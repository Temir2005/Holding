import type { Person } from '@/api/types'
import { PersonCard } from '@/components/cards/PersonCard'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'

/*
 * Slots of the editorial grid: column, width, drop from the row top and the frame proportion.
 * Desktop works in rows of three that alternate a large portrait on the left and on the right,
 * so the page has a rhythm of sizes and heights instead of equal cards. Every breakpoint sets
 * all of its properties, so nothing leaks from the smaller one. Literal strings for Tailwind.
 */
type Slot = { place: string; frame: string }

// phone: pairs, the second drops lower and is taller
const BASE: Slot[] = [
  { place: 'col-start-1 col-span-6 mt-0', frame: 'aspect-[4/5]' },
  { place: 'col-start-7 col-span-6 mt-16', frame: 'aspect-[3/4]' },
]
const BASE_LAST = 'col-start-1 col-span-8 mt-0'

// tablet: pairs, a wide portrait and a narrow one, swapping sides every row
const MD: Slot[] = [
  { place: 'md:col-start-1 md:col-span-7 md:mt-0', frame: 'md:aspect-[4/5]' },
  { place: 'md:col-start-9 md:col-span-4 md:mt-24', frame: 'md:aspect-[3/4]' },
  { place: 'md:col-start-2 md:col-span-4 md:mt-32', frame: 'md:aspect-[3/4]' },
  { place: 'md:col-start-7 md:col-span-6 md:mt-0', frame: 'md:aspect-[4/5]' },
]
const MD_LAST = 'md:col-start-3 md:col-span-6 md:mt-0'

// desktop: rows of three, the large portrait left, then right
const LG3: Slot[] = [
  { place: 'lg:col-start-1 lg:col-span-5 lg:mt-0', frame: 'lg:aspect-[4/5]' },
  { place: 'lg:col-start-7 lg:col-span-3 lg:mt-24', frame: 'lg:aspect-[3/4]' },
  { place: 'lg:col-start-10 lg:col-span-3 lg:mt-48', frame: 'lg:aspect-[4/5]' },
  { place: 'lg:col-start-1 lg:col-span-3 lg:mt-40', frame: 'lg:aspect-[3/4]' },
  { place: 'lg:col-start-5 lg:col-span-3 lg:mt-12', frame: 'lg:aspect-[4/5]' },
  { place: 'lg:col-start-8 lg:col-span-5 lg:mt-0', frame: 'lg:aspect-[4/5]' },
]
// an incomplete last row of desktop
const LG2: Slot[] = [
  { place: 'lg:col-start-2 lg:col-span-4 lg:mt-0', frame: 'lg:aspect-[4/5]' },
  { place: 'lg:col-start-8 lg:col-span-4 lg:mt-24', frame: 'lg:aspect-[3/4]' },
]
const LG1: Slot = { place: 'lg:col-start-4 lg:col-span-5 lg:mt-0', frame: 'lg:aspect-[4/5]' }

const pick = <T,>(list: T[], i: number): T => list[i % list.length] as T

/** Classes of the i-th of n portraits at every breakpoint. */
function slotOf(i: number, n: number) {
  const lastAlone = (size: number) => n % size !== 0 && i === n - 1 && n % size === 1
  const base = lastAlone(2) ? { place: BASE_LAST, frame: 'aspect-[4/5]' } : pick(BASE, i)
  const md = lastAlone(2) ? { place: MD_LAST, frame: 'md:aspect-[4/5]' } : pick(MD, i)
  const rowStart = i - (i % 3)
  const inRow = Math.min(3, n - rowStart)
  const lg = inRow === 3 ? pick(LG3, i) : inRow === 2 ? pick(LG2, i - rowStart) : LG1
  return {
    place: cn(base.place, md.place, lg.place),
    frame: cn(base.frame, md.frame, lg.frame),
    wide: lg.place.includes('span-5'),
  }
}

/** Key people: an editorial grid of portraits of different sizes and heights. */
export function KeyPeople({ people }: { people: Person[] }) {
  return (
    <ul role="list" className="grid grid-cols-12 gap-x-gap gap-y-16 md:gap-y-20 lg:gap-y-24">
      {people.map((p, i) => {
        const slot = slotOf(i, people.length)
        return (
          <li key={p.id} className={slot.place}>
            <PersonCard
              person={p}
              index={i}
              frameClassName={slot.frame}
              delay={stagger(i % 3)}
              sizes={
                slot.wide ? '(min-width: 1024px) 40vw, 55vw' : '(min-width: 1024px) 25vw, 50vw'
              }
            />
          </li>
        )
      })}
    </ul>
  )
}
