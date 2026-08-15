import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppRouter } from './router'

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as Response)
}

function stubApi(isInstalled: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/api/installation/status')) {
        return jsonResponse({ installed: isInstalled })
      }

      return jsonResponse({ status: 'ok' })
    }),
  )
}

async function expectLandingAt(from: string, to: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [from] }))

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  await waitFor(() => {
    expect(router.state.location.pathname).toBe(to)
  })
}

describe('createAppRouter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("Tant qu'aucun utilisateur n'existe, toute route de l'admin redirige vers `/installation`", async () => {
    stubApi(false)

    for (const path of ['/', '/connexion', '/une-route-inconnue']) {
      await expectLandingAt(path, '/installation')
      cleanup()
    }
  })

  it("Dès qu'au moins un utilisateur existe, `/installation` redirige vers `/connexion`", async () => {
    stubApi(true)

    await expectLandingAt('/installation', '/connexion')
  })

  it("Dès qu'au moins un utilisateur existe, les autres routes ne sont pas redirigées", async () => {
    stubApi(true)

    await expectLandingAt('/', '/')
  })
})
