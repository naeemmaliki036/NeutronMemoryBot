# NeutronMemoryBot

An AI agent with persistent memory and semantic search capabilities, built on OpenClaw and powered by the Neutron API.

## Overview

NeutronMemoryBot is an autonomous AI agent that:
- Persists memory across sessions using semantic search
- Interacts on [Moltbook](https://moltbook.com) (social network for AI agents)
- Auto-replies to comments with context-aware responses
- Publishes skills to [ClawHub](https://clawhub.ai)

## Features

- **Persistent Memory** - Store and retrieve context using Neutron API
- **Semantic Search** - Find information by meaning, not just keywords (Jina Embeddings v4, 1024 dimensions)
- **4 Memory Types** - Episodic, semantic, procedural, and working memory
- **Auto-Reply System** - Cron-based replies with memory context
- **Blockchain Attestation** - Tamper-evident memory storage

## Installation

### 1. Clone the repository

```bash
git clone git@github.com:naeemmaliki036/NeutronMemoryBot.git
cd NeutronMemoryBot
```

### 2. Install the skill via ClawHub

```bash
clawhub install neutron-agent-memory
```

### 3. Configure environment

Copy the example config and add your API keys:

```bash
cp openclaw.example.json openclaw.json
```

Edit `openclaw.json` with your credentials:
- `NEUTRON_API_KEY` - Get from [Neutron Console](https://console-development.myneutron.ai)
- `NEUTRON_APP_ID` - Your application ID

### 4. Set up cron jobs (optional)

For auto-replies and heartbeat:

```bash
# Add to crontab
crontab -e

# Auto-reply every hour
30 * * * * ~/.openclaw/scripts/moltbook-autoreplies.sh

# Heartbeat every 4 hours
0 */4 * * * ~/.openclaw/scripts/moltbook-heartbeat.sh
```

## Usage

### Save a memory

```bash
curl -X POST "https://api-development.myneutron.ai/agent-contexts?appId=YOUR_APP_ID&externalUserId=YOUR_USER" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"my-agent","memoryType":"semantic","data":{"key":"value"}}'
```

### Query memories

```bash
curl "https://api-development.myneutron.ai/agent-contexts?appId=YOUR_APP_ID&externalUserId=YOUR_USER&agentId=my-agent" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Semantic search

```bash
curl -X POST "https://api-development.myneutron.ai/seeds/query?appId=YOUR_APP_ID&externalUserId=YOUR_USER" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"your search query","limit":10}'
```

## Project Structure

```
.
├── README.md                        # This file
├── AI_AGENT_ARCHITECTURE_GUIDE.md   # Detailed architecture guide
├── OPENCLAW_SKILL_GUIDE.md          # Skill creation guide
├── openclaw.example.json            # Example configuration
└── skills/
    └── neutron-agent-memory/
        └── SKILL.md                 # Skill definition
```

## Memory Types

| Type | Use Case | Retention |
|------|----------|-----------|
| **episodic** | Conversations, events, actions | Fades over time |
| **semantic** | Facts, knowledge, preferences | Persists long-term |
| **procedural** | Workflows, tool definitions | Stable |
| **working** | Current session state | Transient |

## Links

- **Moltbook Profile**: [moltbook.com/u/NeutronMemoryBot](https://moltbook.com/u/NeutronMemoryBot)
- **ClawHub Skill**: `clawhub install neutron-agent-memory`
- **Neutron API Docs**: [console-development.myneutron.ai/docs](https://console-development.myneutron.ai/docs)

## License

MIT

## Author

Created by [@naeemmaliki036](https://twitter.com/naeemmaliki036)

---

*Built with OpenClaw + DeepSeek + Neutron API*
