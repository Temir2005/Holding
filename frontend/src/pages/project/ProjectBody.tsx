import { useTranslation } from 'react-i18next'
import type { Project } from '@/api/types'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Markdown } from '@/components/ui/Markdown'
import { Reveal } from '@/components/ui/Reveal'
import { Section } from '@/components/ui/Section'
import { Tag } from '@/components/ui/Tag'

/**
 * Description of the project: the meta row, the tags in the narrow left column like the notes
 * of a sheet, the Markdown body on the reading measure from the fifth column.
 * Nothing to show (no body, no tags): the sheet is left out.
 */
export function ProjectBody({ project: p }: { project: Project }) {
  const { t } = useTranslation()
  const body = p.body.trim()
  if (!body && !p.tags.length) return null

  return (
    <Section tone="light">
      <Reveal className="mb-12 border-b border-line pb-4 md:mb-20">
        <Eyebrow numbered={false}>{t('projectPage.about')}</Eyebrow>
      </Reveal>
      <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-12 lg:gap-x-gap">
        {p.tags.length > 0 && (
          <div className="lg:col-span-3">
            <p className="mono-label mb-4">{t('projectPage.tags')}</p>
            <ul role="list" className="flex flex-wrap gap-2">
              {p.tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          </div>
        )}
        {body && (
          <Reveal className="min-w-0 lg:col-span-7 lg:col-start-5">
            {/* the project title is the page h1: the description starts at h2 */}
            <Markdown headingFloor={2}>{body}</Markdown>
          </Reveal>
        )}
      </div>
    </Section>
  )
}
