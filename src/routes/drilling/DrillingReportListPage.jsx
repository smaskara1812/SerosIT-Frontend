import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { IconSearch } from '@/components/icons'
import { Download } from 'lucide-react'

const MENU_KEY = 'drilling.drilling_report'
const API = '/api/drilling/drilling-report/'

const RIG_FIELD = { type: 'select-remote', remote: '/api/drilling/my-rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }

const SCOPE_TABS = [
  { value: '', label: 'All' },
  { value: 'pending_for_me', label: 'Pending for me' },
  { value: 'approved_by_me', label: 'Approved by me' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent_for_revision', label: 'Sent for revision' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const SORT_OPTIONS = [
  { value: '-date', label: 'Date (newest first)' },
  { value: 'date', label: 'Date (oldest first)' },
  { value: 'rig', label: 'Rig (A–Z)' },
  { value: '-rig', label: 'Rig (Z–A)' },
  { value: '-operating_hrs', label: 'Operating Hrs (high–low)' },
  { value: 'operating_hrs', label: 'Operating Hrs (low–high)' },
  { value: '-meterage', label: 'Meterage (high–low)' },
  { value: 'meterage', label: 'Meterage (low–high)' },
]

function emptyFilters() {
  return { rig: null, rig_label: '', date_from: '', date_to: '', scope: '', status: '', ordering: '-date' }
}

function statusInfo(row) {
  if (row.cr_status === 'F') {
    if (row.l1_approval_status === 'A') return { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-600' }
    if (row.l1_approval_status === 'R') return { label: 'Rejected', className: 'bg-red-500/15 text-red-600' }
    return { label: 'Pending approval', className: 'bg-blue-500/15 text-blue-600' }
  }
  if (row.cr_status === 'N') return { label: 'Sent for revision', className: 'bg-orange-500/15 text-orange-600' }
  return { label: 'Draft', className: 'bg-muted text-muted-foreground' }
}

// Data-entry is the primary use of this page — a wide table the user scans
// and jumps into, not a side-panel drawer they browse alongside typing.
// Editing/creating a report gets the whole screen on its own route.
export default function DrillingReportListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, MENU_KEY, 'add')
  const canExport = can(user, MENU_KEY, 'export')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(emptyFilters())
  const [showFilters, setShowFilters] = useState(false)

  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)
  const skipNextLoadRef = useRef(true)

  const activeFilterCount = [filters.rig, filters.date_from, filters.date_to, filters.status].filter(Boolean).length

  function buildFilterParams(searchQuery) {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (filters.rig) params.set('rig', filters.rig)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    if (filters.scope) params.set('scope', filters.scope)
    if (filters.status) params.set('status', filters.status)
    if (filters.ordering) params.set('ordering', filters.ordering)
    return params
  }

  function loadPage(pageNum, searchQuery, { append } = {}) {
    const thisRequest = ++requestIdRef.current
    const params = buildFilterParams(searchQuery)
    params.set('page', String(pageNum))
    if (append) setLoadingMore(true)
    else setLoading(true)
    apiFetch(`${API}?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisRequest !== requestIdRef.current) return
        const results = Array.isArray(data) ? data : data.results || []
        setRows((prev) => (append ? [...prev, ...results] : results))
        setTotalCount(Array.isArray(data) ? results.length : (data.count ?? results.length))
        setHasMore(!Array.isArray(data) && Boolean(data.next))
        setPage(pageNum)
      })
      .finally(() => {
        if (thisRequest !== requestIdRef.current) return
        setLoading(false)
        setLoadingMore(false)
      })
  }

  function loadMore() {
    if (loadingMore || !hasMore) return
    loadPage(page + 1, query, { append: true })
  }

  function handleScroll(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) loadMore()
  }

  async function exportCsv() {
    const params = buildFilterParams(query)
    const res = await apiFetch(`${API}export/?${params.toString()}`)
    if (!res.ok) {
      toast.error('Failed to export')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drilling-report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadPage(1, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (skipNextLoadRef.current) return
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = 0
      loadPage(1, query)
    }, 300)
    return () => clearTimeout(searchTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    if (listRef.current) listRef.current.scrollTop = 0
    loadPage(1, query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Drilling Report</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">{totalCount}</span>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => navigate('/drilling/drilling-report/new')}>+ New Drilling Report</Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SCOPE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, scope: t.value }))}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              filters.scope === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="relative ml-2">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search rig, remarks…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-64 pl-8" />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <select
          value={filters.ordering}
          onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value }))}
          className="ml-auto h-9 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none focus:border-ring"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Sort: {o.label}</option>
          ))}
        </select>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Rig</span>
            <RemoteCombobox field={RIG_FIELD} value={filters.rig} onChange={(id) => setFilters((f) => ({ ...f, rig: id }))} labelValue={filters.rig_label} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Status</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Date From</span>
            <Input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} className="h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Date To</span>
            <Input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} className="h-9" />
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...emptyFilters(), ordering: f.ordering }))}
              className="h-9 text-xs font-medium text-[#2563eb] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card"
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5">Rig</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Operating Hrs</th>
              <th className="px-4 py-2.5 text-right">Standby Hrs</th>
              <th className="px-4 py-2.5 text-right">Meterage</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No records found.</td></tr>
            )}
            {rows.map((r) => {
              const status = statusInfo(r)
              return (
                <tr
                  key={r.drilling_dtl_id}
                  onClick={() => navigate(`/drilling/drilling-report/${r.drilling_dtl_id}/edit`)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/60"
                >
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.rig_name}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{r.drilling_dtl_dt}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.location || '—'}</td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground" title={r.contract_no}>{r.contract_no || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{r.operating_hrs ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{r.standby_hrs ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">{r.drilling_meterage ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loadingMore && <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>}
      </div>
    </div>
  )
}
