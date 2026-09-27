import { useEffect, useState } from 'react'
import { Activity, CalendarClock, FileCheck2, MapPinned, PauseCircle, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { DashboardToolbar, KpiCard, MultiSelectPopover } from './DashboardUI'

const MENU_KEY = 'dashboards.fleet_operating_picture'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function FleetOperatingPicturePage() {
  const { user } = useAuth()

  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    setLoading(true)
    setError('')
    apiFetch(`/api/dashboards/fleet-operating-picture/?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load dashboard')
        return r.json()
      })
      .then(setData)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [selectedRigIds])

  usePageSubtitle(data ? `${data.rows.length} rig(s) · as of ${fmtDate(data.as_of)}` : null)

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
      <DashboardToolbar
        note={`Live snapshot as of ${fmtDate(data?.as_of)}. "Silent" = an open well with no daily report in ${data?.silent_days_threshold ?? 3}+ days.`}
      >
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
            <KpiCard icon={Activity} label="Active Rigs" value={data.summary.active_rigs} accent="var(--chart-1)" />
            <KpiCard icon={FileCheck2} label="On Contract" value={data.summary.on_contract} accent="var(--chart-3)" />
            <KpiCard icon={PauseCircle} label="Idle" value={data.summary.idle} accent="var(--chart-2)" />
            <KpiCard icon={MapPinned} label="Open Wells" value={data.summary.open_wells} accent="var(--chart-5)" />
            <KpiCard
              icon={TriangleAlert}
              label="Silent Rigs"
              value={data.summary.silent_rigs}
              warning={data.summary.silent_rigs > 0}
            />
            <KpiCard icon={CalendarClock} label="Contracts Ending ≤30d" value={data.summary.contracts_ending_soon} accent="var(--chart-4)" />
          </div>

          {/* shrink-0: this div's own `overflow-hidden` (for rounded corners)
              gives it an automatic flex-shrink minimum of 0, so without
              shrink-0 the surrounding flex column silently squashes it down
              to whatever space is left and clips the rest of the table with
              no scrollbar at all, instead of growing the page and letting
              the page-level scroll container handle it. */}
          <div className="shrink-0 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="h-[3px] w-full" style={{ background: 'var(--chart-1)' }} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-border bg-muted/70 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
                    <th className="px-3 py-2.5">Rig</th>
                    <th className="px-3 py-2.5">Contract</th>
                    <th className="px-3 py-2.5">Contract Ends</th>
                    <th className="px-3 py-2.5">Current Well</th>
                    <th className="px-3 py-2.5 text-right">Water Depth</th>
                    <th className="px-3 py-2.5 text-right">Days on Well</th>
                    <th className="px-3 py-2.5">Last Report</th>
                    <th className="px-3 py-2.5 text-right">POB</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr
                      key={r.rig_id}
                      className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${r.rig_active === 'Y' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {r.rig_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.contract_no ? (
                          <span>
                            {r.contract_no}
                            {r.operator_name && <span className="block text-[11px]">{r.operator_name}</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Idle
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.contract_ends ? fmtDate(r.contract_ends) : r.contract_no ? 'Open-ended' : '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.well_location || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{r.water_depth != null ? `${r.water_depth} m` : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{r.days_on_well ?? '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.last_report_dt ? (
                          <span>
                            {fmtDate(r.last_report_dt)}
                            {r.days_since_report != null && (
                              <span className="block text-[11px]">{r.days_since_report}d ago</span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{r.pob_total ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        {r.is_silent ? (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                            Silent
                          </span>
                        ) : r.well_location ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            Reporting
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
