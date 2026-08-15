import { INSTALLATION_ROUTES } from '@mooncello/contracts'
import { Hono } from 'hono'
import { createInitialAdminHandler } from './create-initial-admin.handler'
import { installationStatusHandler } from './installation-status.handler'

export const installationRoutes = new Hono()
  .get(INSTALLATION_ROUTES.status.path, installationStatusHandler)
  .post(INSTALLATION_ROUTES.createInitialAdmin.path, createInitialAdminHandler)
