# ClawHub Suspicious Flag Report

**Date:** 2026-02-28
**Skill:** vanar-neutron-memory v1.2.0
**URL:** https://clawhub.ai/naeemmaliki036/vanar-neutron-memory

---

## How ClawHub Scans Skills

Every published skill goes through a security pipeline:

1. **Deterministic packaging** — skill bundled into ZIP with `_meta.json`
2. **SHA-256 hashing** — unique fingerprint generated
3. **VirusTotal lookup** — hash checked against VirusTotal database
4. **Automated upload** — if hash is new, bundle is uploaded to VirusTotal
5. **Code Insight analysis** — LLM-powered (Gemini 3 Flash) security review of all code starting from SKILL.md
6. **Auto-approval/flagging** — verdicts: Benign, Suspicious, or Malicious
7. **Daily re-scans** — all active skills re-scanned daily

Additionally, skills with 3+ community reports are automatically hidden.

---

## Why Our Skill Was Flagged

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | Background process `&` in post-tool-use.sh | HIGH | `curl ... > /dev/null 2>&1 &` looks like stealth data exfiltration |
| 2 | Auto-capture ON by default | HIGH | Sends conversations to external server without explicit opt-in |
| 3 | Auto-recall ON by default | HIGH | Automatic network calls before every AI turn without consent |
| 4 | External network calls | MEDIUM | Data leaves machine to `api-neutron.vanarchain.com` |
| 5 | File access outside skill dir | LOW | Reads `~/.config/neutron/credentials.json` |

---

## Fixes Applied (v1.3.0)

1. **Removed background process** — curl runs in foreground, visible and trackable
2. **Auto-capture/recall OFF by default** — user must explicitly opt in
3. **Renamed env var** — `API_KEY` (simpler, less brand-specific)
4. **Security section prominent** — moved up in SKILL.md, explicitly states what is/isn't sent
5. **No obfuscation** — all code is readable bash, no binaries

---

## ClawHub Security Policies (Post-ClawHavoc)

After 341+ malicious skills were discovered in Feb 2026:

- Publishers must verify identity via GitHub
- No hardcoded credentials (env vars required)
- No code obfuscation or minification
- Minimal permission requests
- All network requests must be documented
- GitHub account must be 1+ week old

---

## If Still Flagged After Republish

Contact **security@openclaw.ai** with:
- Full source code
- Explanation of all network calls
- Note that auto-capture/recall are opt-in only
- All data flows documented in SKILL.md Security & Privacy section

---

## References

- [ClawHavoc: 341 Malicious Skills (The Hacker News)](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [OpenClaw + VirusTotal Partnership](https://openclaw.ai/blog/virustotal-partnership)
- [Snyk ToxicSkills Report](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
- [OpenClaw Trust Page](https://trust.openclaw.ai/)
