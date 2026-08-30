const ACCESS_KEY = 'serosit.access'
const REFRESH_KEY = 'serosit.refresh'

// Every call site passes a path starting with "/api/..." and relies on
// same-origin (relative fetch) by default — true for local dev (Vite's
// proxy) and for any deployment where the frontend's own web server also
// serves /api (e.g. reverse-proxying it to the backend). Set
// VITE_API_BASE_URL only when the backend genuinely lives on a different
// host/port the browser must be told about explicitly (then the backend's
// CORS_ALLOWED_ORIGINS / ALLOWED_HOSTS need the frontend's origin too).
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function apiUrl(path) {
  return `${API_BASE}${path}`
}

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: ({ access, refresh }) => {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

async function refreshAccessToken() {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return false

  const res = await fetch(apiUrl('/api/auth/token/refresh/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) return false

  const data = await res.json()
  tokenStore.setTokens({ access: data.access, refresh: data.refresh })
  return true
}

/**
 * Wraps fetch() with the JWT bearer header and a single silent
 * refresh-and-retry on a 401 (access token expired mid-session).
 */
export async function apiFetch(path, options = {}) {
  // A FormData body (file uploads) needs the browser to set its own
  // multipart Content-Type with boundary — forcing application/json here
  // would break the upload.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const doFetch = () => {
    const access = tokenStore.getAccess()
    return fetch(apiUrl(path), {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...options.headers,
      },
    })
  }

  let res = await doFetch()

  if (res.status === 401 && tokenStore.getRefresh()) {
    const refreshed = await refreshAccessToken()
    res = refreshed ? await doFetch() : res
  }

  return res
}

export async function loginRequest(username, password) {
  const res = await fetch(apiUrl('/api/auth/token/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    throw new Error('Invalid username or password')
  }
  return res.json()
}

// A list-shaped endpoint normally answers with either a bare array or a
// paginated {results: [...]}. An error response (403/500) is neither, so a
// bare `data.results || data` would hand back the whole error object where
// callers expect an array — feeding straight into `.map` and crashing the
// page instead of just showing an empty dropdown.
export function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export async function fetchCurrentUser() {
  const res = await apiFetch('/api/auth/me/')
  if (!res.ok) return null
  return res.json()
}

export async function logoutRequest() {
  // Best-effort — the audit entry matters, but a failed request here should
  // never block actually logging the user out client-side.
  try {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
  } catch {
    // ignore
  }
}
