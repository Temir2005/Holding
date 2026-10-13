import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'
import { buttonClass, type ButtonSize, type ButtonVariant } from './styles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonClass(variant, size), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </button>
  )
})

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClass(variant, size), className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
