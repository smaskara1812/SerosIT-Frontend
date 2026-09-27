import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Gauge, ListChecks, Ruler, TriangleAlert, Clock3 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'

const MENU_KEY = 'dashboards.drilling_performance'

// Same rotating Seros hues as Rig Utilisation's charts.
const SECTION_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)', '#f97316']

function fmtNum(v) {
  return v == null ? '—' : Math.round(v).toLocaleString()
}

export default function DrillingPerformanceDashboardPage() {
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
    apiFetch(`/api/dashboards/drilling-performance/?${params}`)
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

  usePageSubtitle(data ? `${data.rigs.length} rig(s) · ${data.year}` : null)

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

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note='ROP (Rate of Penetration) and Flat Time use the same "Drill actual" per-row rate this app already computes for Drilling & Tripping Analysis — just rolled up across every rig here instead of one well at a time.'>
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
            <KpiCard
              icon={Gauge}
              label="Avg ROP"
              value={data.summary.avg_rop_m_hr == null ? '—' : `${data.summary.avg_rop_m_hr} m/hr`}
              accent="var(--chart-1)"
            />
            <KpiCard icon={Ruler} label="Metres Drilled" value={fmtNum(data.summary.total_metres)} accent="var(--chart-3)" />
            <KpiCard icon={Clock3} label="Drill Hours" value={fmtNum(data.summary.drill_hours)} accent="var(--chart-2)" />
            <KpiCard icon={ListChecks} label="Drill Ops Logged" value={fmtNum(data.summary.drill_ops_count)} accent="var(--chart-5)" />
            <KpiCard
              icon={TriangleAlert}
              label="Flat Hours"
              value={fmtNum(data.summary.flat_hours)}
              sub="Drilling logged, zero progress"
              warning={data.summary.flat_hours > 0}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Gauge} title="ROP by Hole Section" subtitle={`— ${data.year}`} accent="var(--chart-1)">
              {data.rop_by_section.length === 0 ? (
                <EmptyChartState>No drilling data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.rop_by_section}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="section" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis unit=" m/hr" stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [v == null ? '—' : `${v} m/hr`, 'Avg ROP']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="avg_rop" radius={[4, 4, 0, 0]}>
                      {data.rop_by_section.map((r, i) => (
                        <Cell key={r.section} fill={SECTION_COLORS[i % SECTION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={ListChecks} title="Ops Breakdown by Type" subtitle="— top 10, fleet total" accent="var(--chart-2)">
              {data.ops_breakdown.length === 0 ? (
                <EmptyChartState>No drilling data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.ops_breakdown} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="operation" width={110} stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip
                      formatter={(v, name, p) => [`${fmtNum(v)} hrs (${p.payload.pct_of_total ?? '—'}%)`, 'Hours']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="hours" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={Ruler} title="Metres Drilled by Rig" subtitle={`— ${data.year}`} accent="var(--chart-3)">
              {data.metres_by_rig.length === 0 ? (
                <EmptyChartState>No drilling data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.metres_by_rig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="rig_name" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [`${fmtNum(v)} m`, 'Metres']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="metres" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              icon={TriangleAlert}
              title="Flat Time by Rig"
              subtitle="— drilling logged, zero progress"
              accent="var(--destructive)"
            >
              {data.flat_by_rig.length === 0 ? (
                <EmptyChartState>No flat time logged for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.flat_by_rig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="rig_name" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis unit=" hrs" stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [`${fmtNum(v)} hrs`, 'Flat time']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="flat_hours" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
