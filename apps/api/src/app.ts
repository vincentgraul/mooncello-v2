import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './modules/auth/auth'
import { env } from './shared/config/env'
import { errorHandler } from './shared/http/error.middleware'

export const app = new Hono()

app.use('*', cors({ origin: env.ADMIN_ORIGIN, credentials: true }))

app.onError(errorHandler)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/docs', Scalar({ url: '/openapi.json' }))
