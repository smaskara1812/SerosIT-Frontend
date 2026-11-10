import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { localDateStr } from '@/lib/naiveDateTime'
import { withDefaults } from '@/lib/bannerDesign'

// Which banner is live today, asked once per visit. The home page draws it; the sidebar takes its colours from it when the banner includes the sidebar. Both ask through
// here, so there is one request, and its answer is remembered for the session (and for the day) so nothing flashes the normal look before the custom one.

const CACHE_KEY = 'serosit.banner'
const CHANGED = 'serosit:banner-changed'
let inflight = null

// Today's answer from this session, or null when there is none yet: {event, sero} (event may be null for "no custom banner today"; sero is the outfit Sero wears today, or null).
export function readCachedBanner() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY))
    return c && c.day === localDateStr() ? { event: c.event, sero: c.sero ?? null } : null
  } catch {
    return null
  }
}

// -> Promise of {event, sero}: the live banner event (or null) and the outfit Sero wears today (or null). A preview (?bannerPreview=<id> on the home page) is asked for on its own and never remembered.
export function loadActiveBanner(previewId) {
  const key = previewId || ''
  if (inflight && inflight.key === key) return inflight.promise
  const promise = apiFetch(`/api/banner/active/${previewId ? `?preview=${encodeURIComponent(previewId)}` : ''}`)
    .then((r) => (r.ok ? r.json() : { event: null, sero: null }))
    .catch(() => ({ event: null, sero: null }))
    .then((data) => {
      const event = data?.event || null
      const sero = data?.sero || null
      if (!previewId) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ day: localDateStr(), event, sero }))
        } catch {
          /* private mode */
        }
      }
      return { event, sero }
    })
    .finally(() => {
      setTimeout(() => { if (inflight && inflight.key === key) inflight = null }, 1500) // answers asked for within a moment of each other share one request
    })
  inflight = { key, promise }
  return promise
}

// Called after a banner event is saved, deleted or changed in this browser: forgets today's answer and tells the sidebar to ask again, so it follows without a reload.
// (Other people's browsers pick the change up at their next visit, as before.)
export function bannerChanged() {
  inflight = null
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(CHANGED))
}

// The design of the live banner when it includes the sidebar, else null. Follows a preview on the home page too, so what you preview is what you see.
export function useBannerSidebar() {
  const [params] = useSearchParams()
  const previewId = params.get('bannerPreview')
  const [event, setEvent] = useState(() => (previewId ? null : readCachedBanner()?.event ?? null))
  useEffect(() => {
    let live = true
    loadActiveBanner(previewId).then((a) => { if (live) setEvent(a.event) })
    return () => { live = false }
  }, [previewId])
  useEffect(() => {
    if (previewId) return undefined
    const again = () => loadActiveBanner(null).then((a) => setEvent(a.event))
    window.addEventListener(CHANGED, again)
    return () => window.removeEventListener(CHANGED, again)
  }, [previewId])
  return useMemo(() => (event?.design?.sidebar ? withDefaults(event.design) : null), [event])
}

// The outfit Sero wears today ({id, name, look}), or null for his usual look. It comes with the banner answer, so the home page and the two error pages share one request.
export function useSeroOutfit() {
  const [params] = useSearchParams()
  const previewId = params.get('bannerPreview')
  const [outfit, setOutfit] = useState(() => (previewId ? null : readCachedBanner()?.sero ?? null))
  useEffect(() => {
    let live = true
    loadActiveBanner(previewId).then((a) => { if (live) setOutfit(a.sero) })
    const again = () => loadActiveBanner(null).then((a) => { if (live && !previewId) setOutfit(a.sero) })
    window.addEventListener(CHANGED, again)
    return () => { live = false; window.removeEventListener(CHANGED, again) }
  }, [previewId])
  return outfit
}
