import { useState } from 'react'

// Helpers for the cards of Admin > Mail Controls (the mail redirect, the daily summary, the failure alerts).

export const split = (t) => t.split(/[\n,;\s]+/).map((a) => a.trim()).filter(Boolean)
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const sameList = (a, b) => a.join(',') === b.join(',')

// A draft kept as "only what was changed": reading a field gives the change if there is one, else the saved value. Changing a field back to the saved value drops the change.
export function useDraft(base, equal = (a, b) => a === b) {
  const [edits, setEdits] = useState({})
  const get = (k) => (k in edits ? edits[k] : base[k])
  const set = (k, v) =>
    setEdits((e) => {
      const n = { ...e }
      if (equal(v, base[k])) delete n[k]
      else n[k] = v
      return n
    })
  return { get, set, dirty: Object.keys(edits).length > 0, reset: () => setEdits({}) }
}

// The scheduler runs every `every` minutes on the clock (30: at :00 and :30) and sends the summary at the first run at or after the chosen time.
export function goesAround(time, every) {
  const [h, m] = time.split(':').map(Number)
  const at = (Math.ceil((h * 60 + m) / every) * every) % 1440
  return `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`
}
