import { useEffect } from 'react'
import { EASTER_EGGS } from '@/config/easterEggs'

// Small hidden delights. `triggerGusher` asks the GusherLayer (mounted once in the app shell) to play.
export function triggerGusher(message) {
  if (!EASTER_EGGS.logoGusher) return
  window.dispatchEvent(new CustomEvent('seros:gusher', { detail: { message } }))
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

const typing = (el) => !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)

// Calls `onUnlock` when the classic sequence is typed on the page (never while typing in a field).
export function useKonami(onUnlock, enabled = EASTER_EGGS.konami) {
  useEffect(() => {
    if (!enabled) return undefined
    let at = 0
    const onKey = (e) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      at = key === KONAMI[at] ? at + 1 : key === KONAMI[0] ? 1 : 0
      if (at === KONAMI.length) {
        at = 0
        onUnlock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUnlock, enabled])
}

// Returns a click handler that fires `onFive` after five clicks within two seconds of each other.
export function makeMultiClick(onFive, count = 5, windowMs = 2000) {
  let n = 0
  let timer = null
  return () => {
    n += 1
    clearTimeout(timer)
    if (n >= count) {
      n = 0
      onFive()
      return
    }
    timer = setTimeout(() => (n = 0), windowMs)
  }
}

// A rubber stamp thumps onto the screen ('approved' or 'rejected'); played by the StampLayer in the app shell.
export function triggerStamp(kind) {
  if (!EASTER_EGGS.approvalStamp) return
  window.dispatchEvent(new CustomEvent('seros:stamp', { detail: { kind } }))
}
