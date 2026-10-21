import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type Preloadable<P> = LazyExoticComponent<ComponentType<P>> & {
  /** Starts fetching the chunk; the same promise the component renders from. */
  preload: () => Promise<unknown>
}

/** React.lazy with a shared promise, so preloading and rendering fetch the chunk once. */
export function lazyWithPreload<P extends object>(
  load: () => Promise<ComponentType<P>>,
): Preloadable<P> {
  let pending: Promise<{ default: ComponentType<P> }> | undefined
  const preload = () => (pending ??= load().then((component) => ({ default: component })))
  return Object.assign(lazy(preload), { preload })
}

export const isPreloadable = (value: unknown): value is Preloadable<never> =>
  typeof value === 'object' && value !== null && 'preload' in value
