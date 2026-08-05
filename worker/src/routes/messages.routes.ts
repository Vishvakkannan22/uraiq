import type { RequestContext } from '../types'
import { json, noContent, readJson } from '../utils/http'
import { queryInt, validate } from '../utils/validate'
import { createDb } from '../db/client'
import { createLogger } from '../utils/logger'
import * as messagesService from '../services/messages.service'
import { requireAuth } from '../middleware/requireAuth'
import { enforceRateLimit } from '../middleware/rateLimit'
import { MAX_MESSAGE_LENGTH, MESSAGE_PAGE_MAX, MESSAGE_PAGE_SIZE, RATE_LIMITS } from '../config'

/** GET /conversations/:id/messages?before=<ulid>&limit=50 */
export async function listMessages(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'messages.list' })
  const db = createDb(ctx.env, logger)

  const limit = queryInt(ctx.url, 'limit', { fallback: MESSAGE_PAGE_SIZE, max: MESSAGE_PAGE_MAX })
  const before = ctx.url.searchParams.get('before')

  return json(
    await messagesService.listPage(db, ctx.params.id, auth.userId, limit, before)
  )
}

/** POST /conversations/:id/messages  { body, replyToId?, clientId? } */
export async function sendMessage(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'send', auth.userId, RATE_LIMITS.sendMessage,
    'You are sending messages very quickly. Give it a moment.')

  const raw = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(raw)
  const body = v.string('body', { min: 1, max: MAX_MESSAGE_LENGTH })
  const replyToId = raw.replyToId ? v.id('replyToId', { required: false }) : null
  const clientId = v.clientId('clientId')
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'messages.send' })
  const db = createDb(ctx.env, logger)

  const result = await messagesService.send(
    ctx.env,
    db,
    ctx.ctx,
    {
      conversationId: ctx.params.id,
      senderId: auth.userId,
      body,
      replyToId: replyToId || null,
      clientId,
    },
    logger
  )

  /* A blocked message is a successful request with a refusal in it, not a 4xx:
     the client renders the verdict and the suggested rewrites, and treating it
     as an error would send it down the retry path instead. */
  if (result.status === 'blocked') {
    return json({ status: 'blocked', moderation: result.moderation })
  }

  return json(
    { status: 'sent', message: result.message, moderation: result.moderation },
    { status: result.duplicate ? 200 : 201 }
  )
}

/** PATCH /conversations/:id/messages/:messageId  { body } */
export async function editMessage(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'write', auth.userId, RATE_LIMITS.write)

  const raw = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(raw)
  const body = v.string('body', { min: 1, max: MAX_MESSAGE_LENGTH })
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'messages.edit' })
  const db = createDb(ctx.env, logger)

  const result = await messagesService.edit(
    ctx.env,
    db,
    ctx.ctx,
    {
      conversationId: ctx.params.id,
      messageId: ctx.params.messageId,
      userId: auth.userId,
      body,
    },
    logger
  )

  if (result.status === 'blocked') {
    return json({ status: 'blocked', moderation: result.moderation })
  }
  return json({ status: 'sent', message: result.message })
}

/** DELETE /conversations/:id/messages/:messageId */
export async function deleteMessage(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'write', auth.userId, RATE_LIMITS.write)

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'messages.delete' })
  const db = createDb(ctx.env, logger)

  await messagesService.remove(
    ctx.env,
    db,
    ctx.ctx,
    { conversationId: ctx.params.id, messageId: ctx.params.messageId, userId: auth.userId },
    logger
  )

  return noContent()
}

/** POST /conversations/:id/read  { lastReadMessageId } */
export async function markRead(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'write', auth.userId, RATE_LIMITS.write)

  const raw = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(raw)
  const lastReadMessageId = v.id('lastReadMessageId')
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'messages.read' })
  const db = createDb(ctx.env, logger)

  const { readAt } = await messagesService.markRead(
    ctx.env,
    db,
    ctx.ctx,
    { conversationId: ctx.params.id, userId: auth.userId, lastReadMessageId },
    logger
  )

  return json({ ok: true, readAt })
}
