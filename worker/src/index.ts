/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestContext } from './types'
import { Router } from './router'
import { corsHeaders, withCors } from './middleware/cors'
import { toErrorResponse } from './middleware/errors'
import { resolveAuth } from './auth/session'
import { createLogger } from './utils/logger'
import { requestId as newRequestId } from './utils/ids'
import { json } from './utils/http'
import { HttpError, notFound, unauthorized } from './utils/errors'

import * as authRoutes from './routes/auth.routes'
import * as userRoutes from './routes/users.routes'
import * as conversationRoutes from './routes/conversations.routes'
import * as messageRoutes from './routes/messages.routes'
import * as moderationRoutes from './routes/moderation.routes'

export { ConversationRoom } from './ws/ConversationRoom'

const router = new Router()

// ---- Auth -----------------------------------------------------------------
router.post('/auth/signup', authRoutes.signup, false)
router.post('/auth/login', authRoutes.login, false)
router.post('/auth/refresh', authRoutes.refresh, false)
/* Public so a client holding only an expired access token can still revoke its
   refresh token; the handler uses `auth` when it is present. */
router.post('/auth/logout', authRoutes.logout, false)
router.get('/auth/me', authRoutes.me)

// ---- Users ----------------------------------------------------------------
/* Before /users/:handle — a literal segment registered after a parameter would
   never be reached. */
router.get('/users/search', userRoutes.searchUsers)
router.patch('/users/me', userRoutes.updateProfile)
router.get('/users/:handle', userRoutes.getUser)

// ---- Conversations --------------------------------------------------------
router.get('/conversations', conversationRoutes.listConversations)
router.post('/conversations', conversationRoutes.createConversation)
router.get('/conversations/:id', conversationRoutes.getConversation)

// ---- Messages -------------------------------------------------------------
router.get('/conversations/:id/messages', messageRoutes.listMessages)
router.post('/conversations/:id/messages', messageRoutes.sendMessage)
router.patch('/conversations/:id/messages/:messageId', messageRoutes.editMessage)
router.delete('/conversations/:id/messages/:messageId', messageRoutes.deleteMessage)
router.post('/conversations/:id/read', messageRoutes.markRead)

// ---- Agents ---------------------------------------------------------------
router.post('/agents/moderate', moderationRoutes.checkText)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = newRequestId()
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    const logger = createLogger(env, { requestId, method: request.method, path: url.pathname })

    /* A WebSocket upgrade goes straight to the conversation's Durable Object.
       Auth happens there because the token arrives as a subprotocol rather than
       a header, and only the DO needs to see it. */
    const wsMatch = url.pathname.match(/^\/conversations\/([^/]+)\/ws$/)
    if (wsMatch) {
      try {
        const stub = env.CONVERSATION.get(env.CONVERSATION.idFromName(wsMatch[1]))
        return await stub.fetch(
          new Request(`https://conversation/ws?c=${encodeURIComponent(wsMatch[1])}`, request)
        )
      } catch (err) {
        logger.error('websocket upgrade failed', err, { conversationId: wsMatch[1] })
        return new Response('Upgrade failed', { status: 500 })
      }
    }

    /* Liveness, and a route table so a misconfigured client can see what
       exists. No auth, no database access. */
    if (url.pathname === '/' || url.pathname === '/health') {
      return withCors(
        json({ ok: true, service: 'uraiq-api', routes: router.describe() }),
        cors
      )
    }

    const started = Date.now()

    try {
      const matched = router.match(request.method, url.pathname)
      if (!matched) throw notFound('No such endpoint')

      const { route, params } = matched
      const auth = await resolveAuth(env, request)
      if (route.auth && !auth) throw unauthorized()

      const context: RequestContext = { env, ctx, request, url, params, auth, requestId }
      const response = await route.handler(context)

      logger.info('request', {
        status: response.status,
        durationMs: Date.now() - started,
        userId: auth?.userId,
      })

      const headers = new Headers(response.headers)
      headers.set('X-Request-Id', requestId)
      return withCors(
        new Response(response.body, { status: response.status, headers }),
        cors
      )
    } catch (err) {
      /* Every failure funnels here. Nothing below this line builds an error
         response of its own, which is what keeps the error shape identical
         across every endpoint. */
      if (!(err instanceof HttpError)) {
        logger.error('unhandled', err, { durationMs: Date.now() - started })
      }
      return withCors(toErrorResponse(err, logger, requestId), cors)
    }
  },
}
