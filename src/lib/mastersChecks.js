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

const blank = (v) => v === null || v === undefined || String(v).trim() === ''

export function checkRig(form, original, today) {
  const e = {}
  const name = (form.rig_name || '').trim()
  if (name && changed(form, original, 'rig_name')) {
    if (!/[A-Za-z]/.test(name)) e.rig_name = 'Rig Name must contain letters.'
    else if ((name.match(/\d/g) || []).length > 2) e.rig_name = 'Rig Name can have at most two digits.'
  }
  const short = (form.rig_short_name || '').trim()
  if (short && changed(form, original, 'rig_short_name') && !/^[A-Za-z0-9]+$/.test(short)) e.rig_short_name = 'Short Name can have only letters and digits.'
  if (form.rig_built_dt && form.rig_built_dt > today && changed(form, original, 'rig_built_dt')) e.rig_built_dt = "Built date can't be in the future."
  for (const [f, label] of [['rig_tel_no', 'Telephone'], ['rig_fax_no', 'Fax']]) {
    const v = (form[f] || '').trim()
    if (v && changed(form, original, f) && !/^[0-9/]+$/.test(v)) e[f] = `${label} can have only digits and forward slashes.`
  }
  if (form.rig_from && changed(form, original, 'rig_from')) {
    if (form.rig_from > today) e.rig_from = "From date can't be in the future."
    else if (form.rig_built_dt && form.rig_from < form.rig_built_dt) e.rig_from = "From date can't be before the Built date."
  }
  return e
}

export function checkOperator(form, original) {
  const e = {}
  const tel = (form.tel_no || '').trim()
  if (tel && changed(form, original, 'tel_no')) {
    if (!/^[0-9+()/ -]+$/.test(tel)) e.tel_no = 'Telephone can have only digits and + - ( ) / and spaces.'
    else if ((tel.match(/\d/g) || []).length < 8) e.tel_no = 'Telephone must have at least 8 digits.'
  }
  return e
}

// From not in the future, To not before From (equal allowed), for a mapping with a From/To pair.
function checkFromTo(form, original, today, from, to, e) {
  if (form[from] && form[from] > today && changed(form, original, from)) e[from] = "From date can't be in the future."
  if (form[from] && form[to] && form[to] < form[from] && (changed(form, original, from) || changed(form, original, to))) e[to] = "To date can't be before the From date."
}

export function checkCostCentreMapping(form, original, today) {
  const e = {}
  checkFromTo(form, original, today, 'mapping_from', 'mapping_to', e)
  return e
}

// User Rig Mapping and User Category Mapping share the same From/To pair as the cost centre mapping.
export const checkMappingDates = checkCostCentreMapping

export function checkDocToSign(form, original, today) {
  const e = {}
  checkFromTo(form, original, today, 'sign_from', 'sign_to', e)
  return e
}

export function checkRigSiteMapping(form, original, today) {
  const e = {}
  const addr = (form.camp_office_addr || '').trim()
  if (addr && addr.length < 10 && changed(form, original, 'camp_office_addr')) e.camp_office_addr = 'Enter the full camp office address (at least 10 characters).'
  for (const n of ['1', '2']) {
    const tel = (form[`contact_tel_no_${n}`] || '').trim()
    if (tel && changed(form, original, `contact_tel_no_${n}`) && !/^\d{7,10}$/.test(tel)) e[`contact_tel_no_${n}`] = 'Enter a valid telephone number (7 to 10 digits, digits only).'
    if (tel && !e[`contact_tel_no_${n}`] && blank(form[`contact_fs_emp_${n}`]) && (changed(form, original, `contact_tel_no_${n}`) || changed(form, original, `contact_fs_emp_${n}`))) {
      e[`contact_tel_no_${n}`] = `Enter Contact Person ${n} for this telephone number.`
    }
  }
  const a = form.contact_fs_emp_1
  const b = form.contact_fs_emp_2
  if (!blank(a) && String(a) === String(b) && (changed(form, original, 'contact_fs_emp_1') || changed(form, original, 'contact_fs_emp_2'))) {
    e.contact_fs_emp_2 = 'Contact Person 2 must be a different person from Contact Person 1.'
  }
  checkFromTo(form, original, today, 'site_from', 'site_to', e)
  return e
}

export function checkTravelEligibility(form, original, today) {
  const e = {}
  checkFromTo(form, original, today, 'eligible_from', 'eligible_to', e)
  return e
}

// Rig Crew and Crew Schedule Exceptions: at least one of Emp Type / Rank / Employee, and the From/To dates.
// A planned future To date is allowed.
export function checkException(form, original, today) {
  const e = {}
  const who = ['emp_type', 'rank', 'fs_emp']
  if (who.every((f) => blank(form[f])) && (!original || who.some((f) => changed(form, original, f)))) {
    e.fs_emp = 'Choose an Emp Type, a Rank or an Employee for this exception.'
  }
  checkFromTo(form, original, today, 'exception_from', 'exception_to', e)
  return e
}

// The day after an ISO date, for a date picker that must start after another date.
export function nextDay(iso) {
  if (!iso) return undefined
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
