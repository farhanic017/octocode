---
name: scrape
description: Scrape websites using Scrapling with anti-bot bypass (Cloudflare Turnstile), stealth headless browsing, adaptive scraping, and JavaScript rendering. Use when asked to scrape, crawl, or extract data from websites; web_fetch fails; the site has anti-bot protections; or to write Python code to scrape/crawl.
---

# Scrapling — Web Scraping

Scrapling is an adaptive web scraping framework that handles everything from a single request to a full-scale crawl. It bypasses anti-bot systems like Cloudflare Turnstile, supports stealth headless browsing, and has an adaptive parser that survives website redesigns.

**Requires: Python 3.10+**

## Setup (once)

```bash
pip install "scrapling[all]>=0.4.9"
scrapling install --force
```

If `scrapling` is not on PATH after install, find it with `python -m scrapling` or `pip show scrapling` to locate the binary.

## Quick CLI scraping (no code needed)

The `scrapling extract` command group downloads and extracts content without writing Python:

```bash
# Simple page -> markdown file
scrapling extract get "https://example.com" page.md

# Extract specific elements with CSS selector
scrapling extract get "https://example.com" items.txt -s ".product-title"

# Dynamic JS-rendered site
scrapling extract fetch "https://example.com" content.md --network-idle

# Protected site with Cloudflare
scrapling extract stealthy-fetch "https://example.com" data.md --solve-cloudflare

# POST request with JSON body
scrapling extract post "https://api.example.com" result.json -j '{"key": "value"}'
```

### Which command to use

| Scenario | Command |
|----------|---------|
| Static site, blog, news | `get` |
| Modern web app, JS-heavy | `fetch` |
| Cloudflare, anti-bot | `stealthy-fetch` |

Start with `get`. If it returns empty or fails, escalate to `fetch`, then `stealthy-fetch`.

### Output formats

Change the file extension to control output:
- `.md` — Markdown (best for readability)
- `.txt` — Clean text content
- `.html` — Raw HTML

### Key flags (all request commands)

| Flag | Description |
|------|-------------|
| `-s`, `--css-selector` | CSS selector to extract specific parts |
| `--timeout` | Timeout in seconds (default: 30) |
| `--proxy` | Proxy URL: `http://user:pass@host:port` |
| `-H`, `--headers` | HTTP headers (repeatable) |
| `--cookies` | Cookie string: `name1=val1; name2=val2` |
| `--impersonate` | Browser TLS to impersonate (e.g., `Chrome`, `Firefox`) |
| `--ai-targeted` | Extract main content only, sanitize for AI (recommended) |

### Key flags (browser commands: `fetch` / `stealthy-fetch`)

| Flag | Description |
|------|-------------|
| `--network-idle` | Wait for network idle |
| `--headless` / `--no-headless` | Headless mode (default: True) |
| `--wait-selector` | CSS selector to wait for |
| `--wait` | Extra wait time in ms after load |
| `--solve-cloudflare` | Solve Cloudflare challenges (stealthy-fetch only) |
| `--block-ads` | Block ~3,500 known ad/tracker domains |
| `--disable-resources` | Drop images/css for speed |

Always use `--ai-targeted` when extracting content for AI consumption. It sanitizes hidden elements and extracts main content.

## Python coding patterns

### Simple HTTP request

```python
from scrapling.fetchers import Fetcher

page = Fetcher.get('https://example.com')
title = page.css('h1::text').get()
links = page.css('a::attr(href)').getall()
```

### Session with cookies

```python
from scrapling.fetchers import FetcherSession

with FetcherSession(impersonate='chrome') as session:
    session.get('https://example.com/login', ...)
    page = session.get('https://example.com/dashboard')
    data = page.css('.data').getall()
```

### Stealth mode (bypass Cloudflare)

```python
from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch('https://protected-site.com', headless=True, solve_cloudflare=True)
content = page.css('#main-content').getall()
```

### Full browser automation (JS rendering)

```python
from scrapling.fetchers import DynamicFetcher

page = DynamicFetcher.fetch('https://spa-example.com', network_idle=True)
data = page.css('.dynamic-content').getall()
```

### Async sessions

```python
import asyncio
from scrapling.fetchers import AsyncStealthySession

async def scrape():
    async with AsyncStealthySession(max_pages=3) as session:
        tasks = [session.fetch(url) for url in urls]
        results = await asyncio.gather(*tasks)
        for page in results:
            print(page.css('h1::text').get())

asyncio.run(scrape())
```

### Spider (full crawl)

```python
from scrapling.spiders import Spider, Response

class MySpider(Spider):
    name = "demo"
    start_urls = ["https://example.com/"]
    concurrent_requests = 10

    async def parse(self, response: Response):
        for item in response.css('.product'):
            yield {
                "title": item.css('h2::text').get(),
                "price": item.css('.price::text').get(),
            }
        next_page = response.css('.next a')
        if next_page:
            yield response.follow(next_page[0].attrib['href'])

result = MySpider().start()
result.items.to_json("output.json")
```

Pause and resume with checkpoints:
```python
MySpider(crawldir="./crawl_data").start()
```
Press Ctrl+C to pause; restart with the same `crawldir` to resume.

### Adaptive scraping (survives website redesigns)

```python
from scrapling.fetchers import Fetcher

page = Fetcher.get('https://example.com')
products = page.css('.product', auto_save=True)  # Saves element signatures

# Later, even if the site changes layout:
products = page.css('.product', adaptive=True)  # Relocates elements automatically
```

## Parsing reference

```python
from scrapling.fetchers import Fetcher

page = Fetcher.get('https://example.com')

# CSS selectors
items = page.css('.item')
texts = page.css('.item::text').getall()
hrefs = page.css('a::attr(href)').getall()

# XPath
items = page.xpath('//div[@class="item"]')

# BeautifulSoup-style
items = page.find_all('div', class_='item')
items = page.find_by_text('keyword', tag='div')

# Navigation
first = page.css('.item')[0]
parent = first.parent
sibling = first.next_sibling
similar = first.find_similar()
below = first.below_elements()
```

## Combining with Reach

For social media platforms (Twitter, Reddit, Bilibili, XiaoHongShu, YouTube transcripts, RSS), use the **reach** skill instead — it has dedicated tools for each platform that are faster and more reliable than scraping.

Use **scrape** for:
- General websites and web apps
- JS-heavy single-page applications
- Sites with Cloudflare or anti-bot protection
- Large-scale crawling with spiders
- Any site that needs browser rendering

Use **reach** for:
- Twitter/X search and reading
- Reddit posts and comments
- YouTube video info and subtitles
- Bilibili search and video details
- GitHub repos, issues, search
- RSS feed reading
- Web search (Exa)

Both skills work together — use Reach to find URLs from social media, then use Scrape to extract content from those URLs if they need browser rendering.

## Guardrails

- Only scrape content you are authorized to access.
- Respect robots.txt and ToS. Spiders support `robots_txt_obey = True`.
- Add delays (`download_delay`) for large crawls.
- Do not bypass paywalls or authentication without permission.
- Never scrape personal or sensitive data.
