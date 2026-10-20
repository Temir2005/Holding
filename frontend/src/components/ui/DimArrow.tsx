import { cn } from '@/lib/cn'

/**
 * Arrow of buttons and "more" links. On hover/focus of the parent (`group/btn` or `group/more`)
 * the shaft stretches and a start tick appears: the arrow becomes a dimension line |——>.
 */
export function DimArrow({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative block h-[11px] w-8 flex-none', className)}>
      <span className="absolute left-0 top-0 h-[11px] w-px bg-current opacity-0 transition-opacity duration-2 group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100 group-hover/more:opacity-100 group-focus-visible/more:opacity-100" />
      <span className="absolute left-3 right-px top-[5px] h-px origin-right bg-current transition-transform duration-3 ease-out group-hover/btn:scale-x-[1.62] group-focus-visible/btn:scale-x-[1.62] group-hover/more:scale-x-[1.62] group-focus-visible/more:scale-x-[1.62]" />
      <span className="absolute right-px top-[2px] h-1.5 w-1.5 rotate-45 border-r border-t border-current" />
    </span>
  )
}
