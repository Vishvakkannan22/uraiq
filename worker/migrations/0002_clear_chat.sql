-- Clear chat: hide history for one participant without touching the other's
-- copy or the underlying rows.
--
-- A single per-member cursor rather than a delete or a per-message "hidden"
-- flag: in a 1:1 thread "cleared up to here" is the whole story, the same
-- reasoning that already made read receipts a cursor instead of a row per
-- message. ULIDs sort lexicographically, so "hidden" is just `id <= cursor`.
--
-- NULL means "nothing cleared" — every existing row keeps that default, so
-- this migration changes no visible behaviour until a user clears a chat.

ALTER TABLE conversation_members ADD COLUMN cleared_before_id TEXT;
