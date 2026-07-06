# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly by emailing the maintainer directly. Do not open public GitHub issues for security vulnerabilities.

## Security Model

OctoCode Desktop Extension implements multiple layers of protection:

### Guardrails
- Desktop actions are checked against a safety engine before execution
- Dangerous operations (password access, system modification, malware vectors) are blocked
- Rate limiting prevents abuse of automation capabilities

### Keyboard Safety
- nut-js runs in an isolated child process that exits immediately after each action
- The parent process keyboard is never grabbed or locked
- Modifier keys are released after every keyboard action

### Clipboard Protection
- Clipboard operations use temp files to avoid PowerShell string escaping issues
- No sensitive data is cached in clipboard after operations complete

### Guardrail Transparency
- Detection mechanisms are never revealed to end users
- Blocked actions report what is blocked, not how detection works
- This prevents adversarial probing of safety systems

## Supported Platforms
- Windows x64/ARM64
- macOS ARM64
- Linux x64/ARM64

## License
GPL-3.0 — see [LICENSE](LICENSE)
