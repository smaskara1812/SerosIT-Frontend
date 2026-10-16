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
  if (Math.random() >= EASTER_EGGS.approvalStampChance) return // only now and then, so it stays a treat
  window.dispatchEvent(new CustomEvent('seros:stamp', { detail: { kind } }))
}

// True when what was typed into the home search is the secret phrase.
export function isSunsetPhrase(text) {
  if (!EASTER_EGGS.sunset) return false
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ')
  return EASTER_EGGS.sunsetPhrases.some((p) => p === t)
}

// The sunset scene plays full-page; its code is only fetched the first time this runs (see SunsetLoader).
export function triggerSunset(name) {
  if (!EASTER_EGGS.sunset) return
  window.dispatchEvent(new CustomEvent('seros:sunset', { detail: { name } }))
}

// True when what was typed into the home search is the spud-in phrase.
export function isSpudPhrase(text) {
  if (!EASTER_EGGS.spudIn) return false
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ')
  return EASTER_EGGS.spudPhrases.some((p) => p === t)
}

// The spud-in: a drill bit drops in from the top of the screen and breaks ground at the bottom (see SpudLayer).
export function triggerSpud(name) {
  if (!EASTER_EGGS.spudIn) return
  window.dispatchEvent(new CustomEvent('seros:spud', { detail: { message: `Spud in${name ? `, ${name}` : ''}. The first hole is made.` } }))
}
