import { Facts, Head, Sec } from '@/components/site/kit'
import type { SectionProps } from './types'

/** Key figures with counters. */
export function StatsSection({ section }: SectionProps<'stats'>) {
  const d = section.data
  return (
    <Sec tone={section.tone} anchor={section.anchor}>
      <div className="wrap">
        <Head eyebrow={d.eyebrow} title={d.title} />
        <Facts stats={d.stats} />
      </div>
    </Sec>
  )
}
