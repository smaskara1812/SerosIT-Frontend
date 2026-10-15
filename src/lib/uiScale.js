// Display size. Browsers open the app already zoomed on some Windows machines (display scaling at 125% or 150%),
// so everything looks too large. A web page cannot change the browser's own zoom, but it can scale itself with
// CSS `zoom` (Chrome, Edge, Safari, Firefox 126+). The choice is saved per browser, since it belongs to the
// screen and not the person.
const KEY = 'serosit.ui_scale'

// Master switch, from the environment files (.env.development / .env.production):
//   VITE_DISPLAY_SIZE_ENABLED=false   turns the whole feature off: no dropdown, no zoom is ever applied, and the
//                                     app behaves as if the display setting had never been written.
// Anything else (including leaving it out) keeps the feature on.
export const DISPLAY_SIZE_ENABLED = String(import.meta.env.VITE_DISPLAY_SIZE_ENABLED ?? 'true').toLowerCase() !== 'false'

// What a browser on Windows gets until someone chooses otherwise. Change this one number to move the default.
export const WINDOWS_DEFAULT = 0.8
export const SCALE_OPTIONS = [0.7, 0.75, 0.8, 0.9, 1]

function saved() {
  try {
    const v = parseFloat(localStorage.getItem(KEY))
    return v >= 0.5 && v <= 1.5 ? v : null
  } catch {
    return null
  }
}

const isWindows = () => /windows/i.test(navigator.userAgent || '')

export const defaultScale = () => (isWindows() ? WINDOWS_DEFAULT : 1)
export const hasSavedScale = () => saved() !== null
export const currentScale = () => saved() ?? defaultScale()

export function applyScale(scale = currentScale()) {
  const html = document.documentElement
  if (!DISPLAY_SIZE_ENABLED || !scale || scale === 1) {
    html.style.removeProperty('zoom')
    html.style.removeProperty('--ui-zoom')
    html.removeAttribute('data-ui-zoom')
  } else {
    html.style.zoom = String(scale)
    html.style.setProperty('--ui-zoom', String(scale))
    html.setAttribute('data-ui-zoom', '')
  }
}

// `scale` null means "automatic": forget the saved choice and use the platform default.
export function chooseScale(scale) {
  if (!DISPLAY_SIZE_ENABLED) return
  try {
    if (scale === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(scale))
  } catch {
    /* private mode: the choice lasts until the page is closed */
  }
  applyScale(scale ?? defaultScale())
}
