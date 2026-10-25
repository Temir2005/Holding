import { type CSSProperties, type ReactNode, useContext, useEffect, useState } from 'react'
import type { Cta, Stat, Tone } from '@/api/types'
import { SiteLink } from '@/components/ui/SiteLink'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { resolveHref } from '@/lib/href'
import { useLocale } from '@/lib/locale'
import { AltContext, reduceMotion, useInView } from './hooks'

export function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowLeft({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function Plus() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

type SecProps = {
  tone: Tone
  anchor?: string | null
  className?: string
  /** no default vertical padding (the section lays itself out) */
  bare?: boolean
  label?: string | null
  children: ReactNode
  style?: CSSProperties
}

/** A page section: tone colours, anchor, and the `in` class once it scrolls into view. */
export function Sec({ tone, anchor, className, bare, label, children, style }: SecProps) {
  const alt = useContext(AltContext)
  const [ref, seen] = useInView<HTMLElement>()
  return (
    <section
      ref={ref}
      id={anchor ?? undefined}
      aria-label={label ?? undefined}
      style={style}
      className={cn(
        `tone-${tone}`,
        tone === 'light' && alt && 'alt',
        !bare && 'sec',
        seen && 'in',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function Eyebrow({ children, className }: { children?: ReactNode; className?: string }) {
  if (!children) return null
  return <span className={cn('eyebrow', className)}>{children}</span>
}

/** Heading with optional eyebrow and lead, the usual top of a section. */
export function Head({
  eyebrow,
  title,
  lead,
  aside,
  className,
}: {
  eyebrow?: string | null
  title?: string | null
  lead?: string | null
  aside?: ReactNode
  className?: string
}) {
  if (!eyebrow && !title && !lead && !aside) return null
  return (
    <div className={cn('sec-head', className)}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        {title && <h2 className="h2">{title}</h2>}
        {lead && <p className="lead">{lead}</p>}
      </div>
      {aside}
    </div>
  )
}

type LinkBtnProps = {
  href: string
  className?: string
  children: ReactNode
  onClick?: () => void
  tabIndex?: number
}

/** A CMS link (https://…, #anchor or a page slug) rendered as the right kind of anchor. */
export function CmsLink({ href, className, children, onClick, tabIndex }: LinkBtnProps) {
  const locale = useLocale()
  const r = resolveHref(href, locale)
  if (r.kind === 'internal')
    return (
      <SiteLink to={r.to} className={className} onClick={onClick} tabIndex={tabIndex}>
        {children}
      </SiteLink>
    )
  const external = r.kind === 'external' && /^https?:/.test(r.href)
  return (
    <a
      href={r.href}
      className={className}
      onClick={onClick}
      tabIndex={tabIndex}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

/** CMS buttons: the primary one is filled with the accent, the secondary one white. */
export function Ctas({
  ctas,
  className,
  onDark = true,
}: {
  ctas: Cta[]
  className?: string
  onDark?: boolean
}) {
  if (!ctas.length) return null
  return (
    <div className={cn('ctas', className)}>
      {ctas.map((c, i) => (
        <CmsLink
          key={`${c.href}-${i}`}
          href={c.href}
          className={cn(
            'btn',
            c.variant === 'primary' ? 'btn--accent' : onDark ? 'btn--white' : 'btn--ink',
          )}
        >
          {c.label}
          {c.variant === 'primary' && <Arrow />}
        </CmsLink>
      ))}
    </div>
  )
}

/** A number that counts up once `run` turns true. Years are not grouped (2028, not 2 028). */
export function CountUp({
  value,
  prefix,
  suffix,
  run,
}: {
  value: number
  prefix?: string | null
  suffix?: string
  run: boolean
}) {
  const locale = useLocale()
  const isYear = Number.isInteger(value) && value >= 1900 && value <= 2100
  const fmt = (v: number) => (isYear ? String(Math.round(v)) : formatNumber(Math.round(v), locale))
  const [shown, setShown] = useState(() => (isYear || value === 0 ? value : 0))
  useEffect(() => {
    if (!run || isYear) return
    if (reduceMotion()) {
      setShown(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1600)
      setShown(value * (1 - Math.pow(1 - p, 4)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, value, isYear])
  const full = (prefix ?? '') + fmt(value) + (suffix ?? '')
  return (
    <>
      <span aria-hidden="true">{(prefix ?? '') + fmt(shown) + (suffix ?? '')}</span>
      <span className="sr-only">{full}</span>
    </>
  )
}

/** A row of figures under a heading (hero, project pages). */
export function Facts({ stats, className }: { stats: Stat[]; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>('0px')
  if (!stats.length) return null
  return (
    <div
      ref={ref}
      className={cn('facts', className)}
      style={{ '--n': Math.min(stats.length, 4) } as CSSProperties}
    >
      {stats.map((s) => (
        <div key={s.id} className="fact">
          <b>
            <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} run={seen} />
          </b>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Splits a CMS title into lines that slide up one after another (a newline starts a line). */
export function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className="line">
          <span>{line}</span>
        </span>
      ))}
    </>
  )
}
