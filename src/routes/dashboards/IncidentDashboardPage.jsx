import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, FileSpreadsheet, Grid3x3, Layers, Printer } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { MultiSelectPopover } from '@/components/MultiSelectPopover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ChartCard, DashboardToolbar, KpiCard } from './DashboardUI'

const MENU_KEY = 'dashboards.incident_dashboard'

// Dimensions that show the Immediate/Root sub-filter or the Rig Type
// sub-filter — every other dimension hides that second select entirely.
const RIG_TYPE_SUB_DIMENSION = 'rig_unit'
const CAUSE_SUB_DIMENSION = 'incident_cause'
// "Other QHSE Actions" isn't a per-incident breakdown at all (a standalone
// action log, not linked to Incident) so it has no Rigs/Units toggle and
// no financial-year-checkbox-driven population filter the way every other
// dimension does — just a plain Rig filter.
const NO_POPULATION_FILTER_DIMENSION = 'other_qhse_actions'

function SelectField({ label, value, onChange, options, width = 'w-[190px]' }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 truncate rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 ${width}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// A nicer, more intuitive stand-in for the legacy page's plain Rigs/Units
// radio buttons — a single pill-shaped segmented control.
function SegmentedToggle({ value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Population</span>
      <div className="flex h-9 items-center rounded-lg border border-input bg-transparent p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-full rounded-md px-3 text-sm font-medium transition-colors ${
              value === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const DRILLDOWN_COLUMNS = {
  incidents: [
    { key: 'rig_name', label: 'Rig/Unit' },
    { key: 'rig_incident_no', label: 'Incident No.' },
    { key: 'incident_date', label: 'Date', fmt: fmtDate },
    { key: 'incident_type_abrv', label: 'Type' },
    { key: 'incident_descr', label: 'Description', wide: true },
  ],
  incident_actions: [
    { key: 'rig_incident_no', label: 'Incident No.' },
    { key: 'rig_name', label: 'Rig/Unit' },
    { key: 'incident_date', label: 'Date', fmt: fmtDate },
    { key: 'action_recommended', label: 'Action Recommended', wide: true },
    { key: 'action_taken', label: 'Action Taken', wide: true },
    { key: 'action_party', label: 'Action Party' },
    { key: 'target_date', label: 'Target Date', fmt: fmtDate },
    { key: 'completion_dt', label: 'Completion Date', fmt: fmtDate },
    { key: 'status', label: 'Status' },
  ],
  other_qhse_actions: [
    { key: 'icr_no', label: 'ICR No.' },
    { key: 'rig_name', label: 'Rig' },
    { key: 'qhse_category', label: 'Category' },
    { key: 'action_recommended', label: 'Action Recommended', wide: true },
    { key: 'action_taken', label: 'Action Taken', wide: true },
    { key: 'action_party', label: 'Action Party' },
    { key: 'target_date', label: 'Target Date', fmt: fmtDate },
    { key: 'completion_dt', label: 'Completion Date', fmt: fmtDate },
    { key: 'status', label: 'Status' },
  ],
}

export default function IncidentDashboardPage() {
  const { user } = useAuth()

  const [meta, setMeta] = useState(null)
  const [dimension, setDimension] = useState('rig_unit')
  const [sub, setSub] = useState('all')
  const [mode, setMode] = useState('rigs')
  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())
  const [selectedUnitNames, setSelectedUnitNames] = useState(() => new Set())
  const [selectedYearIds, setSelectedYearIds] = useState(() => new Set())
  const [hideEmptyRows, setHideEmptyRows] = useState(true)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  const [drilldown, setDrilldown] = useState(null) // { rowLabel, yearLabel, loading, kind, rows }

  useEffect(() => {
    apiFetch('/api/dashboards/incident-dashboard/meta/')
      .then((r) => r.json())
      .then((d) => {
        setMeta(d)
        // Default to the 5 most recent financial years rather than all of
        // them — meta.years is already newest-first, and 20+ columns on
        // first load would be unreadable before the user narrows anything.
        setSelectedYearIds(new Set(d.years.slice(0, 5).map((y) => y.id)))
      })
  }, [])

  // Sub-filter resets whenever the dimension changes — "root"/"Onshore
  // Rig" etc. from one dimension has no meaning on another. Done in the
  // change handler itself (see dimensionOptions' onChange below), not a
  // useEffect keyed on `dimension` — setting state synchronously inside an
  // effect just to react to another piece of state changing is the same
  // update expressed one render later, for no benefit.
  function handleDimensionChange(next) {
    setDimension(next)
    setSub('all')
  }

  // Shared by the pivot fetch and Export Excel — one source of truth for
  // the active dimension/sub/population/year filters, so the exported
  // sheet can never drift out of sync with what's on screen.
  const buildPivotParams = useCallback(() => {
    const params = new URLSearchParams()
    params.set('dimension', dimension)
    if (dimension === RIG_TYPE_SUB_DIMENSION || dimension === CAUSE_SUB_DIMENSION) params.set('sub', sub)
    if (dimension !== NO_POPULATION_FILTER_DIMENSION) {
      params.set('mode', mode)
      if (selectedYearIds.size > 0) params.set('years', [...selectedYearIds].join(','))
      if (mode === 'units') {
        if (selectedUnitNames.size > 0) params.set('unit_names', [...selectedUnitNames].join(','))
      } else if (selectedRigIds.size > 0) {
        params.set('rig_ids', [...selectedRigIds].join(','))
      }
    } else {
      if (selectedYearIds.size > 0) params.set('years', [...selectedYearIds].join(','))
      if (selectedRigIds.size > 0) params.set('rig_ids', [...selectedRigIds].join(','))
    }
    return params
  }, [dimension, sub, mode, selectedRigIds, selectedUnitNames, selectedYearIds])

  useEffect(() => {
    if (!meta) return
    const timer = setTimeout(() => {
      const thisRequest = ++requestIdRef.current
      setLoading(true)
      const params = buildPivotParams()
      apiFetch(`/api/dashboards/incident-dashboard/?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed to load dashboard')
          return r.json()
        })
        .then((d) => {
          if (thisRequest !== requestIdRef.current) return
          setError('')
          setData(d)
        })
        .catch(() => {
          if (thisRequest !== requestIdRef.current) return
          setError('Failed to load dashboard data.')
        })
        .finally(() => {
          if (thisRequest !== requestIdRef.current) return
          setLoading(false)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [meta, buildPivotParams])

  usePageSubtitle(data ? `${data.dimension_label} · ${fmtNum(data.grand_total)} incident(s)` : null)

  function fmtNum(v) {
    return v == null ? '—' : v.toLocaleString()
  }

  const rigOptions = useMemo(() => {
    if (!meta) return []
    if (dimension === RIG_TYPE_SUB_DIMENSION && sub !== 'all') {
      return meta.rigs.filter((r) => String(r.rig_type_id) === sub)
    }
    return meta.rigs
  }, [meta, dimension, sub])

  const unitOptions = useMemo(() => (meta ? meta.units.map((u) => ({ id: u, name: u })) : []), [meta])

  function toggleRig(id) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleUnit(name) {
    setSelectedUnitNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleYear(id) {
    setSelectedYearIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleRows = useMemo(() => {
    if (!data) return []
    const rows = hideEmptyRows ? data.rows.filter((r) => r.total > 0) : data.rows
    return [...rows].sort((a, b) => b.total - a.total)
  }, [data, hideEmptyRows])

  const supportsPopulationFilter = dimension !== NO_POPULATION_FILTER_DIMENSION

  // Shared by the drilldown fetch and its Print button — built once at
  // click time and kept on the drilldown's own state, so Print always
  // prints exactly the cell that was opened even if the dashboard's own
  // filters change while the dialog is still up.
  function buildDrilldownParams(row, year) {
    const params = new URLSearchParams()
    params.set('dimension', dimension)
    params.set('row', row.key)
    params.set('year', year.id)
    if (dimension === CAUSE_SUB_DIMENSION) params.set('sub', sub)
    if (supportsPopulationFilter) {
      params.set('mode', mode)
      if (mode === 'units') {
        if (selectedUnitNames.size > 0) params.set('unit_names', [...selectedUnitNames].join(','))
      } else if (selectedRigIds.size > 0) {
        params.set('rig_ids', [...selectedRigIds].join(','))
      }
    } else if (selectedRigIds.size > 0) {
      params.set('rig_ids', [...selectedRigIds].join(','))
    }
    return params
  }

  async function openDrilldown(row, year) {
    if (!year || row.counts[String(year.id)] === 0) return
    const params = buildDrilldownParams(row, year)
    setDrilldown({ rowLabel: row.label, yearLabel: year.label, loading: true, kind: null, rows: [], params })
    const res = await apiFetch(`/api/dashboards/incident-dashboard/drilldown/?${params}`)
    const d = await res.json()
    setDrilldown((prev) =>
      prev ? { ...prev, loading: false, kind: d.kind, rows: d.rows, filterSummary: d.filter_summary } : null
    )
  }

  async function printDrilldownPdf() {
    if (!drilldown?.params) return
    // Open the tab synchronously (in direct response to the click) so
    // popup blockers don't reject it — same trick as the Incident
    // Register's own Print PDF button.
    const tab = window.open('', '_blank')
    const res = await apiFetch(`/api/dashboards/incident-dashboard/drilldown/print/?${drilldown.params}`)
    if (!res.ok) {
      if (tab) tab.close()
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    if (tab) {
      tab.location.href = url
    } else if (!window.open(url, '_blank')) {
      const a = document.createElement('a')
      a.href = url
      a.download = 'Incident Dashboard Drilldown.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  async function exportExcel() {
    const params = buildPivotParams()
    if (hideEmptyRows) params.set('hide_empty', '1')
    const res = await apiFetch(`/api/dashboards/incident-dashboard/export/?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Incident Dashboard - ${data?.dimension_label ?? dimension}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const dimensionOptions = meta ? meta.dimensions.map((d) => ({ value: d.key, label: d.label })) : []
  const subOptions =
    dimension === RIG_TYPE_SUB_DIMENSION
      ? [{ value: 'all', label: 'All Rig Types' }, ...(meta?.rig_types.map((t) => ({ value: String(t.id), label: t.name })) ?? [])]
      : dimension === CAUSE_SUB_DIMENSION
        ? [
            { value: 'immediate', label: 'Immediate Cause' },
            { value: 'root', label: 'Root Cause' },
          ]
        : []

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note="Every dimension is one breakdown of the same underlying incident data — pick a dimension, narrow by year/rig if needed, then click any cell to see the incidents behind it.">
        <SelectField label="Dimension" value={dimension} onChange={handleDimensionChange} options={dimensionOptions} width="w-[220px]" />
        {subOptions.length > 0 && (
          <SelectField
            label={dimension === CAUSE_SUB_DIMENSION ? 'Cause Type' : 'Rig Type'}
            value={sub}
            onChange={setSub}
            options={subOptions}
            width="w-[170px]"
          />
        )}
        {supportsPopulationFilter && (
          <SegmentedToggle
            value={mode}
            onChange={setMode}
            options={[
              { value: 'rigs', label: 'Rigs' },
              { value: 'units', label: 'Units' },
            ]}
          />
        )}
        {supportsPopulationFilter && mode === 'units' ? (
          <MultiSelectPopover
            label="Units"
            placeholder="All units"
            items={unitOptions}
            selected={selectedUnitNames}
            onToggle={toggleUnit}
            onSelectAll={() => setSelectedUnitNames(new Set())}
            getKey={(u) => u.id}
            getLabel={(u) => u.name}
            allSelected={selectedUnitNames.size === 0}
          />
        ) : (
          <MultiSelectPopover
            label="Rigs"
            placeholder="All rigs"
            items={rigOptions}
            selected={selectedRigIds}
            onToggle={toggleRig}
            onSelectAll={() => setSelectedRigIds(new Set())}
            getKey={(r) => r.id}
            getLabel={(r) => r.name}
            allSelected={selectedRigIds.size === 0}
          />
        )}
        {meta && (
          <MultiSelectPopover
            label="Financial Years"
            placeholder="All years"
            items={meta.years}
            selected={selectedYearIds}
            onToggle={toggleYear}
            onSelectAll={() => setSelectedYearIds(new Set())}
            getKey={(y) => y.id}
            getLabel={(y) => y.label}
            allSelected={selectedYearIds.size === 0}
          />
        )}
      </DashboardToolbar>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-3">
            <KpiCard icon={AlertTriangle} label="Total" value={fmtNum(data.grand_total)} accent="var(--chart-1)" />
            <KpiCard icon={Layers} label="Rows With Data" value={fmtNum(data.rows.filter((r) => r.total > 0).length)} accent="var(--chart-3)" />
            <KpiCard icon={Grid3x3} label="Years Shown" value={data.years.length} accent="var(--chart-5)" />
          </div>

          <ChartCard icon={Grid3x3} title={data.dimension_label} accent="var(--chart-1)" bodyClassName="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={hideEmptyRows}
                  onChange={(e) => setHideEmptyRows(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Hide rows with no incidents
              </label>
              <Button size="sm" variant="outline" onClick={exportExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-20 border-b border-border bg-muted text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="sticky left-0 z-30 bg-muted px-3 py-2.5">{data.dimension_label}</th>
                    {data.years.map((y) => (
                      <th key={y.id} className="bg-muted px-3 py-2.5 text-right whitespace-nowrap">
                        {y.label}
                      </th>
                    ))}
                    <th className="bg-muted px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={data.years.length + 2} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        No incidents match the current filters.
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((row, i) => (
                    <tr key={row.key} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="sticky left-0 z-10 truncate bg-inherit px-3 py-2 font-medium text-foreground" title={row.label} style={{ background: i % 2 === 1 ? 'var(--muted)' : 'var(--card)' }}>
                        {row.label}
                      </td>
                      {data.years.map((y) => {
                        const n = row.counts[String(y.id)] ?? 0
                        return (
                          <td
                            key={y.id}
                            onClick={() => openDrilldown(row, y)}
                            className={`px-3 py-2 text-right tabular-nums ${
                              n > 0 ? 'cursor-pointer font-medium text-primary hover:underline' : 'text-muted-foreground/40'
                            }`}
                          >
                            {n || '—'}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                {visibleRows.length > 0 && (
                  <tfoot>
                    {/* bg must be a solid, opaque color (not bg-primary/10) —
                        this row is sticky over the scrolling body, and a
                        translucent tint lets scrolled-past rows bleed
                        through underneath it. */}
                    <tr
                      className="sticky bottom-0 z-20 border-t-2 border-border font-semibold text-foreground"
                      style={{ background: 'color-mix(in oklab, var(--primary) 10%, var(--card))' }}
                    >
                      <td
                        className="sticky left-0 z-10 px-3 py-2.5"
                        style={{ background: 'color-mix(in oklab, var(--primary) 10%, var(--card))' }}
                      >
                        Total
                      </td>
                      {data.years.map((y) => (
                        <td key={y.id} className="px-3 py-2.5 text-right tabular-nums">
                          {data.column_totals[String(y.id)] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right tabular-nums">{data.grand_total}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </ChartCard>
        </>
      )}

      <Dialog open={Boolean(drilldown)} onOpenChange={(open) => !open && setDrilldown(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader className="pr-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>
                  {drilldown?.rowLabel} — {drilldown?.yearLabel}
                </DialogTitle>
                <DialogDescription>
                  {drilldown?.loading ? 'Loading…' : `${drilldown?.rows.length ?? 0} record(s)`}
                </DialogDescription>
              </div>
              {!drilldown?.loading && drilldown?.kind && (
                <Button size="sm" variant="outline" className="shrink-0" onClick={printDrilldownPdf}>
                  <Printer className="h-3.5 w-3.5" />
                  Print PDF
                </Button>
              )}
            </div>
            {drilldown?.filterSummary && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {drilldown.filterSummary.map((line) => (
                  <span
                    key={line}
                    className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {line}
                  </span>
                ))}
              </div>
            )}
          </DialogHeader>
          {!drilldown?.loading && drilldown?.kind && (
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 border-b border-border bg-muted text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {DRILLDOWN_COLUMNS[drilldown.kind].map((c) => (
                      <th key={c.key} className="bg-muted px-3 py-2">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drilldown.rows.map((r, i) => (
                    <tr key={i} className={`border-b border-border/60 last:border-b-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      {DRILLDOWN_COLUMNS[drilldown.kind].map((c) => (
                        <td key={c.key} className={`px-3 py-2 align-top text-muted-foreground ${c.wide ? 'max-w-[280px]' : 'whitespace-nowrap'}`}>
                          {c.fmt ? c.fmt(r[c.key]) : r[c.key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
