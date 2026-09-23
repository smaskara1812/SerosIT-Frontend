import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'

const MENU_KEY = 'drilling.drilling_daily_data'

// The two frozen-left columns — only "date" is ever blank (it's the
// day's own daily-total row marker), "drilling_date" always shows so a
// scrolled-far-right row can still be traced back to its day.
const FROZEN_LEFT = [
  { key: 'date', label: 'Date', minWidth: 90 },
  { key: 'drilling_date', label: 'Drilling Date', minWidth: 100 },
]

const COLUMNS = [
  { key: 'consumption_diesel', label: 'Consumption Diesel' },
  { key: 'consumption_water', label: 'Consumption Water' },
  { key: 'received_diesel', label: 'Received Diesel' },
  { key: 'received_water', label: 'Received Water' },
  { key: 'generated_water', label: 'Generated Water' },
  { key: 'operating_hrs', label: 'Operating Hrs' },
  { key: 'standby_hrs', label: 'Standby Hrs' },
  { key: 'repair_service_hrs', label: 'Repair Service Hrs' },
  { key: 'repair_rate_hrs', label: 'Repair Rate Hrs' },
  { key: 'zero_rate_hrs', label: 'Zero Rate Hrs' },
  { key: 'rig_move_hrs', label: 'Rig Move Hrs' },
  { key: 'time_from', label: 'Time From' },
  { key: 'time_to', label: 'Time To' },
  { key: 'duration', label: 'Duration' },
  { key: 'location', label: 'Location' },
  { key: 'operations', label: 'Code No. Operations' },
  { key: 'section', label: 'Section' },
  { key: 'depth_from', label: 'Depth From' },
  { key: 'depth_to', label: 'Depth To' },
  { key: 'rop_trip', label: 'ROP/Trip' },
  { key: 'rate', label: 'Rate' },
  { key: 'remarks', label: 'Operations in sequence and remarks' },
]

