import { INSTALLATION_ROUTES } from '@mooncello/contracts'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

const ADMIN = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-battery-staple',
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(payload),
  } as Response)
}

function stubApi(isInstalled: () => boolean, isStatusReachable: () => boolean = () => true) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)

    if (url.endsWith(INSTALLATION_ROUTES.status.path)) {
      return isStatusReachable()
        ? jsonResponse({ installed: isInstalled() })
        : Promise.reject(new TypeError('Failed to fetch'))
    }

    if (url.endsWith(INSTALLATION_ROUTES.createInitialAdmin.path)) {
      return jsonResponse({ user: { id: 'usr_1', name: ADMIN.name, email: ADMIN.email } }, 201)
    }

    return jsonResponse({ status: 'ok' })
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function statusCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).endsWith(INSTALLATION_ROUTES.status.path),
  )
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

  it("Tant qu'aucun utilisateur ne détient le rôle `admin`, toute route de l'admin redirige vers `/installation`", async () => {
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

    const statusCallsBefore = statusCalls(fetchMock).length

    isInstalled = true
    await router.navigate({ to: '/' })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
    })
    expect(statusCalls(fetchMock).length).toBeGreaterThan(statusCallsBefore)
  })

  it('quand la requête de statut échoue, la garde se replie sur la dernière valeur connue en cache', async () => {
    let isStatusReachable = true
    stubApi(
      () => false,
      () => isStatusReachable,
    )
    const router = renderApp('/')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/installation')
    })

    isStatusReachable = false
    await router.navigate({ to: '/connexion' })

    expect(
      await screen.findByRole('heading', { name: 'Installation de Mooncello' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/installation')
    expect(screen.queryByRole('heading', { name: 'API injoignable' })).not.toBeInTheDocument()
  })

  it('quand la requête de statut échoue sans valeur en cache, la garde échoue', async () => {
    stubApi(
      () => false,
      () => false,
    )
    const router = renderApp('/')

    expect(await screen.findByRole('heading', { name: 'API injoignable' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it("après la création de l'administrateur, une requête de statut en échec ne renvoie pas vers `/installation`", async () => {
    let isStatusReachable = true
    stubApi(
      () => false,
      () => isStatusReachable,
    )
    const user = userEvent.setup()
    const router = renderApp('/')

    await user.type(await screen.findByLabelText('Nom'), ADMIN.name)
    await user.type(screen.getByLabelText('Adresse email'), ADMIN.email)
    await user.type(screen.getByLabelText('Mot de passe', { exact: true }), ADMIN.password)
    await user.type(screen.getByLabelText('Confirmation du mot de passe'), ADMIN.password)

    isStatusReachable = false
    await user.click(screen.getByRole('button', { name: "Créer l'administrateur" }))

    expect(await screen.findByRole('heading', { name: 'Mooncello' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})
