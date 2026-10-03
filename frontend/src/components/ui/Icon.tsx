import { cn } from '@/lib/cn'

/**
 * Icon keys the CMS can reference (`icon` fields in section data).
 * Unknown keys fall back to a neutral square, so a typo never breaks a section.
 */
const PATHS: Record<string, string> = {
  factory: 'M3 21V10l5 3V10l5 3V5h3v16M3 21h18M16 9h5v12',
  ruler: 'M4 16 16 4l4 4L8 20zM8 12l2 2M11 9l2 2M14 6l2 2',
  shield: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  key: 'M14 10a4 4 0 1 0-1.2 2.8L21 21M17 17l2-2M15 15l2-2',
  square: 'M5 5h14v14H5z',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  palette: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-1 2-3 2-4a9 9 0 0 0-9-8zM7.5 11h.01M10 7h.01M15 7h.01',
  fingerprint: 'M7 11a5 5 0 0 1 10 0v2M12 11v4c0 2 1 4 2 5M9 13c0 3 1 5 2 7M5 9a8 8 0 0 1 14 0M17 16v1',
  leaf: 'M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7',
  sofa: 'M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M2 12h20v5H2zM5 17v2M19 17v2',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  building: 'M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4',
  store: 'M4 9l2-5h12l2 5M4 9v11h16V9M4 9h16M10 20v-6h4v6',
  split: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3zM3 7V5a1 1 0 0 1 1-1h12M16 13h2',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  hammer: 'M14 4l6 6-3 3-6-6zM11 7 3 15l3 3 8-8',
  check: 'M4 12l5 5L20 6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
}

type Props = { name: string; className?: string }

export function Icon({ name, className }: Props) {
  const d = PATHS[name] ?? PATHS.square
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      <path d={d} />
    </svg>
  )
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" className={cn('h-5 w-5', className)}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
