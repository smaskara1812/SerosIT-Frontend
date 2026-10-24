import { useCallback, useEffect, useState } from 'react'

// useState that survives leaving the page: a list page keeps its filters, search and page size when the
// user opens a record and comes back. Held in sessionStorage, so it lasts as long as the tab and is gone
// when the tab closes, and it is wiped at sign-out so the next person on the same browser starts clean.
// Sets are stored as arrays and given back as Sets.
const PREFIX = 'serosit.state.'

function read(key, initial) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw === null) return initial
    const { v, set } = JSON.parse(raw)
    return set ? new Set(v) : v
  } catch {
    return initial
  }
}

function write(key, value) {
  try {
    const isSet = value instanceof Set
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ v: isSet ? [...value] : value, set: isSet }))
  } catch {
    /* storage blocked or full: the page simply forgets next time */
  }
}

export function clearPersistedState() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* nothing to clear */
  }
}

if (typeof window !== 'undefined') window.addEventListener('seros:signed-out', clearPersistedState)

// `key` names the page (and, for a page shared by many lists, which list). `initial` is used the first
// time, and `override` (when not undefined) wins over what was stored, for example filters that arrive
// in the address from a link on another page.
export default function usePersistedState(key, initial, override) {
  const [state, setState] = useState(() => ({ key, value: override !== undefined ? override : read(key, initial) }))
  let current = state
  if (state.key !== key) {
    // the same component now shows another list: take that list's own remembered value
    current = { key, value: read(key, initial) }
    setState(current)
  }

  useEffect(() => {
    write(current.key, current.value)
  }, [current.key, current.value])

  const set = useCallback((next) => {
    setState((prev) => ({ key: prev.key, value: typeof next === 'function' ? next(prev.value) : next }))
  }, [])
  return [current.value, set]
}
