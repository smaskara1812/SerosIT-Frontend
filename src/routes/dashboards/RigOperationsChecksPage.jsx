import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import { useUrlString } from './dashboardUrlState'

const MENU_KEY = 'dashboards.rig_operations'
const PAGE_SIZE = 25
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const n2 = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const dmy = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}-${MON[Number(m) - 1]}-${y}`
}
const reportUrl = (dtlId) => `/drilling/drilling-report/${dtlId}/edit`

// The Things to check list of the Rig Operations dashboard, on its own page. It is loaded a page at a time from the server (25 rows), the next page as the end of the
// list scrolls into view (or with the button), so a long list never loads all at once. The rigs come from the address (?rigs=1,2), as the dashboard sends them.
export default function RigOperationsChecksPage() {
  const { user } = useAuth()
  const canView = can(user, MENU_KEY, 'view')
  const canReport = can(user, 'drilling.drilling_report', 'view')
  const [rigs] = useUrlString('rigs')
  const [kind, setKind] = useUrlString('kind')
  const [rows, setRows] = useState([])
  const [kinds, setKinds] = useState([])
  const [total, setTotal] = useState(0)
  const [allCount, setAllCount] = useState(null) // the count with no kind chosen, kept while a kind is chosen
  const [next, setNext] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const sentinel = useRef(null)
  const busy = useRef(false)
  const gen = useRef(0)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (rigs) p.set('rigs', rigs)
    if (kind) p.set('kind', kind)
    p.set('page_size', String(PAGE_SIZE))
    return p
  }, [rigs, kind])

  const loadPage = useCallback(
    (page, myGen) => {
      busy.current = true
      setLoading(true)
      const p = new URLSearchParams(query)
      p.set('page', String(page))
      apiFetch(`/api/dashboards/rig-operations/things-to-check/?${p}`)
        .then((r) => {
          if (!r.ok) throw new Error('Failed to load')
          return r.json()
        })
        .then((d) => {
          if (gen.current !== myGen) return
          setError('')
          setRows((prev) => (page === 1 ? d.results : [...prev, ...d.results]))
          setKinds(d.kinds)
          setTotal(d.count)
          if (!query.get('kind')) setAllCount(d.count)
          setNext(d.next)
        })
        .catch(() => {
          if (gen.current === myGen) setError('The list could not be loaded.')
        })
        .finally(() => {
          if (gen.current === myGen) {
            busy.current = false
            setLoading(false)
          }
        })
    },
    [query]
  )

  // A new filter starts the list again from the first page.
  useEffect(() => {
    if (!canView) return undefined
    gen.current += 1
    const myGen = gen.current
    const t = setTimeout(() => loadPage(1, myGen), 0)
    return () => clearTimeout(t)
  }, [canView, loadPage])

  useEffect(() => {
    const el = sentinel.current
    if (!el || !next) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && next && !busy.current) loadPage(next, gen.current)
      },
      { rootMargin: '240px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [next, loadPage, rows.length])

  usePageSubtitle(total ? `${total} to check` : null)
  if (!canView) return <AccessDenied />

  const back = `/dashboards/rig-operations${rigs ? `?rigs=${rigs}` : ''}`
  const chip = (key, label, n) => (
    <button
      key={key || 'all'}
      type="button"
      onClick={() => {
        setRows([])
        setLoading(true)
        setKind(key)
      }}
      aria-pressed={(kind || '') === key}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${(kind || '') === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
    >
      {label} <span className="tabular-nums opacity-80">{n}</span>
    </button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <TriangleAlert className="h-5 w-5 text-destructive" />
          <div>
            <h1 className="text-base font-semibold text-foreground">Things to check</h1>
            <p className="text-xs text-muted-foreground">
              Rig Operations, the latest 2 years of the {rigs ? 'chosen rigs' : 'rigs you can see'}. Days with no operation lines, hours that do not add up to 24, a summary that differs from the operations, or a Drill actual row with its depths reversed.
            </p>
          </div>
        </div>
        <Link to={back} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> Back to Rig Operations
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3" role="group" aria-label="Kind of thing to check">
          {chip('', 'All', allCount ?? '')}
          {kinds.map((k) => chip(k.key, k.label, k.count))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/70 text-left text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                <th className="px-3 py-2.5">Rig</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right">Operations (h)</th>
                <th className="px-3 py-2.5 text-right">Summary (h)</th>
                <th className="px-3 py-2.5">What to check</th>
                <th className="px-3 py-2.5">Record</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">Nothing needs checking{kind ? ' of this kind' : ''}.</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-destructive">{error}</td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={`${r.dtl_id}`} className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="px-3 py-2.5 font-medium break-words text-foreground">{r.rig}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{dmy(r.date)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{n2(r.ops_hours)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{n2(r.summary_hours)}</td>
                  <td className="px-3 py-2.5 break-words text-destructive">
                    {r.problems.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                    {canReport ? (
                      <Link to={reportUrl(r.dtl_id)} className="font-semibold text-primary hover:underline">
                        Open report →
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div ref={sentinel} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-muted-foreground">
          {loading ? <RigLoading more /> : <span>Showing {rows.length} of {total}. The first and last report days of a rig are often part-days, so they can be flagged legitimately.</span>}
          {next && !loading && (
            <button type="button" onClick={() => loadPage(next, gen.current)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
              Show {PAGE_SIZE} more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
