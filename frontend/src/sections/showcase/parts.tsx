import { m, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectCard as Project } from '@/api/types'
import { StatusMark } from '@/components/ui/StatusMark'
import { Tag } from '@/components/ui/Tag'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import type { Locale } from '@/lib/locale'
import { DUR, EASE_OUT } from '@/lib/motion'

/**
 * Opacity-only entry. Rows carry trace anchors, and a transform would shift them while the
 * section is measured, so the register never rises into place.
 */
export function Fade({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <m.div
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{
        duration: reduce ? DUR.base : DUR.reveal,
        ease: EASE_OUT,
        delay: reduce ? 0 : delay,
      }}
    >
      {children}
    </m.div>
  )
}

/** Area with its unit set small in mono: 18 500 м². */
export function Area({ value, locale }: { value: number; locale: Locale }) {
  const { t } = useTranslation()
  return (
    <>
      {formatNumber(value, locale)}
      <span className="font-mono text-caption font-medium normal-case tracking-normal text-fg-mute">
        {' '}
        {t('project.sqm')}
      </span>
    </>
  )
}

/** Status mark and the «Токенизирован» tag, side by side. */
export function ProjectMarks({ project, className }: { project: Project; className?: string }) {
  const { t } = useTranslation()
  return (
    <p className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <StatusMark status={project.status} />
      {project.is_tokenized && <Tag>{t('project.tokenized')}</Tag>}
    </p>
  )
}
