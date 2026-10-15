/** A period picked as calendar days, sent to the API as moments in the user's time zone. */

const pad = (n: number) => String(n).padStart(2, '0')

/** Local midnight of `date` as ISO 8601 with the offset: `2026-10-01T00:00:00+05:00`. */
function localMidnight(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T00:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

function parseDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Start of the first day (inclusive), or null. */
export function periodStart(day: string | null): string | null {
  const date = day ? parseDay(day) : null
  return date ? localMidnight(date) : null
}

/** Start of the day after the last one (exclusive end), or null. */
export function periodEnd(day: string | null): string | null {
  const date = day ? parseDay(day) : null
  if (!date) return null
  date.setDate(date.getDate() + 1)
  return localMidnight(date)
}
