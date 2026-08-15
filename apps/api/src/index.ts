import { app } from './app'
import { env } from './shared/config/env'

Bun.serve({ port: env.API_PORT, fetch: app.fetch })

console.info(`API à l'écoute sur http://localhost:${env.API_PORT}`)
