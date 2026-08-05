import type { Env, PublicUser } from '../types'
import type { Db } from '../db/client'
import * as users from '../db/users.repo'
import { badRequest, notFound } from '../utils/errors'
import { initialsFrom } from '../utils/ids'
import { MAX_BIO_LENGTH, MIN_SEARCH_LENGTH } from '../config'
import { invalidateProfile, toPublicUser, toPublicUsers } from './presence.service'

export async function search(env: Env, db: Db, query: string, viewerId: string): Promise<PublicUser[]> {
  const q = query.trim().toLowerCase()
  /* The client mirrors this floor, so an empty result below it reads as "keep
     typing" rather than "nobody found". */
  if (q.length < MIN_SEARCH_LENGTH) return []

  const profiles = await users.searchProfiles(db, q, viewerId)
  return toPublicUsers(env, profiles)
}

export async function getByHandle(env: Env, db: Db, handle: string): Promise<PublicUser> {
  const profile = await users.findProfileByHandle(db, handle.toLowerCase())
  if (!profile) throw notFound('No such account')
  return toPublicUser(env, profile)
}

export async function updateProfile(
  env: Env,
  db: Db,
  userId: string,
  patch: { displayName?: string; bio?: string; avatarGradient?: string }
): Promise<PublicUser> {
  const sets: string[] = []
  const binds: unknown[] = []

  if (patch.displayName !== undefined) {
    sets.push(`display_name = ?${binds.length + 1}`)
    binds.push(patch.displayName)
    /* Initials are derived, never sent by the client — otherwise they drift
       from the name they are supposed to abbreviate. */
    sets.push(`initials = ?${binds.length + 1}`)
    binds.push(initialsFrom(patch.displayName))
  }

  if (patch.bio !== undefined) {
    sets.push(`bio = ?${binds.length + 1}`)
    binds.push(patch.bio.slice(0, MAX_BIO_LENGTH))
  }

  if (patch.avatarGradient !== undefined) {
    if (!isSafeGradient(patch.avatarGradient)) throw badRequest('Invalid avatar style')
    sets.push(`avatar_gradient = ?${binds.length + 1}`)
    binds.push(patch.avatarGradient)
  }

  if (sets.length === 0) throw badRequest('Nothing to update')

  sets.push(`updated_at = ?${binds.length + 1}`)
  binds.push(Date.now())
  binds.push(userId)

  await users.updateProfileFields(db, userId, sets, binds)
  await invalidateProfile(env, userId)

  const profile = await users.findProfile(db, userId)
  if (!profile) throw notFound()
  return toPublicUser(env, profile)
}

/**
 * The gradient is interpolated straight into a `style` attribute by the client,
 * so it is bounded and character-restricted here rather than trusted. Not an
 * XSS vector through React's style prop, but it is user input that ends up in
 * CSS, and `url(...)` in a background is a request to an arbitrary host.
 */
function isSafeGradient(value: string): boolean {
  return value.length <= 120 && /^[a-zA-Z0-9 ,.#()%-]+$/.test(value) && !/url|expression|@import/i.test(value)
}
