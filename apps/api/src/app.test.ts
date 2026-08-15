import { describe, expect, it } from 'vitest'
import { app } from './app'

describe('app', () => {
  it('répond sur /health', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
