import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconSearch, IconChevronDown } from '@/components/icons'
import { AlertTriangle, Mail } from 'lucide-react'

// Rig Personnel > New Joinee Workflow > Print Offer Letter: the approved offer letters. A row opens the letter's details and the button to view it as a PDF.

const MENU_KEY = 'hr.fs_offer_letter_print'
const BASE = '/api/hr/fs-offer-letter-print/'
const FORM = '/rig-personnel/print-offer-letters'

const MAIL_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'not_sent', label: 'Not sent' },
  { value: 'sent', label: 'Sent' },
]
const MAIL_STYLE = {
  Sent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  Resent: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  'Not sent': 'bg-muted text-muted-foreground',
}
const RESPONSE_STYLE = {
  A: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  D: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  C: 'bg-muted text-muted-foreground',
}
const EMPTY_FILTERS = { template: '', response: '', mail: '', rig: '', year: '' }
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

export default function PrintOfferLettersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const ret = useListReturn('hr.fs-offer-letter-print')

  const [filters, setFilters] = usePersistedState('hr.printofferletters.filters', EMPTY_FILTERS)
  const [search, setSearch] = usePersistedState('hr.printofferletters.search', '')
  const [ordering, setOrdering] = usePersistedState('hr.printofferletters.ordering', 'recent')
  const [page, setPage] = useState(ret.restoredPage ?? 1)
  const [pageSize, setPageSize] = usePersistedState('hr.printofferletters.pageSize', 50)

  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)
  const [meta, setMeta] = useState({ years: [], templates: [], responses: [] })
  const [rigs, setRigs] = useState([])
  const [selected, setSelected] = useState({}) // applicant id -> what the mail dialog shows; kept across pages and filters until cleared
  const [mailOpen, setMailOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [mailResult, setMailResult] = useState(null)

  useEffect(() => {
    Promise.all([apiFetch(`${BASE}meta/`).then((r) => r.json()), cachedGet('/api/masters/rigs/?active=Y&page_size=200&fields=rig_id,rig_name')])
      .then(([m, r]) => {
        setMeta({ years: m.years || [], templates: m.templates || [], responses: m.responses || [] })
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

  const pick = (r) => ({ id: r.fs_new_appl, name: r.applicant_name, email: r.applicant_email, problems: r.mail_problems || [] })
  const selectedList = Object.values(selected)
  const readyList = selectedList.filter((x) => x.problems.length === 0)
  const pageAllSelected = rows.length > 0 && rows.every((r) => selected[r.fs_new_appl])

  function toggleRow(r) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[r.fs_new_appl]) delete next[r.fs_new_appl]
      else next[r.fs_new_appl] = pick(r)
      return next
    })
  }

  function togglePage() {
    setSelected((prev) => {
      const next = { ...prev }
      if (pageAllSelected) rows.forEach((r) => delete next[r.fs_new_appl])
      else rows.forEach((r) => (next[r.fs_new_appl] = pick(r)))
      return next
    })
  }

  // Each selected applicant gets his own mail with his own letter. Mail is not configured yet: the server still checks every letter and says which would go.
  async function sendBulk() {
    setSending(true)
    try {
      const res = await apiFetch(`${BASE}send-mail-bulk/`, { method: 'POST', body: JSON.stringify({ ids: selectedList.map((x) => x.id) }) })
      const data = await res.json().catch(() => ({}))
      setMailResult(data)
      if (!res.ok) toast.error(data.error || "Couldn't send the mails")
      else toast.success(`${data.sent} offer letter${data.sent === 1 ? '' : 's'} sent`)
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = count ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, count)

  usePageSubtitle(`${count.toLocaleString()} approved offer letters`)

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
                placeholder="Applicant, rig, designation…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-9 pl-8"
              />
            </div>
          </label>
          <SelectField label="Letter type" value={filters.template} onChange={(v) => setFilter('template', v)} options={[...all, ...meta.templates]} width="w-[140px]" />
          <SelectField label="Response" value={filters.response} onChange={(v) => setFilter('response', v)} options={[...all, ...meta.responses]} width="w-[120px]" />
          <SelectField label="Mail" value={filters.mail} onChange={(v) => setFilter('mail', v)} options={MAIL_OPTIONS} width="w-[110px]" />
          <SelectField label="Rig" value={filters.rig} onChange={(v) => setFilter('rig', v)} options={rigOptions} width="w-[140px]" />
          <SelectField label="Year" value={filters.year} onChange={(v) => setFilter('year', v)} options={yearOptions} width="w-[100px]" />
        </div>
      </div>

      {selectedList.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#1a3f7a]/30 bg-[#1a3f7a]/5 px-4 py-3 text-sm dark:border-sky-300/30 dark:bg-sky-300/5">
          <span className="font-semibold">{selectedList.length} selected</span>
          <span className="text-muted-foreground">
            {readyList.length} ready to mail{selectedList.length - readyList.length ? `, ${selectedList.length - readyList.length} cannot be mailed` : ''}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setMailResult(null)
                setMailOpen(true)
              }}
            >
              <Mail className="h-4 w-4" /> Send mail to selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected({})}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-9 px-3 py-2.5">
                  <input type="checkbox" aria-label="Select all letters on this page" checked={pageAllSelected} onChange={togglePage} className="h-4 w-4 accent-[#1a3f7a]" />
                </th>
                <SortHeader col={SORT_COLUMNS[0]} ordering={ordering} onClick={() => toggleSort('name')} />
                <th className={TH}>Designation</th>
                <th className={TH}>Rig</th>
                <SortHeader col={SORT_COLUMNS[1]} ordering={ordering} onClick={() => toggleSort('dt')} />
                <SortHeader col={SORT_COLUMNS[2]} ordering={ordering} onClick={() => toggleSort('doj')} />
                <th className={TH}>Letter type</th>
                <th className={`${TH} text-right`}>Total Salary</th>
                <th className={TH}>Response</th>
                <th className={TH}>Mail</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const zebra = idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                const openRecord = () => ret.open(navigate, `${FORM}/${r.fs_new_appl}`, page)
                return (
                  <tr key={r.fs_new_appl} className={`${zebra} cursor-pointer border-b border-border/60 hover:bg-accent`} onClick={openRecord}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${r.applicant_name}`} checked={Boolean(selected[r.fs_new_appl])} onChange={() => toggleRow(r)} className="h-4 w-4 accent-[#1a3f7a]" />
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {r.applicant_name}
                        {!r.can_print && (
                          <span title={r.print_problems.join(' ')} className="text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{r.rank_name || '—'}</td>
                    <td className="px-3 py-2.5">{r.rig_name || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{dmy(r.fs_offer_letter_dt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{dmy(r.fs_offer_letter_doj)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.template_label}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{Number(r.salary_amt).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${RESPONSE_STYLE[r.response_status] || 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'}`}>{r.response_status_label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${MAIL_STYLE[r.mail_status] || 'bg-muted'}`}>{r.mail_status}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        title="Open"
                        aria-label="Open offer letter"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRecord()
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <RowOpenIcon canEdit={false} className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No approved offer letters match the current filters.</div>}
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

      <Dialog open={mailOpen} onOpenChange={(o) => !o && setMailOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send mail to {selectedList.length} applicant{selectedList.length === 1 ? '' : 's'}</DialogTitle>
            <DialogDescription>Each applicant gets his own mail with his own offer letter attached. Letters that cannot be mailed are skipped.</DialogDescription>
          </DialogHeader>
          {mailResult?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{mailResult.error} Nothing was sent.</p>}
          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            {selectedList.map((x) => {
              const result = mailResult?.results?.find((r) => r.id === x.id)
              const blocked = x.problems.length > 0
              return (
                <div key={x.id} className="flex items-start justify-between gap-3 border-b border-border/60 px-3 py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{x.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{x.email || 'no e-mail address'}</p>
                  </div>
                  <p className={`max-w-[55%] text-right text-xs ${blocked ? 'text-destructive' : result?.ok ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {blocked ? x.problems.join(' ') : result ? (result.ok ? 'Sent' : result.message) : 'Ready'}
                  </p>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMailOpen(false)}>
              Close
            </Button>
            <Button disabled={sending || readyList.length === 0 || Boolean(mailResult?.sent)} onClick={sendBulk}>
              <Mail className="h-4 w-4" /> {sending ? 'Sending…' : `Send ${readyList.length} mail${readyList.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
