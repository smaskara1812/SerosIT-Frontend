import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'

const MENU_KEY = 'drilling.operations_analytics'
const METERAGE_ROW_LABEL = 'Drilling Meterage'

function fmtNum(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function OperationsAnalyticsPage() {
  const { user } = useAuth()
  const canExport = can(user, MENU_KEY, 'export')

  const [rigs, setRigs] = useState([])
  const [rigId, setRigId] = useState('')
  const [fromDt, setFromDt] = useState('')
  const [toDt, setToDt] = useState('')
  const [reportType, setReportType] = useState('daily')

  const [result, setResult] = useState(null)
  const [appliedParams, setAppliedParams] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  useEffect(() => {
    apiFetch('/api/masters/rigs/?active=Y&page_size=200&fields=rig_id,rig_name')
      .then((r) => r.json())
      .then((data) => setRigs(data.results || data || []))
  }, [])

  function buildParams() {
    const params = new URLSearchParams({ rig: rigId, from_dt: fromDt, to_dt: toDt, report_type: reportType })
    return params
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
    apiFetch(`/api/drilling/operations-analytics/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        if (data.error) {
          setError(data.error)
          setResult(null)
          return
        }
        setResult(data)
        setAppliedParams(params.toString())
      })
      .finally(() => {
        if (thisRequest === requestIdRef.current) setLoading(false)
      })
  }

  async function exportExcel() {
    if (appliedParams == null) return
    const res = await apiFetch(`/api/drilling/operations-analytics/export/?${appliedParams}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operations-analytics-${todayIso()}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const columns = result?.columns || []
  const rows = result?.rows || []

  // Must run every render regardless of the permission check below — see
  // the same fix on the Performance Dashboard page (a conditional early
  // return before a hook call breaks the Rules of Hooks).
  usePageSubtitle(result ? `${rows.length.toLocaleString()} rows` : null)

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

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Report Type</p>
          <div className="flex gap-1.5">
            {[
              { value: 'daily', label: 'Daily' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'location', label: 'Location' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReportType(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  reportType === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        {!result ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            Choose a rig and a date range, then select Apply Filters to see results.
          </div>
        ) : columns.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            No records found for this selection.
          </div>
        ) : (
          <table className="table-auto w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                <th className="sticky left-0 isolate z-30 min-w-[220px] border-b border-border bg-muted px-3 py-2 text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">
                  Operations
                </th>
                {columns.map((c) => (
                  <th key={c} className="border-b border-l border-border bg-muted px-3 py-2 text-right whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isMeterage = r.label === METERAGE_ROW_LABEL
                // Solid backgrounds everywhere, no translucent tint — even
                // though only the frozen (sticky) column strictly needs
                // full opacity to avoid a scrolled column bleeding through
                // it, using /10 or /40 on the Meterage row here made that
                // exact mistake (again). The Meterage row is distinguished
                // with bold text and a colored accent border instead of a
                // color wash, which sidesteps the opacity trap entirely.
                const rowBg = isMeterage ? 'bg-muted' : i % 2 === 1 ? 'bg-muted' : 'bg-card'
                return (
                  <tr key={r.label}>
                    <td
                      title={r.label}
                      className={`sticky left-0 isolate z-10 truncate border-b px-3 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] ${rowBg} ${
                        isMeterage ? 'border-b-2 border-b-primary/40 font-bold text-foreground' : 'border-b-border/60 text-foreground'
                      }`}
                    >
                      {r.label}
                    </td>
                    {r.values.map((v, ci) => (
                      <td
                        key={ci}
                        className={`border-b border-l border-border/60 px-3 py-2 text-right tabular-nums ${rowBg} ${
                          isMeterage ? 'border-b-2 border-b-primary/40 font-semibold text-foreground' : 'text-foreground'
                        }`}
                      >
                        {fmtNum(v)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
