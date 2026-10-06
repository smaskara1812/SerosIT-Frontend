import { toast } from 'sonner'

// Turns what the server sends back when a save is refused into something an
// end user can act on — never the developer-facing wording ("This field may
// not be null", "Drill Dt", "Invalid pk ..."). Required fields are rolled
// into one sentence ("Please fill in: Drill Date, Type of Drill and PIC /
// OIM."), everything else becomes a plain instruction naming the field as it
// appears on the screen.
//
// formatApiError(data, labels): `labels` is optional and tells it how each
// field is named *on this form* — either a masters schema ({ fields: [{ name,
// label }] }) or a plain { api_field: 'On-screen label' } map. Anything it
// isn't told about is worded from the field name (drill_dt -> "Drill Date").

const WORDS = {
  dt: 'Date', no: 'No.', emp: 'Employee', hdr: 'Report', dtl: 'Detail', qty: 'Quantity', amt: 'Amount',
  hse: 'HSE', oim: 'OIM', pic: 'PIC', lti: 'LTI', npt: 'NPT', ssid: 'SSID', url: 'URL', ip: 'IP',
}
const DROP = new Set(['id', 'fs'])

function humanize(key) {
  const parts = key.split('_').filter((p) => p && !DROP.has(p.toLowerCase()))
  return (
    parts
      .map((p) => WORDS[p.toLowerCase()] || p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
      .trim() || 'This field'
  )
}

function labelFor(key, labels) {
  const fromSchema = labels?.fields?.find((f) => f.name === key)?.label
  if (fromSchema) return fromSchema
  const direct = labels?.labels ? labels.labels[key] : labels && !labels.fields ? labels[key] : undefined
  return direct || humanize(key)
}

// Server wording we recognise -> a plain sentence. `req` marks the "you left
// this empty" family, which gets rolled into one combined sentence.
const RULES = [
  { re: /this field is required|may not be (null|blank)|cannot be (null|blank)|must be entered|must be selected/i, req: true },
  { re: /no more than (\d+) characters/i, say: (l, m) => `${l} is too long — please keep it to ${m[1]} characters or fewer.` },
  { re: /at least (\d+) characters/i, say: (l, m) => `${l} is too short — please enter at least ${m[1]} characters.` },
  { re: /valid integer|whole number/i, say: (l) => `${l} must be a whole number.` },
  { re: /valid number|a number is required/i, say: (l) => `${l} must be a number.` },
  { re: /no more than (\d+) digits|no more than (\d+) decimal/i, say: (l) => `${l} has too many digits — please enter a smaller number.` },
  { re: /datetime has wrong format|date\/time/i, say: (l) => `${l} must be a valid date and time.` },
  { re: /date has wrong format|valid date/i, say: (l) => `${l} must be a valid date.` },
  { re: /time has wrong format|valid time/i, say: (l) => `${l} must be a valid time.` },
  { re: /greater than or equal to ([\d.-]+)/i, say: (l, m) => `${l} must be ${m[1]} or more.` },
  { re: /less than or equal to ([\d.-]+)/i, say: (l, m) => `${l} must be ${m[1]} or less.` },
  { re: /invalid pk|does not exist|incorrect type|not a valid choice|valid choice|invalid choice/i, say: (l) => `Please choose a valid ${l}.` },
  { re: /already exists|must make a unique set|already used/i, say: (l) => `${l} is already in use — please enter a different one.` },
  { re: /valid email/i, say: (l) => `${l} must be a valid email address.` },
]

const GENERIC = {
  'Authentication credentials were not provided.': 'Your session has expired. Please sign in again.',
  'Given token not valid for any token type': 'Your session has expired. Please sign in again.',
  'You do not have permission to perform this action.': "You don't have permission to do this.",
  'Not found.': 'This record no longer exists — it may have been deleted by someone else.',
  'Method “DELETE” not allowed.': "This can't be deleted.",
  'Method "DELETE" not allowed.': "This can't be deleted.",
}

function plainText(text) {
  return GENERIC[text] || text
}

// Short message for under a highlighted field (the field itself is already
// pointed at, so "required" needs no label).
export function fieldMessage(msg, label) {
  const rule = RULES.find((r) => r.re.test(msg))
  if (rule?.req) return 'This is required.'
  if (rule) return rule.say(label, msg.match(rule.re))
  return plainText(msg)
}

// {api_field: 'short note'} for outlining each rejected field on the form.
// Only per-field errors — whole-form messages (detail / error /
// non_field_errors) stay in the banner.
export function buildFieldErrors(data, labels) {
  const out = {}
  if (!data || typeof data !== 'object') return out
  for (const [key, val] of Object.entries(data)) {
    if (key === 'detail' || key === 'error' || key === 'non_field_errors') continue
    const msg = Array.isArray(val) ? val[0] : val
    if (typeof msg === 'string') out[key] = fieldMessage(msg, labelFor(key, labels))
  }
  return out
}

export function formatApiError(data, labels) {
  if (!data || typeof data !== 'object') {
    return "Something went wrong and your changes weren't saved. Please try again."
  }
  if (typeof data.detail === 'string') return plainText(data.detail)
  if (typeof data.error === 'string') return plainText(data.error)

  const missing = []
  const lines = []
  for (const [key, val] of Object.entries(data)) {
    const msg = Array.isArray(val) ? val[0] : val
    if (typeof msg !== 'string') continue
    if (key === 'non_field_errors') {
      lines.push(/must make a unique set|already exists/i.test(msg) ? 'This combination already exists — please change one of the values.' : plainText(msg))
      continue
    }
    const label = labelFor(key, labels)
    const rule = RULES.find((r) => r.re.test(msg))
    if (rule?.req) missing.push(label)
    else if (rule) lines.push(rule.say(label, msg.match(rule.re)))
    // A message our own server wrote is already plain English — show it
    // as-is, without prefixing the field name it already talks about.
    else lines.push(msg.toLowerCase().includes(label.toLowerCase()) ? msg : `${label}: ${msg}`)
  }
  if (missing.length) {
    const list = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0]
    lines.unshift(`Please fill in ${list}.`)
  }
  return lines.length ? lines.join('\n') : "Your changes weren't saved. Please check the form and try again."
}

// One place that reports a failed save everywhere: sets the form's error
// banner, raises a toast carrying the SAME plain-language message (never a
// bare "Failed to save"), and scrolls the banner into view so it isn't
// missed at the far end of a long form.
export function showFormError(message, { setError, bannerRef } = {}) {
  setError?.(message)
  const first = message.split('\n').find((l) => l && !l.startsWith('Please fix')) || message
  toast.error(first.length > 140 ? `${first.slice(0, 137)}…` : first, {
    description: message.split('\n').filter((l) => l && l !== first && !l.startsWith('Please fix')).length
      ? 'More details are shown at the top of the form.'
      : undefined,
  })
  requestAnimationFrame(() => bannerRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

// After a failed save, bring the first outlined field into view.
export function scrollToFirstFieldError() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.querySelector('[data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  )
}
