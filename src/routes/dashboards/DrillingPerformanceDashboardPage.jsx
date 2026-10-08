import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Droplets, Fuel, Gauge, ListChecks, Ruler, TriangleAlert, Clock3 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'
import { useUrlIdSet, useUrlYear } from './dashboardUrlState'

const MENU_KEY = 'dashboards.drilling_performance'

// Same rotating Seros hues as Rig Utilisation's charts.
const SECTION_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)', '#f97316']

function fmtNum(v) {
  return v == null ? '—' : Math.round(v).toLocaleString()
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

function BackLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mt-2 mb-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <ArrowLeft className="h-3 w-3" /> {children}
    </button>
  )
}

export default function DrillingPerformanceDashboardPage() {
  const { user } = useAuth()

  const [year, setYear] = useUrlYear()
  const [selectedRigIds, setSelectedRigIds] = useUrlIdSet('rigs')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Which item each of the three drillable charts is drilled into — null
  // shows that chart's normal fleet/rig-level view.
  const [drilledSection, setDrilledSection] = useState(null)
  const [drilledMetresRigId, setDrilledMetresRigId] = useState(null)
  const [drilledDieselRigId, setDrilledDieselRigId] = useState(null)
  const [drilledWaterRigId, setDrilledWaterRigId] = useState(null)
  const [drilledFlatRigId, setDrilledFlatRigId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    apiFetch(`/api/dashboards/drilling-performance/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then((d) => {
        setError('')
        setData(d)
        setDrilledSection(null)
        setDrilledMetresRigId(null)
        setDrilledDieselRigId(null)
        setDrilledWaterRigId(null)
        setDrilledFlatRigId(null)
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [year, selectedRigIds, setYear])

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

  // ROP by Hole Section drill-down: which rig+well combos made up that
  // section's number.
  const sectionDetailRows = useMemo(() => {
    if (!data || !drilledSection) return []
    return data.rop_by_section_detail
      .filter((r) => r.section === drilledSection)
      .map((r) => ({ ...r, label: `${r.rig_name} — ${r.well_location}` }))
      .sort((a, b) => (b.avg_rop ?? 0) - (a.avg_rop ?? 0))
  }, [data, drilledSection])

  // Metres Drilled by Rig drill-down: that rig's monthly metres.
  const metresMonthRows = useMemo(() => {
    if (!data || !drilledMetresRigId) return []
    return data.metres_by_rig_month
      .filter((r) => r.rig_id === drilledMetresRigId)
      .map((r) => ({ ...r, monthLabel: monthLabel(r.month) }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data, drilledMetresRigId])
  const drilledMetresRigName = data?.metres_by_rig.find((r) => r.rig_id === drilledMetresRigId)?.rig_name

  // Diesel Consumption by Rig drill-down: that rig's monthly litres.
  const dieselMonthRows = useMemo(() => {
    if (!data || !drilledDieselRigId) return []
    return data.diesel_by_rig_month
      .filter((r) => r.rig_id === drilledDieselRigId)
      .map((r) => ({ ...r, monthLabel: monthLabel(r.month) }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data, drilledDieselRigId])
  const drilledDieselRigName = data?.diesel_by_rig.find((r) => r.rig_id === drilledDieselRigId)?.rig_name

  // Water Consumption by Rig drill-down: that rig's monthly litres.
  const waterMonthRows = useMemo(() => {
    if (!data || !drilledWaterRigId) return []
    return data.water_by_rig_month
      .filter((r) => r.rig_id === drilledWaterRigId)
      .map((r) => ({ ...r, monthLabel: monthLabel(r.month) }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data, drilledWaterRigId])
  const drilledWaterRigName = data?.water_by_rig.find((r) => r.rig_id === drilledWaterRigId)?.rig_name

  // Flat Time by Rig drill-down: that rig's monthly flat hours.
  const flatMonthRows = useMemo(() => {
    if (!data || !drilledFlatRigId) return []
    return data.flat_by_rig_month
      .filter((r) => r.rig_id === drilledFlatRigId)
      .map((r) => ({ ...r, monthLabel: monthLabel(r.month) }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data, drilledFlatRigId])
  const drilledFlatRigName = data?.flat_by_rig.find((r) => r.rig_id === drilledFlatRigId)?.rig_name

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
            <KpiCard icon={Fuel} label="Diesel Consumed" value={`${fmtNum(data.summary.diesel_consumed)} L`} accent="var(--chart-4)" />
            <KpiCard icon={Droplets} label="Water Consumed" value={`${fmtNum(data.summary.water_consumed)} L`} accent="var(--chart-2)" />
          </div>

          <ChartCard icon={Clock3} title="Rig Hours Breakdown" subtitle={`— fleet total, ${data.year}`} accent="var(--chart-5)">
            {data.hours_breakdown.every((h) => h.hours === 0) ? (
              <EmptyChartState>No drilling report data for this period.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.hours_breakdown} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" unit=" hrs" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="category" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    formatter={(v) => [`${fmtNum(v)} hrs`, 'Hours']}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="hours" fill="var(--chart-5)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={Gauge}
              title={drilledSection ? `ROP — ${drilledSection}` : 'ROP by Hole Section'}
              subtitle={drilledSection ? '— by rig & well' : `— ${data.year}, click a section to drill in`}
              accent="var(--chart-1)"
            >
              {drilledSection && <BackLink onClick={() => setDrilledSection(null)}>Back to all sections</BackLink>}
              {drilledSection ? (
                sectionDetailRows.length === 0 ? (
                  <EmptyChartState>No drilling data for this section.</EmptyChartState>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(300, sectionDetailRows.length * 36)}>
                    <BarChart data={sectionDetailRows} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" unit=" m/hr" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis type="category" dataKey="label" width={150} stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip
                        formatter={(v) => [v == null ? '—' : `${v} m/hr`, 'Avg ROP']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="avg_rop" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : data.rop_by_section.length === 0 ? (
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
                    <Bar dataKey="avg_rop" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(bar) => setDrilledSection(bar?.payload?.section ?? bar?.section)}>
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
            <ChartCard
              icon={Ruler}
              title={drilledMetresRigId ? `Metres Drilled — ${drilledMetresRigName}` : 'Metres Drilled by Rig'}
              subtitle={drilledMetresRigId ? `— by month, ${data.year}` : `— ${data.year}, click a rig to drill in`}
              accent="var(--chart-3)"
            >
              {drilledMetresRigId && <BackLink onClick={() => setDrilledMetresRigId(null)}>Back to all rigs</BackLink>}
              {drilledMetresRigId ? (
                metresMonthRows.length === 0 ? (
                  <EmptyChartState>No drilling data for this rig.</EmptyChartState>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metresMonthRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v) => [`${fmtNum(v)} m`, 'Metres']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="metres" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : data.metres_by_rig.length === 0 ? (
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
                    <Bar
                      dataKey="metres"
                      fill="var(--chart-3)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(bar) => setDrilledMetresRigId(bar?.payload?.rig_id ?? bar?.rig_id)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              icon={TriangleAlert}
              title={drilledFlatRigId ? `Flat Time — ${drilledFlatRigName}` : 'Flat Time by Rig'}
              subtitle={drilledFlatRigId ? `— by month, ${data.year}` : '— drilling logged, zero progress, click a rig to drill in'}
              accent="var(--destructive)"
            >
              {drilledFlatRigId && <BackLink onClick={() => setDrilledFlatRigId(null)}>Back to all rigs</BackLink>}
              {drilledFlatRigId ? (
                flatMonthRows.length === 0 ? (
                  <EmptyChartState>No flat time logged for this rig.</EmptyChartState>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={flatMonthRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis unit=" hrs" stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v) => [`${fmtNum(v)} hrs`, 'Flat time']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="flat_hours" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : data.flat_by_rig.length === 0 ? (
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
                    <Bar
                      dataKey="flat_hours"
                      fill="var(--destructive)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(bar) => setDrilledFlatRigId(bar?.payload?.rig_id ?? bar?.rig_id)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              icon={Fuel}
              title={drilledDieselRigId ? `Diesel Consumption — ${drilledDieselRigName}` : 'Diesel Consumption by Rig'}
              subtitle={drilledDieselRigId ? `— by month, ${data.year}` : `— ${data.year}, click a rig to drill in`}
              accent="var(--chart-4)"
            >
              {drilledDieselRigId && <BackLink onClick={() => setDrilledDieselRigId(null)}>Back to all rigs</BackLink>}
              {drilledDieselRigId ? (
                dieselMonthRows.length === 0 ? (
                  <EmptyChartState>No drilling data for this rig.</EmptyChartState>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dieselMonthRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v) => [`${fmtNum(v)} L`, 'Diesel']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="litres" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : data.diesel_by_rig.length === 0 ? (
                <EmptyChartState>No drilling data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.diesel_by_rig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="rig_name" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [`${fmtNum(v)} L`, 'Diesel']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar
                      dataKey="litres"
                      fill="var(--chart-4)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(bar) => setDrilledDieselRigId(bar?.payload?.rig_id ?? bar?.rig_id)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              icon={Droplets}
              title={drilledWaterRigId ? `Water Consumption — ${drilledWaterRigName}` : 'Water Consumption by Rig'}
              subtitle={drilledWaterRigId ? `— by month, ${data.year}` : `— ${data.year}, click a rig to drill in`}
              accent="var(--chart-2)"
            >
              {drilledWaterRigId && <BackLink onClick={() => setDrilledWaterRigId(null)}>Back to all rigs</BackLink>}
              {drilledWaterRigId ? (
                waterMonthRows.length === 0 ? (
                  <EmptyChartState>No drilling data for this rig.</EmptyChartState>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={waterMonthRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="monthLabel" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v) => [`${fmtNum(v)} L`, 'Water']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="litres" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : data.water_by_rig.length === 0 ? (
                <EmptyChartState>No drilling data for this period.</EmptyChartState>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.water_by_rig}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="rig_name" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [`${fmtNum(v)} L`, 'Water']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar
                      dataKey="litres"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(bar) => setDrilledWaterRigId(bar?.payload?.rig_id ?? bar?.rig_id)}
                    />
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
