import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarClock, ClipboardList, Gauge, ListTree, TriangleAlert } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'

const MENU_KEY = 'dashboards.npt_analysis'

const RIG_BAR_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)', '#f97316']

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

function fmtNum(v) {
  return v == null ? '—' : Math.round(v).toLocaleString()
}

export default function NptAnalysisDashboardPage() {
  const { user } = useAuth()

  const [year, setYear] = useState(null)
  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Which month the trend chart is drilled into — null shows the fleet-wide
  // by-month trend, set (a "YYYY-MM" string) shows that month by rig.
  const [drilledMonth, setDrilledMonth] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    apiFetch(`/api/dashboards/npt-analysis/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then((d) => {
        setError('')
        setData(d)
        setYear((prev) => prev ?? d.year)
        setDrilledMonth(null)
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [year, selectedRigIds])

  usePageSubtitle(data ? `${fmtNum(data.summary.total_npt_hrs)} NPT hr(s) · ${data.year}` : null)

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

  const monthlyData = useMemo(
    () => (data ? data.npt_by_month.map((r) => ({ ...r, monthLabel: monthLabel(r.month) })) : []),
    [data]
  )

  const byRigForDrilledMonth = useMemo(() => {
    if (!data || !drilledMonth) return []
    return data.npt_by_rig_month.filter((r) => r.month === drilledMonth).sort((a, b) => b.hours - a.hours)
  }, [data, drilledMonth])

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note='NPT ("Non Productive Time") is a single lumped category in this system — there is no coded reason/cause field to group by, so this page shows hours only, not causes.'>
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
            <KpiCard icon={TriangleAlert} label="Total NPT Hrs" value={fmtNum(data.summary.total_npt_hrs)} accent="var(--destructive)" />
            <KpiCard icon={ClipboardList} label="NPT Events" value={fmtNum(data.summary.event_count)} accent="var(--chart-3)" />
            <KpiCard icon={ListTree} label="Rigs with NPT" value={`${data.summary.rigs_with_npt} / ${data.summary.total_rigs}`} accent="var(--chart-2)" />
            <KpiCard icon={Gauge} label="Avg NPT Hrs / Rig" value={fmtNum(data.summary.avg_npt_hrs_per_rig)} accent="var(--chart-4)" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={CalendarClock}
              title={drilledMonth ? `NPT Hours — ${monthLabel(drilledMonth)} ${data.year}, by Rig` : 'NPT Hours, by Month'}
              subtitle={drilledMonth ? undefined : '— fleet total, click a month to drill in'}
              accent="var(--chart-3)"
            >
              {drilledMonth && (
                <button
                  type="button"
                  onClick={() => setDrilledMonth(null)}
                  className="-mt-2 mb-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to all months
                </button>
              )}
              {drilledMonth ? (
                byRigForDrilledMonth.length === 0 ? (
                  <EmptyChartState>No NPT logged for this month.</EmptyChartState>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, byRigForDrilledMonth.length * 34)}>
                    <BarChart data={byRigForDrilledMonth} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis type="category" dataKey="rig_name" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v) => [`${fmtNum(v)} hrs`, 'NPT']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                        {byRigForDrilledMonth.map((r, i) => (
                          <Cell key={r.rig_id} fill={RIG_BAR_COLORS[i % RIG_BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : monthlyData.length === 0 ? (
                <EmptyChartState>No NPT logged for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [`${fmtNum(v)} hrs`, 'NPT']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="var(--chart-3)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(bar) => setDrilledMonth(bar?.payload?.month ?? bar?.month)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard icon={TriangleAlert} title="NPT Hours by Rig" subtitle={`— year total, ${data.year}`} accent="var(--destructive)">
              {data.npt_by_rig.length === 0 ? (
                <EmptyChartState>No NPT logged for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(240, data.npt_by_rig.length * 32)}>
                  <BarChart data={data.npt_by_rig} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="rig_name" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [`${fmtNum(v)} hrs`, 'NPT']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="hours" fill="var(--destructive)" radius={[0, 4, 4, 0]} />
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
