---
name: agent-reach
description: >
  MUST USE when the built-in websearch tool returns no useful results, or when
  the user asks to research, search, look up, scrape, or read content from
  specific platforms: Twitter/X, Reddit, YouTube, GitHub, or any web URL.

  Also use when the user shares a URL and wants its content read, or when they
  ask about topics that require real-time internet information.

  This skill uses the extension browser (Playwright) to access content that
  API-based search cannot reach — including JavaScript-rendered pages, login-
  gated content, and platform-specific searches.

  NOT for: Writing reports, data analysis, or content generation (only fetching).
---

# Agent Reach — Browser-Powered Internet Access

When the built-in search (Exa/MiMo) fails or returns poor results, use the
browser-based tools below. These navigate real web pages via Playwright.

## Available Tools

### Web Search (fallback)
Use `websearch` tool normally first. If results are empty/poor, the system
automatically falls back to browser-based Google search.

### Page Scraping
Use the `webfetch` tool with any URL. The browser fallback activates for
pages that block HTTP requests (403, Cloudflare, JS-rendered content).

### Platform-Specific Access

**Twitter/X:**
- Navigate to `https://nitter.net/search?f=tweets&q=QUERY`
- Extract tweet content, usernames, engagement metrics
- Nitter bypasses Twitter's login wall for public tweets

**Reddit:**
- Navigate to `https://www.reddit.com/search/?q=QUERY&sort=relevance`
- Extract post titles, content, upvotes, comment counts
- Works for public subreddits without login

**YouTube:**
- Navigate to `https://www.youtube.com/results?search_query=QUERY`
- Extract video titles, channels, view counts
- For transcripts: navigate to video page, extract subtitle content

**GitHub:**
- Navigate to `https://github.com/search?q=QUERY&type=repositories`
- Extract repo names, descriptions, stars
- For READMEs: navigate to `github.com/OWNER/REPO`

**LinkedIn:**
- Navigate to `https://www.linkedin.com/search/results/people/?keywords=QUERY`
- Public profiles only (login required for full access)

**Hacker News:**
- Navigate to `https://hn.algolia.com/?q=QUERY`
- Extract post titles, points, comment counts

**Stack Overflow:**
- Navigate to `https://stackoverflow.com/search?q=QUERY`
- Extract question titles, accepted answers, vote counts

## Usage Pattern

1. Always try `websearch` tool FIRST (faster, cheaper)
2. If results are empty/poor/irrelevant, use browser scraping
3. For specific platforms, navigate directly to the platform URL
4. Extract structured data from the page DOM
5. Summarize findings for the user

## Limitations

- Browser scraping is slower than API search (3-10 seconds per page)
- Some platforms may block automated access
- Login-required content (private repos, DMs) cannot be accessed
- Rate limiting may apply on some platforms

## When NOT to Use

- Simple factual questions (use websearch first)
- Code-related questions (use codesearch tool)
- Math calculations (use the calculator)
- File operations (use read/write/edit tools)
