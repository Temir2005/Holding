import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { resolveHref } from '@/lib/href'
import { type ButtonVariant, buttonClass } from '@/lib/button'
import { useLocale } from '@/lib/locale'

type LinkProps = {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  className?: string
  /** Plain text link instead of a pill button. */
  plain?: boolean
}

/** Renders a CMS href as the right kind of link: router link, anchor or external. */
export function CmsLink({ href, children, variant = 'primary', className, plain }: LinkProps) {
  const locale = useLocale()
  const target = resolveHref(href, locale)
  const cls = plain ? className : buttonClass(variant, className)
  if (target.kind === 'internal') {
    return (
      <Link to={target.to} className={cls}>
        {children}
      </Link>
    )
  }
  const external = target.kind === 'external'
  return (
    <a
      href={target.href}
      className={cls}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
      {external && !plain && <span aria-hidden="true">↗</span>}
    </a>
  )
}

export function CtaGroup({ ctas }: { ctas: { label: string; href: string; variant: ButtonVariant }[] }) {
  if (!ctas.length) return null
  return (
    <div className="flex flex-wrap gap-3">
      {ctas.map((c) => (
        <CmsLink key={`${c.href}-${c.label}`} href={c.href} variant={c.variant}>
          {c.label}
        </CmsLink>
      ))}
    </div>
  )
}
