// Small helpers for the Birthday Mailer and Scheduled Mails pages. Dates and times arrive as naive local text (no time zone), like everywhere else.

const parse = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso) : null)

export function fmtDay(iso) {
  const d = parse(iso)
  return d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : ''
}
export function fmtDayYear(iso) {
  const d = parse(iso)
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}
export function fmtTime(iso) {
  const d = parse(iso)
  return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''
}
export const fmtWhen = (iso) => (iso ? `${fmtDay(iso)} ${fmtTime(iso)}` : '')

// "in 3 days", "today", "tomorrow" for a date
export function inDays(iso) {
  const d = parse(iso)
  if (!d) return ''
  const t = new Date()
  const n = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000)
  return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 ? `in ${n} days` : n === -1 ? 'yesterday' : `${-n} days ago`
}

export function agoText(minutes) {
  if (minutes == null) return 'never'
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const h = Math.floor(minutes / 60)
  return h < 24 ? `${h} h ${minutes % 60} min ago` : `${Math.floor(h / 24)} days ago`
}

export const STATUS_STYLE = {
  planned: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  sending: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  sent: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-red-500/12 text-red-700 dark:text-red-300',
  skipped: 'bg-muted text-muted-foreground',
  missed: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  cancelled: 'bg-muted text-muted-foreground',
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
