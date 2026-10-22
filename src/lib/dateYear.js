// A date typed with a two-digit year ("12-01-26" out of habit) reaches the browser's date box as year 0026, because that box accepts any
// year. This turns such a year into a four-digit one: 00-69 become 2000-2069 and 70-99 become 1970-1999. A year the person typed in full
// (2026) is never touched, and neither is a value that is not a date.
export function expandTwoDigitYear(value) {
  const m = /^(\d{4})(-\d{2}-\d{2}.*)$/.exec(value || '')
  if (!m) return value
  const year = Number(m[1])
  if (year < 1 || year > 99) return value
  return `${year + (year < 70 ? 2000 : 1900)}${m[2]}`
}

// Writes `next` into an input the way a person's typing would, so React's onChange still fires.
export function setInputValue(el, next) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, next)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
