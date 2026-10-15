import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, CalendarClock, Clock3, Hourglass, MapPinned, Ruler, Timer, TriangleAlert, Truck } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'
import { useUrlIdSet, useUrlYear } from './dashboardUrlState'
import RigLoading from '@/components/RigLoading'

const MENU_KEY = 'dashboards.rig_moves'
const TOOLTIP_STYLE = { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }
const MOVE_COLOR = {
  ILM: 'var(--chart-1)',
  'IPM - Lateral': 'var(--chart-3)',
  'IPM - Adjacent': 'var(--chart-5)',
  'Not set': 'var(--muted-foreground)',
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}
const fmt = (v) => (v == null ? '—' : Math.round(Number(v)).toLocaleString())
const fmt1 = (v) => (v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }))
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
function change(now, before, label) {
  if (!before) return before === 0 && now > 0 ? `up from 0 in ${label}` : `no wells in ${label}`
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return `same as ${label}`
  return `${pct > 0 ? '+' : ''}${pct}% vs ${label}`
}

function WellRows({ wells, canOpen, showStale }) {
  return wells.map((w, i) => (
    <tr key={w.id} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
      <td className="px-3 py-2.5 font-medium text-foreground">{w.rig_name}</td>
      <td className="px-3 py-2.5 text-foreground">{w.location}</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(w.start)}</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{w.end ? fmtDate(w.end) : 'open'}</td>
      <td className="px-3 py-2.5 text-right">
        <span className={showStale && w.stale ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-foreground'}>{fmt(w.days)}</span>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{w.move_type}</td>
      <td className="px-3 py-2.5 text-right text-muted-foreground">{w.distance ? `${fmt1(w.distance)} ${w.distance_unit ?? ''}`.trim() : '—'}</td>
      <td className="px-3 py-2.5">
        {canOpen && (
          <NavLink
            to={`/drilling/drilling-information?select=${w.id}&q=${encodeURIComponent(w.location || '')}`}
            title="Open this well"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </NavLink>
        )}
      </td>
    </tr>
  ))
}

