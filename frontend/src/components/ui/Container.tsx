import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Content area of a sheet: the wide left margin holds the red line, the right one is narrower.
 * Beyond --sheet-max the content is centred and the line stays in the margin.
 */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-sheet pl-pad-l pr-pad-r', className)}>{children}</div>
  )
}
