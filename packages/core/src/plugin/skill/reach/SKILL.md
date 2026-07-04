---
name: reach
description: Read and search content from any platform — Twitter, Reddit, YouTube, Bilibili, GitHub, RSS, web pages, and more. Use when the user asks to search social media, read tweets, check Reddit, get YouTube transcripts, browse Bilibili, read RSS feeds, search the web, or access any online platform content. Combines with the scrape skill for full internet coverage. Triggers: "search twitter", "read reddit", "youtube transcript", "bilibili", "github repo", "rss feed", "web search", "search the web", "read this page".
---

# Reach — Internet Content Access

Read and search content from any platform. Covers web pages, social media, video platforms, code repos, and RSS — all without paid APIs.

**Requires: Python 3.10+**

## Setup (once)

```bash
pip install agent-reach
agent-reach install --env=auto
```

Run `agent-reach doctor` to verify all channels are working.

### Optional channels (ask user which they need)

```bash
agent-reach install --env=auto --channels=opencli,twitter,xiaohongshu
```

Supported: `opencli`, `twitter`, `xiaohongshu`, `reddit`, `bilibili`, `linkedin`, `xiaoyuzhou`, `xueqiu`, `all`

## Platform quick reference

| Platform | Command | Notes |
|----------|---------|-------|
| Web page | `curl -s "https://r.jina.ai/URL"` | Free, no API key |
| YouTube | `yt-dlp --dump-json URL` | Metadata; `yt-dlp --write-sub --skip-download URL` for subs |
| GitHub | `gh repo view owner/repo` | Needs `gh auth login` for private repos |
| Twitter/X | `twitter search "query" -n 10` | Needs cookie config |
| Reddit | `opencli reddit search "query" -f yaml` | Needs login (OpenCLI or rdt-cli) |
| Bilibili | `bili search "query" --type video` | No login needed |
| XiaoHongShu | `opencli xiaohongshu search "query" -f yaml` | Needs OpenCLI + Chrome extension |
| RSS | `python3 -c "import feedparser; d=feedparser.parse('URL'); ..."` | No config needed |
| Web search | `mcporter call 'exa.web_search_exa(...)'` | Auto-configured via MCP |
| LinkedIn | `curl -s "https://r.jina.ai/URL"` | Basic pages; full access needs MCP |
| Podcasts | `bash ~/.agent-reach/tools/xiaoyuzhou/transcribe.sh URL` | Needs Groq key |

## Usage patterns

### Read a web page

```bash
curl -s "https://r.jina.ai/https://example.com/article" | head -200
```

### Search Twitter

```bash
twitter search "AI agents" -n 10 --format json
twitter tweet https://x.com/user/status/123
```

### Read Reddit

```bash
opencli reddit search "machine learning" -f yaml
opencli reddit post POST_ID -f yaml
```

### YouTube transcript

```bash
yt-dlp --write-sub --write-auto-sub --sub-lang en --skip-download --sub-format vtt -o "/tmp/yt-%(id)s" "URL"
# Then parse the .vtt file
```

### Bilibili

```bash
bili search "AI tutorial" --type video
bili video BVxxx --detail
```

### GitHub

```bash
gh repo view owner/repo
gh issue list -R owner/repo --limit 10
gh search repos "query" --limit 10
```

### RSS feed

```bash
python3 -c "
import feedparser
d = feedparser.parse('https://example.com/feed.xml')
for e in d.entries[:10]:
    print(f'{e.title}: {e.link}')
"
```

### Web search (Exa)

```bash
mcporter call 'exa.web_search_exa(query="best Python frameworks 2026", numResults=5)'
```

## Combining with scraping

For platforms not covered by Reach (dynamic JS sites, anti-bot protected pages, large-scale crawling), use the **scrape** skill with Scrapling:

- **Reach** handles social media, video platforms, code repos, RSS
- **Scrape** handles general web scraping, JS-heavy sites, Cloudflare-protected sites, crawls

Use both together:
1. Use Reach to find URLs from social media / search
2. Use Scrape to extract content from those URLs if they need browser rendering

```bash
# Step 1: Find URLs via Reach
twitter search "interesting article about AI" -n 5 --format json

# Step 2: Scrape the found URLs with Scrapling
scrapling extract get "https://found-url.com/article" content.md
```

## Diagnostics

```bash
agent-reach doctor          # Check all channel status
agent-reach doctor --json   # Machine-readable status
agent-reach watch           # Quick health + update check
```

## Configuration

```bash
agent-reach configure twitter-cookies "cookie_string"    # Unlock Twitter
agent-reach configure proxy http://user:pass@host:port   # Set proxy
agent-reach configure groq-key gsk_xxxxx                 # Unlock podcast transcription
agent-reach configure --from-browser chrome              # Auto-extract cookies
```

## Guardrails

- Only access content you are authorized to read.
- Respect platform terms of service.
- Use dedicated/secondary accounts for cookie-based platforms to avoid ban risk on main accounts.
- Cookies are stored locally only (`~/.agent-reach/config.yaml`, mode 600).
- Do not scrape personal or sensitive data without consent.