function WellsTable({ wells, empty, canOpen, showStale, daysLabel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <th className="px-3 py-2.5">Rig</th>
            <th className="px-3 py-2.5">Location</th>
            <th className="px-3 py-2.5">Anchor down</th>
            <th className="px-3 py-2.5">Completed</th>
            <th className="px-3 py-2.5 text-right">{daysLabel}</th>
            <th className="px-3 py-2.5">Move type</th>
            <th className="px-3 py-2.5 text-right">Distance</th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {wells.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          <WellRows wells={wells} canOpen={canOpen} showStale={showStale} />
        </tbody>
      </table>
    </div>
  )
}

export default function RigMovesPage() {
  const { user } = useAuth()

  const [year, setYear] = useUrlYear()
  const [selectedRigIds, setSelectedRigIds] = useUrlIdSet('rigs')
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const [error, setError] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    return params.toString()
  }, [year, selectedRigIds])

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/dashboards/rig-moves/?${queryString}`)
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

  usePageSubtitle(data ? `${data.summary.wells} wells started · ${data.year}` : null)

  const rigOptions = data?.rigs ?? []
  function toggleRig(rigId) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(rigId)) next.delete(rigId)
      else next.add(rigId)
      return next
    })
  }

  const monthly = useMemo(() => (data ? data.by_month.map((m) => ({ ...m, label: monthLabel(m.month) })) : []), [data])
  const hoursByRig = useMemo(
    () => (data ? data.by_rig.filter((r) => r.move_hours > 0).map((r) => ({ name: r.rig_name, hours: r.move_hours })).sort((a, b) => b.hours - a.hours) : []),
    [data]
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const s = data?.summary
  const canOpen = can(user, 'drilling.drilling_information', 'view')
  const stale = data ? data.open_wells.filter((w) => w.stale).length : 0

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note="Read from Drilling Information (one row per well or rig move) and the daily drilling reports. The figures are for wells started in the chosen year. Days on well = completion − first anchor-down; a well with no completion date is open and is kept out of the averages. Gap between wells = anchor-down minus the previous well's completion on the same rig. Distance is one field typed as nautical miles or kilometres with no unit stored; the unit follows the rig (kilometres on an onshore rig, nautical miles on an offshore one), kilometres are totalled and nautical miles are never added in. The current year is compared with the same stretch of last year. Move hours come from the daily reports of the year, whichever year the well started.">
        <YearSelect value={year} options={data?.years} onChange={setYear} />
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
      </DashboardToolbar>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="p-4 text-sm text-muted-foreground"><RigLoading /></p>}

      {data && (
        <div className={`flex flex-col gap-4 transition-opacity ${refreshing ? 'pointer-events-none opacity-50' : ''}`} aria-busy={refreshing}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={MapPinned} label="Wells" value={fmt(s.wells)} sub={change(s.wells, s.wells_prev, data.compare_label)} accent="var(--chart-1)" />
            <KpiCard
              icon={Timer}
              label="Days on well"
              value={s.median_days == null ? '—' : fmt1(s.median_days)}
              sub={s.p90_days == null ? 'median, completed wells' : `median · 9 in 10 done within ${s.p90_days} d`}
              accent="var(--chart-3)"
            />
            <KpiCard icon={Clock3} label="Between wells" value={s.median_gap == null ? '—' : `${fmt1(s.median_gap)} d`} sub={s.gap_unavailable > 0 ? `median idle days · ${s.gap_unavailable} wells have no gap (the well before was never closed)` : 'median idle time before the next well'} accent="var(--chart-2)" />
            <KpiCard icon={Truck} label="Move hours" value={fmt(s.move_hours)} sub={`hours logged as rig move in ${data.year}`} accent="var(--chart-5)" />
            <KpiCard
              icon={Ruler}
              label="Distance"
              value={s.distance_km == null ? '—' : `${fmt(s.distance_km)} km`}
              sub={`on ${s.distance_km_wells} of ${s.onshore_wells} onshore wells${s.distance_nm_wells > 0 ? ` · ${s.distance_nm_wells} offshore wells in nautical miles, not added` : ''}`}
              accent="var(--chart-4)"
            />
            <KpiCard
              icon={Hourglass}
              label="Open wells"
              value={fmt(s.open_wells_now)}
              sub={stale > 0 ? `${stale} open for over ${data.stale_open_days} days` : 'under way now'}
              warning={stale > 0}
            />
          </div>

          <ChartCard icon={CalendarClock} title="Wells started by month" subtitle="— by move type" accent="var(--chart-1)">
            {s.wells === 0 ? (
              <EmptyChartState>No wells started in {data.year}.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {data.move_types.map((t) => (
                    <Bar key={t} stackId="m" dataKey={t} fill={MOVE_COLOR[t]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Timer} title="How long wells take" subtitle="— completed wells started this year" accent="var(--chart-3)">
              {data.duration_histogram.every((b) => b.count === 0) ? (
                <EmptyChartState>No completed wells for {data.year}.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.duration_histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(v), 'Wells']} />
                    <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={CalendarClock} title="Move hours by month" subtitle={`— hours logged as rig move in the daily reports, ${data.year} (not tied to when a well started)`} accent="var(--chart-5)">
              {s.move_hours === 0 ? (
                <EmptyChartState>No rig-move hours logged in {data.year}.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${fmt(v)} h`, 'Move hours']} />
                    <Bar dataKey="move_hours" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <ChartCard icon={Truck} title="Move hours by rig" subtitle={`— hours logged as rig move, ${data.year}`} accent="var(--chart-5)">
              {hoursByRig.length === 0 ? (
                <EmptyChartState>No rig-move hours logged in {data.year}.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(240, hoursByRig.length * 30)}>
                  <BarChart data={hoursByRig} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={100} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${fmt(v)} h`, 'Move hours']} />
                    <Bar dataKey="hours" fill="var(--chart-5)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard icon={MapPinned} title="By rig" subtitle={`— wells started in ${data.year}`} accent="var(--chart-1)" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5 text-right">Wells</th>
                    <th className="px-3 py-2.5 text-right">Still open</th>
                    <th className="px-3 py-2.5 text-right">Median days on well</th>
                    <th className="px-3 py-2.5 text-right">Longest (days)</th>
                    <th className="px-3 py-2.5 text-right">Median days between wells</th>
                    <th className="px-3 py-2.5 text-right">Move hours</th>
                    <th className="px-3 py-2.5 text-right">Distance (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_rig.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No wells or moves for {data.year}.
                      </td>
                    </tr>
                  )}
                  {data.by_rig.map((r, i) => (
                    <tr key={r.rig_id} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="px-3 py-2.5 font-medium text-foreground">{r.rig_name}</td>
                      <td className="px-3 py-2.5 text-right text-foreground">{r.wells || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{r.open_wells || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt1(r.median_days)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(r.longest_days)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt1(r.median_gap)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{r.move_hours ? fmt(r.move_hours) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {r.distance_km != null ? fmt1(r.distance_km) : r.distance_nm_wells ? `${r.distance_nm_wells} well(s) in NM` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard icon={Timer} title="Longest wells" subtitle={`— completed wells started in ${data.year}`} accent="var(--chart-3)" bodyClassName="p-0">
            <WellsTable wells={data.longest_wells} empty={`No completed wells for ${data.year}.`} canOpen={canOpen} daysLabel="Days on well" />
          </ChartCard>

          <ChartCard
            icon={TriangleAlert}
            title="Wells with no completion date"
            subtitle={`— every year; amber = open for more than ${data.stale_open_days} days, often a well never closed in the system`}
            accent="var(--chart-4)"
            bodyClassName="p-0"
          >
            <WellsTable wells={data.open_wells} empty="No open wells." canOpen={canOpen} showStale daysLabel="Days open" />
          </ChartCard>
        </div>
      )}
    </div>
  )
}
