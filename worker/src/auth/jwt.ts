import { b64url, unb64 } from './password'

/**
 * HS256 access tokens, signed with WebCrypto HMAC.
 *
 * Symmetric rather than RS256 because there is exactly one service issuing and
 * one verifying; an asymmetric pair buys nothing and costs a key rotation
 * story. The secret lives in `wrangler secret put JWT_SECRET`.
 *
 * Access tokens are short-lived (15 minutes) and are NOT checked against a
 * revocation list on every request — that would put a KV read in front of every
 * call. Logout revokes the refresh token, so a signed-out session survives at
 * most one access-token lifetime. `session.ts` documents the tradeoff.
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

export interface JwtPayload {
  sub: string
  iat: number
  exp: number
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const data = `${header}.${body}`
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data))
  return `${data}.${b64url(sig)}`
}

/**
 * Verify signature, *then* expiry. Returns null on any failure rather than
 * throwing, because every failure mode means the same thing to a caller: this
 * request is not authenticated.
 *
 * The algorithm is never read from the header — that is the `alg: none`
 * confusion attack. This only ever verifies HS256.
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, sig] = parts

  let signatureValid: boolean
  try {
    signatureValid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      unb64(sig.replace(/-/g, '+').replace(/_/g, '/')) as BufferSource,
      enc.encode(`${header}.${body}`)
    )
  } catch {
    /* Malformed base64 in the signature segment. */
    return null
  }
  if (!signatureValid) return null

  try {
    const payload = JSON.parse(
      dec.decode(unb64(body.replace(/-/g, '+').replace(/_/g, '/')))
    ) as JwtPayload

    if (typeof payload.sub !== 'string' || !payload.sub) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}
