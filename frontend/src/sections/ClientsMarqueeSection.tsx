import { useReducedMotion } from 'framer-motion'
import type { Client } from '@/api/types'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SmartImage } from '@/components/ui/SmartImage'
import { headingId, type SectionProps } from './types'

/** Logos sit on stone tiles, like samples on a dealer's board. */
export function ClientLogo({ client }: { client: Client }) {
  return (
    <div className="tone-light flex h-24 items-center justify-center rounded-tile px-6 grayscale transition duration-300 hover:grayscale-0">
      {client.logo ? (
        <SmartImage media={client.logo} className="h-10 w-auto max-w-[12rem]" fit="contain" />
      ) : (
        <span className="font-display font-bold">{client.name}</span>
      )}
    </div>
  )
}

export function ClientsMarqueeSection({ section }: SectionProps<'clients_marquee'>) {
  const { data } = section
  const reduce = useReducedMotion()
  if (!data.clients.length) return null
  return (
    <Section tone={section.tone} anchor={section.anchor} bleed labelledBy={headingId(section.id)}>
      <Container>
        <SectionHeader id={headingId(section.id)} eyebrow={data.eyebrow} title={data.title} />
      </Container>
      {reduce ? (
        <Container>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {data.clients.map((c) => (
              <li key={c.id}><ClientLogo client={c} /></li>
            ))}
          </ul>
        </Container>
      ) : (
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          {/* Two copies of the list scroll as one loop; the copy is hidden from screen readers. */}
          <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-2 hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex gap-2" aria-hidden={copy === 1 || undefined}>
                {data.clients.map((c) => (
                  <li key={c.id} className="w-56 shrink-0"><ClientLogo client={c} /></li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}
