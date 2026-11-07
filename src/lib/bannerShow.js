// Only one banner show plays at a time: starting one ends the one before it (a second click on a button simply restarts its show).
// Every show that starts through here also gets the same way out: Esc closes it, and a small muted line at the bottom of the screen says so.
// A show can change that line while it plays (`setShowHint`), for example to ask for a click.
let current = null
let hintEl = null
let onKey = null
let fadeTimer = 0

export const DEFAULT_HINT = 'Press Esc to close'

function install() {
  if (typeof document === 'undefined') return
  hintEl = document.createElement('div')
  hintEl.setAttribute('aria-hidden', 'true')
  hintEl.textContent = DEFAULT_HINT
  hintEl.style.cssText =
    'position:fixed;left:0;right:0;bottom:14px;text-align:center;z-index:91;pointer-events:none;font:500 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.02em;color:rgba(255,255,255,.55);text-shadow:0 1px 2px rgba(0,0,0,.5);opacity:0;transition:opacity .5s'
  document.body.appendChild(hintEl)
  fadeTimer = setTimeout(() => {
    if (hintEl) hintEl.style.opacity = '1'
  }, 400)
  // capture, so a first Esc closes the show and does not also close a dialog that is open underneath it
  onKey = (e) => {
    if (e.key === 'Escape' && current) {
      e.preventDefault()
      e.stopPropagation()
      current()
    }
  }
  window.addEventListener('keydown', onKey, true)
}

function uninstall() {
  clearTimeout(fadeTimer)
  if (onKey) window.removeEventListener('keydown', onKey, true)
  onKey = null
  hintEl?.remove()
  hintEl = null
}

export function startShow(end) {
  if (current) current()
  current = end
  install()
}

export function endShow(end) {
  if (current === end) {
    current = null
    uninstall()
  }
}

// Changes the line at the bottom while `end`'s show is the one playing. No text puts the default back.
export function setShowHint(end, text) {
  if (current === end && hintEl) hintEl.textContent = text || DEFAULT_HINT
}
