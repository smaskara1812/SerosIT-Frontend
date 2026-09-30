import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { IconSearch, IconChevronDown, IconTrash } from '@/components/icons'
import { Pencil, Printer } from 'lucide-react'

const MENU_KEY = 'qhse.hazard_id_card'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

// Filters/search/sort live in the URL (not plain useState) so navigating
// to a row's edit page and back — or a browser refresh — doesn't silently
// reset them; same reasoning as dashboards/dashboardUrlState.js.
const FILTER_KEYS = ['year', 'rig', 'status', 'category', 'hazard_type', 'tfs', 'work_location', 'date_from', 'date_to']

const TFS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]

const STATUS_BADGE = {
  O: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  C: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
}

const SORT_COLUMNS = [
  { key: 'haz_id_card_no', label: 'Card No.' },
  { key: 'event_dt', label: 'Event Date' },
]

function fmtDate(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
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

export default function HazardIdCardListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canPrint = can(user, MENU_KEY, 'export')

  const [meta, setMeta] = useState({ years: [], hazard_types: [], work_locations: [], categories: [] })
  const [rigs, setRigs] = useState([])

  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => {
    const f = {}
    for (const k of FILTER_KEYS) f[k] = searchParams.get(k) || ''
    return f
  }, [searchParams])
  const query = searchParams.get('q') || ''
  const ordering = searchParams.get('ordering') || '-event_dt'

  function setFilter(key, value) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (value) params.set(key, value)
        else params.delete(key)
        return params
      },
      { replace: true }
    )
  }
  function setQuery(value) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (value) params.set('q', value)
        else params.delete('q')
        return params
      },
      { replace: true }
    )
  }
  function setOrdering(value) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('ordering', value)
        return params
      },
      { replace: true }
    )
  }

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [openRow, setOpenRow] = useState(null)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} hazard cards` : null)

  useEffect(() => {
    apiFetch('/api/qhse/hazard-id-card/meta/')
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
    apiFetch(`/api/qhse/hazard-id-card/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        const results = data.results || []
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

  function toggleSort(key) {
    setOrdering(ordering === key ? `-${key}` : key)
  }

  function handleScroll(e) {
    const el = e.currentTarget
    if (loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) loadPage(page + 1, query, true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/hazard-id-card/${deleteTarget.haz_card_id}/`, {
        method: 'DELETE',
        body: JSON.stringify({ deleted_remarks: deleteReason }),
      })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.haz_card_id !== deleteTarget.haz_card_id))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success(`Haz ID Card No. ${deleteTarget.haz_id_card_no} deleted`)
        setDeleteTarget(null)
        setDeleteReason('')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to delete')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function printReport() {
    // Open the tab synchronously (in direct response to the click) so
    // popup blockers don't reject it — same pattern as
    // IncidentDetailsListPage's printFlashReport.
    const tab = window.open('', '_blank')
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    const res = await apiFetch(`/api/qhse/hazard-id-card/report/?${params}`)
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
      a.download = 'Hazard ID Card Report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.info('Popup blocked — report downloaded instead')
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const rigOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))],
    [rigs]
  )
  const yearOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(meta.years || []).map((y) => ({ value: String(y), label: String(y) }))],
    [meta.years]
  )
  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(meta.categories || []).map((c) => ({ value: String(c.id), label: c.name }))],
    [meta.categories]
  )
  const typeOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(meta.hazard_types || []).map((t) => ({ value: String(t.id), label: t.name }))],
    [meta.hazard_types]
  )
  const locationOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...(meta.work_locations || []).map((w) => ({ value: String(w.id), label: w.name }))],
    [meta.work_locations]
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField label="Category" value={filters.category} onChange={(v) => setFilter('category', v)} options={categoryOptions} width="w-[150px]" />
          <SelectField label="Year" value={filters.year} onChange={(v) => setFilter('year', v)} options={yearOptions} width="w-[84px]" />
          <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilter('rig', v)} options={rigOptions} width="w-[140px]" />
          <SelectField label="Type" value={filters.hazard_type} onChange={(v) => setFilter('hazard_type', v)} options={typeOptions} width="w-[140px]" />
          <SelectField label="Location" value={filters.work_location} onChange={(v) => setFilter('work_location', v)} options={locationOptions} width="w-[140px]" />
          <SelectField label="Status" value={filters.status} onChange={(v) => setFilter('status', v)} options={STATUS_OPTIONS} width="w-[100px]" />
          <SelectField label="TFS" value={filters.tfs} onChange={(v) => setFilter('tfs', v)} options={TFS_OPTIONS} width="w-[80px]" />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">From</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">To</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Card No., description, action taken, reported by…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
            </div>
          </label>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">{totalCount}</span>
          {canPrint && (
            <Button size="lg" variant="outline" onClick={printReport}>
              <Printer className="h-3.5 w-3.5" />
              Print Report
            </Button>
          )}
          {canAdd && (
            <Button size="lg" onClick={() => navigate('/qhse/hazard-id-card/new')}>
              + New Hazard ID Card
            </Button>
          )}
        </div>
      </div>

      <div onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('haz_id_card_no')} />
              <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('event_dt')} />
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Rig</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Type</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Description</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Status</th>
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
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No hazard cards found.</td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const open = openRow === r.haz_card_id
              const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
              return (
                <Fragment key={r.haz_card_id}>
                  <tr
                    className={`cursor-pointer border-b border-border/60 hover:bg-accent/40 ${zebra}`}
                    onClick={() => setOpenRow(open ? null : r.haz_card_id)}
                  >
                    <td className="px-3 py-2.5 font-medium">{r.haz_id_card_no}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.event_dt)}</td>
                    <td className="truncate px-3 py-2.5" title={r.rig_name}>{r.rig_name || '—'}</td>
                    <td className="truncate px-3 py-2.5" title={r.haz_type_name}>{r.haz_type_name || '—'}</td>
                    <td className="max-w-[360px] truncate px-3 py-2.5" title={r.hazard_desc}>{r.hazard_desc}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[r.haz_id_card_status] || STATUS_BADGE.O}`}>
                        {r.haz_id_card_status === 'C' ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/qhse/hazard-id-card/${r.haz_card_id}/edit`)
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(r)
                              setDeleteReason('')
                            }}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <IconChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className={`${zebra} border-b border-border/60`}>
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                          <DetailField label="Location" value={r.work_location_name} />
                          <DetailField label="Responsible Dept" value={r.resp_dept_name} />
                          <DetailField label="Responsible Rank" value={r.resp_rank_name} />
                          <DetailField label="Close Out Date" value={r.close_out_dt ? fmtDate(r.close_out_dt) : null} />
                          <DetailField label="Reported By" value={r.reported_by_name || r.reported_by_fs_emp_name} />
                          <DetailField label="Action Taken" value={r.action_taken} wide />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
            <DialogTitle>Delete Haz ID Card No. {deleteTarget?.haz_id_card_no}?</DialogTitle>
            <DialogDescription>This can't be undone. Enter a reason for the delete (at least 10 characters).</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            maxLength={100}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Reason for delete…"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting || deleteReason.trim().length < 10}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
