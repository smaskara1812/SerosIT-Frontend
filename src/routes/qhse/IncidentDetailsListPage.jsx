import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
import { Pencil } from 'lucide-react'

const MENU_KEY = 'qhse.incident_details'

const SEVERITY_LABEL = { L: 'Low', M: 'Medium', H: 'High' }
const SEVERITY_BADGE = {
  L: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  M: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  H: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
}
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
  { key: 'rig_incident_no', label: 'Rig Incident No.' },
  { key: 'incident_date', label: 'Date' },
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

export default function IncidentDetailsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [meta, setMeta] = useState({ years: [] })
  const [rigs, setRigs] = useState([])

  const [filters, setFilters] = useState({ year: '', rig: '', severity: '', person_injured: '' })
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [ordering, setOrdering] = useState('-incident_date')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [openRow, setOpenRow] = useState(null)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} incidents` : null)

  useEffect(() => {
    apiFetch('/api/qhse/incidents/meta/')
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
    apiFetch(`/api/qhse/incidents/?${params}`)
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

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/incidents/${deleteTarget.incident_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.incident_id !== deleteTarget.incident_id))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success(`Incident ${deleteTarget.rig_incident_no || `#${deleteTarget.incident_no}`} deleted`)
        setDeleteTarget(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to delete')
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

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <SelectField label="Year" value={filters.year} onChange={(v) => setFilter('year', v)} options={yearOptions} width="w-[84px]" />
        <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilter('rig', v)} options={rigOptions} width="w-[140px]" />
        <SelectField label="Severity" value={filters.severity} onChange={(v) => setFilter('severity', v)} options={SEVERITY_OPTIONS} width="w-[100px]" />
        <SelectField label="Injured" value={filters.person_injured} onChange={(v) => setFilter('person_injured', v)} options={INJURED_OPTIONS} width="w-[90px]" />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Description, reported by, location…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">{totalCount}</span>
        {canAdd && (
          <Button size="lg" onClick={() => navigate('/qhse/incident-details/new')}>
            + New Incident
          </Button>
        )}
      </div>

      <div onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('rig_incident_no')} />
              <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('incident_date')} />
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Rig</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Description</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Severity</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Injured</th>
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
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No incidents found.</td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const open = openRow === r.incident_id
              const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
              return (
                <Fragment key={r.incident_id}>
                  <tr
                    className={`cursor-pointer border-b border-border/60 hover:bg-accent/40 ${zebra}`}
                    onClick={() => setOpenRow(open ? null : r.incident_id)}
                  >
                    <td className="px-3 py-2.5 font-medium" title={`Incident #${r.incident_no}`}>
                      {r.rig_incident_no || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(r.incident_date)}</td>
                    <td className="truncate px-3 py-2.5" title={r.rig_name}>{r.rig_name || '—'}</td>
                    <td className="max-w-[360px] truncate px-3 py-2.5" title={r.incident_descr}>{r.incident_descr}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${SEVERITY_BADGE[r.incident_severity] || ''}`}>
                        {SEVERITY_LABEL[r.incident_severity] || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{r.person_injured === 'Y' ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/qhse/incident-details/${r.incident_id}/edit`)
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
                          <DetailField label="Well No." value={r.well_no} />
                          <DetailField label="Reported By" value={r.reported_by} />
                          <DetailField label="Work Location" value={r.work_location_name} />
                          <DetailField label="Operator" value={r.operator_name} />
                          <DetailField label="Country" value={r.country_name} />
                          <DetailField label="Nature of Incident" value={r.incident_type_name} />
                          <DetailField label="Drilling Superintendent" value={r.drilling_superintendent} />
                          <DetailField label="Safety Officer" value={r.safety_officer} />
                          {r.person_injured === 'Y' && <DetailField label="Injured Person" value={r.emp_name} />}
                          <DetailField label="Comments" value={r.comments} wide />
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
            <DialogTitle>
              Delete Incident {deleteTarget?.rig_incident_no ? deleteTarget.rig_incident_no : `#${deleteTarget?.incident_no}`}?
            </DialogTitle>
            <DialogDescription>This can't be undone.</DialogDescription>
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
