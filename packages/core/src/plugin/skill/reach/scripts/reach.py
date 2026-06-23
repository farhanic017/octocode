#!/usr/bin/env python3
"""Quick multi-platform content reader using agent-reach tools.

Usage:
  python3 reach.py web <url>                  Read a web page via Jina Reader
  python3 reach.py twitter search <query>      Search Twitter
  python3 reach.py twitter tweet <url>         Read a single tweet
  python3 reach.py reddit search <query>       Search Reddit
  python3 reach.py reddit post <id>            Read a Reddit post
  python3 reach.py youtube <url>               Get YouTube video info
  python3 reach.py youtube subs <url>          Get YouTube subtitles
  python3 reach.py bili search <query>         Search Bilibili
  python3 reach.py github repo <owner/repo>    View GitHub repo
  python3 reach.py github issues <owner/repo>  List GitHub issues
  python3 reach.py rss <url>                   Read RSS feed
  python3 reach.py search <query>              Web search via Exa
  python3 reach.py doctor                      Check channel status
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def _run(cmd: str, timeout: int = 30) -> tuple[int, str, str]:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return result.returncode, result.stdout, result.stderr


def cmd_web(args: argparse.Namespace) -> int:
    code, out, err = _run(f'curl -s "https://r.jina.ai/{args.url}"')
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out[:50000])
    return 0


def cmd_twitter_search(args: argparse.Namespace) -> int:
    n = args.limit or 10
    code, out, err = _run(f'twitter search "{args.query}" -n {n} --format json', timeout=60)
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        print("Hint: run 'agent-reach configure twitter-cookies ...' to set up Twitter access", file=sys.stderr)
        return code
    _print_json_or_text(out)
    return 0


def cmd_twitter_tweet(args: argparse.Namespace) -> int:
    code, out, err = _run(f'twitter tweet "{args.url}"', timeout=30)
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out)
    return 0


def cmd_reddit_search(args: argparse.Namespace) -> int:
    n = args.limit or 10
    code, out, err = _run(f'opencli reddit search "{args.query}" -f yaml -n {n}', timeout=60)
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        print("Hint: Reddit requires login. Install OpenCLI extension in Chrome.", file=sys.stderr)
        return code
    print(out[:50000])
    return 0


def cmd_reddit_post(args: argparse.Namespace) -> int:
    code, out, err = _run(f'opencli reddit post {args.post_id} -f yaml', timeout=30)
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out[:50000])
    return 0


def cmd_youtube_info(args: argparse.Namespace) -> int:
    code, out, err = _run(f'yt-dlp --dump-json "{args.url}"', timeout=60)
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    try:
        data = json.loads(out)
        print(f"Title: {data.get('title', 'N/A')}")
        print(f"Uploader: {data.get('uploader', 'N/A')}")
        print(f"Duration: {data.get('duration', 0)}s")
        print(f"Description: {data.get('description', 'N/A')[:500]}")
        print(f"Upload date: {data.get('upload_date', 'N/A')}")
    except json.JSONDecodeError:
        print(out[:50000])
    return 0


def cmd_youtube_subs(args: argparse.Namespace) -> int:
    tmpdir = tempfile.mkdtemp(prefix="reach-yt-")
    code, out, err = _run(
        f'yt-dlp --write-sub --write-auto-sub --sub-lang en '
        f'--skip-download --sub-format vtt -o "{tmpdir}/%(id)s" "{args.url}"',
        timeout=60,
    )
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    vtt_files = list(Path(tmpdir).glob("*.vtt"))
    if not vtt_files:
        print("No subtitles found for this video.", file=sys.stderr)
        return 1
    for vtt in vtt_files:
        print(f"--- {vtt.name} ---")
        print(vtt.read_text(encoding="utf-8", errors="replace")[:50000])
    return 0


def cmd_bili_search(args: argparse.Namespace) -> int:
    n = args.limit or 10
    code, out, err = _run(f'bili search "{args.query}" --type video -n {n}', timeout=60)
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out[:50000])
    return 0


def cmd_github_repo(args: argparse.Namespace) -> int:
    code, out, err = _run(f'gh repo view {args.repo}')
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        print("Hint: run 'gh auth login' first", file=sys.stderr)
        return code
    print(out)
    return 0


def cmd_github_issues(args: argparse.Namespace) -> int:
    n = args.limit or 10
    code, out, err = _run(f'gh issue list -R {args.repo} --limit {n}')
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out)
    return 0


def cmd_rss(args: argparse.Namespace) -> int:
    n = args.limit or 10
    code, out, err = _run(
        f'python3 -c "'
        f"import feedparser; "
        f"d=feedparser.parse('{args.url}'); "
        f"[print(f'{{e.title}}: {{e.link}}') for e in d.entries[:{n}]]"
        f'"',
        timeout=30,
    )
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out)
    return 0


def cmd_search(args: argparse.Namespace) -> int:
    n = args.limit or 5
    code, out, err = _run(
        f"mcporter call 'exa.web_search_exa(query=\"{args.query}\", numResults={n})'",
        timeout=60,
    )
    if code != 0:
        print(f"Error: {err.strip()}", file=sys.stderr)
        return code
    print(out[:50000])
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    code, out, err = _run("agent-reach doctor")
    print(out)
    if err:
        print(err, file=sys.stderr)
    return code


def _print_json_or_text(out: str) -> None:
    try:
        data = json.loads(out)
        if isinstance(data, list):
            for item in data[:20]:
                if isinstance(item, dict):
                    text = item.get("text") or item.get("full_text") or json.dumps(item, indent=2)
                    print(text[:500])
                    print("---")
                else:
                    print(str(item)[:500])
        else:
            print(json.dumps(data, indent=2)[:50000])
    except (json.JSONDecodeError, TypeError):
        print(out[:50000])


def main() -> int:
    ap = argparse.ArgumentParser(prog="reach", description="Quick multi-platform content reader")
    sub = ap.add_subparsers(dest="command", required=True)

    # web
    p = sub.add_parser("web", help="Read a web page")
    p.add_argument("url", help="URL to read")
    p.set_defaults(func=cmd_web)

    # twitter
    p_tw = sub.add_parser("twitter", help="Twitter/X operations")
    tw_sub = p_tw.add_subparsers(dest="twitter_cmd", required=True)
    p_ts = tw_sub.add_parser("search", help="Search Twitter")
    p_ts.add_argument("query", help="Search query")
    p_ts.add_argument("-n", "--limit", type=int, default=10)
    p_ts.set_defaults(func=cmd_twitter_search)
    p_tt = tw_sub.add_parser("tweet", help="Read a tweet")
    p_tt.add_argument("url", help="Tweet URL")
    p_tt.set_defaults(func=cmd_twitter_tweet)

    # reddit
    p_rd = sub.add_parser("reddit", help="Reddit operations")
    rd_sub = p_rd.add_subparsers(dest="reddit_cmd", required=True)
    p_rs = rd_sub.add_parser("search", help="Search Reddit")
    p_rs.add_argument("query", help="Search query")
    p_rs.add_argument("-n", "--limit", type=int, default=10)
    p_rs.set_defaults(func=cmd_reddit_search)
    p_rp = rd_sub.add_parser("post", help="Read a post")
    p_rp.add_argument("post_id", help="Post ID")
    p_rp.set_defaults(func=cmd_reddit_post)

    # youtube
    p_yt = sub.add_parser("youtube", help="YouTube operations")
    yt_sub = p_yt.add_subparsers(dest="yt_cmd", required=True)
    p_yi = yt_sub.add_parser("info", help="Get video info")
    p_yi.add_argument("url", help="Video URL")
    p_yi.set_defaults(func=cmd_youtube_info)
    p_ys = yt_sub.add_parser("subs", help="Get subtitles")
    p_ys.add_argument("url", help="Video URL")
    p_ys.set_defaults(func=cmd_youtube_subs)

    # bilibili
    p_bl = sub.add_parser("bili", help="Bilibili operations")
    bl_sub = p_bl.add_subparsers(dest="bili_cmd", required=True)
    p_bs = bl_sub.add_parser("search", help="Search Bilibili")
    p_bs.add_argument("query", help="Search query")
    p_bs.add_argument("-n", "--limit", type=int, default=10)
    p_bs.set_defaults(func=cmd_bili_search)

    # github
    p_gh = sub.add_parser("github", help="GitHub operations")
    gh_sub = p_gh.add_subparsers(dest="gh_cmd", required=True)
    p_gr = gh_sub.add_parser("repo", help="View repo")
    p_gr.add_argument("repo", help="owner/repo")
    p_gr.set_defaults(func=cmd_github_repo)
    p_gi = gh_sub.add_parser("issues", help="List issues")
    p_gi.add_argument("repo", help="owner/repo")
    p_gi.add_argument("-n", "--limit", type=int, default=10)
    p_gi.set_defaults(func=cmd_github_issues)

    # rss
    p_rss = sub.add_parser("rss", help="Read RSS feed")
    p_rss.add_argument("url", help="Feed URL")
    p_rss.add_argument("-n", "--limit", type=int, default=10)
    p_rss.set_defaults(func=cmd_rss)

    # search
    p_s = sub.add_parser("search", help="Web search via Exa")
    p_s.add_argument("query", help="Search query")
    p_s.add_argument("-n", "--limit", type=int, default=5)
    p_s.set_defaults(func=cmd_search)

    # doctor
    p_d = sub.add_parser("doctor", help="Check channel status")
    p_d.set_defaults(func=cmd_doctor)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
