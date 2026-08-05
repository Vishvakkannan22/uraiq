# UraiQ API — 1:1 messaging

Cloudflare Workers · D1 · KV · Durable Objects · Workers AI · Wrangler v4 · TypeScript

Milestone 1 is **direct messaging only**. No feed, reels, groups, communities,
stories or media exist in this schema or these routes.

**Not used, on purpose:**

| Resource | Why not |
|---|---|
| R2 | Media sharing is a later milestone. No attachments table, no upload route. |
| Queues | Not in the provisioned resource list, and it needs a paid plan. The only job it carried was push notification fan-out, which is a documented TODO in `services/realtime.service.ts`. |

Workers AI **is** used, for the moderation agent. It needs no provisioning — no
id, no create command — and the binding is optional in `Env`, so the Worker
still boots without it and the classifier degrades to its rule net.

---

## Quick start (no Cloudflare account needed)

`wrangler dev` simulates D1, KV and Durable Objects locally. Only Workers AI
reaches the real Cloudflare API, and only when a message is moderated.

```bash
cd worker
npm install
npm run db:local      # apply migrations to the local D1
npm run dev           # http://127.0.0.1:8787
```

Then in the project root:

```bash
npm run dev           # Vite reads VITE_API_URL from .env
```

`GET /health` returns the full route table, which is the fastest way to confirm
the Worker is up and matching what the client expects.

---

## Deploying

```bash
npx wrangler d1 create uraiq              # -> database_id
npx wrangler kv namespace create KV       # -> id
```

Paste both ids into `wrangler.jsonc` (they are marked `TODO_*`), then:

```bash
npx wrangler secret put JWT_SECRET        # 32+ random bytes
npm run db:remote
npm run deploy
```

Durable Objects require the **Workers Paid** plan ($5/month). Everything else
here is on the free tier.

Set `ALLOWED_ORIGINS` in `wrangler.jsonc` to your real front-end origin before
deploying — it defaults to localhost, and the API sends an `Authorization`
header, so a wildcard is not an option.

---

## Every file, and why it exists

### Entry and routing

| File | Purpose |
|---|---|
| `src/index.ts` | The composition root. Registers every route, resolves auth, applies CORS, and is the single place a thrown error becomes a response. Also handles the WebSocket upgrade, which bypasses the router and goes straight to the Durable Object. |
| `src/router.ts` | ~70-line segment-matching router. No regex, no dependency. Registration order matters: `/users/search` must be registered before `/users/:handle`. |
| `src/config.ts` | Every tunable — token TTLs, page sizes, rate limits, cache TTLs. Constants rather than `vars` because changing one should be a reviewable diff, not a dashboard edit with no rollback. |
| `src/types.ts` | `Env` plus the row types (snake_case, as D1 returns them) and the wire DTOs. Kept separate so a column rename is not automatically a breaking API change. |

### `src/auth/` — identity

| File | Purpose |
|---|---|
| `password.ts` | PBKDF2-SHA256 (210k iterations) on WebCrypto, plus base64 helpers and a constant-time compare. Not Argon2: that needs a WASM bundle and real memory, both of which Workers price and limit. The iteration count is stored per row so it can be raised later. |
| `jwt.ts` | HS256 sign and verify. The algorithm is never read from the token header — that is the `alg: none` confusion attack. |
| `tokens.ts` | Access + refresh issuance and rotation. Refresh tokens are opaque and only their SHA-256 is stored, so a dump of the table cannot be replayed as a session. |
| `session.ts` | Resolves the caller from an `Authorization` header, with a KV cache keyed by token hash, and a tombstone list that makes logout take effect immediately instead of at token expiry. Shared with the WebSocket handshake, which passes the token as a subprotocol. |

### `src/db/` — data access

| File | Purpose |
|---|---|
| `client.ts` | Thin D1 wrappers. Attaches retry to reads (always safe to repeat) and a label to every query so a slow statement is identifiable in the logs. Writes deliberately do **not** auto-retry. |
| `users.repo.ts` | Every `users` / `user_profiles` query. Note `searchProfiles`: a prefix match, not a substring — `LIKE '%q%'` cannot use an index. |
| `conversations.repo.ts` | Conversation and membership queries. `listForUser` returns the whole list in one query via a self-join. `createDirect` documents why the `ON CONFLICT` target repeats the partial index predicate. |
| `messages.repo.ts` | Message reads, keyset pagination, the atomic send batch, soft delete, and delivery stamping. |
| `receipts.repo.ts` | Read cursors — one row per member, not one per message read. The upsert guard is what stops an out-of-order request walking the cursor backwards. |

