import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useCreateLead } from '@/api/queries'
import type { LeadType } from '@/api/types'
import { DimArrow } from '@/components/ui/DimArrow'
import { buttonClass } from '@/lib/button'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'

type Props = {
  leadTypes: LeadType[]
  defaultType: LeadType
  consentText: string
  successText: string
}

type Errors = Partial<Record<'name' | 'contact', string>>

/**
 * Fields of a drawing form: no boxes, a hairline baseline that turns into a 2px pen stroke on
 * focus (the focus indicator) and the accent colour on error. 48px+ tall for touch.
 */
const fieldClass = cn(
  'block min-h-12 w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3',
  'text-lead text-fg placeholder:text-fg-mute/70 transition-[border-color,box-shadow] duration-1',
  'hover:border-fg focus:border-trace focus:shadow-[inset_0_-1px_0_rgb(var(--trace))] focus:outline-none',
  'aria-[invalid=true]:border-accent aria-[invalid=true]:shadow-[inset_0_-1px_0_rgb(var(--accent))]',
)

export function LeadForm({ leadTypes, defaultType, consentText, successText }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname } = useLocation()
  const uid = useId()
  const mutation = useCreateLead()
  const [type, setType] = useState<LeadType>(defaultType)
  const [errors, setErrors] = useState<Errors>({})
  const successRef = useRef<HTMLDivElement>(null)

  // The form is replaced by the confirmation: move focus there so keyboard users are not lost.
  useEffect(() => {
    if (mutation.isSuccess) successRef.current?.focus()
  }, [mutation.isSuccess])

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim() || null
    const name = value('name')
    const phone = value('phone')
    const email = value('email')

    const next: Errors = {}
    if (!name || name.length < 2) next.name = t('form.nameRequired')
    if (!phone && !email) next.contact = t('form.contactRequired')
    setErrors(next)
    if (Object.keys(next).length) {
      // aria-invalid is not rendered yet at this point: focus the first bad field by name.
      const first = e.currentTarget.elements.namedItem(next.name ? 'name' : 'phone')
      if (first instanceof HTMLElement) first.focus()
      return
    }

    mutation.mutate({
      name: name ?? '',
      phone,
      email,
      message: value('message'),
      type,
      source_page: pathname,
      locale,
      website: value('website'),
    })
  }

  if (mutation.isSuccess) {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="flex flex-col items-start gap-8 border-t border-fg pt-8 focus:outline-none"
      >
        <p className="flex items-start gap-4 text-subtitle font-medium">
          <span aria-hidden="true" className="mt-[0.4em] h-3 w-3 flex-none bg-trace" />
          {successText}
        </p>
        <button type="button" className={buttonClass('secondary')} onClick={() => mutation.reset()}>
          {t('form.again')}
        </button>
      </div>
    )
  }

  const id = (name: string) => `${uid}-${name}`
  const contactError = errors.contact ? `${uid}-contact-error` : undefined

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-8 border-t border-fg pt-5">
      {leadTypes.length > 1 && (
        <fieldset>
          <legend className="mono-label mb-3">{t('form.type')}</legend>
          {/* Segments: hairline cells that close every row (the last row stretches). */}
          <div className="flex flex-wrap border-l border-t border-line">
            {leadTypes.map((lt) => {
              const on = type === lt
              return (
                <label
                  key={lt}
                  className={cn(
                    'relative flex min-h-14 flex-1 basis-[9rem] cursor-pointer items-center gap-3 border-b border-r border-line px-3 sm:basis-[10.5rem] sm:px-4',
                    'font-mono text-caption font-medium uppercase transition-colors duration-1',
                    'has-[:focus-visible]:z-10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--accent-ink))]',
                    on ? 'bg-surface-2 text-fg' : 'text-fg-mute hover:text-fg',
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={lt}
                    checked={on}
                    onChange={() => setType(lt)}
                    className="sr-only"
                  />
                  {/* the legend square of the drawing: empty, or filled with the line colour */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-2.5 w-2.5 flex-none border transition-colors duration-1',
                      on ? 'border-trace bg-trace' : 'border-current',
                    )}
                  />
                  {t(`form.types.${lt}`)}
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      <Field id={id('name')} label={t('form.name')} error={errors.name}>
        <input
          id={id('name')}
          name="name"
          autoComplete="name"
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${id('name')}-error` : undefined}
          className={fieldClass}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-gap">
          <Field id={id('phone')} label={t('form.phone')}>
            <input
              id={id('phone')}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={!!errors.contact}
              aria-describedby={contactError}
              className={cn(fieldClass, 'tabular')}
            />
          </Field>
          <Field id={id('email')} label={t('form.email')}>
            <input
              id={id('email')}
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.contact}
              aria-describedby={contactError}
              className={fieldClass}
            />
          </Field>
        </div>
        {errors.contact && <ErrorText id={contactError}>{errors.contact}</ErrorText>}
      </div>

      <Field id={id('message')} label={t('form.message')} hint={t('form.optional')}>
        <textarea
          id={id('message')}
          name="message"
          rows={3}
          className={cn(fieldClass, 'resize-y')}
        />
      </Field>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-5">
        <p className="max-w-[60ch] text-[0.8125rem] leading-relaxed text-fg-mute">{consentText}</p>
        {mutation.isError && <ErrorText>{t('form.error')}</ErrorText>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className={buttonClass('primary', 'w-full sm:w-auto sm:self-start')}
        >
          <span>{mutation.isPending ? t('form.sending') : t('form.submit')}</span>
          <DimArrow />
        </button>
        <p aria-live="polite" className="sr-only">
          {mutation.isPending ? t('form.sending') : ''}
        </p>
      </div>
    </form>
  )
}

type FieldProps = { id: string; label: string; hint?: string; error?: string; children: ReactNode }

function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mono-label flex justify-between gap-4">
        <span>{label}</span>
        {hint && <span className="normal-case tracking-normal">{hint}</span>}
      </label>
      {children}
      {error && (
        <ErrorText id={`${id}-error`} className="mt-3">
          {error}
        </ErrorText>
      )}
    </div>
  )
}

/** Error under a field: announced at once, marked with a square so it does not rely on colour. */
function ErrorText({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn('flex items-start gap-2 text-sm text-accent-ink', className)}
    >
      <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 flex-none bg-current" />
      {children}
    </p>
  )
}
