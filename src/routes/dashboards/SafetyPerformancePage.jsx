import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, ClipboardList, Clock3, HeartHandshake, HeartPulse, Hourglass, ShieldAlert, Siren, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'
import { useUrlIdSet, useUrlYear } from './dashboardUrlState'

const MENU_KEY = 'dashboards.safety_performance'

// One colour per hazard type, by meaning rather than by position: a problem is warm, good news is green.
const TYPE_COLOR = {
  'Unsafe Condition': 'var(--chart-4)',
  'Unsafe Act': 'var(--destructive)',
  'Positive Recognition': '#10b981',
}
const FALLBACK_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-5)']
const AGE_COLORS = ['#10b981', 'var(--chart-4)', '#f97316', 'var(--destructive)']
const TOOLTIP_STYLE = { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}
const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString())

// "+12% vs 2025" (or "vs same period of 2025" in the current year) — a change in a count, as a plain sentence.
function vsPrevious(now, before, label) {
  if (!before) return before === 0 && now > 0 ? `up from 0 in ${label}` : `no data for ${label}`
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return `same as ${label}`
  return `${pct > 0 ? '+' : ''}${pct}% vs ${label}`
}

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function HBarChart({ rows, color, empty }) {
  if (!rows || rows.length === 0) return <EmptyChartState>{empty}</EmptyChartState>
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickFormatter={(v) => (v.length > 26 ? `${v.slice(0, 25)}…` : v)}
        />
        <Tooltip formatter={(v) => [fmt(v), 'Count']} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function SafetyPerformancePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

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
    apiFetch(`/api/dashboards/safety-performance/?${queryString}`)
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

  usePageSubtitle(data ? `${fmt(data.summary.hazards)} hazard cards · ${fmt(data.summary.incidents)} incidents · ${data.year}` : null)

  const rigOptions = data?.rigs ?? []
  function toggleRig(rigId) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(rigId)) next.delete(rigId)
      else next.add(rigId)
      return next
    })
  }

  const monthly = useMemo(
    () => (data ? data.by_month.map((m) => ({ label: monthLabel(m.month), incidents: m.incidents, ...m.hazards })) : []),
    [data]
  )
  const typeColor = (name, i) => TYPE_COLOR[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
  const ageing = useMemo(() => (data ? data.open_ageing.map((b) => ({ name: b.bucket, count: b.count })) : []), [data])

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const s = data?.summary
  const oneRig = selectedRigIds.size === 1 ? [...selectedRigIds][0] : null
  const rigQ = oneRig ? `&rig=${oneRig}` : ''
  const canHazards = can(user, 'qhse.hazard_id_card', 'view')
  const canIncidents = can(user, 'qhse.incident_details', 'view')
  const link = (allowed, path) => (allowed ? () => navigate(path) : undefined)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note="Hazard ID Cards are the leading signal: what people notice and report before anything happens. Incidents are the lagging one. Showing both together tells you whether reporting is healthy: a rig with many cards and few incidents is looking; a rig with neither may not be. Positive Recognition cards (good behaviour noticed) count in the card totals but are left out of the hazard-location chart. Open cards are those raised in the last 12 months that are not yet closed; older ones are legacy cards that were never closed out. The current year is compared with the same stretch of last year. Incidents not tied to a drilling rig are not counted here; the Incident Dashboard counts them.">
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
            <KpiCard
              icon={ClipboardList}
              label="Hazard cards"
              value={fmt(s.hazards)}
              sub={vsPrevious(s.hazards, s.hazards_prev, data.compare_label)}
              accent="var(--chart-1)"
              onViewList={link(canHazards, `/qhse/hazard-id-card?year=${data.year}${rigQ}`)}
            />
            <KpiCard
              icon={HeartHandshake}
              label="Positive"
              value={s.positive_pct == null ? '—' : `${s.positive_pct}%`}
              sub={`${fmt(s.positive)} positive recognition cards`}
              accent="#10b981"
            />
            <KpiCard
              icon={Hourglass}
              label="Open cards"
              value={fmt(s.open_hazards)}
              sub={`${fmt(s.open_over_30)} older than 30 days`}
              warning={s.open_over_30 > 0}
              onViewList={link(canHazards, `/qhse/hazard-id-card?status=open&date_from=${isoDaysAgo(365)}${rigQ}`)}
            />
            <KpiCard
              icon={TriangleAlert}
              label="Incidents"
              value={fmt(s.incidents)}
              sub={vsPrevious(s.incidents, s.incidents_prev, data.compare_label)}
              accent="var(--chart-4)"
              onViewList={link(canIncidents, `/qhse/incident-details?year=${data.year}${rigQ}`)}
            />
            <KpiCard
              icon={Siren}
              label="High severity"
              value={fmt(s.high)}
              sub={`of ${fmt(s.incidents)} incidents`}
              warning={s.high > 0}
              onViewList={link(canIncidents, `/qhse/incident-details?year=${data.year}&severity=H${rigQ}`)}
            />
            <KpiCard
              icon={HeartPulse}
              label="Injuries"
              value={fmt(s.injuries)}
              sub="incidents with an injured person, any severity"
              warning={s.injuries > 0}
              onViewList={link(canIncidents, `/qhse/incident-details?year=${data.year}&person_injured=Y${rigQ}`)}
            />
            <KpiCard
              icon={Clock3}
              label="Days since last"
              value={s.days_since_last_incident == null ? '—' : fmt(s.days_since_last_incident)}
              sub={s.last_incident_date ? `incident on ${new Date(s.last_incident_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'no incident on record'}
              accent="var(--chart-2)"
            />
          </div>

          <ChartCard icon={CalendarClock} title="By month" subtitle={`— hazard cards by type (bars) and incidents (line), ${data.year}`} accent="var(--chart-1)">
            {s.hazards === 0 && s.incidents === 0 ? (
              <EmptyChartState>No hazard cards or incidents in {data.year}.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {data.hazard_types.map((t, i) => (
                    <Bar key={t} yAxisId="left" stackId="hz" dataKey={t} fill={typeColor(t, i)} />
                  ))}
                  <Line yAxisId="right" type="linear" dataKey="incidents" name="Incidents" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard icon={ShieldAlert} title="By rig" subtitle="— click a number to open those records" accent="var(--chart-3)" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5 text-right">Hazard cards</th>
                    <th className="px-3 py-2.5 text-right">Positive</th>
                    <th className="px-3 py-2.5 text-right">Open now</th>
                    <th className="px-3 py-2.5 text-right">Incidents</th>
                    <th className="px-3 py-2.5 text-right">High</th>
                    <th className="px-3 py-2.5 text-right">Injuries</th>
                    <th className="px-3 py-2.5 text-right" title="From the most recent incident of any year, so it ignores the year filter">Days since last incident (any year)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_rig.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No rigs to show.
                      </td>
                    </tr>
                  )}
                  {data.by_rig.map((r, i) => {
                    const num = (value, path, allowed, warn) =>
                      value && allowed ? (
                        <NavLink to={path} className={`font-medium hover:underline ${warn ? 'text-destructive' : 'text-foreground'}`}>
                          {fmt(value)}
                        </NavLink>
                      ) : (
                        <span className={value ? (warn ? 'text-destructive' : 'text-foreground') : 'text-muted-foreground/60'}>{value ? fmt(value) : '—'}</span>
                      )
                    return (
                      <tr key={r.rig_id} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                        <td className="px-3 py-2.5 font-medium text-foreground">{r.rig_name}</td>
                        <td className="px-3 py-2.5 text-right">{num(r.hazards, `/qhse/hazard-id-card?year=${data.year}&rig=${r.rig_id}`, canHazards)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{r.positive || '—'}</td>
                        <td className="px-3 py-2.5 text-right">
                          {num(r.open_hazards, `/qhse/hazard-id-card?status=open&date_from=${isoDaysAgo(365)}&rig=${r.rig_id}`, canHazards, true)}
                        </td>
                        <td className="px-3 py-2.5 text-right">{num(r.incidents, `/qhse/incident-details?year=${data.year}&rig=${r.rig_id}`, canIncidents)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {num(r.high, `/qhse/incident-details?year=${data.year}&rig=${r.rig_id}&severity=H`, canIncidents, true)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {num(r.injuries, `/qhse/incident-details?year=${data.year}&rig=${r.rig_id}&person_injured=Y`, canIncidents, true)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{r.days_since_incident == null ? 'none on record' : fmt(r.days_since_incident)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Hourglass} title="Open cards by age" subtitle="— raised in the last 12 months, not yet closed" accent="var(--chart-4)">
              {s.open_hazards === 0 ? (
                <EmptyChartState>No open hazard cards.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ageing}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                    <Tooltip formatter={(v) => [fmt(v), 'Open cards']} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {ageing.map((b, i) => (
                        <Cell key={b.name} fill={AGE_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={TriangleAlert} title="Incidents by type" subtitle={`— ${data.year}`} accent="var(--chart-4)">
              <HBarChart rows={data.incidents_by_type} color="var(--chart-4)" empty={`No incidents in ${data.year}.`} />
            </ChartCard>

            <ChartCard icon={ClipboardList} title="Where hazards are found" subtitle={`— top locations, ${data.year}, excluding positive recognition`} accent="var(--destructive)">
              <HBarChart rows={data.hazards_by_location} color="var(--destructive)" empty={`No hazard cards in ${data.year}.`} />
            </ChartCard>

            <ChartCard icon={HeartHandshake} title="Who reports" subtitle={`— hazard cards by reporting party, ${data.year}`} accent="var(--chart-1)">
              <HBarChart rows={data.hazards_by_party} color="var(--chart-1)" empty={`No hazard cards in ${data.year}.`} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  )
}
