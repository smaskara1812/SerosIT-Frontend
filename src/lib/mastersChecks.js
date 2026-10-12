// Browser checks for master-style pages, plugged into a schema as `checkForm`
// (see MasterCrudPage). They mirror the serializer rules so a mistake shows on
// the field before a round trip; the server still checks everything.
// checkForm(form, original, today) -> { api_field: message }. `original` is the saved
// record when editing: a date is only judged when it is new or changed, so an
// old record stays editable.
const changed = (form, original, name) => !original || String(form[name] ?? '') !== String(original[name] ?? '')

export function checkRigCertificate(form, original, today) {
  const e = {}
  if (form.cert_date && form.cert_date > today && changed(form, original, 'cert_date')) e.cert_date = "Certificate Date can't be in the future."
  if (form.cert_date && form.valid_till && form.valid_till <= form.cert_date && (changed(form, original, 'cert_date') || changed(form, original, 'valid_till'))) {
    e.valid_till = 'Valid Till must be after the Certificate Date.'
  }
  return e
}

export function checkRigCertificateSchedule(form, original, today) {
  const e = {}
  if (form.scheduled_dt && form.scheduled_dt < today && changed(form, original, 'scheduled_dt')) e.scheduled_dt = "Scheduled Date can't be in the past."
  if (form.completion_dt && form.completion_dt > today && changed(form, original, 'completion_dt')) e.completion_dt = "Completion Date can't be in the future."
  return e
}

// The day after an ISO date, for a date picker that must start after another date.
export function nextDay(iso) {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
