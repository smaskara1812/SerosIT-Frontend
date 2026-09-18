// Turns a DRF error payload ({"rig": ["This field is required."]},
// {"detail": "..."}, {"error": "..."}) into a short, human-readable string
// for display in a form's error banner — instead of the raw JSON operators
// otherwise had to decode themselves.
export function formatApiError(data, schema) {
  if (!data || typeof data !== 'object') {
    return 'Something went wrong. Please try again.'
  }
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error

  function fieldLabel(key) {
    const f = schema?.fields?.find((field) => field.name === key)
    if (f?.label) return f.label
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const lines = []
  for (const [key, val] of Object.entries(data)) {
    const msg = Array.isArray(val) ? val[0] : val
    if (typeof msg !== 'string') continue
    if (key === 'non_field_errors') {
      lines.push(msg)
    } else {
      lines.push(`${fieldLabel(key)}: ${msg}`)
    }
  }
  if (lines.length) return lines.join('  •  ')
  return 'Something went wrong. Please check the form and try again.'
}
