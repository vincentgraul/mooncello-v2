import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as Response)
}

function stubApi(isInstalled: () => boolean) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)

    if (url.endsWith('/api/installation/status')) {
      return jsonResponse({ installed: isInstalled() })
    }

    return jsonResponse({ status: 'ok' })
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function renderApp(initialPath: string) {
  const queryClient = createQueryClient()
  const router = createAppRouter(
    queryClient,
    createMemoryHistory({ initialEntries: [initialPath] }),
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

async function expectLandingAt(from: string, to: string) {
  const router = renderApp(from)

  await waitFor(() => {
    expect(router.state.location.pathname).toBe(to)
  })
}

describe('createAppRouter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("Tant qu'aucun utilisateur n'existe, toute route de l'admin redirige vers `/installation`", async () => {
    stubApi(() => false)

    for (const path of ['/', '/connexion', '/une-route-inconnue']) {
      await expectLandingAt(path, '/installation')
      cleanup()
    }
  })

  it("Dès qu'un utilisateur détient le rôle `admin`, `/installation` redirige vers `/connexion`", async () => {
    stubApi(() => true)

    await expectLandingAt('/installation', '/connexion')
  })

  it("Dès qu'un utilisateur détient le rôle `admin`, les autres routes ne sont pas redirigées", async () => {
    stubApi(() => true)

    await expectLandingAt('/', '/')
  })

  it("la garde relit le statut d'installation à chaque navigation plutôt que de se fier au cache", async () => {
    let isInstalled = false
    const fetchMock = stubApi(() => isInstalled)
    const router = renderApp('/')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/installation')
    })

    const statusCallsBefore = fetchMock.mock.calls.length

    isInstalled = true
    await router.navigate({ to: '/' })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
    })
    expect(fetchMock.mock.calls.length).toBeGreaterThan(statusCallsBefore)
  })
})
