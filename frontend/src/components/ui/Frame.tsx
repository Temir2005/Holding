import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = {
  children: ReactNode
  className?: string
  /** Mono caption under the frame (a code, a plan name). */
  caption?: ReactNode
}

/** A frame with crop marks at the corners: photos are framed like sheets, not dropped in cards. */
export function Frame({ children, className, caption }: Props) {
  return (
    <figure className={cn('relative', className)}>
      <div className="relative">
        {children}
        <span aria-hidden="true" className="crop-mark -left-2 -top-2 border-l border-t" />
        <span aria-hidden="true" className="crop-mark -right-2 -top-2 border-r border-t" />
        <span aria-hidden="true" className="crop-mark -bottom-2 -left-2 border-b border-l" />
        <span aria-hidden="true" className="crop-mark -bottom-2 -right-2 border-b border-r" />
      </div>
      {caption && <figcaption className="mono-label mt-4">{caption}</figcaption>}
    </figure>
  )
}
