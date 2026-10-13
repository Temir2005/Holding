/**
 * Typed admin API client over the generated OpenAPI types (`make gen-types`).
 * Paths, params, bodies and responses come from `schema.d.ts`; nothing is restated by hand.
 *
 *   api.get('/api/v1/admin/pages/{page_id}', { path: { page_id } })
 *   api.patch('/api/v1/admin/sections/{section_id}', { path: { section_id }, body })
 */
import type { paths } from '@/api/schema'
import { AdminApiError, ErrorCode, errorFromResponse } from './errors'
import { browserCoordination, TokenManager, type TokenResponse } from './tokens'

export type { CurrentUser } from './tokens'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type JsonOf<R> = R extends { content: { 'application/json': infer T } } ? T : undefined

type PathsWith<M extends Method> = {
  [P in keyof paths]: paths[P] extends Record<M, infer O> ? (O extends object ? P : never) : never
}[keyof paths]

type Operation<P extends keyof paths, M extends Method> = Extract<
  paths[P][M & keyof paths[P]],
  object
>

type SuccessOf<O> = O extends { responses: infer R }
  ? 200 extends keyof R
    ? JsonOf<R[200]>
    : 201 extends keyof R
      ? JsonOf<R[201]>
      : undefined
  : never

type BodyOf<O> = O extends { requestBody: { content: { 'application/json': infer B } } }
  ? { body: B }
  : O extends { requestBody?: never }
    ? { body?: never }
    : O extends { requestBody?: { content: { 'application/json': infer B } } }
      ? { body?: B }
      : { body?: never }

type ParamsOf<O, K extends 'path' | 'query'> = O extends { parameters: infer P }
  ? K extends keyof P
    ? undefined extends P[K]
      ? { [Key in K]?: Exclude<P[K], undefined> }
      : { [Key in K]: P[K] }
    : { [Key in K]?: never }
  : { [Key in K]?: never }

export type RequestOptions<O> = ParamsOf<O, 'path'> &
  ParamsOf<O, 'query'> &
  BodyOf<O> & { signal?: AbortSignal }

type IsOptional<T, K extends keyof T> = Partial<Pick<T, K>> extends Pick<T, K> ? true : false
type RequiredKeys<T> = { [K in keyof T]-?: IsOptional<T, K> extends true ? never : K }[keyof T]
/** Options may be omitted when nothing in them is required. */
type OptionsArg<O> = [RequiredKeys<RequestOptions<O>>] extends [never]
  ? [options?: RequestOptions<O>]
  : [options: RequestOptions<O>]

export type ResponseOf<P extends keyof paths, M extends Method> = SuccessOf<Operation<P, M>>

type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[]

export function buildUrl(
  template: string,
  path?: Record<string, string | number>,
  query?: Record<string, QueryValue>,
): string {
  const url = template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = path?.[name]
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${template}`)
    return encodeURIComponent(String(value))
  })
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)))
    else search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { credentials: 'same-origin', ...init })
  } catch {
    throw new AdminApiError(0, ErrorCode.network, 'Network error')
  }
}

async function refreshRequest(): Promise<TokenResponse> {
  const res = await send('/api/v1/admin/auth/refresh', { method: 'POST' })
  if (!res.ok) throw await errorFromResponse(res)
  return (await res.json()) as TokenResponse
}

export const tokens = new TokenManager({ refresh: refreshRequest, ...browserCoordination() })

interface RawOptions {
  method: string
  path?: Record<string, string | number>
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
  /** Send without the access token (login). */
  anonymous?: boolean
}

/**
 * Sends a request with the access token. On any 401 the token is refreshed once (through
 * `tokens`, shared by all callers) and the request is repeated; if that fails too, the
 * session is over. Not only `TOKEN_EXPIRED`: a token can also be rejected as "not yet
 * valid" when the server clock steps back, and a fresh one fixes that. Codes that really
 * end the session (revoked, user disabled) make the refresh fail, which signs out.
 */
export async function request(template: string, options: RawOptions): Promise<Response> {
  const url = buildUrl(template, options.path, options.query)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const init = (token: string | null): RequestInit => ({
    method: options.method,
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers,
  })

  if (options.anonymous) {
    const res = await send(url, init(null))
    if (!res.ok) throw await errorFromResponse(res)
    return res
  }

  const token = tokens.accessToken ?? (await tokens.refresh(null))
  let res = await send(url, init(token))
  if (res.status === 401) {
    res = await send(url, init(await tokens.refresh(token)))
  }
  if (!res.ok) {
    const error = await errorFromResponse(res)
    if (res.status === 401) tokens.signOut('expired')
    throw error
  }
  return res
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Typed signature of `api.get`, `api.post`…; the checks happen at the call site. */
type Caller<M extends Method> = <P extends PathsWith<M>>(
  path: P,
  ...args: OptionsArg<Operation<P, M>>
) => Promise<ResponseOf<P, M>>

function call<M extends Method>(method: M): Caller<M> {
  const untyped = async (path: string, options?: Omit<RawOptions, 'method'>) =>
    json<unknown>(await request(path, { ...options, method: method.toUpperCase() }))
  return untyped as unknown as Caller<M>
}

export const api = {
  get: call('get'),
  post: call('post'),
  put: call('put'),
  patch: call('patch'),
  delete: call('delete'),
}
