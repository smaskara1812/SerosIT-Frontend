import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, FileCheck2, Landmark, PauseCircle, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { ChartCard, DashboardToolbar, EmptyChartState, KpiCard, MultiSelectPopover, YearSelect } from './DashboardUI'
import { useUrlIdSet, useUrlString, useUrlYear } from './dashboardUrlState'

const MENU_KEY = 'dashboards.contract_exposure'

const RATE_CODE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-2)', '#f97316']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtNum(v) {
  return v == null ? '—' : Math.round(v).toLocaleString()
}

export default function ContractExposureDashboardPage() {
  const { user } = useAuth()

  const [year, setYear] = useUrlYear()
  const [selectedRigIds, setSelectedRigIds] = useUrlIdSet('rigs')
  // Which row status the coverage table is narrowed to — set by a KpiCard's
  // onFilter (Coverage Gaps / Ending ≤30d) rather than by navigating away.
  const [statusFilter, setStatusFilter] = useUrlString('status')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    apiFetch(`/api/dashboards/contract-exposure/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then((d) => {
        setError('')
        setData(d)
        setYear((prev) => prev ?? d.year)
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [year, selectedRigIds, setYear])

  usePageSubtitle(data ? `${data.rows.length} rig(s) · ${data.year}` : null)

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

  // One source of truth for each row's status, shared by the pill it
  // renders and the KPI-driven table filter below — the pill and the
  // "Coverage Gaps"/"Ending ≤30d" KPI cards would silently drift apart if
  // this logic lived in two places.
  function rowStatus(r) {
    if (!r.contract_no) return r.rig_active === 'Y' ? 'gap' : 'idle'
    if (r.days_remaining != null && r.days_remaining <= 30) return 'ending_soon'
    return 'active'
  }

  const rowsWithStatus = useMemo(() => (data ? data.rows.map((r) => ({ ...r, status: rowStatus(r) })) : []), [data])
  const visibleRows = statusFilter ? rowsWithStatus.filter((r) => r.status === statusFilter) : rowsWithStatus

  const STATUS_FILTER_LABELS = { gap: 'Coverage Gaps', ending_soon: 'Ending ≤30d' }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar>
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
            <KpiCard icon={FileCheck2} label="On Contract" value={data.summary.on_contract} accent="var(--chart-3)" />
            <KpiCard icon={PauseCircle} label="Idle" value={data.summary.idle} accent="var(--chart-2)" />
            <KpiCard
              icon={TriangleAlert}
              label="Coverage Gaps"
              value={data.summary.coverage_gaps}
              sub="Active, no current contract"
              warning={data.summary.coverage_gaps > 0}
              onFilter={() => setStatusFilter((prev) => (prev === 'gap' ? '' : 'gap'))}
              filterActive={statusFilter === 'gap'}
            />
            <KpiCard
              icon={CalendarClock}
              label="Ending ≤30d"
              value={data.summary.ending_30d}
              accent="var(--destructive)"
              onFilter={() => setStatusFilter((prev) => (prev === 'ending_soon' ? '' : 'ending_soon'))}
              filterActive={statusFilter === 'ending_soon'}
            />
            <KpiCard icon={CalendarClock} label="Ending ≤60d" value={data.summary.ending_60d} accent="var(--chart-4)" />
            <KpiCard icon={CalendarClock} label="Ending ≤90d" value={data.summary.ending_90d} accent="var(--chart-5)" />
          </div>

          <ChartCard icon={Landmark} title="Hours by Rate Code" subtitle={`— ${data.year}, fleet total`} accent="var(--chart-1)">
            {data.hours_by_rate_code.length === 0 ? (
              <EmptyChartState>No logged operations for this period.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.hours_by_rate_code} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="rate_code" width={90} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    formatter={(v) => [`${fmtNum(v)} hrs`, 'Hours']}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                    {data.hours_by_rate_code.map((r, i) => (
                      <Cell key={r.rate_code} fill={RATE_CODE_COLORS[i % RATE_CODE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard icon={FileCheck2} title="Contract Coverage by Rig" subtitle={`— as of ${fmtDate(data.as_of)}`} accent="var(--chart-1)" bodyClassName="p-0">
            {statusFilter && (
              <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3.5 py-2 text-xs text-foreground">
                <TriangleAlert className="h-3.5 w-3.5 text-destructive" />
                Showing {visibleRows.length} of {rowsWithStatus.length} rigs — {STATUS_FILTER_LABELS[statusFilter]} only.
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="ml-auto font-semibold text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5">Contract</th>
                    <th className="px-3 py-2.5">Operator</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5">Start</th>
                    <th className="px-3 py-2.5">Ends</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No rigs match this filter.
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((r, i) => (
                    <tr key={r.rig_id} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${r.rig_active === 'Y' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {r.rig_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.contract_no || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.operator_name || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.location_name || '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(r.contract_start)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.contract_ends ? fmtDate(r.contract_ends) : r.contract_no ? 'Open-ended' : '—'}
                        {r.days_remaining != null && <span className="block text-[11px]">{r.days_remaining}d left</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {r.status === 'gap' ? (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                            Gap
                          </span>
                        ) : r.status === 'idle' ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Idle
                          </span>
                        ) : r.status === 'ending_soon' ? (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                            Ending Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            Active
                          </span>
                        )}
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
