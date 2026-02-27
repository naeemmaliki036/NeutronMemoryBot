# NeutronMemoryBot - Operations Guide

## 1. Prerequisites

### API Keys

You need two sets of credentials:

| Service | Where to get | Env vars |
|---------|-------------|----------|
| **Neutron** (memory) | https://openclaw.vanarchain.com/ | `NEUTRON_API_KEY`, `NEUTRON_AGENT_ID` |
| **Moltbook** (social) | https://www.moltbook.com | `MOLTBOOK_API_KEY`, `MOLTBOOK_AGENT_ID` |

### Credential Files

Credentials are stored in three places (all should match):

```
.env                          # Root (shared)
webhook-server/.env           # Webhook server
neutron-dashboard/.env.local  # Dashboard
```

The skill also reads `openclaw.json` for Neutron credentials:

```json
{
  "skills": {
    "entries": {
      "vanar-neutron-memory": {
        "enabled": true,
        "apiKey": "nk_your_key_here",
        "env": {
          "NEUTRON_AGENT_ID": "your-agent-id",
          "YOUR_AGENT_IDENTIFIER": "NeutronMemoryBot",
          "VANAR_AUTO_RECALL": "true",
          "VANAR_AUTO_CAPTURE": "true"
        }
      }
    }
  }
}
```

### Dependencies

```bash
# Webhook server
cd webhook-server && npm install

# Dashboard
cd neutron-dashboard && npm install
```

---

## 2. Test the Skill CLI

All commands use the script at `skills/vanar-neutron-memory/scripts/neutron-memory.sh`.

### Test API Connection

```bash
./skills/vanar-neutron-memory/scripts/neutron-memory.sh test
```

Expected: `API connection successful`

### Save a Seed

```bash
./skills/vanar-neutron-memory/scripts/neutron-memory.sh save "Hello from NeutronMemoryBot" "My First Seed"
```

Expected: `{ "jobIds": ["..."], "message": "Created 1 seed processing jobs" }`

### Search Seeds (wait ~15s after saving)

```bash
./skills/vanar-neutron-memory/scripts/neutron-memory.sh search "hello" 5 0.5
```

Arguments: `QUERY` `LIMIT` `THRESHOLD(0-1)`

Expected: Results array with `content`, `similarity`, `seedId`

### Create Agent Context

```bash
./skills/vanar-neutron-memory/scripts/neutron-memory.sh context-create "NeutronMemoryBot" "episodic" '{"interaction":"test interaction"}'
```

Memory types: `episodic`, `semantic`, `procedural`, `working`

### List Agent Contexts

```bash
./skills/vanar-neutron-memory/scripts/neutron-memory.sh context-list "NeutronMemoryBot"
```

### Get Specific Context

```bash
./skills/vanar-neutron-memory/scripts/neutron-memory.sh context-get <CONTEXT_ID>
```

---

## 3. Start the Bot (Webhook Server)

```bash
cd webhook-server
node server.js
```

Output:
```
NeutronMemoryBot Webhook Server
  Status:    Running
  Port:      3456
  Webhook:   POST /webhook/moltbook
  Health:    GET /health
  Trigger:   POST /trigger/check-all
Starting polling mode (every 60s)
```

The server does two things:
- **Listens** for Moltbook webhooks on `/webhook/moltbook`
- **Polls** Moltbook every 60s for new comments (fallback mode)

### Environment Variables

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | `3456` | Server port |
| `ENABLE_POLLING` | `true` | Set `false` to disable polling |

---

## 4. Test the Bot

### Health Check

```bash
curl http://localhost:3456/health
```

### Trigger Comment Check (all posts)

```bash
curl -X POST http://localhost:3456/trigger/check-all
```

This checks hardcoded post IDs for new comments, replies, and saves interactions to Neutron.

### Trigger Single Post

```bash
curl -X POST http://localhost:3456/trigger/check-comments \
  -H "Content-Type: application/json" \
  -d '{"postId":"YOUR_POST_ID"}'
```

### Simulate a Webhook Event

```bash
curl -X POST http://localhost:3456/webhook/moltbook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "comment.created",
    "data": {
      "comment_id": "test-123",
      "post_id": "b6b51aae-f7fb-45a3-aa32-d4745f6025ef",
      "author": {"id": "other-agent", "name": "TestAgent"},
      "content": "Tell me about memory types"
    }
  }'
```

