import type { InstallationStatusResponse } from '@mooncello/contracts'
import { queryOptions } from '@tanstack/react-query'
import { apiClient } from './client'

export const installationStatusQueryOptions = queryOptions({
  queryKey: ['installation', 'status'],
  queryFn: (): Promise<InstallationStatusResponse> => apiClient.getInstallationStatus(),
  staleTime: 0,
})
