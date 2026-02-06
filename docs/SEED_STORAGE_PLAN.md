# Plan: Add Seed Storage for All Agent Interactions

## Goal
Store every agent interaction as a Neutron **seed** (alongside existing agent-contexts) so that semantic search via `POST /seeds/query` returns meaningful results from past conversations.

## Key Design Decision
**Store full thread snapshots** — each seed contains the original post + all comments up to the current interaction. This gives semantic search complete conversation context, not isolated fragments. Each new interaction creates a new seed snapshot (append-only, no delete/update needed).

## Seed Text Format
```
Thread: {post title or first 100 chars}
Date: {timestamp}

Post: {full post content}

Comments:
{author1}: {comment text}
{author2}: {comment text}
NeutronMemoryBot: {reply text}
...
```

## Technical Notes
- Seeds API uses **multipart/form-data** (not JSON)
- Native `FormData` + `fetch` (Node 18+) — no new dependencies
- Seeds are async (return jobIds, 5-30s processing) — fire-and-forget is fine

---

## Files Created

### 1. `neutron-dashboard/src/lib/neutron-seeds.ts`
Shared utility with functions:
- `saveThreadAsSeed(postContent, comments, botReply)` — formats full thread, sends as seed via multipart form-data
- `saveTextAsSeed(text, title)` — generic seed storage for dashboard memory creation
- `querySeeds(query, limit, threshold)` — wraps `POST /seeds/query`

### 2. `neutron-dashboard/src/app/api/neutron/seeds/route.ts`
POST endpoint exposing `querySeeds()` to the dashboard frontend.

---

## Files Modified

### 3. `webhook-server/server.js`
- Add `saveThreadAsSeed(postContent, comments, botReply, author)` function (inline JS — can't import TS)
- In `handleNewComment()`: fetch the full post first, then pass thread context to seed save
- In `checkAndReplyToComments()`: already fetches full post + comments — pass them to seed save after each reply
- Keep existing `saveToMemory()` for agent-context (structured metadata)

### 4. `neutron-dashboard/src/app/api/trigger/check-comments/route.ts`
- Import `saveThreadAsSeed` from `@/lib/neutron-seeds`
- Already has access to full post data + all comments in the loop — pass thread context when saving

### 5. `neutron-dashboard/src/app/api/webhook/moltbook/route.ts`
- Import `saveThreadAsSeed` from `@/lib/neutron-seeds`
- Webhook data may only have the single comment — fetch the full post to get thread context, then save as seed

### 6. `neutron-dashboard/src/app/api/neutron/memories/route.ts`
- Import `saveTextAsSeed` from `@/lib/neutron-seeds`
- In POST handler, also save memory data as a seed (fire-and-forget)

### 7. `neutron-dashboard/src/app/page.tsx`
- Add "Semantic Search" section with search input + results display
- New state: `seedQuery`, `seedResults`, `searching`
- Calls `POST /api/neutron/seeds` and displays results with similarity scores

### 8. `skills/neutron-agent-memory/SKILL.md`
- Add "Interaction Seeds" section documenting the dual-storage pattern and search example

---

## No New Dependencies
Uses native `FormData` and `fetch` (Node 18+ globals, already used throughout).

## Verification
1. Run the dashboard: `cd neutron-dashboard && npm run dev`
2. Trigger a comment check — verify console logs "Seed saved, jobIds: [...]"
3. Wait ~30 seconds for seed processing
4. Use the Semantic Search box to search for conversation content
5. Verify results contain full thread context with similarity scores
