import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Boxes, Building2, CalendarClock, HardDrive, Layers, ListFilter, PackageX, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import {
  ChartActionRow,
  ChartCard,
  DashboardToolbar,
  EmptyChartState,
  KpiCard,
  MultiSelectPopover,
  QuickActionButton,
  QuickActions,
} from './DashboardUI'

const MENU_KEY = 'dashboards.it_asset_overview'

const TYPE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#f97316', '#0ea5e9', '#a855f7']
const ALLOCATION_COLORS = { Y: '#10b981', N: 'var(--chart-4)', S: 'var(--muted-foreground)', L: 'var(--destructive)' }
const WARRANTY_COLORS = { expired: 'var(--destructive)', expiring_soon: 'var(--chart-4)', valid: '#10b981', no_data: 'var(--muted-foreground)' }

function fmtNum(v) {
  return v == null ? '—' : Number(v).toLocaleString()
}

export default function ItAssetDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [selectedTypeIds, setSelectedTypeIds] = useState(() => new Set())
  const [selectedCompanyIds, setSelectedCompanyIds] = useState(() => new Set())
  const [drilledYear, setDrilledYear] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedTypeIds.size > 0) params.set('types', [...selectedTypeIds].join(','))
    if (selectedCompanyIds.size > 0) params.set('companies', [...selectedCompanyIds].join(','))
    apiFetch(`/api/dashboards/it-asset-overview/?${params}`)
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
  }, [selectedTypeIds, selectedCompanyIds])

  usePageSubtitle(data ? `${fmtNum(data.summary.total_assets)} asset(s)` : null)

  const typeOptions = data?.types ?? []
  const companyOptions = data?.companies ?? []
  const allTypesSelected = selectedTypeIds.size === 0
  const allCompaniesSelected = selectedCompanyIds.size === 0

  function toggleType(id) {
    setSelectedTypeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCompany(id) {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const drilledYearDetail = useMemo(() => {
    if (!drilledYear || !data?.purchase_year_cohort_detail) return []
    return data.purchase_year_cohort_detail[drilledYear] ?? []
  }, [drilledYear, data])

  // Every "view list" button lands here on the IT Assets list, carrying
  // whatever that button represents plus the dashboard's own type/company
  // filters when exactly one of each is selected (the list page's own
  // filters are single-value, so a multi-selection on the dashboard can't
  // be carried over — the button's own params still apply).
  //
  // active defaults to 'Y' because this dashboard's own numbers are
  // computed active-only (the /api/dashboards/it-asset-overview/ call never
  // sends an `active` param, and the backend view defaults it to 'Y') —
  // without forcing it here too, the list page's own default of "All"
  // would show inactive assets the dashboard never counted, so the two
  // counts wouldn't match.
  function goToAssets(extra = {}) {
    const params = new URLSearchParams()
    if (selectedTypeIds.size === 1 && !extra.it_asset_type) params.set('it_asset_type', [...selectedTypeIds][0])
    if (selectedCompanyIds.size === 1 && !extra.own_company) params.set('own_company', [...selectedCompanyIds][0])
    if (!extra.active) params.set('active', 'Y')
    Object.entries(extra).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, v)
    })
    navigate(`/it-asset/it-assets?${params.toString()}`)
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pb-6">
      <DashboardToolbar note="Assigned/Unassigned reflects each asset's own status flag; warranty is measured against today's date, not a selected year.">
        <MultiSelectPopover
          label="Asset Type"
          placeholder="All types"
          items={typeOptions}
          selected={selectedTypeIds}
          onToggle={toggleType}
          onSelectAll={() => setSelectedTypeIds(new Set())}
          getKey={(t) => t.type_id}
          getLabel={(t) => t.type_name ?? ''}
          allSelected={allTypesSelected}
        />
        <MultiSelectPopover
          label="Own Company"
          placeholder="All companies"
          items={companyOptions}
          selected={selectedCompanyIds}
          onToggle={toggleCompany}
          onSelectAll={() => setSelectedCompanyIds(new Set())}
          getKey={(c) => c.company_id}
          getLabel={(c) => c.company_name ?? ''}
          allSelected={allCompaniesSelected}
        />
      </DashboardToolbar>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading && !data && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <QuickActions>
            <QuickActionButton icon={Boxes} onClick={() => goToAssets()}>
              Total Assets
            </QuickActionButton>
            <QuickActionButton icon={PackageX} onClick={() => goToAssets({ allocated: 'N' })}>
              Unassigned
            </QuickActionButton>
            <QuickActionButton icon={ShieldCheck} accent="#10b981" onClick={() => goToAssets({ warranty_status: 'valid' })}>
              Valid Warranty
            </QuickActionButton>
            <QuickActionButton
              icon={CalendarClock}
              accent="var(--chart-4)"
              onClick={() => goToAssets({ warranty_status: 'expiring_soon' })}
            >
              Warranty Expiring ≤90d
            </QuickActionButton>
            <QuickActionButton
              icon={ShieldAlert}
              accent="var(--destructive)"
              onClick={() => goToAssets({ warranty_status: 'expired' })}
            >
              Warranty Expired
            </QuickActionButton>
            <QuickActionButton icon={ListFilter} onClick={() => navigate('/it-asset/it-assets')}>
              Open Asset List
            </QuickActionButton>
          </QuickActions>

          <div className="flex flex-wrap gap-3">
            <KpiCard
              icon={HardDrive}
              label="Total Assets"
              value={fmtNum(data.summary.total_assets)}
              accent="var(--chart-1)"
              onViewList={() => goToAssets()}
            />
            <KpiCard
              icon={PackageX}
              label="Unassigned"
              value={fmtNum(data.summary.unassigned)}
              warning={data.summary.unassigned > 0}
              onViewList={() => goToAssets({ allocated: 'N' })}
            />
            <KpiCard
              icon={ShieldAlert}
              label="Warranty Expired"
              value={fmtNum(data.summary.warranty_expired)}
              warning={data.summary.warranty_expired > 0}
              onViewList={() => goToAssets({ warranty_status: 'expired' })}
            />
            <KpiCard
              icon={CalendarClock}
              label="Warranty Expiring ≤90d"
              value={fmtNum(data.summary.warranty_expiring_soon)}
              accent="var(--chart-4)"
              warning={data.summary.warranty_expiring_soon > 0}
              onViewList={() => goToAssets({ warranty_status: 'expiring_soon' })}
            />
          </div>

          <ChartCard icon={Layers} title="Assets by Type" accent="var(--chart-1)">
            {data.assets_by_type.length === 0 ? (
              <EmptyChartState>No assets match the current filters.</EmptyChartState>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(220, data.assets_by_type.length * 34)}>
                  <BarChart data={data.assets_by_type} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="type_name" width={110} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip
                      formatter={(v) => [fmtNum(v), 'Assets']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {data.assets_by_type.map((r, i) => (
                        <Cell key={r.type_id} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ChartActionRow>
                  {data.assets_by_type.map((r, i) => (
                    <QuickActionButton
                      key={r.type_id}
                      dotColor={TYPE_COLORS[i % TYPE_COLORS.length]}
                      onClick={() => goToAssets({ it_asset_type: r.type_id })}
                    >
                      {r.type_name}
                    </QuickActionButton>
                  ))}
                </ChartActionRow>
              </>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard icon={PackageX} title="Allocation Status" accent="var(--chart-2)">
              {data.allocation_status.length === 0 ? (
                <EmptyChartState>No data.</EmptyChartState>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.allocation_status} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {data.allocation_status.map((r) => (
                          <Cell key={r.status} fill={ALLOCATION_COLORS[r.status] ?? 'var(--chart-3)'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [fmtNum(v), n]}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ChartActionRow>
                    {data.allocation_status.map((r) => (
                      <QuickActionButton
                        key={r.status}
                        dotColor={ALLOCATION_COLORS[r.status] ?? 'var(--chart-3)'}
                        onClick={() => goToAssets({ allocated: r.status })}
                      >
                        {r.label}
                      </QuickActionButton>
                    ))}
                  </ChartActionRow>
                </>
              )}
            </ChartCard>

            <ChartCard icon={ShieldAlert} title="Warranty Status" accent="var(--chart-4)">
              {data.warranty_status.length === 0 ? (
                <EmptyChartState>No data.</EmptyChartState>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.warranty_status} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {data.warranty_status.map((r) => (
                          <Cell key={r.status} fill={WARRANTY_COLORS[r.status] ?? 'var(--chart-3)'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [fmtNum(v), n]}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ChartActionRow>
                    {data.warranty_status.map((r) => (
                      <QuickActionButton
                        key={r.status}
                        dotColor={WARRANTY_COLORS[r.status] ?? 'var(--chart-3)'}
                        onClick={() => goToAssets({ warranty_status: r.status })}
                      >
                        {r.label}
                      </QuickActionButton>
                    ))}
                  </ChartActionRow>
                </>
              )}
            </ChartCard>
          </div>

          <ChartCard
            icon={CalendarClock}
            title={drilledYear ? `Purchase Cohort — ${drilledYear}, by Type` : 'Purchase-Year Cohort'}
            subtitle={drilledYear ? undefined : '— fleet age at a glance; click a year to see its type mix'}
            accent="var(--chart-3)"
          >
            {drilledYear && (
              <button
                type="button"
                onClick={() => setDrilledYear(null)}
                className="-mt-2 mb-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-3 w-3" /> Back to all years
              </button>
            )}
            {drilledYear ? (
              drilledYearDetail.length === 0 ? (
                <EmptyChartState>No data for this year.</EmptyChartState>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(220, drilledYearDetail.length * 34)}>
                    <BarChart data={drilledYearDetail} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis type="category" dataKey="type_name" width={110} stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v) => [fmtNum(v), 'Assets']}
                        contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {drilledYearDetail.map((r, i) => (
                          <Cell key={r.type_id} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartActionRow>
                    {drilledYearDetail.map((r, i) => (
                      <QuickActionButton
                        key={r.type_id}
                        dotColor={TYPE_COLORS[i % TYPE_COLORS.length]}
                        onClick={() => goToAssets({ pur_year: drilledYear, it_asset_type: r.type_id })}
                      >
                        {r.type_name}
                      </QuickActionButton>
                    ))}
                  </ChartActionRow>
                </>
              )
            ) : data.purchase_year_cohort.length === 0 ? (
              <EmptyChartState>No purchase-date data available.</EmptyChartState>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.purchase_year_cohort}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    formatter={(v) => [fmtNum(v), 'Assets']}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(bar) => setDrilledYear(bar?.payload?.year ?? bar?.year)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard icon={Building2} title="Top Owning Companies" subtitle="— top 10" accent="var(--chart-5)">
            {data.assets_by_company.length === 0 ? (
              <EmptyChartState>No data.</EmptyChartState>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(240, data.assets_by_company.length * 32)}>
                  <BarChart data={data.assets_by_company} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="company_name" width={180} stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip
                      formatter={(v) => [fmtNum(v), 'Assets']}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="var(--chart-5)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartActionRow>
                  {data.assets_by_company.map((r) => (
                    <QuickActionButton
                      key={r.company_id}
                      dotColor="var(--chart-5)"
                      title={r.company_name}
                      onClick={() => goToAssets({ own_company: r.company_id })}
                    >
                      {r.company_name.length > 24 ? `${r.company_name.slice(0, 24)}…` : r.company_name}
                    </QuickActionButton>
                  ))}
                </ChartActionRow>
              </>
            )}
          </ChartCard>
        </>
      )}
    </div>
  )
}
