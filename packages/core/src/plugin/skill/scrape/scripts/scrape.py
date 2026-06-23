#!/usr/bin/env python3
"""Quick web scraping helper using Scrapling.

Usage:
  python3 scrape.py get <url> [output.md] [--css-selector SEL] [--timeout N]
  python3 scrape.py fetch <url> [output.md] [--network-idle] [--css-selector SEL]
  python3 scrape.py stealthy <url> [output.md] [--solve-cloudflare] [--css-selector SEL]
  python3 scrape.py code <url> [--mode get|fetch|stealthy] [--css-selector SEL]

The 'get', 'fetch', and 'stealthy' subcommands use the scrapling CLI to extract
content and save it to a file. The 'code' subcommand prints a ready-to-run
Python snippet for the given URL and mode.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _find_scrapling() -> str:
    """Find the scrapling CLI binary."""
    candidate = shutil.which("scrapling")
    if candidate:
        return candidate
    candidate = shutil.which("python3") or shutil.which("python")
    if candidate:
        return f"{candidate} -m scrapling"
    raise SystemExit(
        "scrapling is not installed. Run:\n"
        "  pip install 'scrapling[all]>=0.4.9'\n"
        "  scrapling install --force"
    )


def cmd_get(args: argparse.Namespace) -> int:
    scrapling = _find_scrapling()
    output = args.output or _temp_file(args.url, ".md")
    cmd = f'{scrapling} extract get "{args.url}" "{output}"'
    if args.css_selector:
        cmd += f' --css-selector "{args.css_selector}"'
    if args.timeout:
        cmd += f" --timeout {args.timeout}"
    cmd += " --ai-targeted"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr.strip()}", file=sys.stderr)
        return result.returncode
    _print_result(output)
    return 0


def cmd_fetch(args: argparse.Namespace) -> int:
    scrapling = _find_scrapling()
    output = args.output or _temp_file(args.url, ".md")
    cmd = f'{scrapling} extract fetch "{args.url}" "{output}"'
    if args.css_selector:
        cmd += f' --css-selector "{args.css_selector}"'
    if args.network_idle:
        cmd += " --network-idle"
    if args.wait_selector:
        cmd += f' --wait-selector "{args.wait_selector}"'
    cmd += " --ai-targeted"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr.strip()}", file=sys.stderr)
        return result.returncode
    _print_result(output)
    return 0


def cmd_stealthy(args: argparse.Namespace) -> int:
    scrapling = _find_scrapling()
    output = args.output or _temp_file(args.url, ".md")
    cmd = f'{scrapling} extract stealthy-fetch "{args.url}" "{output}"'
    if args.css_selector:
        cmd += f' --css-selector "{args.css_selector}"'
    if args.solve_cloudflare:
        cmd += " --solve-cloudflare"
    cmd += " --ai-targeted"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr.strip()}", file=sys.stderr)
        return result.returncode
    _print_result(output)
    return 0


def cmd_code(args: argparse.Namespace) -> int:
    mode = args.mode or "get"
    selector = args.css_selector
    sel_line = f'\n    items = page.css("{selector}")  # adjust selector' if selector else ""

    if mode == "get":
        print(f"""from scrapling.fetchers import Fetcher

page = Fetcher.get("{args.url}"){sel_line}
# page.css('h1::text').get()       # single element
# page.css('a::attr(href)').getall()  # all links
print(page.css('body').get())""")
    elif mode == "fetch":
        print(f"""from scrapling.fetchers import DynamicFetcher

page = DynamicFetcher.fetch("{args.url}", network_idle=True){sel_line}
print(page.css('body').get())""")
    elif mode == "stealthy":
        print(f"""from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch("{args.url}", headless=True, solve_cloudflare=True){sel_line}
print(page.css('body').get())""")
    else:
        print(f"Unknown mode: {mode}", file=sys.stderr)
        return 1
    return 0


def _temp_file(url: str, ext: str) -> str:
    safe = url.replace("https://", "").replace("http://", "").replace("/", "_")[:60]
    return str(Path(tempfile.gettempdir()) / f"scrape_{safe}{ext}")


def _print_result(path: str) -> None:
    p = Path(path)
    if not p.exists():
        print(f"Output file not created: {path}", file=sys.stderr)
        return
    size = p.stat().st_size
    content = p.read_text(encoding="utf-8", errors="replace")
    print(f"--- Output: {path} ({size} bytes) ---")
    print(content[:50000])
    if len(content) > 50000:
        print(f"\n... (truncated, full file at {path})")


def main() -> int:
    ap = argparse.ArgumentParser(
        prog="scrape",
        description="Quick web scraping with Scrapling",
    )
    sub = ap.add_subparsers(dest="command", required=True)

    # get
    p_get = sub.add_parser("get", help="Simple HTTP GET and extract")
    p_get.add_argument("url", help="URL to scrape")
    p_get.add_argument("output", nargs="?", help="Output file (default: temp)")
    p_get.add_argument("-s", "--css-selector", help="CSS selector for specific content")
    p_get.add_argument("--timeout", type=int, help="Request timeout in seconds")
    p_get.set_defaults(func=cmd_get)

    # fetch
    p_fetch = sub.add_parser("fetch", help="Browser-based fetch (JS rendering)")
    p_fetch.add_argument("url", help="URL to scrape")
    p_fetch.add_argument("output", nargs="?", help="Output file (default: temp)")
    p_fetch.add_argument("-s", "--css-selector", help="CSS selector")
    p_fetch.add_argument("--network-idle", action="store_true", help="Wait for network idle")
    p_fetch.add_argument("--wait-selector", help="CSS selector to wait for")
    p_fetch.set_defaults(func=cmd_fetch)

    # stealthy
    p_stealthy = sub.add_parser("stealthy", help="Stealth fetch (anti-bot bypass)")
    p_stealthy.add_argument("url", help="URL to scrape")
    p_stealthy.add_argument("output", nargs="?", help="Output file (default: temp)")
    p_stealthy.add_argument("-s", "--css-selector", help="CSS selector")
    p_stealthy.add_argument("--solve-cloudflare", action="store_true", help="Solve Cloudflare challenges")
    p_stealthy.set_defaults(func=cmd_stealthy)

    # code
    p_code = sub.add_parser("code", help="Print a Python scraping snippet")
    p_code.add_argument("url", help="URL to scrape")
    p_code.add_argument("--mode", choices=["get", "fetch", "stealthy"], default="get", help="Fetcher mode")
    p_code.add_argument("-s", "--css-selector", help="CSS selector to include in snippet")
    p_code.set_defaults(func=cmd_code)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
