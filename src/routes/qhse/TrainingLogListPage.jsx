import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconSearch, IconTrash } from '@/components/icons'
import { Pencil } from 'lucide-react'

const MENU_KEY = 'qhse.training_log'
const API = '/api/qhse/training-log/'
const TITLE = 'Training Log'
const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', placeholder: 'All' }
const COURSE_FIELD = { type: 'select-remote', remote: `${API}certificates/`, optionLabel: 'name', optionValue: 'id', placeholder: 'All' }
const TYPES = ['', 'Internal', 'External']

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function TrainingLogListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const canExport = can(user, MENU_KEY, 'export')

  const [filters, setFilters] = useState({})
  const [labels, setLabels] = useState({})
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const timerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} training logs` : null)

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
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, false)
    }, 300)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters])

  function handleScroll(e) {
    const el = e.currentTarget
    if (loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) loadPage(page + 1, true)
  }

  const setFilter = (name, value, label) => {
    setFilters((prev) => ({ ...prev, [name]: value || '' }))
    setLabels((prev) => ({ ...prev, [name]: label || '' }))
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
      const res = await apiFetch(`${API}${deleteTarget.training_log_hdr_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.training_log_hdr_id !== deleteTarget.training_log_hdr_id))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success(
          deleteTarget.dtl_count
            ? `Training log deleted, along with its ${deleteTarget.dtl_count} ${deleteTarget.dtl_count === 1 ? 'trainee' : 'trainees'}`
            : 'Training log deleted'
        )
        setDeleteTarget(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't delete this training log. Please try again.")
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rig, course, location or training org…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        <div className="flex w-[160px] flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Rig</span>
          <RemoteCombobox field={RIG_FIELD} value={filters.rig || null} labelValue={labels.rig || ''} onChange={(v, raw) => setFilter('rig', v, raw?.rig_name)} />
        </div>
        <div className="flex w-[200px] flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Course</span>
          <RemoteCombobox field={COURSE_FIELD} value={filters.cert || null} labelValue={labels.cert || ''} onChange={(v, raw) => setFilter('cert', v, raw?.name)} />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Type</span>
          <select
            value={filters.training_type || ''}
            onChange={(e) => setFilter('training_type', e.target.value)}
            className="h-9 w-[110px] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t || 'All'}
              </option>
            ))}
          </select>
        </label>
        {canExport && (
          <Button size="lg" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        )}
        {canAdd && (
          <Button size="lg" onClick={() => navigate('/qhse/training-log/new')}>
            + New Training Log
          </Button>
        )}
      </div>

      <div ref={listRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {['Training Date', 'Rig', 'Course', 'Location', 'Type', 'Trainer', 'Trainees'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No training logs found.</td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={r.training_log_hdr_id} className={`border-b border-border/60 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.training_dt)}</td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.rig_name}</td>
                <td className="px-3 py-2.5">{r.cert_name}</td>
                <td className="px-3 py-2.5">{r.training_location}</td>
                <td className="px-3 py-2.5">{r.training_type}</td>
                <td className="px-3 py-2.5">
                  {r.trainer_name}
                  <span className="block text-xs text-muted-foreground">{r.training_org_name}</span>
                </td>
                <td className="px-3 py-2.5">{r.dtl_count}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {(canEdit || canAdd) && (
                      <button type="button" title="Open" onClick={() => navigate(`/qhse/training-log/${r.training_log_hdr_id}/edit`)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" title="Delete" onClick={() => setDeleteTarget(r)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {loadingMore && (
              <tr>
                <td colSpan={8} className="p-3 text-center text-xs text-muted-foreground">Loading more…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete the {deleteTarget?.cert_name} log for {deleteTarget?.rig_name}?
            </DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          {deleteTarget?.dtl_count > 0 && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p className="font-medium">This will also delete:</p>
              <ul className="mt-1 list-inside list-disc">
                <li>
                  {deleteTarget.dtl_count} {deleteTarget.dtl_count === 1 ? 'trainee' : 'trainees'}, with any certificate files
                </li>
              </ul>
            </div>
          )}
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
