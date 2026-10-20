import { cn } from '@/lib/cn'

/** Loading placeholder: the hatched plate of the tone, part of the drawing rather than a grey box. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('plate motion-safe:animate-pulse', className)} />
}
