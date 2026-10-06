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

function SelectField({ label, value, onChange, options, width }) {
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

function fmtPeriod(iso) {
  return iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : ''
}

const kind = {
  title: 'HSE - Leading Indicators',
  detailTitle: 'Leading Indicators Detail',
  menuKey: 'qhse.leading_indicators',
  apiBase: '/api/qhse/leading-indicators/',
  basePath: '/qhse/leading-indicators',
}

export default function HseLeadingIndicatorsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canAdd = can(user, kind.menuKey, 'add')
  const canDelete = can(user, kind.menuKey, 'delete')
  const canExport = can(user, kind.menuKey, 'export')

  const [years, setYears] = useState([])
  const [rigs, setRigs] = useState([])
  const [filters, setFilters] = useState({ year: '', rig: '' })
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const listRef = useRef(null)
  const requestIdRef = useRef(0)
  const searchTimerRef = useRef(null)

  usePageSubtitle(totalCount ? `${totalCount.toLocaleString()} reports` : null)

  useEffect(() => {
    apiFetch(`${kind.apiBase}meta/`)
      .then((r) => r.json())
      .then((d) => setYears(d.years || []))
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
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
    params.set('page', String(pageNum))
    apiFetch(`${kind.apiBase}?${params}`)
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
  }, [query, filters])

  function handleScroll(e) {
    const el = e.currentTarget
    if (loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) loadPage(page + 1, query, true)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`${kind.apiBase}${deleteTarget.id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id))
        setTotalCount((c) => Math.max(0, c - 1))
        toast.success(`Report ${deleteTarget.report_no} deleted`)
        setDeleteTarget(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || 'Failed to delete')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      const res = await apiFetch(`${kind.apiBase}export/?${params}`)
      if (!res.ok) return toast.error('Failed to export')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `${kind.title}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const rigOptions = useMemo(
    () => [{ value: '', label: 'All' }, ...rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))],
    [rigs]
  )
  const yearOptions = useMemo(() => [{ value: '', label: 'All' }, ...years.map((y) => ({ value: String(y), label: String(y) }))], [years])

  if (!can(user, kind.menuKey, 'view')) return <AccessDenied />

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <SelectField label="Year" value={filters.year} onChange={(v) => setFilters((f) => ({ ...f, year: v }))} options={yearOptions} width="w-[90px]" />
        <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilters((f) => ({ ...f, rig: v }))} options={rigOptions} width="w-[170px]" />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Report No., Rig…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-8" />
          </div>
        </label>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">{totalCount}</span>
        {canExport && (
          <Button size="lg" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        )}
        {canAdd && (
          <Button size="lg" onClick={() => navigate(`${kind.basePath}/new`)}>
            + New Report
          </Button>
        )}
      </div>

      <div ref={listRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              {['Report No.', 'Rig', 'Company', 'Period'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">No reports found.</td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={r.id} className={`border-b border-border/60 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                <td className="px-3 py-2.5 font-medium">{r.report_no}</td>
                <td className="px-3 py-2.5">{r.rig_name}</td>
                <td className="px-3 py-2.5">{r.company_name}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{fmtPeriod(r.period)}</td>
                <td className="px-2 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Open"
                      onClick={() => navigate(`${kind.basePath}/${r.id}/edit`)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
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
            ))}
            {loadingMore && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground">Loading more…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete report {deleteTarget?.report_no}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          {deleteTarget?.dtl_count > 0 && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p className="font-medium">This will also delete:</p>
              <ul className="mt-1 list-inside list-disc">
                <li>{deleteTarget.dtl_count} indicator rows (all figures entered in this report)</li>
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
