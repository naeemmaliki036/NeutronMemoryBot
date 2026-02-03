---
name: neutron-agent-memory
description: Store and retrieve agent memory using Neutron API. Use for saving information with semantic search, and persisting agent context between sessions.
user-invocable: true
metadata: {"openclaw": {"emoji": "🧠", "requires": {"env": ["NEUTRON_API_KEY", "NEUTRON_APP_ID"]}, "primaryEnv": "NEUTRON_API_KEY"}}
---

## Overview

Neutron Agent Memory provides persistent memory storage with semantic search. Use this to:
- Save information and search it semantically
- Persist agent context between sessions
- Organize content into bundles

## Configuration

Required environment variables:
- `NEUTRON_API_KEY` - API authentication key
- `NEUTRON_APP_ID` - Application ID (e.g., `5925f30c-135c-4e10-b275-edf0936ef4be`)
- `NEUTRON_EXTERNAL_USER_ID` - User identifier (default: `1`)

## API Base URL

`https://api-development.myneutron.ai`

## Authentication

All requests require:
- Header: `Authorization: Bearer $NEUTRON_API_KEY`
- Query params: `appId` and `externalUserId`

---

## Seeds (Memory Storage & Search)

### Save Text Content
```bash
curl -X POST "https://api-development.myneutron.ai/seeds?appId=$NEUTRON_APP_ID&externalUserId=$NEUTRON_EXTERNAL_USER_ID" \
  -H "Authorization: Bearer $NEUTRON_API_KEY" \
  -F 'text=["Your content to save"]' \
  -F 'textTypes=["text"]' \
  -F 'textSources=["mcp"]' \
  -F 'textTitles=["Title of content"]'
```

**Text types:** `text`, `markdown`, `json`, `csv`, `claude_chat`, `gpt_chat`, `email`
**Sources:** `upload`, `mcp`, `chrome_extension`, `gmail`, `gdrive`

### Semantic Search
```bash
curl -X POST "https://api-development.myneutron.ai/seeds/query?appId=$NEUTRON_APP_ID&externalUserId=$NEUTRON_EXTERNAL_USER_ID" \
  -H "Authorization: Bearer $NEUTRON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "natural language search", "limit": 10, "threshold": 0.5}'
```

**Request body:**
- `query` (required): Natural language search query
- `limit` (optional): Max results 1-100, default 30
- `threshold` (optional): Similarity threshold 0-1, default 0.5
- `seedIds` (optional): Limit to specific seeds

**Response:** Array of results with `seedId`, `content`, `similarity` score (0-1)

---

## Agent Contexts (Session Persistence)

### Create Context
```bash
curl -X POST "https://api-development.myneutron.ai/agent-contexts?appId=$NEUTRON_APP_ID&externalUserId=$NEUTRON_EXTERNAL_USER_ID" \
  -H "Authorization: Bearer $NEUTRON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "my-agent",
    "memoryType": "episodic",
    "data": {"key": "value"},
    "metadata": {"tags": ["tag1"]}
  }'
```

**Memory types:**
- `episodic` - Conversation history, decisions, actions
- `semantic` - Domain knowledge, user preferences
- `procedural` - System prompts, tool definitions
- `working` - Current task state, variables

### List Contexts
```bash
curl -X GET "https://api-development.myneutron.ai/agent-contexts?appId=$NEUTRON_APP_ID&externalUserId=$NEUTRON_EXTERNAL_USER_ID&agentId=my-agent" \
  -H "Authorization: Bearer $NEUTRON_API_KEY"
```

### Get Context by ID
```bash
curl -X GET "https://api-development.myneutron.ai/agent-contexts/{id}?appId=$NEUTRON_APP_ID&externalUserId=$NEUTRON_EXTERNAL_USER_ID" \
  -H "Authorization: Bearer $NEUTRON_API_KEY"
```

---

## Usage Guidelines

1. **Seeds** for long-term knowledge: documents, notes, reference material
2. **Agent Contexts** for session state: conversation history, task progress
3. **Search** uses semantic similarity, not keyword matching
4. Processing takes 5-30 seconds after creating seeds
