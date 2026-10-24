// Shared "last activity" clock: any tab's mouse, keyboard, scroll or touch counts for all of them.
const KEY = 'serosit.activity'

export function touchActivity() {
  try {
    localStorage.setItem(KEY, String(Date.now()))
  } catch {
    /* storage blocked: this tab's own clock is used */
  }
}

export function lastActivity() {
  try {
    return Number(localStorage.getItem(KEY)) || Date.now()
  } catch {
    return Date.now()
  }
}

export const SIGNED_OUT_REASON = 'serosit.signedOutReason'
