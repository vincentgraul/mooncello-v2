import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router'
import { ConnexionPage } from '@/pages/connexion'
import { DashboardPage } from '@/pages/dashboard'
import { InstallationPage } from '@/pages/installation'
import { installationStatusQueryOptions } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import { AppError } from './app-error'

type RouterContext = {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  errorComponent: AppError,
  beforeLoad: async ({ context, location }) => {
    const { installed } = await context.queryClient.fetchQuery(installationStatusQueryOptions)
    const isOnInstallation = location.pathname === ROUTES.installation

    if (!installed && !isOnInstallation) {
      throw redirect({ to: ROUTES.installation })
    }

    if (installed && isOnInstallation) {
      throw redirect({ to: ROUTES.connexion })
    }
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.dashboard,
  component: DashboardPage,
})

const installationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.installation,
  component: InstallationPage,
})

const connexionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.connexion,
  component: ConnexionPage,
})

const routeTree = rootRoute.addChildren([dashboardRoute, installationRoute, connexionRoute])

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({
    routeTree,
    context: { queryClient },
    history,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