### Verify Interactions Were Saved

After triggering, check that memories were stored:

```bash
# Search seeds
./skills/vanar-neutron-memory/scripts/neutron-memory.sh search "replied" 5 0.5

# List contexts
./skills/vanar-neutron-memory/scripts/neutron-memory.sh context-list "NeutronMemoryBot"
```

---

## 5. Start the Dashboard

```bash
cd neutron-dashboard
npm run dev
```

Opens at `http://localhost:3000`. Features:

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Dashboard UI (stats, memories, search) |
| `/api/neutron/memories` | GET | List stored memories |
| `/api/neutron/memories` | POST | Create a new memory |
| `/api/neutron/seeds` | POST | Semantic search |
| `/api/trigger/check-comments` | POST | Trigger comment check |
| `/api/moltbook/posts` | GET | List Moltbook posts |

### Test Dashboard API

```bash
# List memories
curl http://localhost:3000/api/neutron/memories

# Semantic search
curl -X POST http://localhost:3000/api/neutron/seeds \
  -H "Content-Type: application/json" \
  -d '{"query":"memory types","limit":5,"threshold":0.5}'

# Create memory
curl -X POST http://localhost:3000/api/neutron/memories \
  -H "Content-Type: application/json" \
  -d '{"memoryType":"episodic","data":{"test":"dashboard test"}}'
```

---

## 6. Auto-Recall and Auto-Capture

These are OpenClaw hooks that automatically manage memory during agent conversations.

| Hook | File | What it does |
|------|------|-------------|
| Auto-Recall | `skills/.../hooks/pre-tool-use.sh` | Queries relevant memories before each AI turn |
| Auto-Capture | `skills/.../hooks/post-tool-use.sh` | Saves conversation after each AI turn |

### Configuration

Both default to **ON**. Configure in `openclaw.json`:

```json
"VANAR_AUTO_RECALL": "true",
"VANAR_AUTO_CAPTURE": "true"
```

Or via environment variables:

```bash
export VANAR_AUTO_RECALL=false   # Disable recall
export VANAR_AUTO_CAPTURE=false  # Disable capture
```

### How Auto-Recall Works

1. User sends a message
2. Hook queries Neutron: `POST /seeds/query` with the user's message
3. Top 5 semantically similar memories are returned
4. Memories are injected into the AI's context as `RECALLED MEMORIES`

### How Auto-Capture Works

1. AI generates a response
2. Hook formats: `User: {message}\nAssistant: {response}`
3. Saves as a seed: `POST /seeds` with source `auto_capture`
4. Runs in background (non-blocking)

---

## 7. What Gets Saved to Neutron

Every bot interaction saves **two things**:

1. **Agent Context** (structured metadata)
   - Type: `episodic`
   - Contains: truncated interaction summary
   - Use: filtering, listing, session tracking

2. **Seed** (full thread snapshot)
   - Contains: original post + all comments + bot reply
   - Use: semantic search finds relevant past conversations
   - Format: append-only snapshots

---

## 8. Troubleshooting

### "NEUTRON_API_KEY not found"

Set env vars or check `openclaw.json`:
```bash
export NEUTRON_API_KEY=your_key
export NEUTRON_AGENT_ID=your_agent_id
```

### "fetch failed" on trigger/check-all

Moltbook API is unreachable. Check:
```bash
curl -v https://www.moltbook.com/api/v1/posts
```

If TLS handshake hangs, it's a Moltbook server issue. The bot will retry on next poll cycle.

### Seeds not found in search

Seeds take 10-30 seconds to process after saving. Wait and retry the search.

### CLI returns empty or errors

Verify `jq` is installed (used for JSON formatting):
```bash
which jq || brew install jq
```

### Checking server logs

The webhook server logs all interactions to stdout:
- `Saved to memory` — context saved successfully
- `Seed saved` — thread snapshot saved
- `Reply posted successfully` — Moltbook reply sent
- `Error saving to memory` — Neutron API issue

---

## Quick Reference

```bash
# Test skill
./skills/vanar-neutron-memory/scripts/neutron-memory.sh test

# Start bot
cd webhook-server && node server.js

# Start dashboard
cd neutron-dashboard && npm run dev

# Trigger manually
curl -X POST http://localhost:3456/trigger/check-all

# Search memories
./skills/vanar-neutron-memory/scripts/neutron-memory.sh search "your query" 10 0.5
```
