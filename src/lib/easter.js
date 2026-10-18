import { useEffect } from 'react'
import { EASTER_EGGS, RIDDLES } from '@/config/easterEggs'

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
  return EASTER_EGGS.sunset && matches(text, EASTER_EGGS.sunsetPhrases)
}

// The sunset scene plays full-page; its code is only fetched the first time this runs (see SunsetLoader).
export function triggerSunset(name) {
  if (!EASTER_EGGS.sunset) return
  window.dispatchEvent(new CustomEvent('seros:sunset', { detail: { name } }))
}

// On a day with a custom banner (Admin > Banner Events) the banner's hidden touches are off: the home page says so here.
let customBanner = false
export function setCustomBanner(on) {
  customBanner = !!on
}

// True when what was typed into the home search is the helicopter phrase.
export function isChopperPhrase(text) {
  return EASTER_EGGS.chopper && !customBanner && matches(text, EASTER_EGGS.chopperPhrases)
}

// The helicopter scene plays in the home banner; the home page listens for this (see Home.jsx).
export function triggerChopper() {
  if (!EASTER_EGGS.chopper) return
  window.dispatchEvent(new CustomEvent('seros:chopper'))
}

// True when what was typed into the home search is the spud-in phrase.
export function isSpudPhrase(text) {
  return EASTER_EGGS.spudIn && matches(text, EASTER_EGGS.spudPhrases)
}

// The spud-in: a drill bit drops in from the top of the screen and breaks ground at the bottom (see SpudLayer).
export function triggerSpud(name) {
  if (!EASTER_EGGS.spudIn) return
  window.dispatchEvent(new CustomEvent('seros:spud', { detail: { message: `Spud in${name ? `, ${name}` : ''}. The first hole is made.` } }))
}

// Capitals, hyphens, punctuation and extra spaces do not matter: "Spud-in!" is "spud in".
export const norm = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const matches = (text, phrases) => {
  const t = norm(text)
  return t.length > 0 && phrases.some((p) => norm(p) === t)
}

// The riddle the home search box shows right now (or null for its usual example). The clock is cut into stretches
// (`placeholderRotateMs`, 90 minutes by default); each stretch is either the usual example or one riddle, chosen by a
// fixed scramble of the stretch's number. So the words change slowly, stay put while someone is using the page, and
// are the same for everybody at the same moment.
export function riddleForNow(now = Date.now()) {
  if (!EASTER_EGGS.searchRiddles) return null
  const slot = Math.floor(now / EASTER_EGGS.placeholderRotateMs)
  const h = Math.imul(slot ^ 0x9e3779b1, 0x85ebca6b) >>> 0
  if ((h >>> 3) % EASTER_EGGS.riddleEveryNthSlot !== 0) return null
  // A riddle is only asked if the secret it leads to is switched on.
  const all = [...(EASTER_EGGS.sunset ? RIDDLES.sunset : []), ...(EASTER_EGGS.spudIn ? RIDDLES.spud : []), ...(EASTER_EGGS.chopper && !customBanner ? RIDDLES.chopper : [])]
  if (!all.length) return null
  return all[(h >>> 11) % all.length]
}

// How long until the search box's words may change.
export const msToNextSlot = (now = Date.now()) => EASTER_EGGS.placeholderRotateMs - (now % EASTER_EGGS.placeholderRotateMs)
