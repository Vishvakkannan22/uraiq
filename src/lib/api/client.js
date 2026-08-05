import { API_URL, REQUEST_TIMEOUT, RETRY_ATTEMPTS, RETRY_BACKOFF } from './config'
import { getToken, refreshSession, clearSession } from '../auth'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'unknown', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** True when retrying could plausibly succeed. */
  get retryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Safe to send twice: the server does the same thing or nothing. */
const IDEMPOTENT = new Set(['GET', 'HEAD'])

/**
 * Whether this failure is worth another attempt.
 *
 * The important rule is the first one. A timeout does NOT mean the request
 * failed — it means we stopped waiting, while the server is very likely still
 * working on it. Retrying then adds load to something already too slow to
 * answer, which makes it slower, which times out more requests. That feedback
 * loop is how a server under pressure gets pushed over: observed here as
 * ~2s handlers taking 20s of wall clock while the client fired three attempts
 * at each one and eventually killed the process.
 *
 * A 429 is the exception among "server said no": it is proof the request was
 * rejected without being processed, so retrying after the window is correct.
 */
function shouldRetry(method, error) {
  if (error.code === 'timeout') return false
  if (error.status === 429) return true
  return IDEMPOTENT.has(method)
}

/**
 * Backoff with jitter. Without the random component, every request that failed
 * together retries together, reproducing the same spike that caused the
 * failure — the clients synchronise into a thundering herd.
 */
function backoffFor(attempt) {
  const base = RETRY_BACKOFF[attempt] ?? 1200
  return base + Math.random() * base * 0.5
}

async function parse(res) {
  const type = res.headers.get('content-type') || ''
  if (res.status === 204) return null
  if (type.includes('application/json')) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }
  return res.text()
}

function toError(res, body) {
  /* Workers commonly return { error: { code, message } } or { message }.
     Accept either, and never surface a raw HTML error page to the UI. */
  const payload = body && typeof body === 'object' ? body.error || body : null
  const message =
    payload?.message ||
    (typeof body === 'string' && body.length < 200 ? body : null) ||
    `Request failed (${res.status})`
  return new ApiError(message, {
    status: res.status,
    code: payload?.code || String(res.status),
    details: payload?.details ?? null,
  })
}

/**
 * One request. Handles auth injection, timeouts, retry on transient failure,
 * and a single transparent token refresh on 401.
 *
 * `_retried` guards against a refresh loop: if the refreshed token also 401s,
 * the session is genuinely dead and we stop rather than ping-ponging.
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    signal,
    auth = true,
    timeout = REQUEST_TIMEOUT,
    attempt = 0,
    _retried = false,
  } = options

  if (!API_URL) {
    throw new ApiError('No API configured', { code: 'offline' })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  /* Caller aborts (unmount, new keystroke) must also cancel the request. */
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)

    if (signal?.aborted) throw new ApiError('Cancelled', { code: 'aborted' })

    const timedOut = err.name === 'AbortError'

    /* A rejected CORS preflight and a dead server are the same TypeError to
       JavaScript — the browser deliberately withholds the reason. That makes
       "network unavailable" a misleading thing to show on its own, so in dev we
       name both possibilities where a developer will actually see them. */
    if (import.meta.env.DEV && !timedOut) {
      console.error(
        `[api] ${method} ${API_URL}${path} failed before a response arrived.\n` +
          `Either the Worker is not running, or it is refusing this origin ` +
          `(${window.location.origin}) — check ALLOWED_ORIGINS in worker/wrangler.jsonc.`
      )
    }

    const netErr = new ApiError(
      timedOut ? 'The server took too long to respond' : 'Cannot reach the server',
      { code: timedOut ? 'timeout' : 'network' }
    )
    if (attempt < RETRY_ATTEMPTS && shouldRetry(method, netErr)) {
      await sleep(backoffFor(attempt))
      return request(path, { ...options, attempt: attempt + 1 })
    }
    throw netErr
  }

  clearTimeout(timer)
  signal?.removeEventListener('abort', onAbort)

  if (res.ok) return parse(res)

  if (res.status === 401 && auth && !_retried) {
    const ok = await refreshSession()
    if (ok) return request(path, { ...options, _retried: true })
    clearSession()
    throw new ApiError('Session expired', { status: 401, code: 'unauthenticated' })
  }

  const body_ = await parse(res)
  const error = toError(res, body_)

  /* A 5xx on a POST is not automatically safe to repeat — the write may have
     landed before the response failed. Sends carry a `clientId` and are
     de-duplicated server-side, but the rest are not, so only idempotent methods
     (and 429, which is proof nothing happened) get another attempt. */
  if (error.retryable && attempt < RETRY_ATTEMPTS && shouldRetry(method, error)) {
    await sleep(backoffFor(attempt))
    return request(path, { ...options, attempt: attempt + 1 })
  }

  throw error
}

/**
 * In-flight GETs, keyed by path.
 *
 * Several components legitimately want the same data at the same moment — the
 * chat list is read by the list pane and the command palette, both of which
 * mount together — and without this each one fires its own request for an
 * identical response. React StrictMode doubles that again in development.
 *
 * Only GETs are shared: they have no side effects, so one response is correct
 * for every caller. The entry is removed as soon as the request settles, so
 * this coalesces concurrent calls rather than caching anything.
 */
const inFlight = new Map()

export const get = (path, opts) => {
  /* An aborted caller must not cancel a shared request, so anything carrying
     its own signal opts out and gets a private one. */
  if (opts?.signal) return request(path, { ...opts, method: 'GET' })

  const existing = inFlight.get(path)
  if (existing) return existing

  const promise = request(path, { ...opts, method: 'GET' }).finally(() => {
    inFlight.delete(path)
  })
  inFlight.set(path, promise)
  return promise
}
export const post = (path, body, opts) => request(path, { ...opts, method: 'POST', body })
export const patch = (path, body, opts) => request(path, { ...opts, method: 'PATCH', body })
export const del = (path, opts) => request(path, { ...opts, method: 'DELETE' })
