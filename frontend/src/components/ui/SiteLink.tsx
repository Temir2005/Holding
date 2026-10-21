import { forwardRef } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { usePrefetchIntent } from '@/lib/prefetch'

type Props = Omit<LinkProps, 'to'> & { to: string }

/**
 * Link to a page of the site. The page change runs as a view transition (the new sheet is laid
 * over the old one, globals.css; instant where the browser has none), and the target page is
 * warmed up on hover or focus.
 */
export const SiteLink = forwardRef<HTMLAnchorElement, Props>(function SiteLink(
  { to, onPointerEnter, onFocus, ...rest },
  ref,
) {
  const intent = usePrefetchIntent(to)
  return (
    <Link
      ref={ref}
      to={to}
      viewTransition
      onPointerEnter={(e) => {
        intent.onPointerEnter()
        onPointerEnter?.(e)
      }}
      onFocus={(e) => {
        intent.onFocus()
        onFocus?.(e)
      }}
      {...rest}
    />
  )
})