### `src/services/` — business logic

| File | Purpose |
|---|---|
| `auth.service.ts` | Signup, login, refresh, current user. Login does a throwaway hash on an unknown email so the endpoint is not a user-enumeration oracle. |
| `users.service.ts` | Search, profile lookup, profile update. Validates the avatar gradient because it ends up in a CSS `style` attribute. |
| `conversations.service.ts` | List, idempotent create, single fetch. `assertMember` is the authorisation check every conversation-scoped route runs. |
| `messages.service.ts` | Send, edit, delete, mark read, mark delivered. Moderation runs **before** persistence — a blocked message is never written and never delivered. |
| `moderation.service.ts` | The safety agent. Llama Guard 3 and a local rule net run in parallel; the strictest verdict wins. See the long comment for why the rules are not a fallback. |
| `presence.service.ts` | Online / last-seen / profile cache, all on KV. Presence expiring **is** the offline signal, which is what makes a killed browser tab eventually read as away. |
| `realtime.service.ts` | Fan-out from REST into a conversation's Durable Object. Best-effort by design: a message is durable once its D1 write commits, so a failed broadcast must not fail the send. |

### `src/middleware/`

| File | Purpose |
|---|---|
| `cors.ts` | Exact-origin CORS. No wildcard. |
| `errors.ts` | The one place an exception becomes a response. `HttpError` passes through; anything else is logged in full and answered with a generic 500, because a raw exception message can carry SQL or another user's data. |
| `rateLimit.ts` | Fixed-window limiting on KV. The comment is explicit about what this is not — KV is eventually consistent, so the ceiling is approximate. |
| `requireAuth.ts` | Narrows `ctx.auth` from nullable. Makes a mis-flagged route a 401 instead of a crash. |

### `src/routes/` — HTTP handlers

`auth.routes.ts`, `users.routes.ts`, `conversations.routes.ts`,
`messages.routes.ts`, `moderation.routes.ts`.

Each one validates input, applies its rate limit, calls a service, and shapes
the response. No business logic and no SQL.

### `src/ws/` — realtime

| File | Purpose |
|---|---|
| `ConversationRoom.ts` | One Durable Object per conversation. Uses the **WebSocket Hibernation API**, so an idle room costs nothing while staying connected. Owns typing, presence, delivery acknowledgement and read relay. |
| `protocol.ts` | The wire protocol, shared by the DO and the client. Adding an event cannot break a client that does not know it. |

### `src/utils/`

| File | Purpose |
|---|---|
| `errors.ts` | `HttpError` and its constructors. |
| `http.ts` | `json`, `noContent`, `readJson`, `clientIp`. |
| `ids.ts` | ULID generation and validation. ULIDs sort lexicographically by time, which is what makes keyset pagination and read-cursor comparison plain string operations. |
| `logger.ts` | Structured JSON logging. Workers Logs indexes JSON, so one object per line is searchable by field. Never logs a password, token or message body. |
| `retry.ts` | Retries transient failures only. Explicitly refuses to retry constraint violations, which are deterministic. |
| `validate.ts` | Hand-written validators instead of Zod — nine request bodies do not justify 14kB in the bundle and a cold-start cost. Every failure is a 400 naming the field. |

### `migrations/`

`0001_init.sql` — seven tables. Every non-obvious decision is commented in the
file itself: why `direct_key` is a sorted pair, why the unique indexes are
partial, why delete is soft, why read receipts are a cursor.

---

## API

All routes return `{ error: { code, message, details, requestId } }` on failure.
`X-Request-Id` is on every response, including errors.

