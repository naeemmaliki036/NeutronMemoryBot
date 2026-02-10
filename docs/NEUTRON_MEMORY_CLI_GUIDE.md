# Neutron Memory CLI - Quick Reference

Shorthand used below:

```
NM=~/.claude/skills/vanar-neutron-memory/scripts/neutron-memory.sh
```

Run `NM=~/.claude/skills/vanar-neutron-memory/scripts/neutron-memory.sh` once per terminal session, then use `$NM` in all commands.

---

## Test Connection

```bash
$NM test
```

```
Testing Neutron API connection...
API connection successful
{ "results": [] }
```

---

## Save a Memory

```bash
$NM save "TEXT" "TITLE"
```

**Examples:**

```bash
# Save a project note
$NM save "The API rate limit is 100 requests per minute" "API Rate Limits"

# Save a decision
$NM save "We chose PostgreSQL over MongoDB for the user service because we need ACID transactions" "DB Decision"

# Save a code snippet
$NM save "To fix CORS: app.use(cors({ origin: 'https://example.com' }))" "CORS Fix"

# Title is optional (defaults to 'Untitled')
$NM save "Remember to update the SSL cert before March 2026"
```

**Response:**

```json
{
  "jobIds": ["5099"],
  "message": "Created 1 seed processing jobs"
}
```

---

## Search Memories

```bash
$NM search "QUERY" [LIMIT] [THRESHOLD]
```

- **LIMIT** - max results (default: 10)
- **THRESHOLD** - similarity cutoff 0-1 (default: 0.5, lower = more results)

**Examples:**

```bash
# Basic search
$NM search "database"

# Get top 3 results
$NM search "rate limits" 3

# Broader search with lower threshold
$NM search "deployment" 10 0.3

# Narrow search with high threshold
$NM search "CORS configuration" 5 0.7
```

**Response:**

```json
{
  "results": [
    {
      "seedId": "9e8512e5-2359-4b77-944d-22c23f2981ae",
      "content": "# Title: API Rate Limits\n\nThe API rate limit is 100 requests per minute",
      "similarity": 0.68,
      "title": "API Rate Limits",
      "type": "text",
      "searchMethod": "multimodal"
    }
  ]
}
```

---

## Agent Contexts

### Create a context

```bash
$NM context-create "AGENT_ID" "MEMORY_TYPE" 'JSON_DATA' 'JSON_METADATA'
```

Memory types: `episodic`, `semantic`, `procedural`, `working`

```bash
# Save a user preference
$NM context-create "my-agent" "semantic" '{"preference":"dark mode","user":"alice"}'

# Save a workflow step
$NM context-create "my-agent" "procedural" '{"step":"deploy","cmd":"git push origin main"}' '{"project":"openclaw"}'
```

### List contexts

```bash
# All contexts
$NM context-list

# For a specific agent
$NM context-list "my-agent"
```

### Get a specific context

```bash
$NM context-get "abc-123-def-456"
```

---

## Credentials

Stored at `~/.config/neutron/credentials.json`:

```json
{
  "api_key": "nk_your_key_here",
  "agent_id": "your-agent-uuid",
  "your_agent_identifier": "1"
}
```

Get API keys at: https://openclaw.vanarchain.com/
