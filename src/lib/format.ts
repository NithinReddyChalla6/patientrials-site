/** Formatting helpers. Kept pure so they are trivially testable and reusable. */

const DATE = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(iso: string | undefined | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : DATE.format(d)
}

export function formatDateTime(iso: string | undefined | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : DATE_TIME.format(d)
}

/** "3 days ago" / "in 2 weeks" — relative when recent, absolute when not. */
export function formatRelative(iso: string | undefined | null) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffDays = Math.round((then - Date.now()) / 86_400_000)
  if (Math.abs(diffDays) > 30) return formatDate(iso)
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  return rtf.format(diffDays, 'day')
}

export function formatAddress(a: {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}) {
  return [a.street, a.city, a.state, a.zip, a.country].filter(Boolean).join(', ')
}

/** "1,204" — counts appear in tiles and table footers all over the console. */
export function formatCount(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${formatCount(n)} ${n === 1 ? one : many}`
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Turn an HTML date input value (yyyy-mm-dd) into a display date. */
export function isoFromDateInput(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : ''
}
