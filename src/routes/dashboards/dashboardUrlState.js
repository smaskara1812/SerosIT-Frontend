import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

// URL-backed filter state. Every dashboard's year/rig(s)/type/company
// filters used to live in plain useState, which meant a refresh silently
// reset the view and there was no way to send a colleague "2025, these
// three rigs" as a link. These three hooks are drop-in replacements for
// useState with the exact same read/write shape (including the
// `setValue(prevValue => ...)` functional-updater pattern every dashboard
// already uses), so a page adopts URL state by changing only its
// declaration line, not its logic. They write with `replace: true` so
// changing a filter doesn't spam browser history with one entry per click.
//
// Setters are wrapped in useCallback (deps: the stable setSearchParams plus
// the literal paramKey) so they're referentially stable across renders,
// same as a useState setter would be — without that, every dashboard's
// fetch-effect would need an eslint-disable for exhaustive-deps instead of
// just listing the setter normally.
//
// Kept in their own file, not DashboardUI.jsx: Vite's Fast Refresh only
// works on a file that exports nothing but components.

// A single numeric param (e.g. ?year=2024). Without one in the URL the year
// is the current year, which is also the server's own default — so the
// first request already asks for it and the page doesn't refetch once the
// answer comes back.
export function useUrlYear(paramKey = 'year') {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(paramKey)
  const year = raw && /^\d+$/.test(raw) ? Number(raw) : new Date().getFullYear()

  const setYear = useCallback(
    (updater) => {
      setSearchParams(
        (prev) => {
          const currentRaw = prev.get(paramKey)
          const current = currentRaw && /^\d+$/.test(currentRaw) ? Number(currentRaw) : null
          const next = typeof updater === 'function' ? updater(current) : updater
          const params = new URLSearchParams(prev)
          if (next) params.set(paramKey, String(next))
          else params.delete(paramKey)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams, paramKey]
  )

  return [year, setYear]
}

// A comma-joined set of numeric ids (e.g. ?rigs=3,7,12). Mirrors
// useState(() => new Set())'s shape, including Set-returning updaters.
export function useUrlIdSet(paramKey) {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(paramKey)
  const ids = useMemo(() => {
    if (!raw) return new Set()
    return new Set(
      raw
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => !Number.isNaN(n))
    )
  }, [raw])

  const setIds = useCallback(
    (updater) => {
      setSearchParams(
        (prev) => {
          const currentRaw = prev.get(paramKey)
          const current = currentRaw
            ? new Set(
                currentRaw
                  .split(',')
                  .map((x) => Number(x.trim()))
                  .filter((n) => !Number.isNaN(n))
              )
            : new Set()
          const next = typeof updater === 'function' ? updater(current) : updater
          const params = new URLSearchParams(prev)
          if (next.size > 0) params.set(paramKey, [...next].join(','))
          else params.delete(paramKey)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams, paramKey]
  )

  return [ids, setIds]
}

// A single free-text param (e.g. ?status=silent) — used for the "KPI as
// filter" pattern (KpiCard's onFilter/filterActive), so which exception a
// table is narrowed to is also shareable/resumable.
export function useUrlString(paramKey) {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(paramKey) || ''

  const setValue = useCallback(
    (updater) => {
      setSearchParams(
        (prev) => {
          const current = prev.get(paramKey) || ''
          const next = typeof updater === 'function' ? updater(current) : updater
          const params = new URLSearchParams(prev)
          if (next) params.set(paramKey, next)
          else params.delete(paramKey)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams, paramKey]
  )

  return [value, setValue]
}
