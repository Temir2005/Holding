const API_BASE = '/api/v1'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, params?: Params): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) query.set(key, String(value))
  }
  const qs = query.toString()
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined)
    const detail = (body as { detail?: unknown } | undefined)?.detail
    throw new ApiError(res.status, typeof detail === 'string' ? detail : res.statusText, detail)
  }
  return (await res.json()) as T
}

export function apiGet<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  return request<T>(buildUrl(path, params), { signal })
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
