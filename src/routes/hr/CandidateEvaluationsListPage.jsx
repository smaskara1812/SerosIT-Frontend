import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { IconSearch, IconChevronDown } from '@/components/icons'

// Rig Personnel > New Joinee Workflow > Candidate Competencies Details: the list of candidates with how far their interview ratings are done.
// A row opens that candidate's ratings sheet (CandidateEvaluationPage).

const MENU_KEY = 'hr.candidate_competencies'
const BASE = '/api/hr/candidate-evaluations/'
const SHEET = '/rig-personnel/candidate-evaluations'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'N', label: 'New' },
  { value: 'S', label: 'Selected' },
  { value: 'O', label: 'On Hold' },
  { value: 'R', label: 'Rejected' },
]
const RATING_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'none', label: 'Not rated yet' },
  { value: 'partly', label: 'Partly rated' },
  { value: 'full', label: 'Fully rated' },
]
const STATUS_STYLE = {
  N: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  S: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  O: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  R: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
}
const EMPTY_FILTERS = { hiring_status: '', ratings: '', rig: '', rank: '', year: '' }
const SORT_COLUMNS = [
  { key: 'name', label: 'Candidate' },
  { key: 'interview_dt', label: 'Interview Date' },
]

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
    <th
      onClick={onClick}
      className={`cursor-pointer px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap uppercase select-none ${active ? 'text-[#1a3f7a] dark:text-sky-300' : 'text-muted-foreground'}`}
    >
      <span className="inline-flex items-center gap-1">
        {col.label}
        <IconChevronDown className={`h-3 w-3 transition-transform ${active ? 'opacity-100' : 'opacity-30'} ${active && !desc ? 'rotate-180' : ''}`} />
      </span>
    </th>
  )
}

export default function CandidateEvaluationsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const ret = useListReturn('hr.candidate-evaluations')
  const canSave = can(user, MENU_KEY, 'add') || can(user, MENU_KEY, 'edit')

  const [filters, setFilters] = usePersistedState('hr.evaluations.filters', EMPTY_FILTERS)
  const [search, setSearch] = usePersistedState('hr.evaluations.search', '')
  const [ordering, setOrdering] = usePersistedState('hr.evaluations.ordering', '-interview_dt')
  const [page, setPage] = useState(ret.restoredPage ?? 1)
  const [pageSize, setPageSize] = usePersistedState('hr.evaluations.pageSize', 50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)
  const [meta, setMeta] = useState({ years: [], rigs: [], ranks: [] })

  useEffect(() => {
    Promise.all([
      apiFetch(`${BASE}meta/`).then((r) => r.json()),
      cachedGet('/api/masters/rigs/?active=Y&page_size=200&fields=rig_id,rig_name'),
      cachedGet('/api/masters/ranks/?business_system_id_6=Y&page_size=500&fields=rank_id,rank_name'),
    ])
      .then(([m, rigs, ranks]) => setMeta({ years: m.years || [], rigs: asList(rigs), ranks: asList(ranks) }))
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

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  usePageSubtitle(`${count.toLocaleString()} candidates`)

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const rigOptions = [{ value: '', label: 'All' }, ...meta.rigs.map((r) => ({ value: String(r.rig_id), label: r.rig_name }))]
  const rankOptions = [{ value: '', label: 'All' }, ...meta.ranks.map((r) => ({ value: String(r.rank_id), label: r.rank_name }))]
  const yearOptions = [{ value: '', label: 'All' }, ...meta.years.map((y) => ({ value: String(y), label: String(y) }))]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name, email, mobile…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-9 pl-8"
              />
            </div>
          </label>
          <SelectField label="Ratings" value={filters.ratings} onChange={(v) => setFilter('ratings', v)} options={RATING_OPTIONS} width="w-[140px]" />
          <SelectField label="Hiring Status" value={filters.hiring_status} onChange={(v) => setFilter('hiring_status', v)} options={STATUS_OPTIONS} width="w-[120px]" />
          <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilter('rig', v)} options={rigOptions} width="w-[150px]" />
          <SelectField label="Rank" value={filters.rank} onChange={(v) => setFilter('rank', v)} options={rankOptions} width="w-[170px]" />
          <SelectField label="Interview Year" value={filters.year} onChange={(v) => setFilter('year', v)} options={yearOptions} width="w-[100px]" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">#</th>
                <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('name')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Rank</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Rig</th>
                <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('interview_dt')} />
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Rated by</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Score</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                const open = () => ret.open(navigate, `${SHEET}/${r.candidate_interview_hdr_id}`, page)
                return (
                  <tr key={r.candidate_interview_hdr_id} className={`${zebra} cursor-pointer border-b border-border/60 hover:bg-accent`} onClick={open}>
                    <td className="truncate px-3 py-2.5 text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="max-w-[280px] truncate px-3 py-2.5 font-medium" title={r.full_name}>
                      {r.full_name}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5" title={r.rank_name}>
                      {r.rank_name || '—'}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5" title={r.rig_name}>
                      {r.rig_name || '—'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{r.interview_dt || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap gap-1.5">
                        {r.panels.map((p) => (
                          <span
                            key={p.dept}
                            title={p.rated ? `${p.title} has rated` : `${p.title} has not rated yet`}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              p.rated ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {p.title}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap tabular-nums">{r.score == null ? '—' : `${r.score}/${r.max}`}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[r.hiring_status] || 'bg-muted text-muted-foreground'}`}>
                        {r.hiring_status_label}
                      </span>
                    </td>
                    <td className="w-12 px-2 py-2.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          title={canSave ? 'Rate / view' : 'View'}
                          aria-label={canSave ? 'Open the ratings' : 'View the ratings'}
                          onClick={(e) => {
                            e.stopPropagation()
                            open()
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <RowOpenIcon canEdit={canSave} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No candidates match the current filters.</div>}
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
    </div>
  )
}
