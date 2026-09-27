import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Clock, Gauge, Layers, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'

const MENU_KEY = 'dashboards.rig_utilisation'

// Cycled across the per-rig utilisation-trend lines — Seros brand hues, same
// tokens the rest of the app's --chart-1..5 now carry (see index.css).
const RIG_LINE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)']

// Hour-category colours for the stacked breakdown — "Operating" gets the
// primary navy since it's the one productive category; the rest are the
// remaining Seros hues plus one extra (#f97316, from the same legacy
// palette) since there are six categories and only five chart tokens.
const HOUR_CATEGORIES = [
  { key: 'operating_hrs', label: 'Operating', color: 'var(--chart-1)' },
  { key: 'standby_hrs', label: 'Standby', color: 'var(--chart-3)' },
  { key: 'repair_service_hrs', label: 'Repair (Service)', color: 'var(--chart-4)' },
  { key: 'repair_rate_hrs', label: 'Repair (Rate)', color: '#f97316' },
  { key: 'zero_rate_hrs', label: 'Zero Rate', color: 'var(--chart-5)' },
  { key: 'rig_move_hrs', label: 'Rig Move', color: 'var(--chart-2)' },
]

// Same 80% / 60% bands the legacy serosIS dashboard used for this exact
// chart — green/amber/red are semantic status colours here, not part of the
// rotating chart palette above.
function bandColor(pct) {
  if (pct == null) return 'var(--muted-foreground)'
  if (pct >= 80) return '#10b981'
  if (pct >= 60) return 'var(--chart-4)'
  return 'var(--destructive)'
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

function fmtPct(v) {
  return v == null ? '—' : `${v.toFixed(1)}%`
}

function fmtNum(v) {
  return v == null ? '—' : Math.round(v).toLocaleString()
}

export default function RigUtilisationDashboardPage() {
  const { user } = useAuth()

  const [year, setYear] = useState(null)
  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    setLoading(true)
    setError('')
    apiFetch(`/api/dashboards/rig-utilisation/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then((d) => {
        setData(d)
        setYear((prev) => prev ?? d.year)
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedRigIds])

  usePageSubtitle(data ? `${data.summary.total_rigs} rig(s) · ${data.year}` : null)

  const rigOptions = data?.rigs ?? []
  const allRigsSelected = selectedRigIds.size === 0

  function toggleRig(rigId) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(rigId)) next.delete(rigId)
      else next.add(rigId)
      return next
    })
  }

  // Pivot [{month, rig_name, utilisation_pct}] into recharts' expected
  // one-row-per-month shape, one column per rig.
  const trendData = useMemo(() => {
    if (!data) return []
    const byMonth = new Map()
    for (const row of data.utilisation_by_rig_month) {
      if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month })
      byMonth.get(row.month)[row.rig_name] = row.utilisation_pct
    }
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
  }, [data])

  const rigNamesInTrend = useMemo(() => {
    if (!data) return []
    return [...new Set(data.utilisation_by_rig_month.map((r) => r.rig_name))].sort()
  }, [data])

  const hoursData = useMemo(
    () => (data ? data.hours_by_month.map((r) => ({ ...r, monthLabel: monthLabel(r.month) })) : []),
    [data]
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar
        note={`Utilisation % = Operating Hrs ÷ total logged hours (Operating + Standby + Repair + Zero Rate + Rig Move). This is a different figure from Performance Dashboard's "Efficiency %".`}
      >
        <YearSelect value={year} options={data?.years} onChange={setYear} />
        <MultiSelectPopover
          label="Rigs"
          items={rigOptions}
          selected={selectedRigIds}
          onToggle={toggleRig}
          onSelectAll={() => setSelectedRigIds(new Set())}
          getKey={(r) => r.rig_id}
          getLabel={(r) => r.rig_name ?? ''}
          allSelected={allRigsSelected}
        />
      </DashboardToolbar>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-3">
            <KpiCard icon={Gauge} label="Avg Utilisation" value={fmtPct(data.summary.avg_utilisation_pct)} accent="var(--chart-1)" />
            <KpiCard icon={Activity} label="Active Rigs" value={data.summary.active_rigs} accent="var(--chart-3)" />
            <KpiCard icon={Layers} label="Total Rigs" value={data.summary.total_rigs} accent="var(--chart-2)" />
            <KpiCard icon={Clock} label="Operating Hrs" value={fmtNum(data.summary.operating_hrs)} accent="var(--chart-5)" />
            <KpiCard icon={TriangleAlert} label="NPT Hrs" value={fmtNum(data.summary.npt_hrs)} accent="var(--chart-4)" />
          </div>

          <ChartCard icon={Gauge} title="Utilisation % by Rig, by Month" subtitle={`— ${data.year}`} accent="var(--chart-1)">
            {trendData.length === 0 ? (
              <EmptyChartState>No drilling report data for this period.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis unit="%" stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    labelFormatter={monthLabel}
                    formatter={(v) => [v == null ? '—' : `${Number(v).toFixed(1)}%`]}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {rigNamesInTrend.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={RIG_LINE_COLORS[i % RIG_LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Clock} title="Hours by Category, by Month" subtitle="— fleet total" accent="var(--chart-3)">
              {hoursData.length === 0 ? (
                <EmptyChartState>No drilling report data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {HOUR_CATEGORIES.map((c) => (
                      <Bar key={c.key} dataKey={c.key} name={c.label} stackId="hours" fill={c.color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={Gauge} title="Utilisation by Rig" subtitle={`— ${data.year}`} accent="var(--chart-4)">
              {data.utilisation_by_rig.length === 0 ? (
                <EmptyChartState>No drilling report data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.utilisation_by_rig} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" unit="%" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="rig_name" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [v == null ? '—' : `${Number(v).toFixed(1)}%`, 'Utilisation']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="utilisation_pct" radius={[0, 4, 4, 0]}>
                      {data.utilisation_by_rig.map((r) => (
                        <Cell key={r.rig_id} fill={bandColor(r.utilisation_pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} /> ≥80%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: 'var(--chart-4)' }} /> 60–79%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: 'var(--destructive)' }} /> &lt;60%
                </span>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
