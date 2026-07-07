import { describe, expect, test, beforeEach } from "bun:test"
import { LessonLearner } from "./learning"
import { existsSync, rmSync } from "fs"
import { join } from "path"

const TEST_PATH = join(process.cwd(), ".octocode", "test-lessons.json")

function cleanup() {
  if (existsSync(TEST_PATH)) rmSync(TEST_PATH)
}

describe("LessonLearner", () => {
  beforeEach(cleanup)

  test("logs a lesson", () => {
    const learner = new LessonLearner(TEST_PATH)
    const lesson = learner.logLesson("coder", "fix login bug", "fixed successfully", "check auth tokens first", ["auth"], true)
    expect(lesson.agentName).toBe("coder")
    expect(lesson.success).toBe(true)
    expect(lesson.tags).toEqual(["auth"])
  })

  test("persists to file", () => {
    const learner = new LessonLearner(TEST_PATH)
    learner.logLesson("coder", "test context", "test outcome", "test lesson", [], true)
    const learner2 = new LessonLearner(TEST_PATH)
    const stats = learner2.getStats()
    expect(stats.total).toBe(1)
  })

  test("returns relevant lessons for same agent", () => {
    const learner = new LessonLearner(TEST_PATH)
    learner.logLesson("coder", "fix login bug", "success", "check auth tokens", ["auth", "login"], true)
    learner.logLesson("writer", "write docs", "success", "use markdown", ["docs"], true)
    const relevant = learner.getRelevantLessons("coder", "fix the login authentication issue")
    expect(relevant.length).toBeGreaterThan(0)
    expect(relevant[0].agentName).toBe("coder")
  })

  test("getLessonsForPrompt returns formatted string", () => {
    const learner = new LessonLearner(TEST_PATH)
    learner.logLesson("coder", "fix login", "success", "check tokens first", [], true)
    learner.logLesson("coder", "fix auth", "failure", "don't skip validation", [], false)
    const prompt = learner.getLessonsForPrompt("coder", "fix the login issue")
    expect(prompt).toContain("SUCCESS")
    expect(prompt).toContain("FAILURE")
  })

  test("empty prompt when no relevant lessons", () => {
    const learner = new LessonLearner(TEST_PATH)
    expect(learner.getLessonsForPrompt("coder", "completely unrelated task")).toBe("")
  })

  test("stats return correct counts", () => {
    const learner = new LessonLearner(TEST_PATH)
    learner.logLesson("coder", "a", "b", "c", [], true)
    learner.logLesson("coder", "a", "b", "c", [], true)
    learner.logLesson("writer", "a", "b", "c", [], false)
    const stats = learner.getStats()
    expect(stats.total).toBe(3)
    expect(stats.byAgent.coder).toBe(2)
    expect(stats.byAgent.writer).toBe(1)
    expect(stats.successRate).toBeCloseTo(0.667, 1)
  })

  test("prune removes low-score lessons", () => {
    const learner = new LessonLearner(TEST_PATH)
    learner.logLesson("coder", "x", "y", "z", [], true)
    const removed = learner.pruneLowValue(999)
    expect(removed).toBe(1)
  })
})
