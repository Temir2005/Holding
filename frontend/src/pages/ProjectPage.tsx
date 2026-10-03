import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { isNotFound, useProject } from '@/api/queries'
import { Seo } from '@/components/Seo'
import { Container } from '@/components/ui/Container'
import { Markdown } from '@/components/ui/Markdown'
import { Reveal } from '@/components/ui/Reveal'
import { stagger } from '@/lib/motion'
import { SmartImage } from '@/components/ui/SmartImage'
import { Tag } from '@/components/ui/Tag'
import { formatNumber } from '@/lib/format'
import { useLocale } from '@/lib/locale'
import { ErrorState, NotFoundPage, PageSkeleton } from './states'

export function ProjectPage() {
  const { slug = '' } = useParams()
  const locale = useLocale()
  const { t } = useTranslation()
  const { data: p, error, isPending, refetch } = useProject(slug, locale)

  if (isPending) return <PageSkeleton />
  if (error) return isNotFound(error) ? <NotFoundPage /> : <ErrorState onRetry={() => void refetch()} />

  const facts = [
    { label: t('project.status'), value: t(`status.${p.status}`) },
    { label: t('project.location'), value: p.location },
    p.year ? { label: t('project.year'), value: String(p.year) } : null,
    p.area_m2 ? { label: t('project.area'), value: `${formatNumber(p.area_m2, locale)} ${t('project.sqm')}` } : null,
    p.division ? { label: t('project.division'), value: p.division.name } : null,
  ].filter((f): f is { label: string; value: string } => Boolean(f?.value))

  return (
    <>
      <Seo title={`${p.title} · MegaSmart`} description={p.short_description} image={p.cover} />
      <article>
        <header className="tone-dark pb-12 pt-[calc(var(--header-h)+2.5rem)]">
          <Container className="flex flex-col gap-8">
            <Link to={`/${locale}/projects`} className="eyebrow inline-flex min-h-11 w-fit items-center gap-2 hover:underline">
              ← {t('project.backToProjects')}
            </Link>
            <div className="flex flex-wrap gap-2">
              <Tag>{t(`status.${p.status}`)}</Tag>
              {p.is_tokenized && <Tag tone="accent">{t('project.tokenized')}</Tag>}
              {p.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            <h1 className="text-hero">{p.title}</h1>
            <p className="max-w-prose text-lead text-fg-mute">{p.short_description}</p>
          </Container>
        </header>
        <div className="tone-dark">
          <Container>
            <SmartImage media={p.cover} priority className="aspect-[16/9] rounded-tile md:aspect-[21/9]" crop sizes="100vw" />
          </Container>
        </div>
        <div className="tone-dark py-16 md:py-24">
          <Container className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <dl className="flex flex-col divide-y divide-line border-y border-line lg:col-span-4">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-4">
                  <dt className="text-sm text-fg-mute">{f.label}</dt>
                  <dd className="text-right font-display font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="lg:col-span-7 lg:col-start-6">
              <Markdown>{p.body}</Markdown>
            </div>
          </Container>
        </div>
        {p.gallery.length > 0 && (
          <section className="tone-light py-16 md:py-24" aria-labelledby="gallery-title">
            <Container className="flex flex-col gap-10">
              <h2 id="gallery-title" className="text-h2">{t('project.gallery')}</h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {p.gallery.map((m, i) => (
                  <Reveal as="li" key={m.id} delay={stagger(i % 2)}>
                    <SmartImage media={m} className="aspect-[4/3] rounded-tile" crop sizes="(min-width: 640px) 50vw, 100vw" />
                  </Reveal>
                ))}
              </ul>
            </Container>
          </section>
        )}
      </article>
    </>
  )
}
