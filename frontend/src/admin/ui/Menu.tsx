import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Menu = RadixMenu.Root
export const MenuTrigger = RadixMenu.Trigger

export function MenuContent({
  children,
  align = 'end',
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className="z-modal min-w-56 rounded-lg border border-line bg-panel p-1 text-fg shadow-lg"
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  )
}

export function MenuItem({
  icon,
  children,
  onSelect,
  danger,
}: {
  icon?: ReactNode
  children: ReactNode
  onSelect?: () => void
  danger?: boolean
}) {
  return (
    <RadixMenu.Item
      onSelect={onSelect}
      className={cn(
        'flex min-h-touch cursor-pointer select-none items-center gap-2 rounded px-2 text-sm outline-none md:min-h-9',
        'data-[highlighted]:bg-sunken data-[disabled]:opacity-50',
        danger && 'text-danger',
      )}
    >
      {icon && <span className="text-mute">{icon}</span>}
      {children}
    </RadixMenu.Item>
  )
}

export const MenuSeparator = () => <RadixMenu.Separator className="my-1 h-px bg-line" />

export function MenuLabel({ children }: { children: ReactNode }) {
  return <RadixMenu.Label className="px-2 py-1.5 text-xs text-mute">{children}</RadixMenu.Label>
}

export const MenuRadioGroup = RadixMenu.RadioGroup

export function MenuRadioItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixMenu.RadioItem
      value={value}
      className="flex min-h-touch cursor-pointer select-none items-center gap-2 rounded px-2 text-sm outline-none data-[highlighted]:bg-sunken md:min-h-9"
    >
      <span className="flex w-4 justify-center">
        <RadixMenu.ItemIndicator>
          <span className="block h-2 w-2 rounded-full bg-accent-ink" />
        </RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.RadioItem>
  )
}
