import type { ProfileRow, UserRow } from '../types'
import type { Db } from './client'
import { placeholders } from './client'
import { SEARCH_LIMIT } from '../config'

/** Every users / user_profiles query in the API. */

export function findUserByEmail(db: Db, emailNorm: string) {
  return db.first<UserRow>(
    'users.findByEmail',
    db.prepare('SELECT * FROM users WHERE email_norm = ?1').bind(emailNorm)
  )
}

export function emailExists(db: Db, emailNorm: string) {
  return db.first<{ id: string }>(
    'users.emailExists',
    db.prepare('SELECT id FROM users WHERE email_norm = ?1').bind(emailNorm)
  )
}

export function handleExists(db: Db, handleNorm: string) {
  return db.first<{ user_id: string }>(
    'users.handleExists',
    db.prepare('SELECT user_id FROM user_profiles WHERE handle_norm = ?1').bind(handleNorm)
  )
}

export function findProfile(db: Db, userId: string) {
  return db.first<ProfileRow>(
    'users.findProfile',
    db.prepare('SELECT * FROM user_profiles WHERE user_id = ?1').bind(userId)
  )
}

/** Profile only if the account is still usable — suspended users are invisible. */
export function findActiveProfile(db: Db, userId: string) {
  return db.first<ProfileRow>(
    'users.findActiveProfile',
    db
      .prepare(
        `SELECT p.* FROM user_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE p.user_id = ?1 AND u.status = 'active'`
      )
      .bind(userId)
  )
}

export function findProfileByHandle(db: Db, handleNorm: string) {
  return db.first<ProfileRow>(
    'users.findByHandle',
    db
      .prepare(
        `SELECT p.* FROM user_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE p.handle_norm = ?1 AND u.status = 'active'`
      )
      .bind(handleNorm)
  )
}

export function findProfiles(db: Db, userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve([])
  return db.all<ProfileRow>(
    'users.findProfiles',
    db
      .prepare(`SELECT * FROM user_profiles WHERE user_id IN (${placeholders(userIds.length)})`)
      .bind(...userIds)
  )
}

/**
 * Prefix match on the normalised handle and display name, which the index on
 * `handle_norm` already serves.
 *
 * Deliberately not a substring search: `LIKE '%q%'` cannot use an index and
 * becomes a full table scan as soon as the user table is large.
 *
 * TODO: when fuzzy or mid-word search is needed, mirror handles into a D1 FTS5
 * virtual table and query that — do NOT relax this to a leading wildcard.
 */
export function searchProfiles(db: Db, query: string, excludeUserId: string) {
  return db.all<ProfileRow>(
    'users.search',
    db
      .prepare(
        `SELECT p.* FROM user_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE u.status = 'active'
            AND p.user_id != ?2
            AND (p.handle_norm LIKE ?1 OR LOWER(p.display_name) LIKE ?1)
          ORDER BY p.handle_norm
          LIMIT ?3`
      )
      .bind(`${query}%`, excludeUserId, SEARCH_LIMIT)
  )
}

export function insertUserAndProfile(
  db: Db,
  user: {
    id: string
    email: string
    emailNorm: string
    hash: string
    salt: string
    iterations: number
    handle: string
    displayName: string
    initials: string
    now: number
  }
) {
  return db.batch('users.insert', [
    db
      .prepare(
        `INSERT INTO users
           (id, email, email_norm, password_hash, password_salt, password_iter, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`
      )
      .bind(user.id, user.email, user.emailNorm, user.hash, user.salt, user.iterations, user.now),
    db
      .prepare(
        `INSERT INTO user_profiles
           (user_id, handle, handle_norm, display_name, initials, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`
      )
      .bind(user.id, user.handle, user.handle.toLowerCase(), user.displayName, user.initials, user.now),
  ])
}

export function updateProfileFields(db: Db, userId: string, sets: string[], binds: unknown[]) {
  return db.run(
    'users.updateProfile',
    db
      .prepare(`UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = ?${binds.length}`)
      .bind(...binds)
  )
}

export function touchLastSeen(db: Db, userId: string, at: number) {
  return db.run(
    'users.touchLastSeen',
    db.prepare('UPDATE user_profiles SET last_seen_at = ?1 WHERE user_id = ?2').bind(at, userId)
  )
}
