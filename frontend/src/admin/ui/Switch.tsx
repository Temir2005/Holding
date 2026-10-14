import * as RadixSwitch from '@radix-ui/react-switch'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/cn'

/** On/off toggle; give it a label (`<label htmlFor>` or `aria-label`). */
export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof RadixSwitch.Root>
>(function Switch({ className, ...rest }, ref) {
  return (
    <RadixSwitch.Root
      ref={ref}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors data-[state=checked]:bg-accent disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-panel shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </RadixSwitch.Root>
  )
})
