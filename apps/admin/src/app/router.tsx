import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { DashboardPage } from '@/pages/dashboard'

const rootRoute = createRootRoute({ component: Outlet })

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([dashboardRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
