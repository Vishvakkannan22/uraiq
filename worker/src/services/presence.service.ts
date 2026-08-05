import type { Env, ProfileRow, PublicUser } from '../types'
import {
  LAST_SEEN_TTL_SECONDS,
  PRESENCE_TTL_SECONDS,
  PROFILE_CACHE_TTL_SECONDS,
} from '../config'

/**
 * Presence, last-seen and the profile cache — all on KV.
 *
 * KV is eventually consistent and read-optimised, which makes it right for
 * exactly this: values read on every conversation render and tolerant of a few
 * seconds of staleness. Message state stays in D1 and the Durable Object,
 * because a message a sender cannot immediately read back is a bug, not a
 * caching tradeoff.
 */

const presenceKey = (userId: string) => `presence:${userId}`
const profileKey = (userId: string) => `profile:${userId}`

/**
 * Online, with a TTL longer than the socket heartbeat.
 *
 * The key expiring *is* the offline signal — that is what makes a browser tab
 * killed mid-connection eventually read as offline without anyone sending a
 * close frame.
 */
export async function markOnline(env: Env, userId: string): Promise<void> {
  await env.KV.put(presenceKey(userId), String(Date.now()), {
    expirationTtl: PRESENCE_TTL_SECONDS,
  })
}

/**
 * Offline, but keep the timestamp.
 *
 * Deliberately not a delete: last-seen is what the UI falls back to, so the
 * timestamp has to outlive the online flag.
 */
export async function markOffline(env: Env, userId: string): Promise<void> {
  await env.KV.put(presenceKey(userId), `off:${Date.now()}`, {
    expirationTtl: LAST_SEEN_TTL_SECONDS,
  })
}

export async function getPresence(
  env: Env,
  userId: string
): Promise<{ online: boolean; lastSeenAt: number | null }> {
  const raw = await env.KV.get(presenceKey(userId))
  if (!raw) return { online: false, lastSeenAt: null }
  if (raw.startsWith('off:')) return { online: false, lastSeenAt: Number(raw.slice(4)) || null }
  return { online: true, lastSeenAt: Number(raw) || null }
}

export async function cacheProfile(env: Env, profile: ProfileRow): Promise<void> {
  await env.KV.put(profileKey(profile.user_id), JSON.stringify(profile), {
    expirationTtl: PROFILE_CACHE_TTL_SECONDS,
  })
}

export async function getCachedProfile(env: Env, userId: string): Promise<ProfileRow | null> {
  const raw = await env.KV.get(profileKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ProfileRow
  } catch {
    /* A corrupt entry should not take down a request that can just re-read. */
    return null
  }
}

/**
 * Drop rather than write through.
 *
 * A failed write-through would leave a wrong profile cached for its whole TTL;
 * a failed delete just means the next read repopulates from D1.
 */
export async function invalidateProfile(env: Env, userId: string): Promise<void> {
  await env.KV.delete(profileKey(userId))
}

/** Profile row + live presence, in the shape the client consumes. */
export async function toPublicUser(env: Env, profile: ProfileRow): Promise<PublicUser> {
  const presence = await getPresence(env, profile.user_id)
  return {
    id: profile.user_id,
    handle: profile.handle,
    displayName: profile.display_name,
    bio: profile.bio,
    /* No R2 in this milestone, so there is no avatar object to point at. The
       client renders `initials` on `avatarGradient` instead.
       TODO: return `/media/<key>` here when R2 lands. */
    avatarUrl: null,
    avatarGradient: profile.avatar_gradient,
    initials: profile.initials,
    lastSeenAt: presence.lastSeenAt ?? profile.last_seen_at,
    online: presence.online,
  }
}

/** Batch variant — one KV read per user, issued in parallel. */
export function toPublicUsers(env: Env, profiles: ProfileRow[]): Promise<PublicUser[]> {
  return Promise.all(profiles.map((p) => toPublicUser(env, p)))
}
