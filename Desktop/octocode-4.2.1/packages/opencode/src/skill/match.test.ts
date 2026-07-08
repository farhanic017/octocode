import { describe, expect, test } from "bun:test"
import {
  normalize,
  tokenize,
  expandSynonyms,
  matchToken,
  computeSmartScore,
  matchSkills,
  computeRelevance,
  type ActiveMeta,
} from "./match"
import type { Info } from "."

function skill(name: string, description: string): Info {
  return { name, description, location: `/skills/${name}/SKILL.md`, content: "" }
}

describe("normalize", () => {
  test("lowercases and strips punctuation", () => {
    expect(normalize("Hello-World!")).toBe("hello world")
    expect(normalize("skill_dispatcher/v2")).toBe("skill dispatcher v2")
  })

  test("collapses whitespace", () => {
    expect(normalize("  foo   bar  ")).toBe("foo bar")
  })
})

describe("tokenize", () => {
  test("splits into tokens", () => {
    expect(tokenize("build a landing page")).toEqual(["build", "a", "landing", "page"])
  })

  test("splits compound words", () => {
    expect(tokenize("skill-dispatcher")).toEqual(["skill", "dispatcher"])
    expect(tokenize("my_skill_name")).toEqual(["my", "skill", "name"])
  })

  test("deduplicates tokens", () => {
    const tokens = tokenize("test test test")
    expect(tokens.filter((t) => t === "test")).toHaveLength(1)
  })
})

describe("expandSynonyms", () => {
  test("expands forward synonyms", () => {
    const expanded = expandSynonyms(["database"])
    expect(expanded).toContain("database")
    expect(expanded).toContain("sql")
    expect(expanded).toContain("postgres")
    expect(expanded).toContain("supabase")
  })

  test("expands reverse synonyms", () => {
    const expanded = expandSynonyms(["postgres"])
    expect(expanded).toContain("postgres")
    expect(expanded).toContain("database")
  })

  test("expands transitive synonyms", () => {
    const expanded = expandSynonyms(["motion"])
    expect(expanded).toContain("motion")
    expect(expanded).toContain("animation")
    expect(expanded).toContain("gsap")
  })
})

describe("matchToken", () => {
  test("exact word match returns 1.0", () => {
    expect(matchToken("supabase", "supabase skill")).toBe(1.0)
  })

  test("substring match returns 0.8", () => {
    expect(matchToken("supa", "supabase")).toBe(0.8)
  })

  test("starts-with match returns 0.8 (substring takes priority)", () => {
    expect(matchToken("sup", "supabase")).toBe(0.8)
  })

  test("no match returns 0", () => {
    expect(matchToken("xyz", "supabase")).toBe(0)
  })

  test("empty text returns 0", () => {
    expect(matchToken("test", "")).toBe(0)
  })
})

describe("computeSmartScore", () => {
  test("name match scores higher than description match", () => {
    const nameSkill = skill("supabase", "A generic tool")
    const descSkill = skill("generic", "Works with supabase databases")
    const tokens = ["supabase"]
    const expanded = expandSynonyms(tokens)

    const nameScore = computeSmartScore(nameSkill, tokens, expanded)
    const descScore = computeSmartScore(descSkill, tokens, expanded)

    expect(nameScore).toBeGreaterThan(descScore)
  })

  test("synonym expansion boosts score", () => {
    const dbSkill = skill("database-tool", "Postgres and SQL support")
    const tokens = ["database"]
    const expanded = expandSynonyms(tokens)

    const scoreWithSynonyms = computeSmartScore(dbSkill, tokens, expanded)
    const scoreWithout = computeSmartScore(dbSkill, tokens, tokens)

    expect(scoreWithSynonyms).toBeGreaterThanOrEqual(scoreWithout)
  })

  test("empty query returns 0", () => {
    const s = skill("test", "test skill")
    expect(computeSmartScore(s, [], [])).toBe(0)
  })

  test("multi-token match ratio boost", () => {
    const s = skill("browser-automation", "Automate web browser interactions")
    const tokens = ["browser", "automation"]
    const expanded = expandSynonyms(tokens)

    const score = computeSmartScore(s, tokens, expanded)
    expect(score).toBeGreaterThan(0)
  })
})

