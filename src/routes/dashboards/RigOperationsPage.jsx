import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CalendarDays, Flag, Fuel, Gauge, IndianRupee, Layers, ListOrdered, Ruler, Timer, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover } from './DashboardUI'
import { useUrlIdSet, useUrlString } from './dashboardUrlState'

const MENU_KEY = 'dashboards.rig_operations'
const TOOLTIP_STYLE = { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }
const CLASS_COLOURS = ['var(--chart-1)', 'var(--chart-4)', 'var(--chart-5)', '#10b981', '#ef4444', 'var(--chart-3)', '#94a3b8']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const n0 = (v) => (v == null ? '—' : Math.round(Number(v)).toLocaleString('en-IN'))
const n1 = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
const n2 = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`)
const dmy = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}-${MON[Number(m) - 1]}-${y}`
}
const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return `${MON[Number(m) - 1]}-${y.slice(2)}`
}
const dayLabel = (iso) => `${iso.slice(8, 10)}-${MON[Number(iso.slice(5, 7)) - 1]}`

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// A link to a record, or plain text when the person may not open that page.
function RecordLink({ to, allowed, children, title }) {
  if (!allowed || !to) return <>{children}</>
  return (
    <Link to={to} title={title} className="font-medium text-primary underline-offset-2 hover:underline">
      {children}
    </Link>
  )
}

const reportUrl = (dtlId) => `/drilling/drilling-report/${dtlId}/edit`
const reportsOfRig = (rigId, rigName, from, to) => {
  const p = new URLSearchParams({ rig: String(rigId), rig_name: rigName || '' })
  if (from) p.set('date_from', from)
  if (to) p.set('date_to', to)
  return `/drilling/drilling-report?${p}`
}
const wellUrl = (hdrId, location) => `/drilling/drilling-information?select=${hdrId}&q=${encodeURIComponent(location || '')}`

// The date inputs only change the page a moment after typing stops, so a half-typed date or a quick series of clicks is one request, not many.
function useDebounced(value, ms = 450) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function DateField({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{label}</p>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring"
      />
    </div>
  )
}

function Th({ children, right }) {
  return <th className={`px-3 py-2.5 ${right ? 'text-right' : ''}`}>{children}</th>
}

