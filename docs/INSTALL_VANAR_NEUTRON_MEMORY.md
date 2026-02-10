# Install & Configure vanar-neutron-memory Skill

## Context
The user deleted the old `neutron-agent-memory` skill from `~/.claude/skills/` and wants to install the `vanar-neutron-memory` skill from clawhub.ai with new API credentials. The `clawhub` CLI has a Node.js compatibility error, so we'll install manually from the local skill files already in the repo.

## Steps

### 1. Install skill to `~/.claude/skills/`
Copy the skill directory from the repo to the Claude skills location:
- Source: `/Users/mna036/ai-bytes/openclaw/skills/vanar-neutron-memory/`
- Destination: `/Users/mna036/.claude/skills/vanar-neutron-memory/`
- This includes `SKILL.md`, `hooks/`, and `scripts/`

### 2. Set up credentials file
Create `~/.config/neutron/credentials.json` with the new credentials:
- API Key: `nk_ab5feba24ec938116663b2ab5a14fbb03e4ae3fea791c88f4ac319dea44fb046`
- Agent ID: `d0899a7a-afa0-439a-89a2-935597543b1d`
- User identifier: `1` (default)

### 3. Update `openclaw.json`
Update `/Users/mna036/ai-bytes/openclaw/openclaw.json` with the new credentials:
- New API key and agent ID

### 4. Test the API connection
Run `./scripts/neutron-memory.sh test` to verify connectivity.

### 5. Test save & search
- Save a test seed
- Search for it semantically
- Verify results come back

## Verification
- `neutron-memory.sh test` returns "API connection successful"
- Save a seed and retrieve it via semantic search
- Confirm the skill is registered in `~/.claude/skills/`
