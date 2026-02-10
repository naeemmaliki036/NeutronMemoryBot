# Comparison: vanar-neutron-memory vs @supermemory/openclaw-supermemory

Last updated: February 2026

## Overview

| Feature | **vanar-neutron-memory** | **@supermemory/openclaw-supermemory** |
|---------|--------------------------|---------------------------------------|
| **Type** | ClawHub Skill | OpenClaw Plugin (npm) |
| **Install** | `clawhub install vanar-neutron-memory` | `openclaw plugins install @supermemory/openclaw-supermemory` |
| **Pricing** | Free | Requires Supermemory Pro |
| **Auto-Capture** | ✓ (configurable) | ✓ |
| **Auto-Recall** | ✓ (configurable) | ✓ |
| **Semantic Search** | ✓ | ✓ |
| **Memory Types** | 4 (episodic, semantic, procedural, working) | Single store |
| **Agent Contexts** | ✓ Structured metadata | ✗ |
| **Blockchain Attestation** | ✓ Tamper-evident | ✗ |
| **User Profile** | ✗ | ✓ Auto-built |
| **Configurable On/Off** | ✓ `VANAR_AUTO_RECALL` / `VANAR_AUTO_CAPTURE` | ✗ Always on |
| **CLI Commands** | `save`, `search`, `context-*`, `test` | `search`, `profile`, `wipe` |
| **Weekly Downloads** | ~105 | 957 |
| **Version** | 1.1.0 | 1.0.0 |

## Feature Parity

Both now support:
- ✅ Auto-Capture (saves conversations after AI turn)
- ✅ Auto-Recall (queries memories before AI turn)
- ✅ Semantic Search (find by meaning, not keywords)

## vanar-neutron-memory Advantages

| Advantage | Description |
|-----------|-------------|
| **Free** | No subscription required |
| **Blockchain Attestation** | Tamper-evident memory with transaction hashes |
| **4 Memory Types** | Episodic, semantic, procedural, working |
| **Configurable** | Can disable auto-recall/capture via env vars |
| **Agent Contexts** | Structured metadata storage |

## @supermemory Advantages

| Advantage | Description |
|-----------|-------------|
| **Official Backing** | From Supermemory team |
| **User Profiles** | Auto-built persistent profiles |
| **Established** | More downloads, longer track record |

## Links

### vanar-neutron-memory
- **ClawHub:** https://clawhub.ai/naeemmaliki036/vanar-neutron-memory
- **GitHub:** https://github.com/naeemmaliki036/NeutronMemoryBot
- **Get API Keys:** https://openclaw.vanarchain.com/

### @supermemory/openclaw-supermemory
- **npm:** https://www.npmjs.com/package/@supermemory/openclaw-supermemory
- **GitHub:** https://github.com/supermemoryai/openclaw-supermemory
- **Docs:** https://supermemory.ai/docs/integrations/openclaw
