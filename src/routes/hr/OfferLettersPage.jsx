import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import usePersistedState from '@/hooks/usePersistedState'
import { useListReturn } from '@/hooks/useListReturn'
import RowOpenIcon from '@/components/RowOpenIcon'
import { apiFetch, asList, cachedGet } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconSearch, IconChevronDown, IconTrash } from '@/components/icons'

const MENU_KEY = 'hr.fs_offer_letters'
const BASE = '/api/hr/fs-offer-letters/'
const FORM = '/rig-personnel/offer-letters'

// The legacy buttons Search All / Search Pending for me / Search Approved by me.
const SCOPES = [
  { value: '', label: 'All' },
  { value: 'pending_for_me', label: 'Pending for me' },
  { value: 'approved_by_me', label: 'Approved by me' },
]
const WORKFLOW_STYLE = {
  draft: 'bg-muted text-muted-foreground',
  sent_back: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  pending: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
}
const RESPONSE_STYLE = {
  A: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  D: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  C: 'bg-muted text-muted-foreground',
}
const EMPTY_FILTERS = { scope: '', state: '', response: '', letter: '', rig: '', year: '' }
const SORT_COLUMNS = [
  { key: 'name', label: 'Applicant' },
  { key: 'dt', label: 'Date' },
  { key: 'doj', label: 'Date of Joining' },
]
const TH = 'px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase'
const dmy = (s) => (s ? String(s).split('-').reverse().join('/') : '—')

