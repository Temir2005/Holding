/**
 * A fact value as the CMS stores it — one string such as «30 000 м²», «50 листов», «2,5 км»,
 * «30+» — split into the figure and its tail, so the figure is set large and the unit as a mono
 * annotation. Thousands groups (space, no-break space, «1,500», «1.500») and a decimal comma or
 * point are understood. Returns null when the value does not start with a figure: it is then
 * shown as written.
 */
export type Fact = { prefix: string; value: number; tail: string }

export function parseFact(raw: string): Fact | null {
  const m = raw.trim().match(/^([~≈<>±]?\s*)(\d[\d\s\u00a0\u202f.,]*)(.*)$/)
  if (!m) return null
  const prefix = (m[1] ?? '').trim()
  const digits = (m[2] ?? '').replace(/[\s\u00a0\u202f]/g, '').replace(/[.,]$/, '')
  const grouped = /^\d{1,3}([.,]\d{3})+$/.test(digits)
  const value = Number(grouped ? digits.replace(/[.,]/g, '') : digits.replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return { prefix, value, tail: (m[3] ?? '').trim() }
}

/** A tail of one symbol (+, %) is set with the figure in a thin cut, not as a unit. */
export const isSymbol = (tail: string) => /^[+%]$/.test(tail)
