import type { Person } from '@/api/types'
import { SmartImage } from '@/components/ui/SmartImage'

type Props = { person: Person; onOpen?: () => void; compact?: boolean }

export function PersonCard({ person, onOpen, compact }: Props) {
  const body = (
    <>
      <SmartImage
        media={person.photo}
        sizes="(min-width: 1024px) 25vw, 50vw"
        className="aspect-[4/5] rounded-tile"
        crop
      />
      <div className="flex flex-col gap-1 text-left">
        <h3 className={compact ? 'text-base' : 'text-h3'}>{person.full_name}</h3>
        <p className="text-sm text-fg-mute">{person.position}</p>
        {person.division && !compact && (
          <p className="font-mono text-xs text-accent-ink">{person.division.name}</p>
        )}
      </div>
    </>
  )
  if (!onOpen) return <div className="flex flex-col gap-4">{body}</div>
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-4 rounded-tile [&_img]:motion-safe:transition-transform [&_img]:motion-safe:duration-700 hover:[&_img]:scale-[1.03]"
    >
      {body}
    </button>
  )
}
