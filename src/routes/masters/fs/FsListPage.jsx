import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import { mastersSchemas } from '@/config/mastersSchemas'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconSearch, IconTrash, IconChevronDown } from '@/components/icons'
import { Pencil, UserCheck, UserRound } from 'lucide-react'
import { FS_KINDS } from './fsKinds'
import { openEmployeeStatus } from './openStatus'

const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Y', label: 'Active' },
  { value: 'N', label: 'Inactive' },
]
const EMPTY_FILTERS = {}

function DetailField({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value && String(value).trim() ? value : '—'}</div>
    </div>
  )
}

// The list page for FS Employee and FS Employee Status — same layout as the
// IT Asset list: a filter bar, a table whose rows expand, and per-row actions
// including a shortcut across to the other FS page when the user may open it.
export default function FsListPage({ kind: kindKey }) {
  const kind = FS_KINDS[kindKey]
  const other = FS_KINDS[kind.other]
  const schema = mastersSchemas[kind.schemaKey]
  const otherSchema = mastersSchemas[other.schemaKey]
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, schema.menuKey, 'add')
  const canEdit = can(user, schema.menuKey, 'edit')
  const canDelete = can(user, schema.menuKey, 'delete')
  const canExport = can(user, schema.menuKey, 'export')
  const canOpenOther = can(user, otherSchema.menuKey, 'view')
  const canAddStatus = can(user, mastersSchemas['fs-emp-cur-status'].menuKey, 'add')
  const remoteFilters = useMemo(() => schema.fields.filter((f) => f.filterable && f.remote), [schema])

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [labels, setLabels] = useState({})
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const timerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} records` : null)

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
    apiFetch(`${schema.apiBase}?${params}`)
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

  function setFilter(name, value, label) {
    setFilters((prev) => ({ ...prev, [name]: value || '' }))
    setLabels((prev) => ({ ...prev, [name]: label || '' }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await apiFetch(`${schema.apiBase}export/?${buildParams()}`)
      if (!res.ok) return toast.error("Couldn't export the list. Please try again.")
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `${kind.title}.csv`
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
      const res = await apiFetch(`${schema.apiBase}${kind.idOf(deleteTarget)}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => kind.idOf(r) !== kind.idOf(deleteTarget)))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success(`${kind.nameOf(deleteTarget)} deleted`)
        setDeleteTarget(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't delete this record. Please try again.")
      }
    } finally {
      setDeleting(false)
    }
  }

  function goOther(r, e) {
    e.stopPropagation()
    if (kindKey === 'employee') openEmployeeStatus(navigate, kind.idOf(r), kind.nameOf(r), canAddStatus)
    else navigate(other.editPath(kind.idOf(r)))
  }

  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  const OtherIcon = kindKey === 'employee' ? UserCheck : UserRound
  const otherTitle = kindKey === 'employee' ? 'Open this employee’s status' : 'Open this employee’s record'

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={kind.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        {remoteFilters.map((f) => (
          <div key={f.name} className="flex w-[170px] flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{f.label}</span>
            <RemoteCombobox
              field={{ ...f, labelField: undefined, placeholder: 'All' }}
              value={filters[f.name] || null}
              labelValue={labels[f.name] || ''}
              onChange={(v, raw) => setFilter(f.name, v, raw?.[f.optionLabel])}
            />
          </div>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Status</span>
          <select
            value={filters.active || ''}
            onChange={(e) => setFilter('active', e.target.value)}
            className="h-9 w-[110px] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          >
            {ACTIVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
          <Button size="lg" onClick={() => navigate(kind.newPath)}>
            + {kind.newLabel}
          </Button>
        )}
      </div>

      <div ref={listRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {kind.columns.map((c) => (
                <th key={c.label} className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{c.label}</th>
              ))}
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={kind.columns.length + 2} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={kind.columns.length + 2} className="p-6 text-center text-sm text-muted-foreground">No records found.</td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const id = kind.idOf(r)
              const open = expanded === id
              const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
              return (
                <Fragment key={id}>
                  <tr onClick={() => setExpanded(open ? null : id)} className={`cursor-pointer border-b border-border/60 ${zebra} hover:bg-muted/50`}>
                    {kind.columns.map((c) => (
                      <td key={c.label} className={`px-3 py-2.5 ${c.bold ? 'font-medium' : ''}`}>{c.render(r)}</td>
                    ))}
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          kind.activeOf(r) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {kind.activeOf(r) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canOpenOther && (
                          <button type="button" title={otherTitle} onClick={(e) => goOther(r, e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <OtherIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(kind.editPath(id))
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
                            }}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <IconChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className={`${zebra} border-b border-border/60`}>
                      <td colSpan={kind.columns.length + 2} className="px-5 py-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {(canEdit || canAdd) && (
                            <Button size="sm" variant="outline" onClick={() => navigate(kind.editPath(id))}>
                              <Pencil className="h-3.5 w-3.5" />
                              {canEdit ? 'Edit' : 'Open'}
                            </Button>
                          )}
                          {canOpenOther && (
                            <Button size="sm" variant="outline" onClick={(e) => goOther(r, e)}>
                              <OtherIcon className="h-3.5 w-3.5" />
                              {kindKey === 'employee' ? 'FS Employee Status' : 'FS Employee'}
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                          {kind.details.map(([label, get]) => (
                            <DetailField key={label} label={label} value={get(r)} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {loadingMore && (
              <tr>
                <td colSpan={kind.columns.length + 2} className="p-3 text-center text-xs text-muted-foreground">Loading more…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget ? kind.nameOf(deleteTarget) : ''}?</DialogTitle>
            <DialogDescription>
              {kindKey === 'employee' ? 'This also deletes their status record. This can’t be undone.' : 'This can’t be undone.'}
            </DialogDescription>
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
