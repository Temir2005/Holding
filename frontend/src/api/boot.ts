/**
 * Requests started by the inline script of index.html before the bundle runs, keyed by what
 * they load ('settings', 'page:<slug>', 'project:<slug>'). Each is used once, by the first
 * query for it in the same locale; a failed one (a 404 too) is simply loaded again the usual
 * way, so errors come as ApiError as before.
 */
type Boot = { locale: string; data: Record<string, Promise<unknown> | undefined> }

export function fromBoot<T>(key: string, locale: string, load: () => Promise<T>): Promise<T> {
  const boot = (window as { __boot?: Boot }).__boot
  const early = boot && boot.locale === locale ? boot.data[key] : undefined
  if (!early || !boot) return load()
  boot.data[key] = undefined
  return (early as Promise<T>).catch(load)
}
