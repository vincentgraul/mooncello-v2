import {
  INITIAL_ADMIN_PASSWORD_MIN_LENGTH,
  INSTALLATION_ERROR_CODES,
  INSTALLATION_ROUTES,
} from '@mooncello/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installationStatusQueryOptions } from '@/shared/api'
import { InstallationPage } from './installation-page'

const VALID_PASSWORD = 'correct-horse-battery-staple'
const TOO_SHORT_PASSWORD = 'a'.repeat(INITIAL_ADMIN_PASSWORD_MIN_LENGTH - 1)

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(payload),
  } as Response)
}

type CreateInitialAdminOutcome = { payload: unknown; status: number }

const CREATED: CreateInitialAdminOutcome = {
  payload: { user: { id: 'usr_1', name: 'Ada Lovelace', email: 'ada@example.com' } },
  status: 201,
}

function stubApi(outcome: CreateInitialAdminOutcome = CREATED) {
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    if (String(input).endsWith(INSTALLATION_ROUTES.createInitialAdmin.path)) {
      return jsonResponse(outcome.payload, outcome.status)
    }

    return jsonResponse({ installed: false })
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function createInitialAdminCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).endsWith(INSTALLATION_ROUTES.createInitialAdmin.path),
  )
}

function renderInstallationPage() {
  const rootRoute = createRootRoute({ component: Outlet })
  const routeTree = rootRoute.addChildren([
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/installation',
      component: InstallationPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <p>Tableau de bord</p>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/connexion',
      component: () => <p>Écran de connexion</p>,
    }),
  ])

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/installation'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )

  return { queryClient, router, user: userEvent.setup() }
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  passwords: {
    password: string
    confirmation: string
  },
) {
  await user.type(await screen.findByLabelText('Nom'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('Adresse email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Mot de passe'), passwords.password)
  await user.type(screen.getByLabelText('Confirmation du mot de passe'), passwords.confirmation)
}

describe('InstallationPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("L'écran demande un nom, un email, un mot de passe et sa confirmation ; le mot de passe fait au moins 12 caractères et l'écran refuse la soumission en deçà", async () => {
    const fetchMock = stubApi()
    const { user } = renderInstallationPage()

    expect(await screen.findByLabelText('Nom')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmation du mot de passe')).toBeInTheDocument()

    await fillForm(user, { password: TOO_SHORT_PASSWORD, confirmation: TOO_SHORT_PASSWORD })
    await user.click(screen.getByRole('button', { name: "Créer l'administrateur" }))

    expect(
      await screen.findByText(
        `Le mot de passe doit faire au moins ${INITIAL_ADMIN_PASSWORD_MIN_LENGTH} caractères`,
      ),
    ).toBeInTheDocument()
    expect(createInitialAdminCalls(fetchMock)).toHaveLength(0)
  })

  it('La confirmation doit correspondre', async () => {
    const fetchMock = stubApi()
    const { user } = renderInstallationPage()

    await fillForm(user, { password: VALID_PASSWORD, confirmation: `${VALID_PASSWORD}-autre` })
    await user.click(screen.getByRole('button', { name: "Créer l'administrateur" }))

    expect(
      await screen.findByText('La confirmation ne correspond pas au mot de passe'),
    ).toBeInTheDocument()
    expect(createInitialAdminCalls(fetchMock)).toHaveLength(0)
  })

  it("La soumission crée l'utilisateur, lui attribue le rôle `admin`, ouvre une session et redirige vers le tableau de bord", async () => {
    const fetchMock = stubApi()
    const { router, user } = renderInstallationPage()

    await fillForm(user, { password: VALID_PASSWORD, confirmation: VALID_PASSWORD })
    await user.click(screen.getByRole('button', { name: "Créer l'administrateur" }))

    await waitFor(() => {
      expect(createInitialAdminCalls(fetchMock)).toHaveLength(1)
    })

    const init = createInitialAdminCalls(fetchMock)[0]?.[1]

    expect(init?.method).toBe(INSTALLATION_ROUTES.createInitialAdmin.method)
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: VALID_PASSWORD,
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
    })
    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
  })

  it("Dès qu'au moins un utilisateur existe, `/installation` redirige vers `/connexion`", async () => {
    const fetchMock = stubApi({
      payload: {
        code: INSTALLATION_ERROR_CODES.alreadyInstalled,
        message: "L'instance est déjà installée",
      },
      status: 404,
    })
    const { queryClient, router, user } = renderInstallationPage()

    await fillForm(user, { password: VALID_PASSWORD, confirmation: VALID_PASSWORD })
    await user.click(screen.getByRole('button', { name: "Créer l'administrateur" }))

    await waitFor(() => {
      expect(createInitialAdminCalls(fetchMock)).toHaveLength(1)
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/connexion')
    })
    expect(await screen.findByText('Écran de connexion')).toBeInTheDocument()
    expect(queryClient.getQueryData(installationStatusQueryOptions.queryKey)).toEqual({
      installed: true,
    })
  })

  it("Un échec de création affiche le message d'erreur et laisse l'écran d'installation ouvert", async () => {
    const fetchMock = stubApi({
      payload: { code: 'internal_error', message: 'Le rôle système « admin » est introuvable' },
      status: 500,
    })
    const { queryClient, router, user } = renderInstallationPage()

    await fillForm(user, { password: VALID_PASSWORD, confirmation: VALID_PASSWORD })
    await user.click(screen.getByRole('button', { name: "Créer l'administrateur" }))

    await waitFor(() => {
      expect(createInitialAdminCalls(fetchMock)).toHaveLength(1)
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le rôle système « admin » est introuvable',
    )
    expect(router.state.location.pathname).toBe('/installation')
    expect(queryClient.getQueryData(installationStatusQueryOptions.queryKey)).toBeUndefined()
  })
})
