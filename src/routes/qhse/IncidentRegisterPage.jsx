import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MultiSelectPopover } from '@/components/MultiSelectPopover'
import { IconSearch } from '@/components/icons'
import { FileSpreadsheet, Printer } from 'lucide-react'

const MENU_KEY = 'qhse.incident_register'

function SelectField({ label, value, onChange, options, width = 'w-[180px]' }) {
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

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IncidentRegisterPage() {
  const { user } = useAuth()
  const canExport = can(user, MENU_KEY, 'export')

  const [meta, setMeta] = useState({ categories: [], rigs: [], incident_types: [] })
  const [category, setCategory] = useState('')
  const [selectedRigIds, setSelectedRigIds] = useState(() => new Set())
  const [selectedTypeIds, setSelectedTypeIds] = useState(() => new Set())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  // No sortable column headers (legacy grid didn't have them either) —
  // always newest incident first.
  const ordering = '-date'
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)

  // Shared by exportExcel/printPdf/the list fetch — one source of truth for
  // which filters are currently active, so the exported CSV, the printed
  // PDF, and the on-screen list can never drift out of sync with each
  // other. Wrapped in useCallback (deps = the filter values themselves) so
  // it's a stable reference the fetch effect below can safely list as a
  // dependency instead of needing an eslint-disable for it.
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (selectedRigIds.size > 0) params.set('rigs', [...selectedRigIds].join(','))
    if (selectedTypeIds.size > 0) params.set('incident_types', [...selectedTypeIds].join(','))
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (search) params.set('search', search)
    params.set('ordering', ordering)
    return params
  }, [category, selectedRigIds, selectedTypeIds, dateFrom, dateTo, search, ordering])

  // Re-fetched whenever Category changes: the Category dropdown scopes
  // which rigs the Rig picker offers (matching the legacy page's own
  // Category-narrows-the-Rig-search behavior), not the incident rows
  // directly, so a stale rig selection outside the new category is
  // dropped rather than silently kept.
  useEffect(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    apiFetch(`/api/qhse/incident-register/meta/?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setMeta(d)
        setSelectedRigIds((prev) => {
          const validIds = new Set(d.rigs.map((r) => r.id))
          const next = new Set([...prev].filter((id) => validIds.has(id)))
          return next.size === prev.size ? prev : next
        })
      })
  }, [category])

  useEffect(() => {
    const timer = setTimeout(() => {
      const thisRequest = ++requestIdRef.current
      setLoading(true)
      const params = buildFilterParams()
      params.set('page', page)
      params.set('page_size', pageSize)
      apiFetch(`/api/qhse/incident-register/?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (thisRequest !== requestIdRef.current) return
          setRows(data.results || [])
          setCount(data.count || 0)
        })
        .finally(() => {
          if (thisRequest !== requestIdRef.current) return
          setLoading(false)
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [buildFilterParams, page, pageSize])

  function toggleRig(rigId) {
    setSelectedRigIds((prev) => {
      const next = new Set(prev)
      if (next.has(rigId)) next.delete(rigId)
      else next.add(rigId)
      return next
    })
    setPage(1)
  }

  function toggleType(typeId) {
    setSelectedTypeIds((prev) => {
      const next = new Set(prev)
      if (next.has(typeId)) next.delete(typeId)
      else next.add(typeId)
      return next
    })
    setPage(1)
  }

  function handleClear() {
    setCategory('')
    setSelectedRigIds(new Set())
    setSelectedTypeIds(new Set())
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setPage(1)
  }

  async function exportExcel() {
    const res = await apiFetch(`/api/qhse/incident-register/export/?${buildFilterParams().toString()}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Incident Register.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function printPdf() {
    // Open the tab synchronously (in direct response to the click) so
    // popup blockers don't reject it — same trick as the QHSE Incident
    // Flash Report's own print button (IncidentDetailsListPage.jsx).
    const tab = window.open('', '_blank')
    const res = await apiFetch(`/api/qhse/incident-register/print/?${buildFilterParams().toString()}`)
    if (!res.ok) {
      toast.error((await res.json().catch(() => null))?.detail || 'Failed to generate report')
      if (tab) tab.close()
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    if (tab) {
      tab.location.href = url
    } else if (!window.open(url, '_blank')) {
      const a = document.createElement('a')
      a.href = url
      a.download = 'Incident Register.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All Categories' }, ...meta.categories.map((c) => ({ value: String(c.id), label: c.name }))],
    [meta.categories]
  )
  const allRigsSelected = selectedRigIds.size === 0
  const allTypesSelected = selectedTypeIds.size === 0

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  usePageSubtitle(`${count.toLocaleString()} incidents`)

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Category"
            value={category}
            onChange={(v) => {
              setCategory(v)
              setPage(1)
            }}
            options={categoryOptions}
          />
          <MultiSelectPopover
            label="Rig"
            placeholder="All Rigs"
            items={meta.rigs}
            selected={selectedRigIds}
            onToggle={toggleRig}
            onSelectAll={() => setSelectedRigIds(new Set())}
            getKey={(r) => r.id}
            getLabel={(r) => r.name}
            allSelected={allRigsSelected}
          />
          <MultiSelectPopover
            label="Incident Type"
            placeholder="All Types"
            items={meta.incident_types}
            selected={selectedTypeIds}
            onToggle={toggleType}
            onSelectAll={() => setSelectedTypeIds(new Set())}
            getKey={(t) => t.id}
            getLabel={(t) => t.name}
            allSelected={allTypesSelected}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Incident From
            </span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[150px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Incident To
            </span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[150px]"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Brief description…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-9 pl-8"
              />
            </div>
          </label>
          <Button size="lg" variant="outline" onClick={handleClear}>
            Clear
          </Button>
          {canExport && (
            <Button size="lg" variant="outline" className="ml-auto" onClick={printPdf}>
              <Printer className="h-3.5 w-3.5" />
              Print PDF
            </Button>
          )}
          {canExport && (
            <Button size="lg" onClick={exportExcel}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-[150px]" />
              <col className="w-[110px]" />
              <col className="w-[170px]" />
              <col className="w-[130px]" />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Sr.No.
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Rig
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Incident No.
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Date &amp; Time of Incident
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Incident Type
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Brief Description of Incident
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const srNo = (page - 1) * pageSize + idx + 1
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                return (
                  <tr key={r.incident_id} className={`${zebra} border-b border-border/60`}>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{srNo}</td>
                    <td className="truncate px-3 py-2.5 font-medium text-foreground" title={r.rig_name}>
                      {r.rig_name}
                    </td>
                    <td className="truncate px-3 py-2.5 text-muted-foreground">{r.rig_incident_no || '—'}</td>
                    <td className="truncate px-3 py-2.5 text-muted-foreground">{fmtDateTime(r.incident_date)}</td>
                    <td className="truncate px-3 py-2.5" title={r.incident_type_name}>
                      {r.incident_type_abrv || '—'}
                    </td>
                    <td className="px-3 py-2.5 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {r.incident_descr}
                    </td>
                  </tr>
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
            {count ? `Total: ${count.toLocaleString()} (showing ${start}–${end})` : 'Total: 0'}
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
