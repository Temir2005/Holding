/**
 * Admin API errors. Every admin and preview error is `{error: {code, message, details}}`
 * (docs/admin-api.md, "Ошибки"); `code` is stable and drives the UI reaction.
 */

export type LocPart = string | number

/** One field problem from a 422 `VALIDATION_ERROR` (publish errors also carry `section_id`). */
export interface FieldIssue {
  loc: LocPart[]
  msg: string
  section_id?: string
}

/** Codes the UI reacts to. Others still work: `code` is a plain string. */
export const ErrorCode = {
  validation: 'VALIDATION_ERROR',
  notFound: 'NOT_FOUND',
  tokenExpired: 'TOKEN_EXPIRED',
  forbidden: 'FORBIDDEN',
  versionConflict: 'VERSION_CONFLICT',
  orderMismatch: 'ORDER_MISMATCH',
  alreadyExists: 'ALREADY_EXISTS',
  inUse: 'IN_USE',
  draftChanged: 'DRAFT_CHANGED',
  rateLimited: 'RATE_LIMITED',
  network: 'NETWORK_ERROR',
  unknown: 'UNKNOWN_ERROR',
} as const

/** 401 codes after which the session cannot be recovered and the user must sign in again. */
export const SESSION_ENDED_CODES: ReadonlySet<string> = new Set([
  'NOT_AUTHENTICATED',
  'UNAUTHORIZED',
  'TOKEN_REVOKED',
  'USER_INACTIVE',
  'NO_REFRESH_TOKEN',
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_REUSED',
])

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AdminApiError'
  }

  /** Field problems of a 422; empty for any other error. */
  get fieldIssues(): FieldIssue[] {
    return this.code === ErrorCode.validation ? toFieldIssues(this.details) : []
  }
}

export function isApiError(error: unknown, code?: string): error is AdminApiError {
  return error instanceof AdminApiError && (code === undefined || error.code === code)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function toFieldIssues(details: unknown): FieldIssue[] {
  if (!Array.isArray(details)) return []
  return details.flatMap((item): FieldIssue[] => {
    if (!isRecord(item) || !Array.isArray(item.loc) || typeof item.msg !== 'string') return []
    const loc = item.loc.filter((p): p is LocPart => typeof p === 'string' || typeof p === 'number')
    const issue: FieldIssue = { loc, msg: item.msg }
    if (typeof item.section_id === 'string') issue.section_id = item.section_id
    return [issue]
  })
}

/** Builds an error from a failed response, whatever its body looks like. */
export async function errorFromResponse(res: Response): Promise<AdminApiError> {
  const body: unknown = await res.json().catch(() => undefined)
  if (isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string') {
    const { code, message, details } = body.error
    return new AdminApiError(
      res.status,
      code,
      typeof message === 'string' ? message : res.statusText,
      details,
    )
  }
  return new AdminApiError(res.status, ErrorCode.unknown, res.statusText || `HTTP ${res.status}`)
}

/** Where a request part ends and the field path begins in a `loc`. */
const LOC_ROOTS: ReadonlySet<LocPart> = new Set(['body', 'query', 'path'])

/**
 * Turns a server `loc` into a form field path: `["body", "data", "steps", 0, "title", "ru"]`
 * becomes `data.steps.0.title.ru`. `strip` drops a further prefix, e.g. `["sections", 2]`
 * for publish errors that are shown inside one section's form.
 */
export function locToPath(loc: readonly LocPart[], strip: readonly LocPart[] = []): string | null {
  let parts = [...loc]
  if (parts.length > 0 && LOC_ROOTS.has(parts[0] as LocPart)) parts = parts.slice(1)
  if (strip.length > 0) {
    const matches = strip.every((p, i) => String(parts[i]) === String(p))
    if (!matches) return null
    parts = parts.slice(strip.length)
  }
  return parts.length > 0 ? parts.join('.') : null
}
