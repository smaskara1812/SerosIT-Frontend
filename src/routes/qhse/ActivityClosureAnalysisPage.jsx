import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Download } from 'lucide-react'

const MENU_KEY = 'qhse.activity_closure_analysis'

function fmtDate(v) {
  if (!v) return ''
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ActivityClosureAnalysisPage() {
  const { user } = useAuth()
  const canExport = can(user, MENU_KEY, 'export')

  const [financialYears, setFinancialYears] = useState([])
  const [selectedFy, setSelectedFy] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  const [drilldown, setDrilldown] = useState(null) // { rig, bucket, label }
  const [drilldownRows, setDrilldownRows] = useState([])
  const [drilldownCount, setDrilldownCount] = useState(0)
  const [drilldownPage, setDrilldownPage] = useState(1)
  const [drilldownHasMore, setDrilldownHasMore] = useState(false)
  const [drilldownLoading, setDrilldownLoading] = useState(false)
  const [drilldownLoadingMore, setDrilldownLoadingMore] = useState(false)
  // A rapid-fire scroll (e.g. scrolling to the very bottom in one gesture,
  // which re-fires the scroll event as newly-appended rows grow the
  // scrollable height) can call loadMoreDrilldown several times before the
  // first call's setDrilldownLoadingMore(true) actually commits — state
  // updates aren't synchronous, so each of those calls still reads the old
  // `false` and slips past the guard below, fetching (and appending) the
  // same page more than once. A ref is read/written synchronously, so it
  // closes that window; the state flag stays too, just for the "Loading
  // more…" label.
  const drilldownLoadingMoreRef = useRef(false)

  usePageSubtitle(result ? `${result.totals.total.toLocaleString()} closed activities` : null)

  useEffect(() => {
    apiFetch('/api/masters/financial-years/?page_size=50')
      .then((r) => r.json())
      .then((data) => setFinancialYears(Array.isArray(data) ? data : data.results || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedFy) params.set('financial_years', selectedFy)
    apiFetch(`/api/qhse/activity-closure-analysis/?${params}`)
      .then((r) => r.json())
      .then(setResult)
      .finally(() => setLoading(false))
  }, [selectedFy])

  function drilldownParams(pageNum) {
    const params = new URLSearchParams()
    if (selectedFy) params.set('financial_years', selectedFy)
    if (drilldown?.rig) params.set('rig', drilldown.rig)
    if (drilldown?.bucket) params.set('bucket', drilldown.bucket)
    params.set('page', String(pageNum))
    return params
  }

  function openDrilldown(rig, bucket, label) {
    setDrilldown({ rig, bucket, label })
    setDrilldownLoading(true)
    drilldownLoadingMoreRef.current = false
    const params = new URLSearchParams()
    if (selectedFy) params.set('financial_years', selectedFy)
    if (rig) params.set('rig', rig)
    if (bucket) params.set('bucket', bucket)
    params.set('page', '1')
    apiFetch(`/api/qhse/activity-closure-analysis/drilldown/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDrilldownRows(data.rows)
        setDrilldownCount(data.count)
        setDrilldownPage(1)
        setDrilldownHasMore(data.has_more)
      })
      .finally(() => setDrilldownLoading(false))
  }

  function loadMoreDrilldown() {
    if (drilldownLoadingMoreRef.current || !drilldownHasMore) return
    drilldownLoadingMoreRef.current = true
    const nextPage = drilldownPage + 1
    setDrilldownLoadingMore(true)
    apiFetch(`/api/qhse/activity-closure-analysis/drilldown/?${drilldownParams(nextPage)}`)
      .then((r) => r.json())
      .then((data) => {
        setDrilldownRows((prev) => [...prev, ...data.rows])
        setDrilldownPage(nextPage)
        setDrilldownHasMore(data.has_more)
      })
      .finally(() => {
        drilldownLoadingMoreRef.current = false
        setDrilldownLoadingMore(false)
      })
  }

  function handleDrilldownScroll(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) loadMoreDrilldown()
  }

  async function exportExcel() {
    const params = new URLSearchParams()
    if (selectedFy) params.set('financial_years', selectedFy)
    const res = await apiFetch(`/api/qhse/activity-closure-analysis/export/?${params}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-closure-analysis-${todayIso()}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const bucketOrder = result?.bucket_order || []
  const bucketLabels = result?.bucket_labels || {}
  const earlyBuckets = bucketOrder.filter((k) => k.startsWith('early_'))
  const lateBuckets = bucketOrder.filter((k) => k.startsWith('late_'))

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex w-[220px] flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Financial Year</p>
          <select
            value={selectedFy}
            onChange={(e) => setSelectedFy(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="">All Years</option>
            {financialYears.map((y) => (
              <option key={y.financial_year_id} value={y.financial_year_id}>
                {y.fin_year_text}
              </option>
            ))}
          </select>
        </div>
        {canExport && (
          <Button variant="outline" onClick={exportExcel} disabled={!result?.rows?.length}>
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        {loading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
        {!loading && result && result.rows.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No completed activities for this selection.</p>
        )}
        {!loading && result && result.rows.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th rowSpan={2} className="border-b border-r border-border px-3 py-2 text-left align-bottom">
                  Rig
                </th>
                <th colSpan={earlyBuckets.length} className="border-b border-r border-border px-3 py-1.5 text-center">
                  Completed Early
                </th>
                <th colSpan={lateBuckets.length} className="border-b border-r border-border px-3 py-1.5 text-center">
                  Completed Late
                </th>
                <th rowSpan={2} className="border-b border-border px-3 py-2 text-right align-bottom">
                  Total
                </th>
              </tr>
              <tr className="bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {[...earlyBuckets, ...lateBuckets].map((key, i) => (
                  <th
                    key={key}
                    className={`border-b px-3 py-1.5 text-right ${
                      i === earlyBuckets.length + lateBuckets.length - 1 ? 'border-r border-border' : 'border-r border-border/60'
                    }`}
                  >
                    {bucketLabels[key]?.match(/\(([^)]+)\)/)?.[1] || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.rig} className="border-b border-border/60 hover:bg-accent/40">
                  <td className="border-r border-border px-3 py-2 font-medium text-foreground">{row.rig}</td>
                  {[...earlyBuckets, ...lateBuckets].map((key) => (
                    <td key={key} className="border-r border-border/60 px-3 py-2 text-right tabular-nums">
                      {row.buckets[key] > 0 ? (
                        <button
                          type="button"
                          onClick={() => openDrilldown(row.rig, key, bucketLabels[key])}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {row.buckets[key]}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    <button
                      type="button"
                      onClick={() => openDrilldown(row.rig, null, 'All')}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {row.total}
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/60 font-semibold text-foreground">
                <td className="border-r border-border px-3 py-2">Total:</td>
                {[...earlyBuckets, ...lateBuckets].map((key) => (
                  <td key={key} className="border-r border-border/60 px-3 py-2 text-right tabular-nums">
                    {result.totals.buckets[key]}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{result.totals.total}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={Boolean(drilldown)} onOpenChange={(open) => !open && setDrilldown(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {drilldown?.rig} — {drilldown?.label}
            </DialogTitle>
            <DialogDescription>
              {drilldownRows.length < drilldownCount
                ? `${drilldownRows.length} of ${drilldownCount} record(s)`
                : `${drilldownCount} record(s)`}
            </DialogDescription>
          </DialogHeader>
          <div
            onScroll={handleDrilldownScroll}
            className="max-h-[60vh] overflow-auto rounded-lg border border-border"
          >
            {drilldownLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 bg-muted/95 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    <th className="border-b border-border px-3 py-2 text-left">Activity</th>
                    <th className="border-b border-border px-3 py-2 text-left">Rig</th>
                    <th className="border-b border-border px-3 py-2 text-left">Monitor Date</th>
                    <th className="border-b border-border px-3 py-2 text-left">Completion Date</th>
                    <th className="border-b border-border px-3 py-2 text-left">Planning Remark</th>
                    <th className="border-b border-border px-3 py-2 text-left">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldownRows.map((r, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-2">{r.activity_name}</td>
                      <td className="px-3 py-2">{r.rig_name}</td>
                      <td className="px-3 py-2">{fmtDate(r.scheduled_dt)}</td>
                      <td className="px-3 py-2">{fmtDate(r.completion_dt)}</td>
                      <td className="px-3 py-2">{r.planning_remark}</td>
                      <td className="px-3 py-2">{r.completion_remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {drilldownLoadingMore && (
              <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
