import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-tile bg-tile motion-safe:animate-pulse', className)} />
}
