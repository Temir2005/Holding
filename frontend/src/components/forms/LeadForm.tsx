import { type FormEvent, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useCreateLead } from '@/api/queries'
import type { LeadType } from '@/api/types'
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

const fieldClass =
  'min-h-12 w-full rounded-tile border border-line bg-tile px-4 py-3 text-base text-fg placeholder:text-fg-mute/70 focus:border-fg focus:outline-none'

export function LeadForm({ leadTypes, defaultType, consentText, successText }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname } = useLocation()
  const uid = useId()
  const mutation = useCreateLead()
  const [type, setType] = useState<LeadType>(defaultType)
  const [errors, setErrors] = useState<Errors>({})

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
      e.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
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
      <div role="status" className="flex flex-col items-start gap-6 rounded-tile bg-tile p-8">
        <p className="font-display text-h3">{successText}</p>
        <button type="button" className={buttonClass('secondary')} onClick={() => mutation.reset()}>
          {t('form.again')}
        </button>
      </div>
    )
  }

  const id = (name: string) => `${uid}-${name}`

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 rounded-tile bg-tile/60 p-5 md:p-8">
      {leadTypes.length > 1 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-mono text-xs uppercase tracking-[0.06em] text-fg-mute">{t('form.type')}</legend>
          <div className="flex flex-wrap gap-2">
            {leadTypes.map((lt) => (
              <label
                key={lt}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                  type === lt ? 'border-fg bg-fg text-surface' : 'border-line text-fg-mute hover:border-fg/50',
                )}
              >
                <input type="radio" name="type" value={lt} checked={type === lt} onChange={() => setType(lt)} className="sr-only" />
                {t(`form.types.${lt}`)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field id={id('name')} label={t('form.name')} error={errors.name}>
        <input id={id('name')} name="name" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id('name')}-error` : undefined} className={fieldClass} />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id={id('phone')} label={t('form.phone')}>
          <input id={id('phone')} name="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!errors.contact} aria-describedby={errors.contact ? `${uid}-contact-error` : undefined} className={fieldClass} />
        </Field>
        <Field id={id('email')} label={t('form.email')}>
          <input id={id('email')} name="email" type="email" autoComplete="email" aria-invalid={!!errors.contact} aria-describedby={errors.contact ? `${uid}-contact-error` : undefined} className={fieldClass} />
        </Field>
      </div>
      {errors.contact && (
        <p id={`${uid}-contact-error`} role="alert" className="-mt-2 text-sm text-accent-ink">
          {errors.contact}
        </p>
      )}

      <Field id={id('message')} label={t('form.message')} hint={t('form.optional')}>
        <textarea id={id('message')} name="message" rows={4} className={cn(fieldClass, 'resize-y')} />
      </Field>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="text-xs leading-relaxed text-fg-mute">{consentText}</p>

      {mutation.isError && (
        <p role="alert" className="text-sm text-accent-ink">{t('form.error')}</p>
      )}

      <button type="submit" disabled={mutation.isPending} className={buttonClass('primary', 'self-start')}>
        {mutation.isPending ? t('form.sending') : t('form.submit')}
      </button>
    </form>
  )
}

type FieldProps = { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }

function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex gap-2 text-sm">
        {label}
        {hint && <span className="text-fg-mute">({hint})</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-accent-ink">
          {error}
        </p>
      )}
    </div>
  )
}