describe("matchSkills", () => {
  const skills: Info[] = [
    skill("supabase", "Use when doing ANY task involving Supabase"),
    skill("browser", "Automate web browser interactions"),
    skill("search", "Search the web without a full browser session"),
    skill("understand", "Analyze a codebase to produce an interactive knowledge graph"),
    skill("fetch", "Retrieve a URL without a full browser session"),
  ]

  test("returns all skills with score 0 for empty query", () => {
    const results = matchSkills(skills, "")
    expect(results).toHaveLength(skills.length)
    expect(results.every((r) => r.score === 0)).toBe(true)
  })

  test("ranks relevant skills first", () => {
    const results = matchSkills(skills, "supabase database")
    expect(results[0].skill.name).toBe("supabase")
    expect(results[0].score).toBeGreaterThan(0)
  })

  test("synonym expansion finds related skills", () => {
    const results = matchSkills(skills, "postgres database")
    expect(results[0].skill.name).toBe("supabase")
    expect(results[0].score).toBeGreaterThan(0)
  })

  test("browser-related query ranks browser skill first", () => {
    const results = matchSkills(skills, "browse a website")
    expect(results[0].skill.name).toBe("browser")
  })

  test("search query ranks search skill first", () => {
    const results = matchSkills(skills, "search the web")
    expect(results[0].skill.name).toBe("search")
  })

  test("results are sorted by score descending", () => {
    const results = matchSkills(skills, "web browser automation")
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })
})

describe("computeRelevance", () => {
  test("returns 0 for empty context", () => {
    const s = skill("supabase", "Database tool")
    expect(computeRelevance(s, "")).toBe(0)
  })

  test("returns high score for matching context", () => {
    const s = skill("supabase", "Use when doing ANY task involving Supabase")
    const relevance = computeRelevance(s, "set up a supabase database with auth")
    expect(relevance).toBeGreaterThan(0.3)
  })

  test("returns low score for unrelated context", () => {
    const s = skill("supabase", "Use when doing ANY task involving Supabase")
    const relevance = computeRelevance(s, "animate a logo with gsap")
    expect(relevance).toBeLessThan(0.3)
  })
})

describe("matchSkills with lifecycle", () => {
  const skills: Info[] = [
    skill("supabase", "Use when doing ANY task involving Supabase"),
    skill("browser", "Automate web browser interactions"),
    skill("search", "Search the web without a full browser session"),
  ]

  test("active skills get score boost", () => {
    const active = new Map<string, ActiveMeta>()
    active.set("browser", { loadedAt: Date.now(), callCount: 3, lastUsedAt: Date.now() })

    const results = matchSkills(skills, "supabase database", active)
    const browserResult = results.find((r) => r.skill.name === "browser")
    const supabaseResult = results.find((r) => r.skill.name === "supabase")

    expect(browserResult?.active).toBe(true)
    expect(browserResult?.callCount).toBe(3)
    expect(supabaseResult?.active).toBe(false)
  })

  test("active skills have active flag set", () => {
    const active = new Map<string, ActiveMeta>()
    active.set("search", { loadedAt: Date.now(), callCount: 1, lastUsedAt: Date.now() })

    const results = matchSkills(skills, "search the web", active)
    const searchResult = results.find((r) => r.skill.name === "search")
    expect(searchResult?.active).toBe(true)
    expect(searchResult?.callCount).toBe(1)
  })

  test("empty active map works", () => {
    const results = matchSkills(skills, "supabase database", new Map())
    expect(results).toHaveLength(3)
    expect(results[0].skill.name).toBe("supabase")
  })
})
