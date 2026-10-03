import { cn } from '@/lib/cn'

type Option = { value: string; label: string }

type Props = {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** Chip filter. A radio group under the hood, so it works with the keyboard. */
export function Filter({ label, options, value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm transition-colors',
              active
                ? 'border-fg bg-fg text-surface'
                : 'border-line text-fg-mute hover:border-fg/50 hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
