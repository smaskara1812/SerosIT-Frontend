import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

/**
 * Shared paginated/filterable/search-backed user list, with infinite-scroll
 * accumulation (each loadMore() call appends a page instead of replacing).
 * `extraParam` is the boolean query param for the 4th filter tab
 * (e.g. "admin_only" or "local_only").
 */
export function useUserList(endpoint, { extraParam } = {}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'inactive' | 'extra'
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0, extra: 0 })

  // Bumped on every fetch so a slow response from a since-superseded
  // query/filter (or an overlapping loadMore) can detect it's stale and
  // discard itself instead of corrupting the current list.
  const requestId = useRef(0)

  const buildParams = useCallback(
    (pageNum) => {
      const params = new URLSearchParams({ page: String(pageNum) })
      if (query) params.set('q', query)
      if (filter === 'active') params.set('active', '1')
      if (filter === 'inactive') params.set('active', '0')
      if (filter === 'extra' && extraParam) params.set(extraParam, '1')
      return params
    },
    [query, filter, extraParam]
  )

  const fetchFirstPage = useCallback(() => {
    const myRequestId = ++requestId.current
    setLoading(true)
    setPage(1)
    return apiFetch(`${endpoint}?${buildParams(1)}`)
      .then((r) => r.json())
      .then((data) => {
        if (myRequestId !== requestId.current) return
        setItems(data.users || [])
        setHasMore(Boolean(data.has_more))
        setCounts({
          total: data.total ?? 0,
          active: data.active_count ?? 0,
          inactive: data.inactive_count ?? 0,
          extra: data.admin_count ?? data.local_count ?? 0,
        })
      })
      .finally(() => {
        if (myRequestId === requestId.current) setLoading(false)
      })
  }, [endpoint, buildParams])

  useEffect(() => {
    fetchFirstPage().catch(() => {})
    // fetchFirstPage already depends on query/filter via buildParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter])

  function loadMore() {
    if (loadingMore || loading || !hasMore) return
    const myRequestId = ++requestId.current
    const nextPage = page + 1
    setLoadingMore(true)
    apiFetch(`${endpoint}?${buildParams(nextPage)}`)
      .then((r) => r.json())
      .then((data) => {
        if (myRequestId !== requestId.current) return
        setItems((prev) => [...prev, ...(data.users || [])])
        setHasMore(Boolean(data.has_more))
        setPage(nextPage)
      })
      .finally(() => {
        if (myRequestId === requestId.current) setLoadingMore(false)
      })
  }

  return {
    query,
    setQuery,
    filter,
    setFilter,
    items,
    setItems,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    counts,
    refresh: fetchFirstPage,
  }
}
