import { useCallback, useEffect, useState } from 'react'

// A list that opens a record on its own screen (Drilling Report, Incident Details, IT Assets ...) must bring the person back to where they were:
//   * filters, search and sort: usePersistedState (hooks/usePersistedState.js), remembered for the tab;
//   * how far they had scrolled (the batches already loaded, or the numbered page) and the scroll position: this hook.
// The position is remembered only at the moment a record is opened from the list (open()), and used ONCE when the list is next shown, so coming back
// from the record (the Back button, or after Save) returns to the same place, while arriving from the menu starts at the top of the first batch.
// It lives in sessionStorage under the usePersistedState prefix, so signing out wipes it too, and it expires after an hour.
//
// A page uses it like this (infinite-scroll list, loadPage(n, append) returns a promise of "there is another batch"):
//   const ret = useListReturn('drilling.report-list', listRef)
//   useEffect(() => { ret.load((n, append) => loadPage(n, query, append)) }, [])        // first load, restoring the batches and the scroll
//   onClick={() => ret.open(navigate, `/drilling/drilling-report/${id}/edit`, page)}     // instead of navigate(...)
// A numbered-page list takes the remembered number: useState(ret.restoredPage ?? 1).
// New list pages that open a record on its own route MUST do this (scripts/check-list-memory.mjs fails the build check when one does not).
const PREFIX = 'serosit.state.return.'
const MAX_AGE_MS = 60 * 60 * 1000

function peek(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw === null) return null
    const pos = JSON.parse(raw)
    if (!pos || Date.now() - pos.at > MAX_AGE_MS) return null
    return pos
  } catch {
    return null
  }
}

function discard(key) {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    /* nothing to remove */
  }
}

function remember(key, page, top) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ page: Number(page) || 1, top: Math.round(top || 0), at: Date.now() }))
  } catch {
    /* storage blocked or full: the list simply starts at the top next time */
  }
}

export function useListReturn(key, listRef) {
  // Read once, without removing, while rendering (a second render in development must see the same value); removed when the list has mounted.
  const [pos] = useState(() => peek(key))
  useEffect(() => {
    discard(key)
  }, [key])

  const open = useCallback(
    (navigate, path, page) => {
      remember(key, page, listRef?.current ? listRef.current.scrollTop : window.scrollY)
      navigate(path)
    },
    [key, listRef],
  )

  const load = useCallback(
    async (loadFn) => {
      let more = await loadFn(1, false)
      for (let p = 2; pos && p <= pos.page && more !== false; p += 1) {
        more = await loadFn(p, true)
      }
      if (pos) {
        requestAnimationFrame(() => {
          if (listRef?.current) listRef.current.scrollTop = pos.top
          else window.scrollTo(0, pos.top)
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return { open, load, restoredPage: pos?.page }
}
