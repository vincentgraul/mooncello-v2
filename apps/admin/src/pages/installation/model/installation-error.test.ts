import { INSTALLATION_ERROR_CODES } from '@mooncello/contracts'
import { describe, expect, it } from 'vitest'
import { ApiRequestError, HTTP_ERROR_CODE } from '@/shared/api'
import { isAlreadyInstalledError } from './installation-error'

describe('isAlreadyInstalledError', () => {
  it("reconnaît l'erreur d'instance déjà installée", () => {
    const error = new ApiRequestError(
      INSTALLATION_ERROR_CODES.alreadyInstalled,
      "L'instance est déjà installée",
    )

    expect(isAlreadyInstalledError(error)).toBe(true)
  })

  it("rejette une erreur d'API portant un autre code", () => {
    expect(isAlreadyInstalledError(new ApiRequestError(HTTP_ERROR_CODE, 'Erreur HTTP 500'))).toBe(
      false,
    )
  })

  it("rejette une erreur qui n'est pas une erreur d'API", () => {
    expect(isAlreadyInstalledError(new Error(INSTALLATION_ERROR_CODES.alreadyInstalled))).toBe(
      false,
    )
    expect(isAlreadyInstalledError({ code: INSTALLATION_ERROR_CODES.alreadyInstalled })).toBe(false)
    expect(isAlreadyInstalledError(undefined)).toBe(false)
  })
})
