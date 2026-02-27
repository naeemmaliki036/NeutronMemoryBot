---
name: vanar-neutron-memory
description: Your AI remembers every conversation — finds relevant context by meaning, not keywords. Fully automatic.
user-invocable: true
metadata: {"openclaw": {"emoji": "🧠", "requires": {"env": ["NEUTRON_API_KEY"]}, "primaryEnv": "NEUTRON_API_KEY"}}
---

# Neutron Memory

Your AI remembers every conversation and finds relevant context by meaning — not keywords. Save anything, search by what it means, and your agent picks up where it left off across sessions.

## How It Works

1. You talk to your AI agent
2. **Auto-Capture** saves the conversation to memory (background, non-blocking)
3. Next time you ask something, **Auto-Recall** finds relevant past conversations and injects them as context
4. Your agent responds with full awareness of previous interactions

No manual work — it just works once installed.

## Quick Start

See **[SETUP.md](SETUP.md)** for the full setup guide. TL;DR:

1. Get a free API key at **https://openclaw.vanarchain.com/** ($20 free credits, no credit card)
2. `export NEUTRON_API_KEY=nk_your_key`
3. `./scripts/neutron-memory.sh test`

## Commands

### Save
```bash
./scripts/neutron-memory.sh save "Content to remember" "Title"
```

### Search
```bash
./scripts/neutron-memory.sh search "what do I know about X" 10 0.5
```

Arguments: `QUERY` `LIMIT` `THRESHOLD(0-1)`

### Diagnose
```bash
./scripts/neutron-memory.sh diagnose
```

Checks all prerequisites: curl, jq, API key, connectivity, and authentication.

## Hooks (Auto-Capture & Auto-Recall)

- `hooks/pre-tool-use.sh` — **Auto-Recall**: Queries memories before AI turn, injects relevant context
- `hooks/post-tool-use.sh` — **Auto-Capture**: Saves conversation after AI turn

Both are **enabled by default**. To disable:

```bash
export VANAR_AUTO_RECALL=false
export VANAR_AUTO_CAPTURE=false
```

## API Endpoints

- `POST /memory/save` — Save text (multipart/form-data)
- `POST /memory/search` — Semantic search (JSON body)

**Auth:** `Authorization: Bearer $NEUTRON_API_KEY` — that's it. No other credentials needed.

## Security & Privacy

This skill only sends data you explicitly save (or auto-captured conversations) to the Neutron API. Here's exactly what happens:

| Action | What's sent | Where |
|--------|------------|-------|
| **Save** | The text you pass to `save` or auto-captured conversation turns | `POST /memory/save` over HTTPS |
| **Search** | Your search query text | `POST /memory/search` over HTTPS |
| **Auto-Recall** | The user's latest message (used as search query) | `POST /memory/search` over HTTPS |
| **Auto-Capture** | `User: {message}\nAssistant: {response}` | `POST /memory/save` over HTTPS |

**What is NOT sent:**
- No local files are read or uploaded
- No environment variables (other than the API key for auth)
- No system information, file paths, or directory contents
- No data from other tools or skills

All communication is over HTTPS to `api-neutron.vanarchain.com`. The source code is fully readable in the `scripts/` and `hooks/` directories — three short bash scripts, no compiled binaries.