### Auth

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/signup` | – | `{ email, password, name, handle? }` |
| POST | `/auth/login` | – | `{ email, password }` |
| POST | `/auth/refresh` | – | `{ refreshToken }` |
| POST | `/auth/logout` | optional | `{ refreshToken? }` |
| GET | `/auth/me` | ✓ | – |

Signup and login return `{ token, refreshToken, expiresIn, user }`.

Logout with a `refreshToken` revokes that one session. Without it, every session
for the user is revoked. Either way the presented access token is tombstoned in
KV and stops working immediately.

### Users

| Method | Path | Notes |
|---|---|---|
| GET | `/users/search?q=` | Prefix match on handle and display name. Returns `[]` below 2 characters. |
| GET | `/users/:handle` | |
| PATCH | `/users/me` | `{ displayName?, bio?, avatarGradient? }` |

### Conversations

| Method | Path | Notes |
|---|---|---|
| GET | `/conversations` | Newest first, 200 max. |
| POST | `/conversations` | `{ peerId }`. Idempotent — **201** when created, **200** when it already existed. |
| GET | `/conversations/:id` | |

### Messages

| Method | Path | Notes |
|---|---|---|
| GET | `/conversations/:id/messages?before=&limit=` | Keyset pagination. Also returns `peerLastReadMessageId` / `peerLastReadAt`. |
| POST | `/conversations/:id/messages` | `{ body, replyToId?, clientId? }` |
| PATCH | `/conversations/:id/messages/:messageId` | `{ body }` — re-moderated. |
| DELETE | `/conversations/:id/messages/:messageId` | Soft delete, 204. |
| POST | `/conversations/:id/read` | `{ lastReadMessageId }` |

**Send returns one of two shapes**, both HTTP 2xx:

```jsonc
// delivered (201, or 200 on an idempotent repeat)
{ "status": "sent", "message": { … }, "moderation": null }

// refused — nothing was written
{ "status": "blocked",
  "moderation": { "severity": "blocked", "standard": "threats",
                  "reason": "…", "suggestions": ["…"] } }
```

A refusal is **not** a 4xx: the client renders the verdict and the suggested
rewrites, and an error status would send it down the retry path instead.

### Agents

| Method | Path | Notes |
|---|---|---|
| POST | `/agents/moderate` | `{ text }`. The composer's pre-send check. Same classifier as the send path, so a warning and the enforcement can never disagree. |

### WebSocket

`GET /conversations/:id/ws`, with the token as a subprotocol:

```js
new WebSocket(url, ['bearer', accessToken])
```

Browsers cannot set headers on a WebSocket handshake, and a token in the query
string ends up in access logs. The server echoes `Sec-WebSocket-Protocol: bearer`
back — without that the browser rejects the connection.

**Server → client:** `ready`, `message`, `message.updated`, `message.deleted`,
`typing`, `presence`, `delivered`, `read`, `pong`, `error`

**Client → server:** `ping`, `typing`, `read`, `delivered`

---

## Delivered vs read

Two distinct states, tracked separately:

- **delivered** — the recipient's device acknowledged the message over its
  socket. Stamped once on `messages.delivered_at`; a reconnect that replays the
  acknowledgement cannot move it. On connect, anything that arrived while the
  recipient was offline is stamped and the sender is told.
- **read** — the recipient's read cursor passed the message. One row per member
  in `read_receipts`, and it only ever moves forward.

---

## Known gaps

Deliberate, and each is marked with a TODO at the relevant call site.

1. **The rule net is three regexes.** It is doing load-bearing work: Llama Guard
   is tuned for the MLCommons *hazard* taxonomy, so it returns SAFE for ordinary
   insults. Verified against a live endpoint. Either the fine-tuned agent
   replaces this or it needs to become a real lexicon before launch.
2. **No push notifications.** Needs a provider decision and a device-token
   table. Everything the job needs is available at the call site.
3. **Archive and mute are not persisted.** The columns exist; no route writes
   them, so the toggles are session-only.
4. **No reactions endpoint.** Session-only on the client.
5. **Signup has no CAPTCHA.** A per-IP rate limit is a speed bump, not a
   control — put Turnstile in front of it.
6. **Search is prefix-only.** Do not fix this by adding a leading wildcard; use
   a D1 FTS5 table.
7. **Not end-to-end encrypted, and cannot be.** The server reads every message
   in order to moderate it. Encrypted in transit and at rest is accurate; the
   UI copy was corrected to say that instead.
