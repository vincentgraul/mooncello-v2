import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiRequest } from './client'

const responseSchema = z.object({ status: z.string() })

function stubFetch() {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok' }),
    } as Response),
  )

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function sentHeaders(fetchMock: ReturnType<typeof stubFetch>): Headers {
  return new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("les en-têtes fournis par l'appelant sont conservés", async () => {
    const fetchMock = stubFetch()

    await apiRequest('/health', responseSchema, {
      method: 'POST',
      body: JSON.stringify({ any: 'thing' }),
      headers: { 'X-Trace-Id': 'trace-42' },
    })

    const headers = sentHeaders(fetchMock)

    expect(headers.get('X-Trace-Id')).toBe('trace-42')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it("un `Content-Type` fourni par l'appelant n'est pas écrasé", async () => {
    const fetchMock = stubFetch()

    await apiRequest('/health', responseSchema, {
      method: 'POST',
      body: 'a=1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    expect(sentHeaders(fetchMock).get('Content-Type')).toBe('application/x-www-form-urlencoded')
  })

  it('une requête sans corps ne porte pas de `Content-Type`', async () => {
    const fetchMock = stubFetch()

    await apiRequest('/health', responseSchema, { method: 'GET' })

    expect(sentHeaders(fetchMock).get('Content-Type')).toBeNull()
  })

  it('une requête sans corps conserve les en-têtes de l’appelant', async () => {
    const fetchMock = stubFetch()

    await apiRequest('/health', responseSchema, {
      method: 'GET',
      headers: { 'X-Trace-Id': 'trace-7' },
    })

    expect(sentHeaders(fetchMock).get('X-Trace-Id')).toBe('trace-7')
  })
})
