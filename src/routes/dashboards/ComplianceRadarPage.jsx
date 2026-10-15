import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileBadge,
  Hourglass,
  ListChecks,
  ShieldAlert,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, KpiCard, MultiSelectPopover } from './DashboardUI'
import { useUrlBatch, useUrlIdSet, useUrlString } from './dashboardUrlState'
import RigLoading from '@/components/RigLoading'

const MENU_KEY = 'dashboards.compliance_radar'
const PAGE_STEP = 100

// The KPI cards are narrow, so each carries a one-word label and the rest in its sub-line.
const CARD_TEXT = {
  certificate: { label: 'Certificates', sub: 'overdue' },
  survey: { label: 'Surveys', sub: 'overdue' },
  activity: { label: 'Activities', sub: 'overdue' },
  incident_action: { label: 'Incident', sub: 'actions overdue' },
  corrective_action: { label: 'Corrective', sub: 'actions overdue' },
}
const CATEGORY_ICON = {
  certificate: FileBadge,
  survey: ClipboardCheck,
  activity: ListChecks,
  incident_action: ShieldAlert,
  corrective_action: Wrench,
}
const CATEGORY_ACCENT = {
  certificate: 'var(--chart-1)',
  survey: 'var(--chart-2)',
  activity: 'var(--chart-3)',
  incident_action: 'var(--chart-5)',
  corrective_action: 'var(--chart-4)',
}
const STATE_LABEL = { overdue: 'overdue', due_soon: 'due soon', no_date: 'with no target date' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// "5,349 days" is hard to read; past a year say so in years too.
function fmtOverdue(days) {
  if (days == null) return '—'
  if (days < 365) return `${days.toLocaleString()} d`
  return `${days.toLocaleString()} d (${(days / 365).toFixed(1)} yr)`
}

function Pill({ tone, children }) {
  const cls =
    tone === 'overdue'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'soon'
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'bg-muted text-muted-foreground'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>
}

function MatrixCell({ cell, onClick }) {
  if (!cell || (cell.overdue === 0 && cell.due_soon === 0)) return <span className="text-muted-foreground/50">—</span>
  return (
    <button
      type="button"
      onClick={onClick}
      title="List these items"
      className="inline-flex items-center justify-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted"
    >
      {cell.overdue > 0 && <Pill tone="overdue">{cell.overdue}</Pill>}
      {cell.due_soon > 0 && <Pill tone="soon">{cell.due_soon}</Pill>}
    </button>
  )
}

export default function ComplianceRadarPage() {
  const { user } = useAuth()

  const [selectedRigIds, setSelectedRigIds] = useUrlIdSet('rigs')
  const [horizonParam, setHorizonParam] = useUrlString('horizon')
  const [category] = useUrlString('category') // one type, or several joined with commas
  const [stateFilter, setStateFilter] = useUrlString('state')
  const [rigFilter] = useUrlString('rig')
  const [mandatoryOnly, setMandatoryOnly] = useUrlString('mandatory')
  const [includeInactive, setIncludeInactive] = useUrlString('inactive')
  const setMany = useUrlBatch()
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const [error, setError] = useState('')
  const [shown, setShown] = useState(PAGE_STEP)
  const [showClean, setShowClean] = useState(false)
  const [exporting, setExporting] = useState(false)

  const horizon = [30, 60, 90].includes(Number(horizonParam)) ? Number(horizonParam) : 30

  // Everything that changes what the server returns. The list's own filters (type, status, rig) are
  // sent too, so the 1,000-row cap applies after them, not before.
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ horizon: String(horizon) })
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    if (category) params.set('category', category)
    if (stateFilter) params.set('state', stateFilter)
    if (rigFilter) params.set('rig', rigFilter)
    if (mandatoryOnly) params.set('mandatory', '1')
    if (includeInactive) params.set('inactive', '1')
    return params.toString()
  }, [horizon, selectedRigIds, category, stateFilter, rigFilter, mandatoryOnly, includeInactive])

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/dashboards/compliance-radar/?${queryString}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        setError('')
        setLoaded({ key: queryString, data: d })
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load dashboard data.')
      })
    return () => {
      cancelled = true
    }
  }, [queryString])

  const data = loaded.data
  const refreshing = Boolean(data) && loaded.key !== queryString

  usePageSubtitle(data ? `${data.summary.total_overdue} overdue · as of ${fmtDate(data.as_of)}` : null)

  const rigOptions = data?.rigs_filter ?? []
  const categories = useMemo(() => data?.categories ?? [], [data])
  const catInfo = useMemo(() => Object.fromEntries(categories.map((c) => [c.key, c])), [categories])
  const activeCats = category ? category.split(',') : []
  const catIs = (key) => activeCats.length === 1 && activeCats[0] === key

  // Rigs with nothing outstanding are hidden by default; the count says how many.
  const matrixRigs = useMemo(
    () => (data ? data.rigs.filter((r) => showClean || r.total_overdue > 0 || r.total_due_soon > 0) : []),
    [data, showClean]
  )
  const cleanCount = data ? data.rigs.filter((r) => r.total_overdue === 0 && r.total_due_soon === 0).length : 0

  function toggleRig(rigId) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(rigId)) next.delete(rigId)
      else next.add(rigId)
      return next
    })
  }

  const narrowed = Boolean(category || stateFilter || rigFilter)
  function clearNarrowing() {
    setMany({ category: '', state: '', rig: '' })
    setShown(PAGE_STEP)
  }
  const flip = (setter) => (value) => {
    setter((prev) => (prev === value ? '' : value))
    setShown(PAGE_STEP)
  }
  const flagToggle = (setter) => (e) => setter(e.target.checked ? '1' : '')

  // One click on a type card lists exactly the number on the card: that type's overdue items.
  function pickType(key) {
    const same = catIs(key) && stateFilter === 'overdue'
    setMany({ category: same ? '' : key, state: same ? '' : 'overdue' })
    setShown(PAGE_STEP)
  }
  function pickCell(rigId, key) {
    setMany({ rig: String(rigId), category: key, state: '' })
    setShown(PAGE_STEP)
  }

  async function exportXlsx() {
    setExporting(true)
    try {
      const res = await apiFetch(`/api/dashboards/compliance-radar/export/?${queryString}`)
      if (!res.ok) throw new Error('export failed')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-radar-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Couldn't download the file. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const s = data?.summary
  const items = data?.items ?? []
  const rigName = rigFilter ? data?.rigs.find((r) => String(r.rig_id) === rigFilter)?.rig_name : null
  const checkbox = 'h-4 w-4 rounded border-input accent-[#1a3f7a]'

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar
        note={`Live snapshot as of ${fmtDate(data?.as_of)}. An item is overdue when its due date has passed and it is not completed or closed; it is due soon when it falls within the next ${horizon} days. An open action with no target date is counted separately, because it can never become overdue by itself. For certificates only the latest one of each type on a rig counts: an older one that was renewed is history.`}
      >
        <MultiSelectPopover
          label="Rigs"
          items={rigOptions}
          selected={selectedRigIds}
          onToggle={toggleRig}
          onSelectAll={() => setSelectedRigIds(new Set())}
          getKey={(r) => r.rig_id}
          getLabel={(r) => r.rig_name ?? ''}
          allSelected={selectedRigIds.size === 0}
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Due soon window</p>
          <div className="inline-flex overflow-hidden rounded-lg border border-input" role="group" aria-label="Due soon window">
            {[30, 60, 90].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonParam(h === 30 ? '' : String(h))}
                className={`h-9 px-3 text-sm font-medium transition-colors ${
                  horizon === h ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-muted'
                }`}
              >
                {h} days
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Include</p>
          <div className="flex h-9 items-center gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className={checkbox} checked={mandatoryOnly === '1'} onChange={flagToggle(setMandatoryOnly)} />
              Mandatory activities only
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className={checkbox} checked={includeInactive === '1'} onChange={flagToggle(setIncludeInactive)} />
              Inactive rigs
            </label>
          </div>
        </div>
        {can(user, MENU_KEY, 'export') && (
          <button
            type="button"
            onClick={exportXlsx}
            disabled={exporting || !data}
            className="ml-auto flex h-9 items-center gap-2 self-end rounded-lg border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Preparing…' : 'Export Excel'}
          </button>
        )}
      </DashboardToolbar>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="p-4 text-sm text-muted-foreground"><RigLoading /></p>}

      {data && (
        <div className={`flex flex-col gap-4 transition-opacity ${refreshing ? 'pointer-events-none opacity-50' : ''}`} aria-busy={refreshing}>
          <div className="flex flex-wrap gap-3">
            <KpiCard
              icon={TriangleAlert}
              label="Overdue"
              value={s.total_overdue}
              warning={s.total_overdue > 0}
              onFilter={() => flip(setStateFilter)('overdue')}
              filterActive={stateFilter === 'overdue' && !category}
            />
            <KpiCard
              icon={Hourglass}
              label="Due soon"
              sub={`next ${horizon} days`}
              value={s.total_due_soon}
              accent="var(--chart-4)"
              onFilter={() => flip(setStateFilter)('due_soon')}
              filterActive={stateFilter === 'due_soon' && !category}
            />
            <KpiCard
              icon={CalendarX2}
              label="No date"
              value={s.total_no_date}
              sub="open actions, no target date"
              accent="var(--chart-5)"
              warning={s.total_no_date > 0}
              onFilter={() => flip(setStateFilter)('no_date')}
              filterActive={stateFilter === 'no_date' && !category}
            />
            <KpiCard icon={ShieldAlert} label="Rigs affected" sub="with overdue items" value={`${s.rigs_with_overdue} / ${s.rigs_shown}`} accent="var(--chart-5)" />
            <KpiCard
              icon={CalendarClock}
              label="Oldest"
              sub="longest overdue item"
              value={s.oldest_overdue_days == null ? '—' : fmtOverdue(s.oldest_overdue_days)}
              accent="var(--chart-2)"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map((c) => {
              const v = s.by_category[c.key]
              return (
                <KpiCard
                  key={c.key}
                  icon={CATEGORY_ICON[c.key]}
                  label={CARD_TEXT[c.key].label}
                  value={v.overdue}
                  sub={v.due_soon > 0 ? `${CARD_TEXT[c.key].sub} · ${v.due_soon} due soon` : CARD_TEXT[c.key].sub}
                  accent={CATEGORY_ACCENT[c.key]}
                  warning={v.overdue > 0}
                  onFilter={() => pickType(c.key)}
                  filterActive={catIs(c.key) && stateFilter === 'overdue'}
                />
              )
            })}
          </div>

          <ChartCard
            icon={ListChecks}
            title="By rig"
            subtitle="red = overdue · amber = due soon · click a number to list those items"
            accent="var(--chart-1)"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2.5">Rig</th>
                    {categories.map((c) => (
                      <th key={c.key} className="px-3 py-2.5 text-center">
                        {c.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRigs.map((r, i) => (
                    <tr
                      key={String(r.rig_id)}
                      className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <button
                          type="button"
                          onClick={() => {
                            setMany({ rig: rigFilter === String(r.rig_id) ? '' : String(r.rig_id), category: '', state: '' })
                            setShown(PAGE_STEP)
                          }}
                          className={`text-left hover:underline ${rigFilter === String(r.rig_id) ? 'text-primary' : ''}`}
                        >
                          {r.rig_name}
                        </button>
                      </td>
                      {categories.map((c) => (
                        <td key={c.key} className="px-3 py-2.5 text-center">
                          <MatrixCell cell={r.categories[c.key]} onClick={() => pickCell(r.rig_id, c.key)} />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        {r.total_overdue > 0 ? (
                          <Pill tone="overdue">{r.total_overdue}</Pill>
                        ) : (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" aria-label="Nothing overdue" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cleanCount > 0 && (
              <div className="flex items-center gap-2 border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {cleanCount} {cleanCount === 1 ? 'rig has' : 'rigs have'} nothing outstanding.
                <button type="button" onClick={() => setShowClean((v) => !v)} className="ml-auto font-semibold text-primary hover:underline">
                  {showClean ? 'Hide them' : 'Show them'}
                </button>
              </div>
            )}
          </ChartCard>

          <ChartCard icon={TriangleAlert} title="Items" subtitle={`${data.items_total.toLocaleString()} matching`} accent="var(--destructive)" bodyClassName="p-0">
            {narrowed && (
              <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3.5 py-2 text-xs text-foreground">
                Showing {data.items_total.toLocaleString()}
                {activeCats.length ? ` ${activeCats.map((k) => catInfo[k]?.label?.toLowerCase() ?? k).join(' and ')}` : ' items'}
                {stateFilter ? ` ${STATE_LABEL[stateFilter]}` : ''}
                {rigName ? ` on ${rigName}` : ''}.
                <button type="button" onClick={clearNarrowing} className="ml-auto font-semibold text-primary hover:underline">
                  Clear
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5">Item</th>
                    <th className="px-3 py-2.5">Due</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        {narrowed ? (
                          'No items match this filter.'
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            Nothing is overdue or due in the next {horizon} days.
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                  {items.slice(0, shown).map((i, idx) => {
                    const Icon = CATEGORY_ICON[i.category]
                    const openable = catInfo[i.category]?.can_open
                    return (
                      <tr
                        key={`${i.category}-${idx}-${i.due_date}-${i.title}`}
                        className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: CATEGORY_ACCENT[i.category] }} />
                            {catInfo[i.category]?.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{i.rig_name}</td>
                        <td className="px-3 py-2.5 text-foreground">
                          {openable ? (
                            <NavLink to={i.path} className="block max-w-[46ch] hover:text-primary hover:underline">
                              {i.title}
                            </NavLink>
                          ) : (
                            <span className="block max-w-[46ch]">{i.title}</span>
                          )}
                          {(i.detail || i.mandatory) && (
                            <span className="block text-[11px] text-muted-foreground">
                              {i.mandatory && <span className="mr-1 font-semibold">Mandatory</span>}
                              {i.detail}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(i.due_date)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {i.state === 'overdue' ? (
                            <Pill tone="overdue">{fmtOverdue(-i.days)} overdue</Pill>
                          ) : i.state === 'no_date' ? (
                            <Pill tone="neutral">no target date</Pill>
                          ) : (
                            <Pill tone="soon">{i.days === 0 ? 'due today' : `due in ${i.days} d`}</Pill>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {openable && (
                            <NavLink
                              to={i.path}
                              title={`Open ${catInfo[i.category]?.label}`}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </NavLink>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {items.length > shown && (
              <div className="border-t border-border p-3 text-center">
                <button type="button" onClick={() => setShown((n) => n + PAGE_STEP)} className="text-sm font-semibold text-primary hover:underline">
                  Show {Math.min(PAGE_STEP, items.length - shown)} more
                </button>
              </div>
            )}
          </ChartCard>

          {data.items_truncated && (
            <p className="rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
              Showing the first 1,000 of {data.items_total.toLocaleString()} matching items, most overdue first. Narrow the filters or export to Excel for the rest. The counts in the cards are complete.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