function SelectField({ label, value, onChange, options, width = 'w-[120px]' }) {
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

function SortHeader({ col, ordering, onClick }) {
  const active = ordering === col.key || ordering === `-${col.key}`
  const desc = ordering === `-${col.key}`
  return (
    <th onClick={onClick} className={`cursor-pointer px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap uppercase select-none ${active ? 'text-[#1a3f7a] dark:text-sky-300' : 'text-muted-foreground'}`}>
      <span className="inline-flex items-center gap-1">
        {col.label}
        <IconChevronDown className={`h-3 w-3 transition-transform ${active ? 'opacity-100' : 'opacity-30'} ${active && !desc ? 'rotate-180' : ''}`} />
      </span>
    </th>
  )
}

export default function OfferLettersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const ret = useListReturn('hr.fs-offer-letters')
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')

  const [filters, setFilters] = usePersistedState('hr.offerletters.filters', EMPTY_FILTERS)
  const [search, setSearch] = usePersistedState('hr.offerletters.search', '')
  const [ordering, setOrdering] = usePersistedState('hr.offerletters.ordering', 'recent')
  const [page, setPage] = useState(ret.restoredPage ?? 1)
  const [pageSize, setPageSize] = usePersistedState('hr.offerletters.pageSize', 50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)
  const [meta, setMeta] = useState({ years: [], workflow: [], responses: [], letters: [] })
  const [rigs, setRigs] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    Promise.all([apiFetch(`${BASE}meta/`).then((r) => r.json()), cachedGet('/api/masters/rigs/?active=Y&page_size=200&fields=rig_id,rig_name')])
      .then(([m, r]) => {
        setMeta({ years: m.years || [], workflow: m.workflow || [], responses: m.responses || [], letters: m.letters || [] })
        setRigs(asList(r))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const thisRequest = ++requestIdRef.current
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      if (search) params.set('search', search)
      params.set('ordering', ordering)
      params.set('page', page)
      params.set('page_size', pageSize)
      apiFetch(`${BASE}?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (thisRequest !== requestIdRef.current) return
          setRows(data.results || [])
          setCount(data.count || 0)
        })
        .finally(() => {
          if (thisRequest === requestIdRef.current) setLoading(false)
        })
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

  async function confirmDelete() {
    const target = deleteTarget
    const res = await apiFetch(`${BASE}${target.fs_new_appl}/`, { method: 'DELETE' })
    setDeleteTarget(null)
    if (res.status === 204) {
      toast.success('Offer letter deleted')
      setRows((prev) => prev.filter((r) => r.fs_new_appl !== target.fs_new_appl))
      setCount((c) => Math.max(0, c - 1))
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Couldn't delete the offer letter")
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  usePageSubtitle(`${count.toLocaleString()} offer letters`)

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const all = [{ value: '', label: 'All' }]
  const rigOptions = [...all, ...rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))]
  const yearOptions = [...all, ...meta.years.map((y) => ({ value: String(y), label: String(y) }))]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Applicant, rig, contact person…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-9 pl-8"
              />
            </div>
          </label>
          <SelectField label="Show" value={filters.scope} onChange={(v) => setFilter('scope', v)} options={SCOPES} width="w-[150px]" />
          <SelectField label="Approval" value={filters.state} onChange={(v) => setFilter('state', v)} options={[...all, ...meta.workflow]} width="w-[160px]" />
          <SelectField label="Response" value={filters.response} onChange={(v) => setFilter('response', v)} options={[...all, ...meta.responses]} width="w-[120px]" />
          <SelectField label="Letter" value={filters.letter} onChange={(v) => setFilter('letter', v)} options={[...all, ...meta.letters]} width="w-[110px]" />
          <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilter('rig', v)} options={rigOptions} width="w-[140px]" />
          <SelectField label="Year" value={filters.year} onChange={(v) => setFilter('year', v)} options={yearOptions} width="w-[100px]" />
          {canAdd && (
            <div className="ml-auto">
              <Button size="lg" onClick={() => navigate(`${FORM}/new`)}>
                + New Offer Letter
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('name')} />
                <th className={TH}>Designation</th>
                <th className={TH}>Rig</th>
                <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('dt')} />
                <SortHeader col={SORT_COLUMNS[2]} ordering={ordering} onClick={() => toggleSort('doj')} />
                <th className={`${TH} text-right`}>Total Salary</th>
                <th className={TH}>Approval</th>
                <th className={TH}>Response</th>
                <th className={TH}>Letter</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                const openRecord = () => ret.open(navigate, `${FORM}/${r.fs_new_appl}/edit`, page)
                return (
                  <tr key={r.fs_new_appl} className={`${zebra} cursor-pointer border-b border-border/60 hover:bg-accent`} onClick={openRecord}>
                    <td className="px-3 py-2.5 font-medium">{r.applicant_name}</td>
                    <td className="px-3 py-2.5">{r.rank_name || '—'}</td>
                    <td className="px-3 py-2.5">{r.rig_name || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{dmy(r.fs_offer_letter_dt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{dmy(r.fs_offer_letter_doj)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{Number(r.salary_amt).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${WORKFLOW_STYLE[r.workflow] || 'bg-muted'}`}>{r.workflow_label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${RESPONSE_STYLE[r.response_status] || 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'}`}>{r.response_status_label}</span>
                      {r.auto_closed_dt && <span className="ml-1.5 text-[10px] text-muted-foreground" title="Closed automatically due to inactivity">auto</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.letter_status_label}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={canEdit ? 'Open' : 'View'}
                          aria-label="Open offer letter"
                          onClick={(e) => {
                            e.stopPropagation()
                            openRecord()
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <RowOpenIcon canEdit={canEdit} className="h-3.5 w-3.5" />
                        </button>
                        {canDelete && r.workflow !== 'approved' && r.workflow !== 'pending' && r.workflow !== 'rejected' && (
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Delete offer letter"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(r)
                            }}
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
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No offer letters match the current filters.</div>}
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
          <div className="text-xs text-muted-foreground">{count ? `Showing ${start}–${end} of ${count.toLocaleString()}` : ''}</div>
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

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete the offer letter of {deleteTarget?.applicant_name}?</DialogTitle>
            <DialogDescription>Only a draft or a letter sent back can be deleted. This can't be undone from this page.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
