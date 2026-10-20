import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePinnedSteps } from '@/components/motion/usePinnedSteps'
import type { TraceBranches } from '@/components/trace/paths'
import { Container } from '@/components/ui/Container'
import { DimensionLine } from '@/components/ui/DimensionLine'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Scene } from './process/Scene'
import { DIVISION_ANCHOR, StepList } from './process/StepList'
import { pad2 } from './sectionNumber'
import { headingId, type SectionProps } from './types'

/** List mode: the line branches off the margin into the callout of every division stage. */
const divisionBranches: TraceBranches = (box) =>
  (box.anchors[DIVISION_ANCHOR] ?? [])
    .filter((p) => p.x > box.x)
    .map((p) => ({ d: `M ${box.x} ${p.y} H ${p.x}`, at: p.y }))

/**
 * «Полный цикл»: the signature moment of the site.
 * - With motion and 2+ stages: a pinned scene (process/Scene), the active stage follows the
 *   scroll position only.
 * - Reduced motion or a single stage: every stage open in a list on the line (process/StepList).
 * - No stages: the header and one line of the empty state; nothing without a header.
 */
export function ProcessStepsSection({ section }: SectionProps<'process_steps'>) {
  const { data } = section
  const { t } = useTranslation()
  const steps = data.steps
  const n = steps.length
  const sceneRef = useRef<HTMLDivElement>(null)
  const { pinned, active, progress } = usePinnedSteps(sceneRef, n)
  const hasHeader = Boolean(data.title || data.eyebrow || data.intro)
  if (!n && !hasHeader) return null
  const id = headingId(section.id)
  const range = n > 1 ? <DimensionLine label={`${pad2(1)} — ${pad2(n)}`} /> : undefined

  return (
    <Section
      tone={section.tone}
      anchor={section.anchor}
      labelledBy={data.title ? id : undefined}
      branches={pinned ? undefined : divisionBranches}
      bleed
    >
      <Container>
        <SectionHeader
          id={id}
          eyebrow={data.eyebrow}
          title={data.title}
          intro={data.intro}
          aside={data.intro ? undefined : range}
        />
      </Container>
      {pinned ? (
        <Scene steps={steps} sceneRef={sceneRef} active={active} progress={progress} />
      ) : (
        <Container>
          <div ref={sceneRef}>
            {n ? <StepList steps={steps} /> : <p className="mono-label">{t('process.empty')}</p>}
          </div>
        </Container>
      )}
    </Section>
  )
}
