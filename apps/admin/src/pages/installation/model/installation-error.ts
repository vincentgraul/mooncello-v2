import { INSTALLATION_ERROR_CODES } from '@mooncello/contracts'
import { ApiRequestError } from '@/shared/api'

export function isAlreadyInstalledError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError && error.code === INSTALLATION_ERROR_CODES.alreadyInstalled
  )
}
