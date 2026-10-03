import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ProjectCard as Project } from '@/api/types'
import { ArrowIcon } from '@/components/ui/Icon'
import { SmartImage } from '@/components/ui/SmartImage'
import { Tag } from '@/components/ui/Tag'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'

type Props = { project: Project; large?: boolean; className?: string }

export function ProjectCard({ project, large, className }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Link
      to={`/${locale}/projects/${project.slug}`}
      className={cn('group flex flex-col gap-4 rounded-tile', className)}
    >
      <div className="relative overflow-hidden rounded-tile">
        <SmartImage
          media={project.cover}
          sizes={large ? '(min-width: 768px) 60vw, 100vw' : '(min-width: 768px) 33vw, 100vw'}
          className={cn(large ? 'aspect-[4/3] md:aspect-[16/11]' : 'aspect-[4/3]')}
          crop
          imgClassName="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Tag tone="overlay">{t(`status.${project.status}`)}</Tag>
          {project.is_tokenized && <Tag tone="accent">{t('project.tokenized')}</Tag>}
        </div>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className={cn(large ? 'text-h2' : 'text-h3')}>{project.title}</h3>
          <p className="font-mono text-xs text-fg-mute">
            {[project.location, project.year].filter(Boolean).join(' · ')}
          </p>
          {large && <p className="mt-2 max-w-prose text-fg-mute">{project.short_description}</p>}
        </div>
        <ArrowIcon className="mt-1 shrink-0 text-fg-mute transition-transform group-hover:translate-x-1 group-hover:text-fg" />
      </div>
    </Link>
  )
}
