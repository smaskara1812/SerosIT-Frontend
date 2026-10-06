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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconSearch, IconTrash } from '@/components/icons'
import { Pencil } from 'lucide-react'

const MENU_KEY = 'qhse.corrective_actions'
const API = '/api/qhse/corrective-actions/'
const TITLE = 'Corrective Actions Reporting'
const STATUS = {
  OP: { label: 'Open', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' },
  IN: { label: 'In Process', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200' },
  CL: { label: 'Closed', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' },
}
const STATUS_FILTER = [{ value: '', label: 'All' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function SelectField({ label, value, onChange, options, width = 'w-[140px]' }) {
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

export default function CorrectiveActionListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canExport = can(user, MENU_KEY, 'export')

  const [categories, setCategories] = useState([])
  const [rigs, setRigs] = useState([])
  const [filters, setFilters] = useState({ category: '', rig: '', status: '' })
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} corrective actions` : null)

  useEffect(() => {
    apiFetch('/api/masters/qhse-categories/?page_size=200&fields=qhse_category_id,qhse_category_name')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
    apiFetch('/api/masters/rigs/?page_size=200&fields=rig_id,rig_name')
      .then((r) => r.json())
      .then((data) => setRigs(Array.isArray(data) ? data : data.results || []))
  }, [])

  function buildParams() {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    return params
  }

  function loadPage(pageNum, append) {
    const thisRequest = ++requestIdRef.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    const params = buildParams()
    params.set('page', String(pageNum))
    apiFetch(`${API}?${params}`)
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
      loadPage(1, false)
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters])

  function handleScroll(e) {
    const el = e.currentTarget
    if (loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) loadPage(page + 1, true)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await apiFetch(`${API}export/?${buildParams()}`)
      if (!res.ok) return toast.error("Couldn't export the list. Please try again.")
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `${TITLE}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`${API}${deleteTarget.other_qhse_action_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.other_qhse_action_id !== deleteTarget.other_qhse_action_id))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success('Corrective action deleted')
        setDeleteTarget(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't delete this record. Please try again.")
      }
    } finally {
      setDeleting(false)
    }
  }

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...categories.map((c) => ({ value: String(c.qhse_category_id), label: c.qhse_category_name }))],
    [categories]
  )
  const rigOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))],
    [rigs]
  )

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <SelectField label="Category" value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} options={categoryOptions} width="w-[190px]" />
        <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilters((f) => ({ ...f, rig: v }))} options={rigOptions} width="w-[170px]" />
        <SelectField label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={STATUS_FILTER} width="w-[120px]" />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="ICR No., details, action party, rig…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">{totalCount}</span>
        {canExport && (
          <Button size="lg" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        )}
        {canAdd && (
          <Button size="lg" onClick={() => navigate('/qhse/corrective-actions/new')}>
            + New Corrective Action
          </Button>
        )}
      </div>

      <div ref={listRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {['ICR No.', 'Category', 'Rig', 'Date', 'Details of Findings', 'Action Party', 'Target Date', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">No corrective actions found.</td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const status = STATUS[r.action_status] || { label: r.action_status, cls: 'bg-muted text-foreground' }
              const closed = r.action_status === 'CL'
              return (
                <tr key={r.other_qhse_action_id} className={`border-b border-border/60 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.icr_no}</td>
                  <td className="px-3 py-2.5">{r.qhse_category_name}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.rig_name}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.other_qhse_action_dt)}</td>
                  <td className="max-w-[320px] truncate px-3 py-2.5" title={r.action_recommended}>{r.action_recommended}</td>
                  <td className="max-w-[180px] truncate px-3 py-2.5" title={r.action_party}>{r.action_party}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.target_date)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {(canEdit || canAdd) && (
                        <button
                          type="button"
                          title={closed ? 'View' : 'Open'}
                          onClick={() => navigate(`/qhse/corrective-actions/${r.other_qhse_action_id}/edit`)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && !closed && (
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
                <td colSpan={9} className="p-3 text-center text-xs text-muted-foreground">Loading more…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete corrective action {deleteTarget?.icr_no}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
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
