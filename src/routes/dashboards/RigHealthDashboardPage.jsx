import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, FileWarning, HeartPulse, ShieldAlert, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover } from './DashboardUI'

const MENU_KEY = 'dashboards.rig_health'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Same 80/60 bands used on Rig Utilisation's own ranked-by-rig chart.
function bandColor(score) {
  if (score == null) return 'var(--muted-foreground)'
  if (score >= 80) return '#10b981'
  if (score >= 60) return 'var(--chart-4)'
  return 'var(--destructive)'
}

export default function RigHealthDashboardPage() {
  const { user } = useAuth()

  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    apiFetch(`/api/dashboards/rig-health/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then((d) => {
        setError('')
        setData(d)
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [selectedRigIds])

  usePageSubtitle(data ? `${data.summary.rigs_scored} rig(s) · as of ${fmtDate(data.as_of)}` : null)

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
      <DashboardToolbar note="A plain average of five 0-100 scores — report freshness, efficiency, open high-severity incident actions, certificates, and mandatory activities. The number is a sort key, not a hidden formula; every component is in the table below.">
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
            <KpiCard icon={HeartPulse} label="Avg Health Index" value={data.summary.avg_health_index ?? '—'} accent="var(--chart-1)" />
            <KpiCard
              icon={TriangleAlert}
              label="Rigs Below 60"
              value={data.summary.rigs_below_60}
              warning={data.summary.rigs_below_60 > 0}
            />
            <KpiCard
              icon={ShieldAlert}
              label="Open High-Sev Actions"
              value={data.summary.total_open_hi_sev_actions}
              warning={data.summary.total_open_hi_sev_actions > 0}
            />
            <KpiCard
              icon={FileWarning}
              label="Overdue Certificates"
              value={data.summary.total_overdue_certs}
              warning={data.summary.total_overdue_certs > 0}
            />
            <KpiCard
              icon={CalendarClock}
              label="Overdue Activities"
              value={data.summary.total_overdue_activities}
              warning={data.summary.total_overdue_activities > 0}
            />
          </div>

          <ChartCard icon={HeartPulse} title="Health Index by Rig" subtitle="— ranked, worst first" accent="var(--chart-1)">
            {data.rows.length === 0 ? (
              <EmptyChartState>No active rigs in scope.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, data.rows.length * 30)}>
                <BarChart data={data.rows} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="rig_name" width={100} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    formatter={(v) => [v, 'Health Index']}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="health_index" radius={[0, 4, 4, 0]}>
                    {data.rows.map((r) => (
                      <Cell key={r.rig_id} fill={bandColor(r.health_index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} /> ≥80
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--chart-4)' }} /> 60–79
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--destructive)' }} /> &lt;60
              </span>
            </div>
          </ChartCard>

          <ChartCard icon={HeartPulse} title="Component Breakdown" subtitle={`— as of ${fmtDate(data.as_of)}`} accent="var(--chart-3)" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5 text-right">Health Index</th>
                    <th className="px-3 py-2.5 text-right">Days Since Report</th>
                    <th className="px-3 py-2.5 text-right">Efficiency %</th>
                    <th className="px-3 py-2.5 text-right">Open Hi-Sev Actions</th>
                    <th className="px-3 py-2.5 text-right">Overdue Certs</th>
                    <th className="px-3 py-2.5 text-right">Overdue Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={r.rig_id} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="px-3 py-2.5 font-medium text-foreground">{r.rig_name}</td>
                      <td className="px-3 py-2.5 text-right font-semibold" style={{ color: bandColor(r.health_index) }}>
                        {r.health_index}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {r.has_open_well ? (r.days_since_report ?? 'Never reported') : 'No open well'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{r.efficiency_pct == null ? '—' : `${r.efficiency_pct}%`}</td>
                      <td className={`px-3 py-2.5 text-right ${r.open_hi_sev_actions > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        {r.open_hi_sev_actions}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${r.overdue_certs > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        {r.overdue_certs}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${r.overdue_mandatory_activities > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
                        {r.overdue_mandatory_activities}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  )
}
