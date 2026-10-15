import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, CalendarClock, Droplets, Fuel, Gauge, Ruler, Timer, TriangleAlert, Waves } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'
import { useUrlIdSet, useUrlYear } from './dashboardUrlState'

const MENU_KEY = 'dashboards.fuel_water'
const TOOLTIP_STYLE = { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}
const fmt = (v) => (v == null ? '—' : Math.round(Number(v)).toLocaleString())
const fmt1 = (v) => (v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 }))
// Large litre figures are easier to read in thousands or millions.
function compact(v) {
  if (v == null) return '—'
  const n = Math.abs(v)
  if (n >= 1e6) return `${(v / 1e6).toFixed(n >= 1e7 ? 1 : 2)} M`
  if (n >= 1e4) return `${(v / 1e3).toFixed(0)} k`
  return Math.round(v).toLocaleString()
}

function change(now, before, label) {
  if (!before) return `no data for ${label}`
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return `same as ${label}`
  return `${pct > 0 ? '+' : ''}${pct}% vs ${label}`
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export default function FuelWaterPage() {
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
    apiFetch(`/api/dashboards/fuel-water/?${queryString}`)
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

  usePageSubtitle(data ? `${compact(data.summary.diesel)} L diesel · ${compact(data.summary.water)} L water · ${data.year}` : null)

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
  const perHour = useMemo(
    () => (data ? data.by_rig.filter((r) => r.diesel_per_hour != null).map((r) => ({ name: r.rig_name, value: r.diesel_per_hour })).sort((a, b) => b.value - a.value) : []),
    [data]
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const s = data?.summary
  const canReport = can(user, 'drilling.drilling_report', 'view')

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note="Read from the daily drilling reports; nothing is entered here. Per operating hour = diesel ÷ operating hours; per metre = diesel ÷ metres drilled, over all reported days. Per rig per day divides by the rig-days that carry a figure; a rig-day is one rig's report for one day, so five rigs working the same day count as five. A rig's diesel balance (received − consumed) is shown only if it recorded at least one receipt in the year, because several rigs never do. Days using is the share of a rig's reports with a figure above zero; the report requires the figure, so a zero is a real entry (none used), not a missing one. The current year is compared with the same stretch of last year.">
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
      {!data && !error && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <div className={`flex flex-col gap-4 transition-opacity ${refreshing ? 'pointer-events-none opacity-50' : ''}`} aria-busy={refreshing}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={Fuel} label="Diesel" value={`${compact(s.diesel)} L`} sub={change(s.diesel, s.diesel_prev, data.compare_label)} accent="var(--chart-4)" />
            <KpiCard icon={Timer} label="Per hour" value={`${fmt1(s.diesel_per_hour)} L`} sub="diesel per operating hour" accent="var(--chart-1)" />
            <KpiCard icon={Ruler} label="Per metre" value={`${fmt1(s.diesel_per_metre)} L`} sub="diesel per metre drilled" accent="var(--chart-5)" />
            <KpiCard icon={Gauge} label="Per rig per day" value={`${fmt(s.diesel_per_day)} L`} sub={`${s.diesel_days.toLocaleString()} rig-days with diesel use`} accent="var(--chart-2)" />
            <KpiCard icon={Droplets} label="Water" value={`${compact(s.water)} L`} sub={change(s.water, s.water_prev, data.compare_label)} accent="var(--chart-3)" />
            <KpiCard icon={Waves} label="Water per rig per day" value={s.water_per_day == null ? '—' : `${compact(s.water_per_day)} L`} sub={`${s.water_days.toLocaleString()} rig-days with water use`} accent="var(--chart-2)" />
            <KpiCard icon={Fuel} label="Diesel received" value={`${compact(s.diesel_received)} L`} sub="as recorded in reports" accent="var(--chart-1)" />
            <KpiCard
              icon={TriangleAlert}
              label="To check"
              value={s.outlier_days}
              sub={`rig-days with a figure at ${data.outlier_factor}×+ that rig's usual`}
              warning={s.outlier_days > 0}
            />
          </div>

          <div className="flex flex-col gap-4">
            <ChartCard icon={CalendarClock} title="Diesel by month" subtitle="— consumed and received (bars), litres per operating hour (line)" accent="var(--chart-4)">
              {s.diesel === 0 ? (
                <EmptyChartState>No diesel recorded in {data.year}.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={compact} />
                    <YAxis yAxisId="r" orientation="right" stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmt(v), n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="l" dataKey="diesel" name="Consumed (L)" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="l" dataKey="diesel_in" name="Received (L)" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="r" type="linear" dataKey="diesel_per_hour" name="L per operating hour" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Droplets} title="Water by month" subtitle="— litres consumed" accent="var(--chart-3)">
              {s.water === 0 ? (
                <EmptyChartState>No water recorded in {data.year}.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={compact} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${fmt(v)} L`, 'Water consumed']} />
                    <Bar dataKey="water" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={Gauge} title="Diesel per operating hour, by rig" subtitle="— the fairest like-for-like comparison" accent="var(--chart-1)">
              {perHour.length === 0 ? (
                <EmptyChartState>No rig has both diesel and operating hours in {data.year}.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, perHour.length * 32)}>
                  <BarChart data={perHour} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={100} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${fmt1(v)} L/h`, 'Diesel']} />
                    <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard icon={Fuel} title="By rig" subtitle="— days using = share of reports with a figure above zero" accent="var(--chart-3)" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5 text-right">Reports</th>
                    <th className="px-3 py-2.5 text-right">Diesel (L)</th>
                    <th className="px-3 py-2.5 text-right">Per day</th>
                    <th className="px-3 py-2.5 text-right">Per hour</th>
                    <th className="px-3 py-2.5 text-right">Per metre</th>
                    <th className="px-3 py-2.5 text-right">Received (L)</th>
                    <th className="px-3 py-2.5 text-right">Balance (L)</th>
                    <th className="px-3 py-2.5 text-right">Days using diesel</th>
                    <th className="px-3 py-2.5 text-right">Water (L)</th>
                    <th className="px-3 py-2.5 text-right">Days using water</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_rig.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No reports for {data.year}.
                      </td>
                    </tr>
                  )}
                  {data.by_rig.map((r, i) => {
                    const pct = (v) => <span className="text-muted-foreground">{v == null ? '—' : `${v}%`}</span>
                    return (
                      <tr key={r.rig_id} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                        <td className="px-3 py-2.5 font-medium text-foreground">{r.rig_name}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{r.days.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-foreground">{fmt(r.diesel)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(r.diesel_per_day)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt1(r.diesel_per_hour)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt1(r.diesel_per_metre)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{r.diesel_received ? fmt(r.diesel_received) : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground" title={r.diesel_balance == null ? 'No receipts recorded for this rig' : undefined}>
                          {r.diesel_balance == null ? 'not recorded' : `${r.diesel_balance > 0 ? '+' : ''}${fmt(r.diesel_balance)}`}
                        </td>
                        <td className="px-3 py-2.5 text-right">{pct(r.diesel_use_pct)}</td>
                        <td className="px-3 py-2.5 text-right text-foreground">{r.water ? fmt(r.water) : '—'}</td>
                        <td className="px-3 py-2.5 text-right">{pct(r.water_use_pct)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard
            icon={TriangleAlert}
            title="Days to check"
            subtitle={`— at least ${data.outlier_factor}× that rig's median day; often a mistyped figure`}
            accent="var(--destructive)"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5">Figure</th>
                    <th className="px-3 py-2.5 text-right">Reported (L)</th>
                    <th className="px-3 py-2.5 text-right">Rig's median day (L)</th>
                    <th className="px-3 py-2.5 text-right">Times the median</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.outliers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No unusual days in {data.year}.
                      </td>
                    </tr>
                  )}
                  {data.outliers.map((o, i) => (
                    <tr key={`${o.report_id}-${o.kind}`} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(o.date)}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{o.rig_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{o.kind === 'diesel' ? 'Diesel consumed' : 'Water consumed'}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-destructive">{fmt(o.value)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(o.median)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt1(o.times_median)}×</td>
                      <td className="px-3 py-2.5">
                        {canReport && (
                          <NavLink
                            to={`/drilling/drilling-report/${o.report_id}/edit`}
                            title="Open this daily report"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </NavLink>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {s.outlier_days > data.outliers.length && (
              <p className="border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
                Showing the {data.outliers.length} most unusual of {s.outlier_days}.
              </p>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  )
}