function fmtCell(v) {
  if (v == null || v === '') return ''
  return String(v)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function DrillingDailyDataPage() {
  const { user } = useAuth()
  const canExport = can(user, MENU_KEY, 'export')

  const [rigs, setRigs] = useState([])
  const [rigId, setRigId] = useState('')
  const [fromDt, setFromDt] = useState('')
  const [toDt, setToDt] = useState('')

  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [appliedParams, setAppliedParams] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  // Measured (not assumed) pixel offset for the 2nd frozen column — see
  // the same pattern, and the reason it has to be measured rather than
  // hardcoded, on the Performance Dashboard page.
  const frozenRefs = [useRef(null), useRef(null)]
  const [frozenOffsets, setFrozenOffsets] = useState([0, 0])

  useLayoutEffect(() => {
    function measure() {
      const widths = frozenRefs.map((r) => r.current?.offsetWidth || 0)
      setFrozenOffsets([0, widths[0]])
    }
    measure()
    const observed = frozenRefs.map((r) => r.current).filter(Boolean)
    if (observed.length === 0) return
    const ro = new ResizeObserver(measure)
    observed.forEach((el) => ro.observe(el))
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  useEffect(() => {
    apiFetch('/api/masters/rigs/?active=Y&page_size=200&fields=rig_id,rig_name')
      .then((r) => r.json())
      .then((data) => setRigs(data.results || data || []))
  }, [])

  function buildParams() {
    return new URLSearchParams({ rig: rigId, from_dt: fromDt, to_dt: toDt })
  }

  const liveParamString = buildParams().toString()
  const filtersAreStale = result !== null && appliedParams !== liveParamString

  function runQuery() {
    if (!rigId) {
      setError('Pick a rig.')
      setResult(null)
      return
    }
    if (!fromDt || !toDt) {
      setError('Pick both a From and To date.')
      setResult(null)
      return
    }
    if (fromDt > toDt) {
      setError('From date must be before To date.')
      setResult(null)
      return
    }
    setError('')
    setLoading(true)
    const params = buildParams()
    const thisRequest = ++requestIdRef.current
    apiFetch(`/api/drilling/drilling-daily-data/?${params}&page=1`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        if (data.error) {
          setError(data.error)
          setResult(null)
          return
        }
        setResult(data)
        setPage(1)
        setAppliedParams(params.toString())
      })
      .finally(() => {
        if (thisRequest === requestIdRef.current) setLoading(false)
      })
  }

  function loadNextPage() {
    if (appliedParams == null || loading || loadingMore || !result?.has_more) return
    const nextPage = page + 1
    setLoadingMore(true)
    const thisRequest = ++requestIdRef.current
    apiFetch(`/api/drilling/drilling-daily-data/?${appliedParams}&page=${nextPage}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        // Pages after the first don't recompute the full-range count (an
        // expensive full COUNT for a wide date range) — keep page 1's value.
        setResult((prev) => ({ ...data, count: data.count ?? prev?.count, rows: [...(prev?.rows || []), ...data.rows] }))
        setPage(nextPage)
      })
      .finally(() => {
        if (thisRequest === requestIdRef.current) setLoadingMore(false)
      })
  }

  function handleTableScroll(e) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadNextPage()
  }

  async function exportExcel() {
    if (appliedParams == null) return
    const res = await apiFetch(`/api/drilling/drilling-daily-data/export/?${appliedParams}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    // The <a download> filename wins over the server's Content-Disposition
    // in every browser that matters here, so the rig name has to be baked
    // in on this side too, not just in the backend response header.
    const rigName = rigs.find((r) => String(r.rig_id) === String(rigId))?.rig_name
    const rigSlug = rigName ? `-${rigName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}` : ''
    const a = document.createElement('a')
    a.href = url
    a.download = `drilling-daily-data${rigSlug}-${todayIso()}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const rows = result?.rows || []
  const totalCount = result?.count ?? 0

  // Must run every render regardless of the permission check below — a
  // conditional early return before a hook call breaks the Rules of Hooks.
  usePageSubtitle(
    result ? (rows.length < totalCount ? `${rows.length.toLocaleString()} of ${totalCount.toLocaleString()} rows` : `${totalCount.toLocaleString()} rows`) : null
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex w-[200px] flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Rig</p>
          <select
            value={rigId}
            onChange={(e) => setRigId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="">Select a rig…</option>
            {rigs.map((r) => (
              <option key={r.rig_id} value={r.rig_id}>{r.rig_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">From</Label>
          <Input type="date" value={fromDt} onChange={(e) => setFromDt(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">To</Label>
          <Input type="date" value={toDt} onChange={(e) => setToDt(e.target.value)} />
        </div>

        <Button onClick={runQuery} disabled={loading}>
          {loading ? 'Loading…' : filtersAreStale ? 'Update Results' : 'Apply Filters'}
        </Button>

        {canExport && (
          <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0 || filtersAreStale}>
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        )}
      </div>

      {(error || filtersAreStale) && (
        <div className="-mt-2 flex flex-col gap-1">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!error && filtersAreStale && (
            <p className="text-xs text-muted-foreground">Filters have changed — select Update Results to refresh the table below.</p>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card" onScroll={handleTableScroll}>
        {!result ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            Choose a rig and a date range, then select Apply Filters to see results.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            No records found for this selection.
          </div>
        ) : (
          <table className="table-auto w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {FROZEN_LEFT.map((c, i) => (
                  <th
                    key={c.key}
                    ref={frozenRefs[i]}
                    style={{ minWidth: c.minWidth, left: frozenOffsets[i] }}
                    className={`sticky isolate z-30 border-b border-border bg-muted px-3 py-2 text-left whitespace-nowrap ${
                      i === FROZEN_LEFT.length - 1 ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]' : ''
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
                {COLUMNS.map((c) => (
                  <th key={c.key} className="border-b border-l border-border bg-muted px-3 py-2 text-left whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rowBg = i % 2 === 1 ? 'bg-muted' : 'bg-card'
                return (
                  <tr key={i}>
                    {FROZEN_LEFT.map((c, ci) => (
                      <td
                        key={c.key}
                        style={{ minWidth: c.minWidth, left: frozenOffsets[ci] }}
                        className={`sticky isolate z-10 whitespace-nowrap border-b border-border/60 px-3 py-2 font-medium text-foreground ${rowBg} ${
                          ci === FROZEN_LEFT.length - 1 ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]' : ''
                        }`}
                      >
                        {fmtCell(r[c.key])}
                      </td>
                    ))}
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        title={c.key === 'remarks' ? fmtCell(r[c.key]) : undefined}
                        className={`border-b border-l border-border/60 px-3 py-2 text-foreground ${rowBg} ${
                          c.key === 'remarks' ? 'max-w-[320px] truncate' : 'whitespace-nowrap'
                        }`}
                      >
                        {fmtCell(r[c.key])}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {loadingMore && (
                <tr>
                  <td colSpan={FROZEN_LEFT.length + COLUMNS.length} className="bg-card px-3 py-2 text-center text-xs text-muted-foreground">
                    Loading more…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
