// Calls to the public candidate form (/api/public/onboarding/). Plain fetch on purpose: this page has no signed-in user, so it must never go through
// apiFetch (which adds a token, tries to refresh one and can send the person to the sign-in page). The invite token travels in the body, not the address.
const BASE = '/api/public/onboarding/'

export async function call(endpoint, body = {}, file = null) {
  try {
    let init
    if (file) {
      const form = new FormData()
      Object.entries(body).forEach(([k, v]) => form.append(k, v))
      form.append('file', file)
      init = { method: 'POST', body: form }
    } else {
      init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    }
    const res = await fetch(`${BASE}${endpoint}/`, { ...init, referrerPolicy: 'no-referrer', credentials: 'omit' })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { message: "Couldn't reach the server. Check your connection and try again." } }
  }
}
