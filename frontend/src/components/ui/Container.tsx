import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-container px-[var(--gutter)]', className)}>
      {children}
    </div>
  )
}
