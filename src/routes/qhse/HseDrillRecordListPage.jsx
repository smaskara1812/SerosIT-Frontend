import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { IconSearch, IconChevronDown, IconTrash } from '@/components/icons'
import { Pencil, Printer, ClipboardList } from 'lucide-react'

const MENU_KEY = 'qhse.hse_drill_record'

const SORT_COLUMNS = [
  { key: 'drill_record_no', label: 'Report No.' },
  { key: 'drill_dt', label: 'Drill Date' },
  { key: 'head_count', label: 'Head Count' },
]

function fmtDate(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function SelectField({ label, value, onChange, options, width = 'w-[140px]' }) {
  const selected = options.find((o) => o.value === value)
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={selected?.label}
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

export default function HseDrillRecordListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [meta, setMeta] = useState({ years: [], drill_types: [] })
  const [rigs, setRigs] = useState([])
  const [filters, setFilters] = useState({ year: '', rig: '', hse_drill: '' })
  const [ordering, setOrdering] = useState('-drill_dt')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} drill records` : null)

  useEffect(() => {
    apiFetch('/api/qhse/hse-drill-record/meta/')
      .then((r) => r.json())
      .then(setMeta)
    apiFetch('/api/masters/rigs/?page_size=200&fields=rig_id,rig_name')
      .then((r) => r.json())
      .then((data) => setRigs(Array.isArray(data) ? data : data.results || []))
  }, [])

  function loadPage(pageNum, searchQuery, append) {
    const thisRequest = ++requestIdRef.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (ordering) params.set('ordering', ordering)
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    params.set('page', String(pageNum))
    apiFetch(`/api/qhse/hse-drill-record/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        const results = data.results || data
        setRows((prev) => (append ? [...prev, ...results] : results))
        setTotalCount(data.count ?? results.length)
        setHasMore(Boolean(data.next))
        setPage(pageNum)
      })
      .finally(() => {
        if (thisRequest !== requestIdRef.current) return
        setLoading(false)
        setLoadingMore(false)
      })
  }

  useEffect(() => {
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, query, false)
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, ordering, filters])

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function toggleSort(key) {
    setOrdering((prev) => (prev === key ? `-${key}` : key))
  }

  function handleScroll(e) {
    const el = e.currentTarget
    if (loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) loadPage(page + 1, query, true)
  }

  async function printReport(r) {
    const tab = window.open('', '_blank')
    const res = await apiFetch(`/api/qhse/hse-drill-record/${r.drill_record_hdr_id}/print/`)
    if (!res.ok) {
      toast.error('Failed to generate report')
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
      a.download = `HSE Drill Record - ${r.drill_record_no}.pdf`
      a.click()
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/hse-drill-record/${deleteTarget.drill_record_hdr_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.drill_record_hdr_id !== deleteTarget.drill_record_hdr_id))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success(`Drill Record ${deleteTarget.drill_record_no} deleted`)
        setDeleteTarget(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || 'Failed to delete')
      }
    } finally {
      setDeleting(false)
    }
  }

  const rigOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))],
    [rigs]
  )
  const yearOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(meta.years || []).map((y) => ({ value: String(y), label: String(y) }))],
    [meta.years]
  )
  const drillTypeOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(meta.drill_types || []).map((d) => ({ value: String(d.id), label: d.label || d.name }))],
    [meta.drill_types]
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <SelectField label="Year" value={filters.year} onChange={(v) => setFilter('year', v)} options={yearOptions} width="w-[90px]" />
        <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilter('rig', v)} options={rigOptions} width="w-[150px]" />
        <SelectField label="Type of Drill" value={filters.hse_drill} onChange={(v) => setFilter('hse_drill', v)} options={drillTypeOptions} width="w-[260px]" />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Report No., Location…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">{totalCount}</span>
        {canAdd && (
          <Button size="lg" onClick={() => navigate('/qhse/hse-drill-record/new')}>
            + New Drill Record
          </Button>
        )}
      </div>

      <div ref={listRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('drill_record_no')} />
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Rig</th>
              <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('drill_dt')} />
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Location</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Type of Drill</th>
              <SortHeader col={SORT_COLUMNS[2]} ordering={ordering} onClick={() => toggleSort('head_count')} />
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No drill records found.</td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
              return (
                <tr key={r.drill_record_hdr_id} className={`border-b border-border/60 ${zebra}`}>
                  <td className="px-3 py-2.5 font-medium">{r.drill_record_no}</td>
                  <td className="truncate px-3 py-2.5" title={r.rig_name}>{r.rig_name || '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.drill_dt)}</td>
                  <td className="truncate px-3 py-2.5" title={r.drill_location}>{r.drill_location}</td>
                  <td className="max-w-[260px] truncate px-3 py-2.5" title={`${r.hse_drill_1_name}${r.hse_drill_2_name ? ' + ' + r.hse_drill_2_name : ''}`}>
                    {r.hse_drill_1_name}
                    {r.hse_drill_2_name ? ` + ${r.hse_drill_2_name}` : ''}
                  </td>
                  <td className="px-3 py-2.5">{r.head_count}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Drill Details (Events, Observations, Improvements, Corrective Action, Photos)"
                        onClick={() => navigate(`/qhse/hse-drill-record/${r.drill_record_hdr_id}/details`)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Print"
                        onClick={() => printReport(r)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => navigate(`/qhse/hse-drill-record/${r.drill_record_hdr_id}/edit`)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTarget(r)}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {loadingMore && (
              <tr>
                <td colSpan={7} className="p-3 text-center text-xs text-muted-foreground">Loading more…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drill Record {deleteTarget?.drill_record_no}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (() => {
            const cascade = [
              ['Events', deleteTarget.events_count],
              ['Observations', deleteTarget.observations_count],
              ['Improvements', deleteTarget.improvements_count],
              ['Corrective Actions', deleteTarget.corrective_actions_count],
              ['Photo references', deleteTarget.photo_uploads_count],
            ].filter(([, count]) => count > 0)
            if (cascade.length === 0) return null
            return (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <p className="font-medium">This will also delete:</p>
                <ul className="mt-1 list-inside list-disc">
                  {cascade.map(([label, count]) => (
                    <li key={label}>
                      {count} {label}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
