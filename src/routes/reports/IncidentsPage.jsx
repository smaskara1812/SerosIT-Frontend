import { Fragment, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconSearch, IconChevronDown } from '@/components/icons'
import { Download } from 'lucide-react'

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'H', label: 'High' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Low' },
]

const INJURED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]

const SORT_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'severity', label: 'Severity' },
  { key: 'npt_hours', label: 'NPT Hrs' },
]

const SEVERITY_BADGE = {
  High: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  Medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  Low: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  Unknown: 'bg-muted text-muted-foreground',
}

function SelectField({ label, value, onChange, options, width = 'w-[110px]' }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 truncate rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 ${width}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function fmtMoney(v) {
  if (v == null || v === '') return '—'
  return Number(v).toLocaleString()
}

function DetailField({ label, value, wide }) {
  return (
    <div className={wide ? 'col-span-full' : ''}>
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {value && String(value).trim() ? value : '—'}
      </div>
    </div>
  )
}

export default function IncidentsPage() {
  const { user } = useAuth()
  const canExport = can(user, 'reports.incidents', 'export')

  const [meta, setMeta] = useState({ years: [], incident_types: [] })
  const [rigs, setRigs] = useState([])

  const [filters, setFilters] = useState({
    year: '',
    rig: '',
    severity: '',
    person_injured: '',
    incident_type: '',
  })
  const [search, setSearch] = useState('')
  const [ordering, setOrdering] = useState('-date')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openRow, setOpenRow] = useState(null)

  useEffect(() => {
    apiFetch('/api/reports/incidents/meta/')
      .then((r) => r.json())
      .then(setMeta)
    apiFetch('/api/masters/rigs/?page_size=200')
      .then((r) => r.json())
      .then((data) => setRigs(Array.isArray(data) ? data : data.results || []))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      if (search) params.set('search', search)
      params.set('ordering', ordering)
      params.set('page', page)
      params.set('page_size', pageSize)
      apiFetch(`/api/reports/incidents/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setRows(data.results || [])
          setCount(data.count || 0)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [filters, search, ordering, page, pageSize])

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function toggleSort(key) {
    setOrdering((prev) => (prev === `-${key}` ? key : `-${key}`))
    setPage(1)
  }

  async function exportCsv() {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    if (search) params.set('search', search)
    params.set('ordering', ordering)
    // A plain navigation/<a href> wouldn't carry the JWT (auth here is a
    // header, not a cookie) — fetch through apiFetch and save the blob.
    const res = await apiFetch(`/api/reports/incidents/export/?${params.toString()}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'incidents.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const rigOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))],
    [rigs]
  )
  const yearOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...meta.years.map((y) => ({ value: String(y), label: String(y) }))],
    [meta.years]
  )
  const typeOptions = useMemo(
    () => [
      { value: '', label: 'All' },
      ...meta.incident_types.map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [meta.incident_types]
  )

  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  usePageSubtitle(`${count.toLocaleString()} incidents`)

  if (!can(user, 'reports.incidents', 'view')) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <SelectField
          label="Year"
          value={filters.year}
          onChange={(v) => setFilter('year', v)}
          options={yearOptions}
          width="w-[84px]"
        />
        <SelectField
          label="Rig"
          value={filters.rig}
          onChange={(v) => setFilter('rig', v)}
          options={rigOptions}
          width="w-[120px]"
        />
        <SelectField
          label="Severity"
          value={filters.severity}
          onChange={(v) => setFilter('severity', v)}
          options={SEVERITY_OPTIONS}
          width="w-[100px]"
        />
        <SelectField
          label="Injured"
          value={filters.person_injured}
          onChange={(v) => setFilter('person_injured', v)}
          options={INJURED_OPTIONS}
          width="w-[90px]"
        />
        <SelectField
          label="Type"
          value={filters.incident_type}
          onChange={(v) => setFilter('incident_type', v)}
          options={typeOptions}
          width="w-[150px]"
        />
        <label className="flex min-w-[160px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Description, causes, actions…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-9 pl-8"
            />
          </div>
        </label>
        {canExport && (
          <Button size="lg" className="ml-auto" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[116px]" />
              <col className="w-[76px]" />
              <col className="w-[92px]" />
              <col className="w-[80px]" />
              <col className="w-[128px]" />
              <col className="w-[68px]" />
              <col className="w-[68px]" />
              <col />
              <col className="w-9" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Sr
                </th>
                {SORT_COLUMNS.slice(0, 1).map((c) => (
                  <SortHeader key={c.key} col={c} ordering={ordering} onClick={() => toggleSort(c.key)} />
                ))}
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Incident No
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Rig
                </th>
                <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('severity')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Injured
                </th>
                <SortHeader col={SORT_COLUMNS[2]} ordering={ordering} onClick={() => toggleSort('npt_hours')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Summary
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const open = openRow === r.incident_id
                const srNo = (page - 1) * pageSize + idx + 1
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                return (
                  <Fragment key={r.incident_id}>
                    <tr
                      className={`${zebra} cursor-pointer border-b border-border/60 hover:bg-accent`}
                      onClick={() => setOpenRow(open ? null : r.incident_id)}
                    >
                      <td className="truncate px-3 py-2.5 text-xs text-muted-foreground">{srNo}</td>
                      <td className="truncate px-3 py-2.5">
                        {r.incident_date ? new Date(r.incident_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="truncate px-3 py-2.5">{r.incident_no}</td>
                      <td className="truncate px-3 py-2.5" title={r.rig_name}>
                        {r.rig_name}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${SEVERITY_BADGE[r.severity_display] || SEVERITY_BADGE.Unknown}`}
                        >
                          {r.severity_display}
                        </span>
                      </td>
                      <td className="truncate px-3 py-2.5" title={r.incident_type_name}>
                        {r.incident_type_name || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            r.person_injured_bool
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {r.person_injured_bool ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="truncate px-3 py-2.5">{r.npt_hrs_loss}</td>
                      <td className="truncate px-3 py-2.5 text-muted-foreground" title={r.incident_descr}>
                        {r.incident_descr}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <IconChevronDown
                          className={`inline-block h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </td>
                    </tr>
                    {open && (
                      <tr className={`${zebra} border-b border-border/60`}>
                        <td colSpan={10} className="px-5 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailField label="Full Description" value={r.incident_descr} wide />
                            <DetailField
                              label="Immediate Cause"
                              value={[r.immediate_cause, r.immediate_cause_descr].filter(Boolean).join(' — ')}
                              wide
                            />
                            <DetailField label="Corrective Action" value={r.corrective_action} wide />
                            <DetailField label="Preventive Action" value={r.preventive_action} wide />
                            <DetailField label="Comments" value={r.comments} />
                            <DetailField
                              label="Employee"
                              value={[r.emp_name, r.rank_name].filter(Boolean).join(' — ')}
                            />
                            <DetailField label="Work Location" value={r.work_location_name} />
                            <DetailField label="Manhours Loss" value={r.manhours_loss} />
                            <DetailField label="Financial Loss" value={fmtMoney(r.financial_loss_amt)} />
                            <DetailField label="Reported By" value={r.reported_by} />
                            <DetailField label="Drilling Superintendent" value={r.drilling_superintendent} />
                            <DetailField label="Safety Officer" value={r.safety_officer} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No incidents match the current filters.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs text-foreground outline-none focus:border-ring"
            >
              {[25, 50, 75, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            {count ? `Showing ${start}–${end} of ${count.toLocaleString()}` : ''}
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Prev
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SortHeader({ col, ordering, onClick }) {
  const active = ordering === col.key || ordering === `-${col.key}`
  const desc = ordering === `-${col.key}`
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer px-3 py-2.5 text-left text-[11px] font-bold tracking-wide uppercase select-none ${active ? 'text-[#1a3f7a]' : 'text-muted-foreground'}`}
    >
      <span className="inline-flex items-center gap-1">
        {col.label}
        <IconChevronDown
          className={`h-3 w-3 transition-transform ${active ? 'opacity-100' : 'opacity-30'} ${active && !desc ? 'rotate-180' : ''}`}
        />
      </span>
    </th>
  )
}
