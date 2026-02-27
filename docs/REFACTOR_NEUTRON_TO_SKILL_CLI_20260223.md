# Plan: Replace Direct Neutron API Calls with Skill CLI

**Date:** 2026-02-23

## Context

The project currently makes direct HTTP `fetch()` calls to `api-neutron.vanarchain.com` from multiple places (dashboard API routes, webhook server, seed utility library). The goal is to **remove all direct Neutron API consumption** and instead route everything through the `vanar-neutron-memory` skill's CLI (`neutron-memory.sh`), which already handles credentials, API calls, and output formatting.

The skill's hooks (`pre-tool-use.sh`, `post-tool-use.sh`) already call the API as part of the skill — these stay as-is.

---

## Approach

Create a thin Node.js wrapper around the skill CLI (`neutron-memory.sh`) using `child_process.execFile`, then replace all direct `fetch()` calls with wrapper calls.

---

## Files to Create

### 1. `neutron-dashboard/src/lib/neutron-cli.ts` (NEW)
TypeScript wrapper that shells out to `neutron-memory.sh`. Provides:
- `saveSeed(text, title)` — calls `neutron-memory.sh save`
- `searchSeeds(query, limit, threshold)` — calls `neutron-memory.sh search`
- `createContext(agentId, memoryType, data, metadata)` — calls `neutron-memory.sh context-create`
- `listContexts(agentId?)` — calls `neutron-memory.sh context-list`
- `getContext(contextId)` — calls `neutron-memory.sh context-get`
- `saveThreadAsSeed(postContent, comments, botReply, replyAuthor)` — formats thread text, then calls `saveSeed()`

Uses `execFile` (not `exec`) to avoid shell injection. Passes `process.env` so the CLI picks up `NEUTRON_API_KEY`/`NEUTRON_AGENT_ID` from `.env.local`.

### 2. `webhook-server/neutron-cli.js` (NEW)
Plain JavaScript (ESM) version of the same wrapper for the Express server. Same functions: `saveSeed`, `searchSeeds`, `createContext`, `listContexts`, `getContext`.

Script path: `resolve(__dirname, '..', 'skills', 'vanar-neutron-memory', 'scripts', 'neutron-memory.sh')`

---

## Files to Modify

### 3. `neutron-dashboard/src/lib/config.ts`
- **Remove** the `neutron` block (apiKey, agentId, baseUrl) — no longer needed
- **Keep** the `moltbook` block (still used for Moltbook API calls)

### 4. `neutron-dashboard/src/app/api/neutron/memories/route.ts`
- Replace `fetch()` to `/agent-contexts` with `listContexts('NeutronMemoryBot')` (GET)
- Replace `fetch()` to `/agent-contexts` with `createContext(...)` (POST)
- Replace `saveTextAsSeed()` with `saveSeed()` (fire-and-forget)
- Remove imports of `config` (neutron part) and `neutron-seeds`

### 5. `neutron-dashboard/src/app/api/neutron/seeds/route.ts`
- Replace `querySeeds()` import with `searchSeeds()` from `neutron-cli`

### 6. `neutron-dashboard/src/app/api/trigger/check-comments/route.ts`
- Replace inline `saveToMemory()` (direct fetch to `/agent-contexts`) with `createContext()`
- Change `saveThreadAsSeed` import from `neutron-seeds` to `neutron-cli`

### 7. `neutron-dashboard/src/app/api/webhook/moltbook/route.ts`
- Replace inline `saveToMemory()` with `createContext()`
- Change `saveThreadAsSeed` import from `neutron-seeds` to `neutron-cli`

### 8. `webhook-server/server.js`
- Add `import { saveSeed, createContext } from './neutron-cli.js'`
- **Remove** `CONFIG.neutron` block (including hardcoded API key fallback)
- Replace `saveToMemory()` body: use `createContext('NeutronMemoryBot', 'episodic', {...})`
- Replace `saveThreadAsSeed()` body: format thread text, then call `saveSeed(text, title)`

---

## Files to Delete

### 9. `neutron-dashboard/src/lib/neutron-seeds.ts`
Fully replaced by `neutron-cli.ts`. All functions (`saveThreadAsSeed`, `saveTextAsSeed`, `querySeeds`, `sendSeed`) are now in the CLI wrapper.

---

## Implementation Order

1. Create `neutron-dashboard/src/lib/neutron-cli.ts`
2. Create `webhook-server/neutron-cli.js`
3. Update `neutron-dashboard/src/app/api/neutron/seeds/route.ts` (simplest route)
4. Update `neutron-dashboard/src/app/api/neutron/memories/route.ts`
5. Update `neutron-dashboard/src/app/api/webhook/moltbook/route.ts`
6. Update `neutron-dashboard/src/app/api/trigger/check-comments/route.ts`
7. Delete `neutron-dashboard/src/lib/neutron-seeds.ts`
8. Update `neutron-dashboard/src/lib/config.ts` (remove neutron block)
9. Update `webhook-server/server.js`

---

## Verification

1. **Grep check** — confirm zero direct API references in app code:
   ```bash
   grep -r "api-neutron.vanarchain.com" --include="*.ts" --include="*.js" neutron-dashboard/src/ webhook-server/
   ```
   Should return no results.

2. **CLI test** — verify skill CLI works:
   ```bash
   ./skills/vanar-neutron-memory/scripts/neutron-memory.sh test
   ```

3. **Dashboard routes** — start Next.js dev server and test:
   - `GET /api/neutron/memories` — returns memory list
   - `POST /api/neutron/memories` — creates memory + seed
   - `POST /api/neutron/seeds` — semantic search works
   - `POST /api/trigger/check-comments` — processes comments

4. **Webhook server** — start Express server and test:
   - `GET /health` — server running
   - `POST /trigger/check-all` — triggers full flow
