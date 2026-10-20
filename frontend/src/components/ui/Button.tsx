import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { resolveHref } from '@/lib/href'
import { type ButtonVariant, buttonClass } from '@/lib/button'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'
import { DimArrow } from './DimArrow'

type LinkProps = {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  className?: string
  /** Plain text link instead of a button. */
  plain?: boolean
}

/** Renders a CMS href as the right kind of link: router link, anchor or external. */
export function CmsLink({ href, children, variant = 'primary', className, plain }: LinkProps) {
  const locale = useLocale()
  const target = resolveHref(href, locale)
  const cls = plain ? className : buttonClass(variant, className)
  const external = target.kind === 'external'
  const body = plain ? (
    children
  ) : (
    <>
      <span>{children}</span>
      {external ? (
        <span aria-hidden="true" className="text-lg leading-none">
          ↗
        </span>
      ) : (
        <DimArrow />
      )}
    </>
  )
  if (target.kind === 'internal') {
    return (
      <Link to={target.to} className={cls}>
        {body}
      </Link>
    )
  }
  return (
    <a
      href={target.href}
      className={cls}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {body}
    </a>
  )
}

/** Quiet "see all" link: drawn underline and the dimension arrow. */
export function MoreLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <CmsLink
      href={href}
      plain
      className={cn(
        'group/more inline-flex items-center gap-4 py-2 font-medium text-fg',
        className,
      )}
    >
      <span className="link-draw">{children}</span>
      <DimArrow />
    </CmsLink>
  )
}

export function CtaGroup({
  ctas,
}: {
  ctas: { label: string; href: string; variant: ButtonVariant }[]
}) {
  if (!ctas.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {ctas.map((c) => (
        <CmsLink key={`${c.href}-${c.label}`} href={c.href} variant={c.variant}>
          {c.label}
        </CmsLink>
      ))}
    </div>
  )
}
