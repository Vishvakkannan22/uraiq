import { PBKDF2_ITERATIONS } from '../config'

/**
 * Password hashing on WebCrypto only — no dependencies, no WASM.
 *
 * PBKDF2-SHA256 rather than Argon2id: Argon2 needs a WASM bundle and real
 * memory, and Workers price and limit both. PBKDF2 through SubtleCrypto is
 * native and the iteration count is stored per row, so the cost can be raised
 * later and old hashes upgraded on the next successful login.
 */

const KEY_BITS = 256
const SALT_BYTES = 16
const enc = new TextEncoder()

export function b64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of view) s += String.fromCharCode(b)
  return btoa(s)
}

export function unb64(text: string): Uint8Array {
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Comparison whose duration does not depend on where the first difference is.
 *
 * Length is compared first and leaks, which is fine — both operands here are
 * fixed-width base64 digests.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export interface PasswordHash {
  hash: string
  salt: string
  iterations: number
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return { hash: b64(hash), salt: b64(salt), iterations: PBKDF2_ITERATIONS }
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  iterations: number
): Promise<boolean> {
  const hash = await pbkdf2(password, unb64(storedSalt), iterations)
  return timingSafeEqual(b64(hash), storedHash)
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS
  )
}

export async function sha256(text: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

/** Refresh tokens are opaque random strings; only their hash is persisted. */
export function newOpaqueToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)))
}
