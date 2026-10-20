import type { Locale } from './locale'

/**
 * Thousands separator for every locale: a no-break space (U+00A0).
 * Not Intl: for `kk` browsers disagree (some give "30,000"), and U+202F (the narrow one Intl
 * uses for ru) is missing in our subset fonts, so it would fall back to a system face.
 */
export const THOUSANDS = '\u00a0'

/** 30 000 · 18 500 · 2,5 (ru/kk) · 2.5 (en). One decimal at most, integers without. */
export function formatNumber(value: number, locale: Locale): string {
  const abs = Math.abs(value)
  const [int = '0', frac] = (Number.isInteger(value) ? String(abs) : abs.toFixed(1)).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS)
  const decimals = frac && frac !== '0' ? (locale === 'en' ? '.' : ',') + frac : ''
  return (value < 0 ? '\u2212' : '') + grouped + decimals
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}
