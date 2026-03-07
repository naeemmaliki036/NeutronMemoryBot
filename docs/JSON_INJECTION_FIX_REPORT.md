# JSON Injection Vulnerability Fix Report

**Date:** 2026-02-28
**Skill:** vanar-neutron-memory v1.3.1
**ClawHub Issue:** #500
**Reporter:** steipete (Collaborator)

---

## Summary

The skill was flagged as suspicious on ClawHub due to critical input sanitization vulnerabilities. All bash scripts directly interpolated user-controlled input into JSON payloads for curl commands without proper escaping, creating a JSON injection vulnerability.

## Root Cause

From steipete's analysis:

> The skill is classified as suspicious due to critical input sanitization vulnerabilities. Specifically, the hooks/pre-tool-use.sh and scripts/neutron-memory.sh scripts directly interpolate user-controlled input (e.g., OPENCLAW_USER_MESSAGE, query) into JSON payloads for curl -d commands without proper escaping. This creates a JSON injection vulnerability, allowing an attacker to manipulate the API request by crafting malicious input.

## Vulnerable Lines (Before Fix)

### 1. `hooks/pre-tool-use.sh` — Auto-Recall hook
```bash
-d "{\"query\":\"${USER_MESSAGE}\",\"limit\":5,\"threshold\":0.5}"
```
`USER_MESSAGE` from `OPENCLAW_USER_MESSAGE` env var — unescaped user input in JSON.

### 2. `scripts/neutron-memory.sh` — Search command
```bash
-d "{\"query\":\"${query}\",\"limit\":${limit},\"threshold\":${threshold}}"
```
`query` is a CLI argument — unescaped. `limit` and `threshold` not validated as numbers.

### 3. `scripts/neutron-memory.sh` — Save command
```bash
-F "text=[\"${text}\"]"
-F "textTitles=[\"${title}\"]"
```
`text` and `title` are CLI args — unescaped in JSON arrays within form fields.

### 4. `hooks/post-tool-use.sh` — Auto-Capture hook
```bash
-F "text=[\"${CONTENT}\"]"
-F "textTitles=[\"${TITLE}\"]"
```
`CONTENT` contains `OPENCLAW_USER_MESSAGE` + `OPENCLAW_AI_RESPONSE` — unescaped.

## Fix Applied

All JSON payloads and form field values are now constructed using `jq -n --arg` which properly escapes all special characters (quotes, backslashes, newlines, etc.).

### Approach: `jq` for safe JSON construction

```bash
# Before (vulnerable — string interpolation):
-d "{\"query\":\"${USER_MESSAGE}\",\"limit\":5,\"threshold\":0.5}"

# After (safe — jq constructs valid JSON):
json_body=$(jq -n --arg q "$USER_MESSAGE" '{"query":$q,"limit":5,"threshold":0.5}')
curl ... -d "$json_body"
```

```bash
# Before (vulnerable — string interpolation in form fields):
-F "text=[\"${text}\"]"

# After (safe — jq constructs valid JSON array):
text_json=$(jq -n --arg t "$text" '[$t]')
curl ... -F "text=${text_json}"
```

### Additional hardening

- **`jq` upgraded to hard requirement** — script exits with error if jq is not installed (previously only warned)
- **Numeric input validation** — `limit` and `threshold` are validated as numbers before use
- **Removed grep/sed fallback** — credential file parsing now uses jq exclusively

## Files Modified

| File | Changes |
|------|---------|
| `hooks/pre-tool-use.sh` | Use `jq -n` for search JSON body; require jq |
| `hooks/post-tool-use.sh` | Use `jq -n` for form field JSON arrays; require jq |
| `scripts/neutron-memory.sh` | Use `jq -n` for all JSON; validate numeric inputs; jq now required |

## Neutron API Status

No API changes needed. The server already has defense-in-depth:
- Zod schema validation on search (`query`: string, `limit`: 1-100, `threshold`: 0-1)
- JSON.parse with try-catch on save text fields
- Rate limiting, auth, content-type enforcement
- Bandwidth and field count limits

## Verification

All tests passed on production API:

| Test | Result |
|------|--------|
| `./scripts/neutron-memory.sh test` | OK |
| `./scripts/neutron-memory.sh diagnose` | OK |
| Save with quotes: `'He said "hello"'` | OK — properly escaped |
| Search with quotes and backslash | OK — properly escaped |
| Invalid limit: `search "test" abc` | Rejected with error |
| Invalid threshold: `search "test" 5 notanumber` | Rejected with error |

## References

- [ClawHub Issue #500](https://github.com/openclaw/openclaw/issues/500)
- [VirusTotal Analysis](https://www.virustotal.com/gui/file/706f0d8f0e606818bb25c1b9c2af47ac68f0c9199eef910c9785a8f81fa7dbfd)
- [OWASP Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
