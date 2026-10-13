import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Loader2
      aria-hidden="true"
      size={size}
      className={cn('animate-spin motion-reduce:animate-none', className)}
    />
  )
}
