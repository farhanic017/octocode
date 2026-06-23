---
name: watch
description: ALWAYS use this skill when a video file is attached or a video URL is shared. Watch a video (URL, local path, or attached file). Downloads with yt-dlp, extracts auto-scaled frames with ffmpeg, pulls the transcript from captions (or Whisper API fallback), and hands the result to the agent. Must be used for any video input — never guess about video content, always watch it first. Triggers: any video attachment, any video URL, /watch, "watch video", "analyze video", "summarize video", "what happens in this video", ".mp4", ".mov", ".mkv", ".webm", "youtube", "tiktok", "vimeo".
---

# /watch — Agent watches a video

You don't have a video input; this skill gives you one. A Python script downloads the video, extracts frames as JPEGs, gets a timestamped transcript (native captions first, then Whisper API fallback), and prints frame paths. You then `Read` each frame path to see the images and combine them with the transcript to answer the user.

## Step 0 — Setup preflight (runs every `/watch` invocation, silent on success)

Before every `/watch` run, verify that dependencies are in place:

```bash
python3 "${SKILL_DIR}/scripts/setup.py" --check
```

This is a <100ms lookup. On exit 0, the script emits **nothing** — proceed to Step 1 without comment. Do NOT announce "setup is complete" to the user.

On non-zero exit, follow the table:

| Exit | Meaning | Action |
|------|---------|--------|
| `2` | Missing binaries (`ffmpeg` / `ffprobe` / `yt-dlp`) | Run installer |
| `3` | No Whisper API key | Run installer to scaffold `.env`, then ask user for a key |
| `4` | Both missing | Run installer, then ask for a key |

The installer is idempotent — safe to re-run:

```bash
python3 "${SKILL_DIR}/scripts/setup.py"
```

On macOS with Homebrew, it auto-installs `ffmpeg` and `yt-dlp`. On Linux/Windows, it prints the exact install commands for the user to run.

**If an API key is still missing after install:** ask the user whether they have a Groq API key (preferred — cheaper, faster) or an OpenAI key. Then write it into `~/.config/watch/.env`. If they don't want to set up Whisper, proceed with `--no-whisper` and tell them videos without native captions will come back frames-only.

## When to use

- User pastes a video URL (YouTube, Vimeo, X, TikTok, Twitch clip, most yt-dlp-supported sites) and asks about it.
- User points at a local video file (`.mp4`, `.mov`, `.mkv`, `.webm`, etc.) and asks about it.
- User attaches a video file and asks about it.
- User types `/watch <url-or-path> [question]`.

## Recommended limits

- **Best accuracy: videos under 10 minutes.** Frame coverage scales inversely with duration.
- **Hard caps: 100 frames total and 2 fps.** Token cost grows with frame count.
- If the user hands you a long video, consider asking whether they want a specific section before burning tokens on a sparse scan.

## How to invoke

**Step 1 — parse the user input.** Separate the video source (URL, path, or attached file) from any question. Example: `/watch https://youtu.be/abc what language is this in?` → source = `https://youtu.be/abc`, question = `what language is this in?`.

**Step 2 — run the watch script.** Pass the source verbatim:

```bash
python3 "${SKILL_DIR}/scripts/watch.py" "<source>"
```

Optional flags:
- `--start T` / `--end T` — focus on a section. Accepts `SS`, `MM:SS`, or `HH:MM:SS`.
- `--max-frames N` — lower the cap for tighter token budget (e.g. `--max-frames 40`)
- `--resolution W` — change frame width in px (default 512; bump to 1024 for on-screen text)
- `--fps F` — override auto-fps (clamped to 2 fps max)
- `--out-dir DIR` — keep working files somewhere specific
- `--whisper groq|openai` — force a specific Whisper backend
- `--no-whisper` — disable the Whisper fallback entirely

### Focusing on a section (higher frame rate)

When the user asks about a specific moment, pass `--start` and/or `--end`. The script switches to focused-mode budgets (denser, still capped at 2 fps).

Examples:
```bash
python3 "${SKILL_DIR}/scripts/watch.py" video.mp4 --start 50 --end 60
python3 "${SKILL_DIR}/scripts/watch.py" "$URL" --start 2:15 --end 2:45
python3 "${SKILL_DIR}/scripts/watch.py" "$URL" --start 1:12:00
```

**Step 3 — Read every frame path the script lists.** The Read tool renders JPEGs directly as images. Read all frames in a single message (parallel tool calls) so you see them together. Frames are in chronological order with `t=MM:SS` timestamps.

**Alternative: Use vision-tool for frame analysis.** If the vision-tool skill is available, you can use it to analyze frames without consuming your own vision tokens:

```bash
python3 "${SKILL_DIR}/../vision/scripts/vision_proxy.py" "/path/to/frame.jpg" "Describe what you see in this frame"
```

For video analysis, use the vision-tool's `analyze_video` directly on the source video:

```bash
python3 "${SKILL_DIR}/../vision/scripts/vision_proxy.py" "/path/to/video.mp4" "Describe the video content"
```

**Step 4 — answer the user.** You now have two streams of evidence:
- **Frames** — what's on screen at each timestamp
- **Transcript** — what's said at each timestamp

If the user asked a specific question, answer it directly citing timestamps. If they didn't ask anything, summarize what happens in the video.

**Step 5 — clean up.** The script prints a working directory at the end. Delete it when done: `rm -rf <dir>`.

## Handling attached video files

When the user attaches a video file (via octocode's attachment system), the file is available as a local path. Pass it directly to the watch script:

```bash
python3 "${SKILL_DIR}/scripts/watch.py" "/path/to/attached/video.mp4"
```

The script detects local files automatically — no download needed.

## Transcription

The script gets a timestamped transcript in one of two ways:

1. **Native captions (free, preferred).** yt-dlp pulls manual or auto-generated subtitles.
2. **Whisper API fallback.** If no captions, the script extracts audio and uploads to Groq (`whisper-large-v3`, preferred) or OpenAI (`whisper-1`).

Both keys live in `~/.config/watch/.env`. Use `--no-whisper` to skip the fallback entirely.

## Failure modes

- **Setup preflight failed** → run `python3 "${SKILL_DIR}/scripts/setup.py"`.
- **No transcript available** → captions missing AND no Whisper key. Proceed frames-only.
- **Long video warning** → acknowledge it. Offer to re-run focused with `--start`/`--end`.
- **Download fails** → yt-dlp error on stderr. Tell the user if it's login-required or region-locked.
- **Whisper fails** → error on stderr. Retry with `--whisper openai` if Groq failed.

## Token efficiency

This skill burns tokens primarily on frames. 80 frames at 512px wide is roughly 50-80k image tokens. The transcript is cheap. If you already watched a video this session and the user asks a follow-up, do **not** re-run — answer from what you have.

## Security

- Runs `yt-dlp` and `ffmpeg` locally.
- Only extracted audio goes to Whisper APIs (when captions are missing).
- No video is uploaded to any API.
- No platform accounts are accessed.
- API keys are stored in `~/.config/watch/.env` (mode `0600`).