function Table({ head, children, empty, cols }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{head}</tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={cols} className="px-3 py-8 text-center text-sm text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

const rowClass = (i) => `border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`

function VBar({ data, x, y, name, fmt, colour = 'var(--chart-1)', height = 260, tick }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={x} stroke="var(--muted-foreground)" fontSize={11} interval={0} angle={data.length > 4 ? -35 : 0} textAnchor={data.length > 4 ? 'end' : 'middle'} height={data.length > 4 ? 56 : 30} tickFormatter={tick} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(v), name]} />
        <Bar dataKey={y} fill={colour} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function RigOperationsPage() {
  const { user } = useAuth()
  const [selectedRigIds, setSelectedRigIds] = useUrlIdSet('rigs')
  const [fromUrl, setFrom] = useUrlString('from')
  const [toUrl, setTo] = useUrlString('to')
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const [error, setError] = useState('')
  const [showCheck, setShowCheck] = useState(false)

  // Without dates in the address the page shows the last 12 months (the workbook showed all the data; clear a date to widen it).
  const defaultFrom = useMemo(() => isoDaysAgo(365), [])
  const from = fromUrl || defaultFrom
  const to = toUrl

  const rawQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return params.toString()
  }, [selectedRigIds, from, to])
  const queryString = useDebounced(rawQuery)

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/dashboards/rig-operations/?${queryString}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load')
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
  usePageSubtitle(data?.data_through ? `Data through ${dmy(data.data_through)}` : null)

  function toggleRig(id) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const comparison = useMemo(() => (data?.comparison ?? []).filter((r) => r.rig !== 'Total'), [data])
  const total = data?.comparison?.find((r) => r.rig === 'Total')
  const monthly = useMemo(() => (data?.monthly ?? []).map((m) => ({ ...m, label: monthLabel(m.month) })), [data])
  const daily = useMemo(() => (data?.daily ?? []).map((d) => ({ ...d, label: dayLabel(d.date) })), [data])
  const classes = useMemo(() => (data?.hours_by_class ?? []).filter((c) => c.hours > 0), [data])
  const topOps = useMemo(() => [...(data?.top_operations ?? [])].reverse(), [data])

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const k = data?.kpis
  const canReport = can(user, 'drilling.drilling_report', 'view')
  const canWells = can(user, 'drilling.drilling_information', 'view')

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note="Read from the daily drilling reports; nothing is entered here. Metres are the figure the daily report itself calculates. Productivity % = productive hours ÷ all logged hours (every rate class except Zero Rate counts as productive; the same rule as the Rig Performance report). Operating % counts R1 only. Revenue = hours × the rate per hour in Project Drilling Rates, for the hourly-billed classes; ILM/IPM lump-sum billing is not included. Wells are the wells of Drilling Information; a well is completed when it has a completion date. The rig comparison follows the dates only, the monthly trend ends at the To month, the daily trend shows the 31 days to the To date, the status board shows every rig's latest report.">
        <MultiSelectPopover
          label="Rigs"
          items={data?.rigs ?? []}
          selected={selectedRigIds}
          onToggle={toggleRig}
          onSelectAll={() => setSelectedRigIds(new Set())}
          getKey={(r) => r.rig_id}
          getLabel={(r) => r.rig_name ?? ''}
          allSelected={selectedRigIds.size === 0}
        />
        <DateField label="From" value={from} onChange={(v) => setFrom(v)} />
        <DateField label="To" value={to} onChange={(v) => setTo(v)} />
        <button
          type="button"
          onClick={() => {
            setFrom('')
            setTo('')
          }}
          className="h-9 self-end rounded-lg border border-input px-3 text-xs font-medium text-foreground hover:bg-muted"
          title="Last 12 months"
        >
          Last 12 months
        </button>
        {data?.from && (
          <p className="self-end pb-2 text-xs text-muted-foreground">
            {dmy(data.from)} to {dmy(data.to)}
          </p>
        )}
      </DashboardToolbar>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!data && !error && <RigLoading />}
      {data?.empty && <p className="p-4 text-sm text-muted-foreground">There are no daily drilling reports for the rigs you can see.</p>}

      {data && !data.empty && (
        <div className={`flex flex-col gap-4 transition-opacity ${refreshing ? 'pointer-events-none opacity-50' : ''}`} aria-busy={refreshing}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={Ruler} label="Meterage drilled" value={`${n1(k.drilled_m)} m`} sub={`drilling hrs: ${n1(k.drilling_hrs)}`} accent="var(--chart-1)" />
            <KpiCard icon={Gauge} label="Average ROP" value={`${n2(k.avg_rop)} m/hr`} sub={`rig-days: ${n0(k.rig_days)}`} accent="var(--chart-2)" />
            <KpiCard icon={Activity} label="Productivity" value={pct(k.productivity_pct)} sub={`productive hrs: ${n0(k.productive_hrs)} of ${n0(k.total_hrs)}`} accent="var(--chart-3)" />
            <KpiCard icon={IndianRupee} label="Revenue (Rs Cr)" value={n2(k.revenue_cr)} sub="hours × rate per hour (no ILM / IPM lump sums)" accent="var(--chart-4)" />
            <KpiCard icon={Fuel} label="Diesel used" value={`${n0(k.diesel_l)} L`} sub={k.diesel_per_m == null ? 'no metres drilled' : `${n1(k.diesel_per_m)} L per metre drilled`} accent="var(--chart-5)" />
            <KpiCard icon={Flag} label="Wells completed" value={n0(k.wells_completed)} sub="completion date in these dates" accent="var(--chart-1)" />
            <KpiCard icon={Timer} label="Operating % (R1 only)" value={pct(k.operating_pct)} sub={`operating hrs: ${n0(k.operating_hrs)}`} accent="var(--chart-2)" />
            <KpiCard
              icon={TriangleAlert}
              label="Days to check"
              value={n0(k.days_to_check)}
              sub="hours not adding up (latest 2 years)"
              warning={k.days_to_check > 0}
              onFilter={() => setShowCheck((s) => !s)}
              filterActive={showCheck}
            />
          </div>

          {data.warnings.length > 0 && (
            <div className="flex flex-col gap-1 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {data.warnings.map((w) => (
                <p key={w}>⚠ {w}</p>
              ))}
              {canReport && data.depth_error_days?.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-semibold">Open the report:</span>
                  {data.depth_error_days.slice(0, 8).map((d) => (
                    <Link key={d.dtl_id} to={reportUrl(d.dtl_id)} className="font-medium underline underline-offset-2">
                      {d.rig} {dmy(d.date)}
                    </Link>
                  ))}
                </p>
              )}
              {data.days_to_check_total > 0 && !showCheck && (
                <button type="button" onClick={() => setShowCheck(true)} className="self-start text-xs font-semibold underline underline-offset-2">
                  Show the days to check
                </button>
              )}
            </div>
          )}

          {showCheck && (
            <ChartCard icon={TriangleAlert} title="Days to check" subtitle={`— ${n0(data.days_to_check_total)} flagged in the latest 2 years of the chosen rigs (first ${n0(data.days_to_check.length)} shown)`} accent="var(--destructive)" bodyClassName="p-0">
              <Table
                cols={6}
                empty={data.days_to_check.filter((r) => selectedRigIds.size === 0 || selectedRigIds.has(r.rig_id)).length === 0 ? 'No day needs checking.' : null}
                head={
                  <>
                    <Th>Rig</Th>
                    <Th>Date</Th>
                    <Th right>Operations (h)</Th>
                    <Th right>Daily summary (h)</Th>
                    <Th>Problem</Th>
                    <Th>Record</Th>
                  </>
                }
              >
                {data.days_to_check
                  .filter((r) => selectedRigIds.size === 0 || selectedRigIds.has(r.rig_id))
                  .map((r, i) => (
                    <tr key={`${r.rig_id}-${r.date}`} className={rowClass(i)}>
                      <td className="px-3 py-2.5 font-medium text-foreground">{r.rig}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <RecordLink to={reportUrl(r.dtl_id)} allowed={canReport} title="Open this day's drilling report">
                          {dmy(r.date)}
                        </RecordLink>
                      </td>
                      <td className="px-3 py-2.5 text-right text-foreground">{n2(r.ops_hours)}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{n2(r.summary_hours)}</td>
                      <td className="px-3 py-2.5 text-destructive">{r.problems.join('; ')}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {canReport ? (
                          <Link to={reportUrl(r.dtl_id)} className="font-semibold text-primary hover:underline">
                            Open report →
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
              </Table>
              <p className="px-4 py-3 text-[11px] text-muted-foreground">The first and last report days of a rig are often part-days, so they can be flagged legitimately.</p>
            </ChartCard>
          )}

          <ChartCard icon={Layers} title="Rig status board" subtitle="— each rig's latest report (ignores the filters)" accent="var(--chart-2)" bodyClassName="p-0">
            <Table
              cols={7}
              empty={data.status_board.length === 0 ? 'No rig has reported recently.' : null}
              head={
                <>
                  <Th>Rig</Th>
                  <Th>Last report</Th>
                  <Th>Well / location</Th>
                  <Th right>Depth (m)</Th>
                  <Th>Section</Th>
                  <Th>Last operation</Th>
                  <Th>Rate</Th>
                </>
              }
            >
              {data.status_board.map((b, i) => (
                <tr key={b.rig_id} className={rowClass(i)}>
                  <td className="px-3 py-2.5 font-medium text-foreground">{b.rig}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <RecordLink to={reportUrl(b.dtl_id)} allowed={canReport} title="Open this report">
                      {dmy(b.last_report)}
                    </RecordLink>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">
                    <RecordLink to={b.hdr_id ? wellUrl(b.hdr_id, b.location) : null} allowed={canWells} title="Open this well in Drilling Information">
                      {b.location || '—'}
                    </RecordLink>
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground">{n0(b.depth_m)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{b.section || '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{b.last_operation || '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{b.rate || '—'}</td>
                </tr>
              ))}
            </Table>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard icon={Activity} title="Productivity % by rig" accent="var(--chart-3)">
              <VBar data={comparison} x="rig" y="productivity_pct" name="Productivity" fmt={pct} colour="var(--chart-3)" />
            </ChartCard>
            <ChartCard icon={Ruler} title="Metres drilled by rig" accent="var(--chart-1)">
              <VBar data={comparison} x="rig" y="drilled_m" name="Metres" fmt={(v) => `${n1(v)} m`} />
            </ChartCard>
            <ChartCard icon={IndianRupee} title="Revenue by rig (Rs Cr)" accent="var(--chart-4)">
              <VBar data={comparison} x="rig" y="revenue_cr" name="Revenue (Rs Cr)" fmt={n2} colour="var(--chart-4)" />
            </ChartCard>
          </div>

          <ChartCard icon={Layers} title="Rig comparison" subtitle="— follows the dates, every rig" accent="var(--chart-1)" bodyClassName="p-0">
            <Table
              cols={15}
              empty={comparison.length === 0 ? 'No reports in these dates.' : null}
              head={
                <>
                  <Th>Rig</Th>
                  <Th right>Total hrs</Th>
                  <Th right>Operating hrs</Th>
                  <Th right>Operating %</Th>
                  <Th right>Productive hrs</Th>
                  <Th right>Productivity %</Th>
                  <Th right>Drilled (m)</Th>
                  <Th right>Drilling hrs</Th>
                  <Th right>Avg ROP</Th>
                  <Th right>Diesel (L)</Th>
                  <Th right>Diesel / m</Th>
                  <Th right>Revenue (Cr)</Th>
                  <Th right>Rig-days</Th>
                  <Th right>Wells done</Th>
                  <Th right>Check days</Th>
                </>
              }
            >
              {[...comparison, ...(total && comparison.length ? [total] : [])].map((r, i) => (
                <tr key={r.rig} className={`${rowClass(i)} ${r.rig === 'Total' ? 'bg-muted/60 font-semibold' : ''}`}>
                  <td className="px-3 py-2.5 font-medium text-foreground">{r.rig}</td>
                  <td className="px-3 py-2.5 text-right">{n1(r.total_hrs)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n1(r.operating_hrs)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{pct(r.operating_pct)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n1(r.productive_hrs)}</td>
                  <td className="px-3 py-2.5 text-right">{pct(r.productivity_pct)}</td>
                  <td className="px-3 py-2.5 text-right">{n1(r.drilled_m)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n1(r.drilling_hrs)}</td>
                  <td className="px-3 py-2.5 text-right">{n2(r.avg_rop)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n0(r.diesel_l)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n1(r.diesel_per_m)}</td>
                  <td className="px-3 py-2.5 text-right">{n2(r.revenue_cr)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">
                    {r.rig_id ? (
                      <RecordLink to={reportsOfRig(r.rig_id, r.rig, data.from, data.to)} allowed={canReport} title="Open this rig's daily reports for these dates">
                        {n0(r.rig_days)}
                      </RecordLink>
                    ) : (
                      n0(r.rig_days)
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n0(r.wells_completed)}</td>
                  <td className={`px-3 py-2.5 text-right ${r.check_days > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                    {r.rig_id && r.check_days > 0 ? (
                      <button
                        type="button"
                        className="font-semibold text-destructive underline underline-offset-2"
                        title="Show the days to check for this rig"
                        onClick={() => {
                          setSelectedRigIds(new Set([r.rig_id]))
                          setShowCheck(true)
                        }}
                      >
                        {n0(r.check_days)}
                      </button>
                    ) : (
                      n0(r.check_days)
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={IndianRupee} title="Revenue by month (Rs Cr)" subtitle="— 12 months to the To date; follows the rigs" accent="var(--chart-4)">
              <VBar data={monthly} x="label" y="revenue_cr" name="Revenue (Rs Cr)" fmt={n2} colour="var(--chart-4)" />
            </ChartCard>
            <ChartCard icon={Activity} title="Productivity % by month" subtitle="— 12 months to the To date; follows the rigs" accent="var(--chart-3)">
              <VBar data={monthly} x="label" y="productivity_pct" name="Productivity" fmt={pct} colour="var(--chart-3)" />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={CalendarDays} title="Daily metres drilled" subtitle="— the 31 days to the To date" accent="var(--chart-1)">
              <VBar data={daily} x="label" y="drilled_m" name="Metres" fmt={(v) => `${n1(v)} m`} />
            </ChartCard>
            <ChartCard icon={Fuel} title="Daily diesel used (L)" subtitle="— the 31 days to the To date" accent="var(--chart-5)">
              <VBar data={daily} x="label" y="diesel_l" name="Diesel (L)" fmt={(v) => `${n0(v)} L`} colour="var(--chart-5)" />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Timer} title="Hours by rate class" subtitle="— follows the rigs and dates" accent="var(--chart-2)">
              {classes.length === 0 ? (
                <EmptyChartState>No hours in these dates.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={classes} dataKey="hours" nameKey="class" innerRadius={62} outerRadius={105} paddingAngle={1}>
                      {classes.map((c) => (
                        <Cell key={c.class} fill={CLASS_COLOURS[data.hours_by_class.findIndex((x) => x.class === c.class) % CLASS_COLOURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${n1(v)} h`, n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard icon={ListOrdered} title="Top 10 operations by hours" subtitle="— follows the rigs and dates" accent="var(--chart-3)">
              {topOps.length === 0 ? (
                <EmptyChartState>No hours in these dates.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(260, topOps.length * 30)}>
                  <BarChart data={topOps} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis type="category" dataKey="operation" width={190} stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${n1(v)} h`, 'Hours']} />
                    <Bar dataKey="hours" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard icon={Layers} title="Well-wise performance" subtitle="— the latest 12 wells of the chosen rigs, any date" accent="var(--chart-1)" bodyClassName="p-0">
            <Table
              cols={11}
              empty={data.wells.length === 0 ? 'No wells for these rigs.' : null}
              head={
                <>
                  <Th>Rig</Th>
                  <Th>Well (location)</Th>
                  <Th>Status</Th>
                  <Th right>Days</Th>
                  <Th right>Depth (m)</Th>
                  <Th right>Drilled (m)</Th>
                  <Th right>ROP (m/hr)</Th>
                  <Th right>Productivity %</Th>
                  <Th right>Revenue (Cr)</Th>
                  <Th right>Diesel (L)</Th>
                  <Th right>Diesel / m</Th>
                </>
              }
            >
              {data.wells.map((w, i) => (
                <tr key={w.hdr_id} className={rowClass(i)}>
                  <td className="px-3 py-2.5 font-medium text-foreground">{w.rig}</td>
                  <td className="px-3 py-2.5 text-foreground">
                    <RecordLink to={wellUrl(w.hdr_id, w.location)} allowed={canWells} title="Open this well in Drilling Information">
                      {w.location || '—'}
                    </RecordLink>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${w.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'}`}>{w.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n0(w.days)}</td>
                  <td className="px-3 py-2.5 text-right">{n0(w.depth_m)}</td>
                  <td className="px-3 py-2.5 text-right">{n1(w.drilled_m)}</td>
                  <td className="px-3 py-2.5 text-right">{n2(w.rop)}</td>
                  <td className="px-3 py-2.5 text-right">{pct(w.productivity_pct)}</td>
                  <td className="px-3 py-2.5 text-right">{n2(w.revenue_cr)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n0(w.diesel_l)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{n1(w.diesel_per_m)}</td>
                </tr>
              ))}
            </Table>
          </ChartCard>

          <div className="flex flex-col gap-1 px-1 text-[11px] text-muted-foreground">
            <p>Productivity % = hours of the productive classes ÷ all logged hours ({data.productive_rule}). Operating % counts R1 only.</p>
            <p>Revenue = hours × the rate per hour of the operation's rate in Project Drilling Rates, for hourly-billed classes. ILM / IPM lump-sum billing is not included. A rig without rates shows 0.</p>
            <p>Metres drilled = the daily report's own figure (the depth change of the drilling operation). ROP = metres ÷ drilling-operation hours.</p>
          </div>
        </div>
      )}
    </div>
  )
}
