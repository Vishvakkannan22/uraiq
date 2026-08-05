-- UraiQ — milestone 1: one-to-one messaging.
--
-- Scope note: no posts, feeds, reels, communities, groups, stories or media.
-- The schema does not model them, and deliberately does not leave columns lying
-- around for them either — a nullable column nobody writes is a worse record of
-- intent than a migration written when the feature exists.
--
-- Every id is a ULID (26 chars, Crockford base32). ULIDs sort lexicographically
-- by creation time, which is what makes keyset pagination and read-cursor
-- comparison plain string operations against the primary key.
--
-- Timestamps are INTEGER milliseconds since epoch (Date.now()), not SQLite
-- datetimes: one representation, no parsing, no timezone.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- users ---

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  -- Lowercased copy used for lookup and uniqueness, so "A@b.com" and "a@b.com"
  -- cannot both register while the original casing is still shown back.
  email_norm    TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  -- Stored per row so the cost can be raised later and existing hashes
  -- upgraded on the owner's next successful login.
  password_iter INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_users_email_norm ON users (email_norm);

-- Profile is split from credentials so the row read on every conversation
-- render carries no password material at all.
CREATE TABLE user_profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  handle          TEXT NOT NULL,
  handle_norm     TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  bio             TEXT,
  -- CSS gradient string; the client renders initials on it. No avatar images
  -- in this milestone (R2 is a later step).
  avatar_gradient TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #C084FC, #4F46E5)',
  initials        TEXT NOT NULL,
  -- Durable fallback. Live presence lives in KV and expires; this does not.
  last_seen_at    INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_profiles_handle_norm ON user_profiles (handle_norm);
-- Serves the prefix search on display name; see users.repo.searchProfiles for
-- why that search is a prefix and not a substring.
CREATE INDEX idx_profiles_display_name ON user_profiles (display_name);

-- -------------------------------------------------------- refresh tokens ---

CREATE TABLE refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- SHA-256 of the opaque token. A dump of this table cannot be replayed as a
  -- session, which is the only reason storing refresh tokens is acceptable.
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_refresh_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_user ON refresh_tokens (user_id, revoked_at);

-- -------------------------------------------------------- conversations ---

CREATE TABLE conversations (
  id              TEXT PRIMARY KEY,
  -- Sorted "userA:userB". Both participants derive the same key, so opening a
  -- thread is idempotent no matter who does it first or whether they race.
  direct_key      TEXT NOT NULL,
  created_by      TEXT NOT NULL REFERENCES users (id),
  last_message_id TEXT,
  last_message_at INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

-- Partial index. NOTE for anyone writing an upsert against it: SQLite will not
-- match a bare `ON CONFLICT (direct_key)` to a partial index — the conflict
-- target must repeat this predicate, or the statement fails at runtime with
-- "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint".
CREATE UNIQUE INDEX idx_conversations_direct_key
  ON conversations (direct_key) WHERE direct_key IS NOT NULL;

CREATE TABLE conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Denormalised so the conversation list does not have to count messages.
  -- Incremented on send for everyone but the sender; zeroed on read.
  unread_count    INTEGER NOT NULL DEFAULT 0,
  archived        INTEGER NOT NULL DEFAULT 0,
  muted_until     INTEGER,
  joined_at       INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

-- Drives the conversation list: "every conversation for this user". The
-- primary key above already covers the other direction.
CREATE INDEX idx_members_user ON conversation_members (user_id, conversation_id);

-- ------------------------------------------------------------- messages ---

CREATE TABLE messages (
  id                  TEXT PRIMARY KEY,
  conversation_id     TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id           TEXT NOT NULL REFERENCES users (id),
  body                TEXT,
  reply_to_id         TEXT REFERENCES messages (id),
  -- Client-generated idempotency key. A retry after a flaky response returns
  -- the original message instead of sending it twice.
  client_id           TEXT,
  -- 'blocked' never appears on an inserted row: a blocked message is refused
  -- before it is written. The value exists for a second-pass review that could
  -- retract an already-delivered message.
  moderation_state    TEXT NOT NULL DEFAULT 'clear'
                      CHECK (moderation_state IN ('clear', 'flagged', 'blocked')),
  moderation_standard TEXT,
  -- First time the recipient's device acknowledged receipt. Distinct from read:
  -- the device has it, a human has not necessarily seen it.
  delivered_at        INTEGER,
  created_at          INTEGER NOT NULL,
  edited_at           INTEGER,
  -- Soft delete. The row anchors replies and read cursors; the body is nulled.
  deleted_at          INTEGER
);

-- The one index the message list needs: newest-first within a conversation,
-- which keyset pagination then walks with `id < ?cursor`.
CREATE INDEX idx_messages_conversation ON messages (conversation_id, id DESC);

-- Partial: only rows that actually carry a client id take part in uniqueness,
-- so the many NULLs cost nothing and cannot collide with each other.
CREATE UNIQUE INDEX idx_messages_client_id
  ON messages (sender_id, client_id) WHERE client_id IS NOT NULL;

-- Serves the catch-up query a socket runs on connect.
CREATE INDEX idx_messages_undelivered
  ON messages (conversation_id, sender_id) WHERE delivered_at IS NULL;

-- -------------------------------------------------------- read receipts ---

-- One cursor per member, not one row per message read. In a 1:1 thread
-- "read up to here" is the whole story, and it turns an unbounded write per
-- message into a single upsert per read event.
CREATE TABLE read_receipts (
  conversation_id      TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id              TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  last_read_message_id TEXT NOT NULL,
  last_read_at         INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);
