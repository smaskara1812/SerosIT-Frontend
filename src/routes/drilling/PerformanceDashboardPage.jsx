import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconChevronDown } from '@/components/icons'
import { Download } from 'lucide-react'

const MENU_KEY = 'drilling.performance_dashboard'

// The frozen-left columns' content is short (a rig name, a well label, a
// date) — a sensible min-width so they don't collapse to nothing, but no
// forced width beyond that. Column widths for the whole table are left to
// the browser's normal (auto) table layout, which sizes every column from
// its actual content and stretches to fill whatever room is available —
// dynamic, rather than a hardcoded pixel budget that either wastes space
// on a wide screen or silently gets compressed on a narrow one.
const FROZEN_LEFT = [
  { key: 'rig', label: 'Rig', minWidth: 90 },
  { key: 'well', label: 'Well', minWidth: 120 },
  { key: 'period', label: 'Period', minWidth: 90 },
]
const FROZEN_EDGE_SHADOW_RIGHT = 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]'
const FROZEN_EDGE_SHADOW_LEFT = 'shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.15)]'

const NUMERIC_COLUMNS = [
  { key: 'received_diesel', label: 'Received D', group: 'Diesel (Ltr)' },
  { key: 'consumption_diesel', label: 'Consumed D', group: 'Diesel (Ltr)' },
  { key: 'received_water', label: 'Received W', group: 'Water (Ltr)' },
  { key: 'generated_water', label: 'Generated W', group: 'Water (Ltr)' },
  { key: 'consumption_water', label: 'Consumed W', group: 'Water (Ltr)' },
  { key: 'operating_hrs', label: 'Operating', group: 'Operations (Hrs)' },
  { key: 'standby_hrs', label: 'Standby', group: 'Operations (Hrs)' },
  { key: 'repair_service_hrs', label: 'Service', group: 'Operations (Hrs)' },
  { key: 'repair_rate_hrs', label: 'Repair Rate', group: 'Operations (Hrs)' },
  { key: 'zero_rate_hrs', label: 'Zero Rate', group: 'Operations (Hrs)' },
  // Its own group, not "Operations (Hrs)" — meterage is drilled distance,
  // not an hours bucket, and grouping it under Hrs mislabeled it.
  { key: 'drilling_meterage', label: 'Drilling Meterage', group: 'Meterage (m)' },
]

