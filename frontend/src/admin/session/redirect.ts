export const LOGIN_PATH = '/admin/login'

/** Only same-admin paths are accepted as a return target (no open redirects). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith(LOGIN_PATH)
    ? next
    : '/admin'
}
