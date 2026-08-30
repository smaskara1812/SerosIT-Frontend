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

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

const TFS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]

const SORT_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'age', label: 'Age (d)' },
]

const STATUS_BADGE = {
  Open: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  Closed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
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

export default function HazardCardsPage() {
  const { user } = useAuth()
  const canExport = can(user, 'reports.hazard_cards', 'export')

  const [meta, setMeta] = useState({ years: [], hazard_types: [], work_locations: [] })
  const [rigs, setRigs] = useState([])

  const [filters, setFilters] = useState({
    year: '',
    rig: '',
    hazard_type: '',
    status: '',
    tfs: '',
    work_location: '',
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
    apiFetch('/api/reports/hazard-cards/meta/')
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
      apiFetch(`/api/reports/hazard-cards/?${params.toString()}`)
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
    const res = await apiFetch(`/api/reports/hazard-cards/export/?${params.toString()}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hazard_cards.csv'
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
    () => [{ value: '', label: 'All' }, ...meta.hazard_types.map((t) => ({ value: String(t.id), label: t.name }))],
    [meta.hazard_types]
  )
  const locationOptions = useMemo(
    () => [
      { value: '', label: 'All' },
      ...meta.work_locations.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [meta.work_locations]
  )

  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  usePageSubtitle(`${count.toLocaleString()} hazard cards`)

  if (!can(user, 'reports.hazard_cards', 'view')) return <AccessDenied />

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
          label="Type"
          value={filters.hazard_type}
          onChange={(v) => setFilter('hazard_type', v)}
          options={typeOptions}
          width="w-[140px]"
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
          width="w-[90px]"
        />
        <SelectField
          label="TFS"
          value={filters.tfs}
          onChange={(v) => setFilter('tfs', v)}
          options={TFS_OPTIONS}
          width="w-[80px]"
        />
        <SelectField
          label="Location"
          value={filters.work_location}
          onChange={(v) => setFilter('work_location', v)}
          options={locationOptions}
          width="w-[130px]"
        />
        <label className="flex min-w-[160px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Description, action taken…"
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
              <col className="w-[112px]" />
              <col className="w-[68px]" />
              <col className="w-[92px]" />
              <col className="w-[124px]" />
              <col className="w-[112px]" />
              <col className="w-[76px]" />
              <col className="w-[56px]" />
              <col className="w-[68px]" />
              <col />
              <col className="w-9" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Sr
                </th>
                <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('date')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Card No
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Rig
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Location
                </th>
                <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('status')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  TFS
                </th>
                <SortHeader col={SORT_COLUMNS[2]} ordering={ordering} onClick={() => toggleSort('age')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Summary
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const open = openRow === r.haz_card_id
                const srNo = (page - 1) * pageSize + idx + 1
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                return (
                  <Fragment key={r.haz_card_id}>
                    <tr
                      className={`${zebra} cursor-pointer border-b border-border/60 hover:bg-accent`}
                      onClick={() => setOpenRow(open ? null : r.haz_card_id)}
                    >
                      <td className="truncate px-3 py-2.5 text-xs text-muted-foreground">{srNo}</td>
                      <td className="truncate px-3 py-2.5">
                        {r.event_dt ? new Date(r.event_dt).toLocaleDateString() : '—'}
                      </td>
                      <td className="truncate px-3 py-2.5">{r.haz_id_card_no}</td>
                      <td className="truncate px-3 py-2.5" title={r.rig_name}>
                        {r.rig_name}
                      </td>
                      <td className="truncate px-3 py-2.5" title={r.haz_type_name}>
                        {r.haz_type_name || '—'}
                      </td>
                      <td className="truncate px-3 py-2.5" title={r.work_location_name}>
                        {r.work_location_name || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[r.status_label] || STATUS_BADGE.Open}`}
                        >
                          {r.status_label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            r.tfs_bool
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {r.tfs_bool ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="truncate px-3 py-2.5">{r.age_days}</td>
                      <td className="truncate px-3 py-2.5 text-muted-foreground" title={r.hazard_desc}>
                        {r.hazard_desc}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <IconChevronDown
                          className={`inline-block h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </td>
                    </tr>
                    {open && (
                      <tr className={`${zebra} border-b border-border/60`}>
                        <td colSpan={11} className="px-5 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailField label="Full Description" value={r.hazard_desc} wide />
                            <DetailField label="Action Taken" value={r.action_taken} wide />
                            <DetailField label="Responsible Department" value={r.resp_dept_name} />
                            <DetailField label="Responsible Rank" value={r.resp_rank_name} />
                            <DetailField label="Reported By" value={r.reported_by_name} />
                            <DetailField
                              label="Close Out Date"
                              value={r.close_out_dt ? new Date(r.close_out_dt).toLocaleDateString() : null}
                            />
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
              No hazard cards match the current filters.
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