function fmtNum(v) {
  if (v == null) return '0'
  const n = Number(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// `frozenOffsets` is [0, rigColumnWidth, rigColumnWidth+wellColumnWidth] —
// measured from the real rendered column widths (see the ResizeObserver in
// the page component below), not assumed. Column widths are dynamic (auto
// layout, sized from content, filling available space), so the pixel
// offset a sticky column needs to dock at can only be known by measuring
// it after render, not by hardcoding a number that will drift out of sync
// the moment the data or the viewport width changes.
function GroupHeader({ frozenRefs, frozenOffsets }) {
  const groups = []
  for (const c of NUMERIC_COLUMNS) {
    const last = groups[groups.length - 1]
    if (last && last.label === c.group) last.span += 1
    else groups.push({ label: c.group, span: 1 })
  }
  // Every header cell paints its own solid background rather than relying
  // on the <tr>'s — with border-separate (required for sticky cells to
  // work at all) a row's background doesn't reliably show through its
  // cells, so each <th> needs to be opaque on its own, doubly so for the
  // ones that are also sticky and need to cover scrolled-under content.
  const cellBg = 'bg-muted'
  return (
    <thead className="sticky top-0 z-20">
      <tr className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
        {FROZEN_LEFT.map((c, i) => (
          <th
            key={c.key}
            ref={frozenRefs[i]}
            rowSpan={2}
            style={{ minWidth: c.minWidth, left: frozenOffsets[i] }}
            className={`sticky isolate z-30 border-b border-border px-3 py-2 text-left align-bottom ${cellBg} ${
              i === FROZEN_LEFT.length - 1 ? FROZEN_EDGE_SHADOW_RIGHT : ''
            }`}
          >
            {c.label}
          </th>
        ))}
        {groups.map((g) => (
          <th key={g.label} colSpan={g.span} className={`border-b border-l border-border px-3 py-1.5 text-center ${cellBg}`}>
            {g.label}
          </th>
        ))}
        <th
          rowSpan={2}
          className={`sticky isolate right-0 z-30 border-b border-l border-border px-3 py-2 text-right align-bottom ${cellBg} ${FROZEN_EDGE_SHADOW_LEFT}`}
        >
          Efficiency %
        </th>
      </tr>
      <tr className="text-[11px] font-semibold text-muted-foreground">
        {NUMERIC_COLUMNS.map((c, i) => {
          const isFirstOfGroup = i === 0 || NUMERIC_COLUMNS[i - 1].group !== c.group
          return (
            <th key={c.key} className={`border-b px-3 py-1.5 text-right ${cellBg} ${isFirstOfGroup ? 'border-l border-border' : ''}`}>
              {c.label}
            </th>
          )
        })}
      </tr>
    </thead>
  )
}

// Compact "N selected" trigger + checklist popover — the same interaction
// this app already uses for the IT Asset Report's filters, applied here so
// the filter bar reads as a single row of controls instead of a bank of
// inline checklists eating the top of the page.
function MultiSelectPopover({ label, placeholder = 'All', width = 220, items, selected, onToggle, onSelectAll, getKey, getLabel, allSelected }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Count against `selected.size` (the true total), not against how many
  // of the currently-listed `items` are checked — when `items` has already
  // been narrowed (e.g. by the Rig Type filter), a rig selected under a
  // different type is still selected, just not visible in this list right
  // now, and the trigger shouldn't understate that.
  const visibleSelected = items.filter((i) => selected.has(getKey(i))).map(getLabel)
  const triggerText =
    selected.size === 0
      ? placeholder
      : selected.size === 1 && visibleSelected.length === 1
        ? visibleSelected[0]
        : `${selected.size} selected`

  return (
    <div className="relative flex flex-col gap-2" ref={ref} style={{ width }}>
      <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-left text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
      >
        <span className={selected.size ? 'truncate text-foreground' : 'text-muted-foreground'}>{triggerText}</span>
        <IconChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 z-40 mt-1 w-[260px] rounded-lg border border-border bg-popover p-2 shadow-lg"
        >
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted">
            <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="h-3.5 w-3.5 accent-primary" />
            Select All
          </label>
          <div className="my-1 border-t border-border" />
          <div className="max-h-56 overflow-y-auto">
            {items.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">None available.</div>}
            {items.map((item) => {
              const key = getKey(item)
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => onToggle(key)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="truncate">{getLabel(item)}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function PerformanceDashboardPage() {
  const { user } = useAuth()
  const canExport = can(user, MENU_KEY, 'export')

  // Monthly, not Daily — Daily's default (current financial year, ~365
  // days) triggered the "wide date range" warning on every fresh page
  // load before anyone had touched a filter. Monthly is also the lighter
  // aggregation, a better default for a dashboard-style overview.
  const [summaryType, setSummaryType] = useState('monthly')
  const [dateMode, setDateMode] = useState('financial_yr')
  const [rigTypeFilter, setRigTypeFilter] = useState('')
  const [fromDt, setFromDt] = useState('')
  const [toDt, setToDt] = useState('')

  const [rigs, setRigs] = useState([])
  const [financialYears, setFinancialYears] = useState([])
  const [selectedFyIds, setSelectedFyIds] = useState(() => new Set())
  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())

  const [result, setResult] = useState(null)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  // The exact query string that produced `result` — Export re-sends this,
  // not whatever the filter controls currently show, so a CSV always
  // matches what's on screen even if the user has tweaked filters since
  // the last Apply without re-running the query yet.
  const [appliedParams, setAppliedParams] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  // Real, measured pixel offsets for the frozen-left columns — column
  // widths are dynamic (auto layout, sized from content), so the only way
  // to know where the 2nd and 3rd frozen columns should dock is to measure
  // the actual rendered width of the ones before them, not assume a fixed
  // number. Re-measures on resize and whenever new rows arrive, since
  // either can change a column's natural width.
  const frozenRefs = [useRef(null), useRef(null), useRef(null)]
  const [frozenOffsets, setFrozenOffsets] = useState([0, 0, 0])

  useLayoutEffect(() => {
    function measure() {
      const widths = frozenRefs.map((r) => r.current?.offsetWidth || 0)
      setFrozenOffsets([0, widths[0], widths[0] + widths[1]])
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
    apiFetch('/api/masters/rigs/?active=Y&page_size=200&fields=rig_id,rig_name,rig_subtype_name')
      .then((r) => r.json())
      .then((data) => {
        setRigs(data.results || data || [])
      })
    apiFetch('/api/masters/financial-years/?page_size=200')
      .then((r) => r.json())
      .then((data) => {
        const years = data.results || data || []
        setFinancialYears(years)
        const current = years.find((y) => y.fin_year_from <= todayIso() && todayIso() <= y.fin_year_to)
        if (current) setSelectedFyIds(new Set([current.financial_year_id]))
      })
  }, [])

  const rigTypes = useMemo(() => {
    const names = new Set(rigs.map((r) => r.rig_subtype_name).filter(Boolean))
    return [...names].sort()
  }, [rigs])

  const visibleRigs = useMemo(
    () => (rigTypeFilter ? rigs.filter((r) => r.rig_subtype_name === rigTypeFilter) : rigs),
    [rigs, rigTypeFilter]
  )

  function toggleRig(id) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleFy(id) {
    setSelectedFyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function buildParams() {
    const params = new URLSearchParams({ record_status: summaryType, dates_entered: dateMode })
    params.set('rig_ids', [...selectedRigIds].join(','))
    if (dateMode === 'financial_yr') {
      params.set('financial_years', [...selectedFyIds].join(','))
    } else {
      params.set('from_dt', fromDt)
      params.set('to_dt', toDt)
    }
    return params
  }

  const liveParamString = buildParams().toString()
  // The table on screen was built from `appliedParams`, not from whatever
  // the filter controls say right now — this flags when they've drifted
  // apart, so the user isn't looking at a stale grid without knowing it.
  const filtersAreStale = result !== null && appliedParams !== liveParamString

  // Daily rows are one row per rig per day — a multi-year financial-year
  // selection (or an equally wide date range) in Daily mode can mean
  // thousands of rows with no pagination to fall back on. Not a hard
  // block, just a heads-up before the user waits on a huge fetch.
  const wideRangeWarning = useMemo(() => {
    if (summaryType !== 'daily') return null
    let days = 0
    if (dateMode === 'financial_yr') {
      for (const id of selectedFyIds) {
        const fy = financialYears.find((y) => y.financial_year_id === id)
        if (fy) days += (new Date(fy.fin_year_to) - new Date(fy.fin_year_from)) / 86400000
      }
    } else if (fromDt && toDt) {
      days = (new Date(toDt) - new Date(fromDt)) / 86400000
    }
    if (days > 180) return 'This is a wide date range for Daily — it may take a few scrolls to load everything, or switch to Monthly.'
    return null
  }, [summaryType, dateMode, selectedFyIds, financialYears, fromDt, toDt])

  function runQuery() {
    if (selectedRigIds.size === 0) {
      setError('Select at least one rig.')
      setResult(null)
      return
    }
    if (dateMode === 'financial_yr' && selectedFyIds.size === 0) {
      setError('Select at least one financial year.')
      setResult(null)
      return
    }
    if (dateMode === 'dates' && (!fromDt || !toDt)) {
      setError('Pick both a From and To date.')
      setResult(null)
      return
    }
    setError('')
    setLoading(true)
    const params = buildParams()
    const thisRequest = ++requestIdRef.current
    apiFetch(`/api/drilling/performance-dashboard/?${params}&page=1`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        // A fresh Apply replaces the table outright — this is a new query,
        // not a continuation of whatever was scrolled into view before.
        setResult(data)
        setPage(1)
        setAppliedParams(params.toString())
      })
      .finally(() => {
        if (thisRequest === requestIdRef.current) setLoading(false)
      })
  }

  // Fires from the table's own onScroll once the user nears the bottom —
  // fetches the next page and appends it, rather than the (unbounded, and
  // for a wide Daily selection, browser-hanging) approach of asking the
  // API for every matching row in one response and rendering all of it at
  // once. Totals always come back computed from the *entire* filtered
  // result server-side, not just what's been paged in, so the Total row is
  // correct even mid-scroll.
  function loadNextPage() {
    if (appliedParams == null || loading || loadingMore || !result?.has_more) return
    const nextPage = page + 1
    setLoadingMore(true)
    const thisRequest = ++requestIdRef.current
    apiFetch(`/api/drilling/performance-dashboard/?${appliedParams}&page=${nextPage}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        // Pages after the first don't recompute totals/count (expensive
        // full-range aggregates) — keep the values from page 1.
        setResult((prev) => ({
          ...data,
          totals: data.totals ?? prev?.totals,
          count: data.count ?? prev?.count,
          rows: [...(prev?.rows || []), ...data.rows],
        }))
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
    const res = await apiFetch(`/api/drilling/performance-dashboard/export/?${appliedParams}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-dashboard-${todayIso()}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const rows = result?.rows || []
  const totals = result?.totals
  const totalCount = result?.count ?? 0

  // Must run on every render regardless of the permission check below —
  // a conditional early return before a hook call breaks the Rules of
  // Hooks (a user without view rights would render fewer hooks than one
  // with rights, which React doesn't allow for the same component).
  usePageSubtitle(
    result ? (rows.length < totalCount ? `${rows.length.toLocaleString()} of ${totalCount.toLocaleString()} rows` : `${totalCount.toLocaleString()} rows`) : null
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4">
      {/* One horizontal filter bar instead of a left rail or a bank of
          inline checklists — each multi-select collapses to a compact
          "N selected" trigger, so the whole bar stays a single row and the
          table below gets the full width and height. */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Summary</p>
          <div className="flex gap-1.5">
            {[
              { value: 'daily', label: 'Daily' },
              { value: 'monthly', label: 'Monthly' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSummaryType(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  summaryType === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-[160px] flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Rig Type</p>
          <select
            value={rigTypeFilter}
            onChange={(e) => setRigTypeFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="">All</option>
            {rigTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <MultiSelectPopover
          label="Rig"
          items={visibleRigs}
          selected={selectedRigIds}
          onToggle={toggleRig}
          getKey={(r) => r.rig_id}
          getLabel={(r) => r.rig_name}
          allSelected={visibleRigs.length > 0 && visibleRigs.every((r) => selectedRigIds.has(r.rig_id))}
          onSelectAll={() =>
            setSelectedRigIds((prev) => {
              const allOn = visibleRigs.every((r) => prev.has(r.rig_id))
              const next = new Set(prev)
              for (const r of visibleRigs) {
                if (allOn) next.delete(r.rig_id)
                else next.add(r.rig_id)
              }
              return next
            })
          }
        />

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Period</p>
          <div className="flex gap-1.5">
            {[
              { value: 'financial_yr', label: 'Financial Year' },
              { value: 'dates', label: 'Date Range' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDateMode(opt.value)}
                className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  dateMode === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {dateMode === 'financial_yr' ? (
          <MultiSelectPopover
            label="Financial Year"
            items={financialYears}
            selected={selectedFyIds}
            onToggle={toggleFy}
            getKey={(y) => y.financial_year_id}
            getLabel={(y) => y.fin_year_text}
            allSelected={financialYears.length > 0 && selectedFyIds.size === financialYears.length}
            onSelectAll={() =>
              setSelectedFyIds((prev) =>
                prev.size === financialYears.length ? new Set() : new Set(financialYears.map((y) => y.financial_year_id))
              )
            }
          />
        ) : (
          <div className="flex gap-2">
            <div className="flex flex-col gap-2">
              <Label className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">From</Label>
              <Input type="date" value={fromDt} onChange={(e) => setFromDt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">To</Label>
              <Input type="date" value={toDt} onChange={(e) => setToDt(e.target.value)} />
            </div>
          </div>
        )}

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

      {(error || wideRangeWarning || filtersAreStale) && (
        <div className="-mt-2 flex flex-col gap-1">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!error && wideRangeWarning && <p className="text-xs text-amber-600">{wideRangeWarning}</p>}
          {!error && filtersAreStale && (
            <p className="text-xs text-muted-foreground">Filters have changed — select Update Results to refresh the table below.</p>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card" onScroll={handleTableScroll}>
        {!result ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            Choose your filters above and select Apply Filters to see results.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            No records found for this selection.
          </div>
        ) : (
          <table className="table-auto w-full border-separate border-spacing-0 text-sm">
            <GroupHeader frozenRefs={frozenRefs} frozenOffsets={frozenOffsets} />
            <tbody>
              {rows.map((r, i) => {
                const rowKey = `${r.rig}__${r.well}__${r.period}`
                // Explicit per-cell background rather than a Tailwind
                // even/odd variant — with border-separate, the zebra
                // stripe and the frozen columns' opaque backgrounds are
                // the same concern, so every <td> sets its own color.
                // Frozen cells use a fully solid color (not /20) — a
                // translucent stripe is exactly a hole a scrolled-under
                // column can show through, which is the whole reason a
                // frozen column has an opaque background in the first
                // place.
                const rowBg = i % 2 === 1 ? 'bg-muted/20' : 'bg-card'
                const frozenRowBg = i % 2 === 1 ? 'bg-muted' : 'bg-card'
                return (
                  <tr key={rowKey}>
                    {/* `isolate` on every sticky cell — without it, a
                        browser can composite the horizontally-scrolled-past
                        cells *above* a sticky cell's own background instead
                        of hiding them behind it, so the scrolling column's
                        text visibly bleeds through the frozen column.
                        Forcing each sticky cell into its own stacking
                        context fixes the paint order. `left` comes from
                        the measured `frozenOffsets`, not a guess — column
                        widths are dynamic, so this is the only value that
                        can ever be correct. */}
                    {FROZEN_LEFT.map((c, ci) => (
                      <td
                        key={c.key}
                        title={r[c.key]}
                        style={{ minWidth: c.minWidth, left: frozenOffsets[ci] }}
                        className={`sticky isolate z-10 truncate border-b border-border/60 px-3 py-2 ${frozenRowBg} ${
                          c.key === 'rig' ? 'font-medium text-foreground' : c.key === 'period' ? 'font-mono text-muted-foreground' : 'text-muted-foreground'
                        } ${ci === FROZEN_LEFT.length - 1 ? FROZEN_EDGE_SHADOW_RIGHT : ''}`}
                      >
                        {r[c.key]}
                      </td>
                    ))}
                    {NUMERIC_COLUMNS.map((c, ci) => (
                      <td
                        key={c.key}
                        className={`border-b border-border/60 px-3 py-2 text-right tabular-nums text-foreground ${rowBg} ${
                          ci === 0 || NUMERIC_COLUMNS[ci - 1].group !== c.group ? 'border-l border-border' : ''
                        }`}
                      >
                        {fmtNum(r[c.key])}
                      </td>
                    ))}
                    <td
                      className={`sticky isolate right-0 z-10 border-b border-l border-border/60 px-3 py-2 text-right font-semibold tabular-nums text-foreground ${frozenRowBg} ${FROZEN_EDGE_SHADOW_LEFT}`}
                    >
                      {fmtNum(r.efficiency)}
                    </td>
                  </tr>
                )
              })}
              {loadingMore && (
                <tr>
                  <td colSpan={FROZEN_LEFT.length + NUMERIC_COLUMNS.length + 1} className="bg-card px-3 py-2 text-center text-xs text-muted-foreground">
                    Loading more…
                  </td>
                </tr>
              )}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="sticky bottom-0 z-20 font-bold text-foreground">
                  {FROZEN_LEFT.map((c, i) => (
                    <td
                      key={c.key}
                      style={{ minWidth: c.minWidth, left: frozenOffsets[i] }}
                      // Sticky left AND sticky bottom compound on the same
                      // cell — this is the bottom-left frozen corner, so it
                      // needs the same z-30 the header's corners use or a
                      // diagonal scroll can tuck it under a plain cell.
                      className={`sticky isolate z-30 border-t-2 border-border bg-muted px-3 py-2 ${i === FROZEN_LEFT.length - 1 ? FROZEN_EDGE_SHADOW_RIGHT : ''}`}
                    >
                      {i === 0 ? 'Total' : ''}
                    </td>
                  ))}
                  {NUMERIC_COLUMNS.map((c, ci) => (
                    <td
                      key={c.key}
                      className={`border-t-2 border-border bg-muted px-3 py-2 text-right tabular-nums ${
                        ci === 0 || NUMERIC_COLUMNS[ci - 1].group !== c.group ? 'border-l border-border' : ''
                      }`}
                    >
                      {fmtNum(totals[c.key])}
                    </td>
                  ))}
                  <td
                    className={`sticky isolate right-0 z-30 border-t-2 border-l border-border bg-muted px-3 py-2 text-right tabular-nums ${FROZEN_EDGE_SHADOW_LEFT}`}
                  >
                    {fmtNum(totals.efficiency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  )
}
