import type { InstallationStatusResponse } from '@mooncello/contracts'
import type { Handler } from 'hono'
import { isInstalled } from './installation.service'

export const installationStatusHandler: Handler = async (c) => {
  const body: InstallationStatusResponse = { installed: await isInstalled() }

  return c.json(body, 200)
}
