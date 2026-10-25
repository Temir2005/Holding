import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useCreateLead } from '@/api/queries'
import type { LeadType } from '@/api/types'
import { Arrow } from '@/components/site/kit'
import { useLocale } from '@/lib/locale'

type Props = {
  leadTypes: LeadType[]
  defaultType: LeadType
  consentText: string
  successText: string
}

type Errors = Partial<Record<'name' | 'contact', string>>

/** Lead form: a white card on the section photo. Saves a lead through the public API. */
export function LeadForm({ leadTypes, defaultType, consentText, successText }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { pathname } = useLocation()
  const uid = useId()
  const mutation = useCreateLead()
  const [type, setType] = useState<LeadType>(defaultType)
  const [errors, setErrors] = useState<Errors>({})
  const successRef = useRef<HTMLDivElement>(null)
  // the confirmation keeps the form's height, so the page below does not jump
  const formHeight = useRef(0)

  useEffect(() => {
    if (mutation.isSuccess) successRef.current?.focus()
  }, [mutation.isSuccess])

  // a vacancy's "apply" button preselects the candidate topic and fills the message
  useEffect(() => {
    const onApply = (e: Event) => {
      const title = (e as CustomEvent<string>).detail
      if (leadTypes.includes('candidate')) setType('candidate')
      const field = document.getElementById(`${uid}-message`)
      if (field instanceof HTMLTextAreaElement && title) field.value = title
    }
    window.addEventListener('lead:apply', onApply)
    return () => window.removeEventListener('lead:apply', onApply)
  }, [leadTypes, uid])

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
      const first = e.currentTarget.elements.namedItem(next.name ? 'name' : 'phone')
      if (first instanceof HTMLElement) first.focus()
      return
    }

    formHeight.current = e.currentTarget.offsetHeight
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
        className="form"
        style={{ minHeight: formHeight.current || undefined }}
      >
        <div className="form__ok">
          <p>{successText}</p>
          <button type="button" className="btn btn--ink" onClick={() => mutation.reset()}>
            {t('form.again')}
          </button>
        </div>
      </div>
    )
  }

  const id = (name: string) => `${uid}-${name}`
  const contactError = errors.contact ? id('contact-error') : undefined

  return (
    <form noValidate onSubmit={onSubmit} className="form">
      {leadTypes.length > 1 && (
        <fieldset className="seg" aria-label={t('form.type')}>
          {leadTypes.map((lt) => (
            <label key={lt}>
              <input
                type="radio"
                name="type"
                value={lt}
                checked={type === lt}
                onChange={() => setType(lt)}
              />
              <span>{t(`form.types.${lt}`)}</span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="f" htmlFor={id('name')}>
        {t('form.name')}
        <input
          id={id('name')}
          name="name"
          autoComplete="name"
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? id('name-error') : undefined}
        />
      </label>
      {errors.name && (
        <p id={id('name-error')} role="alert" className="err">
          {errors.name}
        </p>
      )}
      <div className="two">
        <label className="f" htmlFor={id('phone')}>
          {t('form.phone')}
          <input
            id={id('phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={!!errors.contact}
            aria-describedby={contactError}
          />
        </label>
        <label className="f" htmlFor={id('email')}>
          {t('form.email')}
          <input
            id={id('email')}
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.contact}
            aria-describedby={contactError}
          />
        </label>
      </div>
      {errors.contact && (
        <p id={contactError} role="alert" className="err">
          {errors.contact}
        </p>
      )}
      <label className="f" htmlFor={id('message')}>
        {t('form.message')}
        <textarea id={id('message')} name="message" rows={3} />
      </label>
      {/* honeypot: invisible to people, tempting to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {mutation.isError && (
        <p role="alert" className="err">
          {t('form.error')}
        </p>
      )}
      <button type="submit" className="btn btn--accent" disabled={mutation.isPending}>
        {mutation.isPending ? t('form.sending') : t('form.submit')}
        {!mutation.isPending && <Arrow />}
      </button>
      <small>{consentText}</small>
    </form>
  )
}
