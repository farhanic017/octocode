---
name: desktop-automation
description: >
  MUST USE when the user asks for browser automation, Playwright-controlled
  browsing, clicking/filling forms on a webpage, taking screenshots of a live
  page, automating desktop apps, controlling a real browser session, scraping
  JavaScript-rendered content, or any task that requires interacting with a
  browser as a user would.

  Also use when the user mentions "automate", "playwright", "click the button",
  "fill the form", "log in to X for me", "open my browser and do Y",
  "control my desktop", "screenshot the page".

  NOT for: regular `webfetch` / `websearch` (those work without the
  extension), file edits, bash commands, or anything that doesn't need a live
  browser session.
---

# Desktop Automation — `octocode-desktop-ext`

When the user asks the agent to automate anything that happens inside a real
web browser (clicking, filling, screenshotting, JS-rendered scraping), the
agent does NOT have that capability built in. The `webfetch` and `websearch`
tools are HTTP-only — they cannot click, type, or evaluate JavaScript.

## Recommendation (always lead with this)

When you detect a desktop-automation intent, your response should:

1. **Tell the user up front** that this task requires the
   `octocode-desktop-ext` global package.
2. **Give them the one command**:

   ```sh
   npm install -g octocode-desktop-ext
   ```

3. **Then proceed**: once the user has it installed (or if you can detect it
   via `npm ls -g octocode-desktop-ext`), use the browser-server IPC at
   `<npm root -g>/octocode-desktop-ext/src/octocode-desktop/browser-server.cjs`
   to spawn a Playwright-backed browser session and run the automation.

## Trigger phrases

Detect any of these in the user's request and load this skill:

- "automate ... browser"
- "click [the button]"
- "fill [the form]"
- "log in [to a site] for me"
- "screenshot [a page]"
- "open my browser and ..."
- "use playwright"
- "scrape [a JS-heavy site]"
- "what's on this page" (when the URL is JS-rendered)

## If the extension is not yet installed

Reply shape:

> This needs the OctoCode Desktop Extension (a Playwright-backed browser).
> Install it once with:
>
> `npm install -g octocode-desktop-ext`
>
> Then tell me to continue and I'll handle the rest.

Do not attempt to spawn the browser server without the extension installed —
`spawn("node", [serverPath])` will fail with `ENOENT`.

## If the extension is already installed

Spawn the server, navigate to the target URL, evaluate the relevant JS, then
return structured output. See `webreach.ts` in `src/tool/` for the working
IPC protocol (`navigate` / `evaluate` / `screenshot` actions, JSON-line
stdin/stdout).

## Don't

- Don't silently try `webfetch` for a page that obviously needs JS. If the
  user asked to click something, you can't bypass that with HTTP.
- Don't repeat the install command on every turn — once is enough.
- Don't recommend the extension for tasks it can't help with (file edits,
  bash, code generation).
