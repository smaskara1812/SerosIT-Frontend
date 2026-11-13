import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ArrowLeft, Eye, Copy, Send, RefreshCw, CalendarPlus, Ban, ExternalLink } from 'lucide-react'

const MENU_KEY = 'hr.candidate_interviews'
const BASE = '/api/hr/candidate-invites/'
const LIST = '/rig-personnel/candidate-interviews'

const STATUS = {
  sent: ['Sent', 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'],
  opened: ['Opened', 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'],
  verified: ['Code checked', 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'],
  draft: ['Filling in', 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'],
  submitted: ['Submitted', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'],
  expired: ['Expired', 'bg-muted text-muted-foreground'],
  cancelled: ['Cancelled', 'bg-muted text-muted-foreground'],
  locked: ['Locked', 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'],
}
const FILTERS = [
  { value: '', label: 'All' },
  { value: 'waiting', label: 'Still open' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]
const DAY_OPTIONS = [3, 7, 14, 30]

function when(s) {
  return s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function errorText(data) {
  if (!data || typeof data !== 'object') return "Couldn't save."
  return Object.values(data).map((v) => (Array.isArray(v) ? v.join(' ') : String(v))).join(' ')
}

export default function CandidateInvitesPage() {
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [tick, setTick] = useState(0)
  const [form, setForm] = useState({ candidate_name: '', email_id: '', expires_days: 7 })
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)
  const [shown, setShown] = useState(null) // { name, link, mail_sent } — the link is shown once
  const [confirm, setConfirm] = useState(null) // { kind: 'resend' | 'cancel', row }
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page_size: '100' })
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      apiFetch(`${BASE}?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return
          setRows(d.results || [])
          setCount(d.count || 0)
        })
        .finally(() => alive && setLoading(false))
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [status, search, tick])

  usePageSubtitle(`${count} invites`)

  async function create(e) {
    e.preventDefault()
    setCreating(true)
    setFormError('')
    const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(form) })
    const data = await res.json().catch(() => ({}))
    setCreating(false)
    if (!res.ok) return setFormError(errorText(data))
    setShown({ name: data.candidate_name, link: data.link, mail_sent: data.mail_sent })
    setForm({ candidate_name: '', email_id: '', expires_days: 7 })
    reload()
  }

  async function act(row, kind, body) {
    setBusy(true)
    const res = await apiFetch(`${BASE}${row.candidate_invite_id}/${kind}/`, { method: 'POST', body: JSON.stringify(body || {}) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setConfirm(null)
    if (!res.ok) return toast.error(data.error || errorText(data))
    if (kind === 'resend') setShown({ name: row.candidate_name, link: data.link, mail_sent: data.mail_sent })
    else toast.success(kind === 'cancel' ? 'Invite cancelled' : 'Invite extended')
    reload()
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Link copied')
    } catch {
      toast.error("Couldn't copy. Select the link and copy it.")
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={LIST} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Candidate Interview Details
        </Link>
        {/* Opens the blank form in a new tab: nothing is checked, saved or sent. */}
        <Button size="sm" variant="outline" nativeButton={false} render={<a href="/join/preview" target="_blank" rel="noopener" />}>
          <Eye className="h-3.5 w-3.5" /> Preview the form
        </Button>
      </div>

      {canAdd && (
        <form onSubmit={create} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Request details from an applicant</h2>
          <p className="text-xs text-muted-foreground">
            The applicant gets a link by email to fill in their details. To open it they must enter a code sent to that same address. The link works for one person, once.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Candidate name</span>
              <Input value={form.candidate_name} maxLength={60} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} className="h-9" />
            </label>
            <label className="flex min-w-[240px] flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Email address</span>
              <Input type="email" value={form.email_id} maxLength={40} onChange={(e) => setForm({ ...form, email_id: e.target.value })} className="h-9" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Link works for</span>
              <select
                value={form.expires_days}
                onChange={(e) => setForm({ ...form, expires_days: Number(e.target.value) })}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring"
              >
                {DAY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="lg" disabled={creating}>
              <Send className="h-4 w-4" /> {creating ? 'Sending…' : 'Send request'}
            </Button>
          </div>
          {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        </form>
      )}

      {shown && (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
            {shown.mail_sent ? `The link was emailed to ${shown.name}.` : `The email could not be sent to ${shown.name}. Send them this link yourself.`}
          </p>
          <p className="text-xs text-muted-foreground">This link is shown only now. If it is lost, use Resend to make a new one.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 rounded-lg bg-background px-3 py-2 text-xs break-all">{shown.link}</code>
            <Button size="sm" variant="outline" onClick={() => copy(shown.link)}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShown(null)}>
              Hide
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Search</span>
          <Input placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Show</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Candidate', 'Status', 'Progress', 'Invited', 'Expires', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const [label, cls] = STATUS[r.status] || [r.status, 'bg-muted']
                const open = !['submitted', 'cancelled'].includes(r.status)
                return (
                  <tr key={r.candidate_invite_id} className={`border-b border-border/60 ${i % 2 ? 'bg-muted/30' : ''}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.candidate_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email_id}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{r.progress != null ? `${r.progress}%` : r.status === 'submitted' ? 'Done' : '—'}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                      {when(r.cr_dt)}
                      {r.resend_count > 0 && <div>Resent {r.resend_count}×</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{r.submitted_dt ? `Sent ${when(r.submitted_dt)}` : when(r.expires_dt)}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.status === 'submitted' && r.hdr && (
                          <Button size="sm" variant="outline" nativeButton={false} render={<Link to={`${LIST}/${r.hdr}/edit`} />}>
                            <ExternalLink className="h-3.5 w-3.5" /> Open candidate
                          </Button>
                        )}
                        {canEdit && open && (
                          <>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ kind: 'resend', row: r })}>
                              <RefreshCw className="h-3.5 w-3.5" /> Resend
                            </Button>
                            {r.status !== 'expired' && (
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(r, 'extend', { days: 7 })}>
                                <CalendarPlus className="h-3.5 w-3.5" /> +7 days
                              </Button>
                            )}
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ kind: 'cancel', row: r })}>
                              <Ban className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          </>
                        )}
                        {canEdit && r.status === 'expired' && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(r, 'extend', { days: 7 })}>
                            <CalendarPlus className="h-3.5 w-3.5" /> Reopen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="py-14 text-center text-sm text-muted-foreground">No invites yet.</div>}
        </div>
      </div>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.kind === 'cancel' ? `Cancel the invite for ${confirm?.row.candidate_name}?` : `Send ${confirm?.row.candidate_name} a new link?`}</DialogTitle>
            <DialogDescription>
              {confirm?.kind === 'cancel'
                ? 'The link stops working and anything they have typed so far is deleted.'
                : 'A new link is emailed and the old one stops working. What they have already typed is kept. The 7 days start again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Back
            </Button>
            <Button variant={confirm?.kind === 'cancel' ? 'destructive' : 'default'} disabled={busy} onClick={() => act(confirm.row, confirm.kind)}>
              {confirm?.kind === 'cancel' ? 'Cancel the invite' : 'Send new link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
