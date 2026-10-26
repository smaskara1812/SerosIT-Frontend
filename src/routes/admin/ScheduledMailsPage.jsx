import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, FastForward, Pause, Play, RefreshCw, RotateCw, SkipForward, Undo2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { can } from '@/lib/permissions'
import { STATUS_STYLE, agoText, fmtDay, fmtTime, fmtWhen, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AccessDenied from '@/components/AccessDenied'

const MENU_KEY = 'admin.scheduled_mails'
const TABS = [
  ['upcoming', 'Upcoming', 'The next 7 days'],
  ['today', 'Today', 'Everything for today'],
  ['earlier', 'Earlier', 'Before today'],
]

function StatusPill({ row }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.status] || ''}`}>
      {row.status_label}
      {row.status === 'failed' && row.retry_pending && <span className="font-normal opacity-80">· will retry</span>}
    </span>
  )
}

// Whether the hourly scheduler is alive. It runs at the top of every hour, so a long silence means the service has stopped.
function HealthBanner({ health, mayRun, onRun, running }) {
  const stale = health.state === 'stale'
  const never = health.state === 'never'
  const tone = stale || !health.ok ? 'border-amber-500/40 bg-amber-500/10' : never ? 'border-border bg-muted/40' : 'border-emerald-500/30 bg-emerald-500/8'
  const Icon = stale || !health.ok ? AlertTriangle : never ? CalendarClock : CheckCircle2
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${tone}`}>
      <Icon className={`h-5 w-5 shrink-0 ${stale || !health.ok ? 'text-amber-600' : never ? 'text-muted-foreground' : 'text-emerald-600'}`} />
      <div className="min-w-0 flex-1 text-sm">
        {never && <p className="font-medium">The scheduler has not run yet.</p>}
        {health.state === 'running' && <p className="font-medium">The scheduler is running. Last run {agoText(health.minutes_ago)} ({fmtWhen(health.last_run)}).</p>}
        {stale && <p className="font-medium">The scheduler has not run for {agoText(health.minutes_ago).replace(' ago', '')}. It should run at the top of every hour.</p>}
        <p className="text-xs text-muted-foreground">
          {stale || never ? 'Check that the scheduler service is installed and running on the server. You can also run it now by hand.' : health.ok ? 'It looks after every automatic mail, once an hour on the hour.' : `The last run had a problem: ${health.message}`}
        </p>
      </div>
      {mayRun && (
        <Button type="button" variant="outline" size="sm" onClick={onRun} disabled={running}>
          <RefreshCw className={running ? 'animate-spin' : ''} /> {running ? 'Running…' : 'Run it now'}
        </Button>
      )}
    </div>
  )
}

function JobCard({ job, mayEdit, onSwitch }) {
  return (
    <div className="flex min-w-[16rem] max-w-md flex-1 flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{job.name}</p>
          <p className="text-xs text-muted-foreground">{job.schedule}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${job.enabled ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>{job.enabled ? 'On' : 'Paused'}</span>
      </div>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Last run</dt>
        <dd>{job.last_run_at ? fmtWhen(job.last_run_at) : 'never'}</dd>
        <dt className="text-muted-foreground">Next check</dt>
        <dd>{fmtTime(job.next_run)} today</dd>
        <dt className="text-muted-foreground">Sent today</dt>
        <dd>{job.sent_today}</dd>
        <dt className="text-muted-foreground">Failed</dt>
        <dd className={job.failed ? 'font-semibold text-red-600' : ''}>{job.failed}</dd>
      </dl>
      {job.last_run_note && <p className="truncate text-xs text-muted-foreground" title={job.last_run_note}>{job.last_run_note}</p>}
      {mayEdit && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onSwitch(job)}>
          {job.enabled ? <><Pause /> Pause</> : <><Play /> Resume</>}
        </Button>
      )}
    </div>
  )
}

function EmailDialog({ item, onClose, isAdmin }) {
  const [mail, setMail] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!item) return undefined
    let live = true
    apiFetch(`/api/admin/scheduled-mails/${item.id}/email/`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!live) return
        if (r.ok) setMail(data)
        else setError(data.detail || 'The email could not be loaded.')
      })
      .catch(() => live && setError('The email could not be loaded.'))
    return () => {
      live = false
    }
  }, [item])
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mail?.subject || item?.label}</DialogTitle>
          <DialogDescription>The email as it was sent (the picture is shown smaller here).</DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!mail && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        {mail && (
          <div className="flex flex-col gap-3 text-sm">
            <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Sent</dt>
              <dd>{fmtWhen(mail.sent_at)} · {mail.success ? 'delivered to the mail server' : 'FAILED'}{mail.used_fallback ? ' · by the default account' : ''}</dd>
              <dt className="text-muted-foreground">To</dt>
              <dd className="break-words">{mail.recipients}</dd>
              {mail.error && (<><dt className="text-muted-foreground">Error</dt><dd className="break-words text-red-600">{mail.error}</dd></>)}
            </dl>
            <iframe title="The email" srcDoc={mail.body} sandbox="" className="h-96 w-full rounded-lg border border-border bg-white" />
          </div>
        )}
        <DialogFooter>
          {isAdmin && mail && <Link to={`/admin/email-log?id=${mail.id}`} className="mr-auto text-sm text-primary hover:underline">Open in the Email Log</Link>}
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ScheduledMailsPage() {
  const { user } = useAuth()
  const mayView = can(user, MENU_KEY, 'view')
  const mayEdit = can(user, MENU_KEY, 'edit')
  const [section, setSection] = useState('upcoming')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [running, setRunning] = useState(false)
  const [email, setEmail] = useState(null)
  const [confirm, setConfirm] = useState(null) // { item, kind }

  const load = useCallback(async () => {
    const p = new URLSearchParams({ section, page: String(page), page_size: '40' })
    if (status) p.set('status', status)
    if (q.trim()) p.set('q', q.trim())
    try {
      const res = await apiFetch(`/api/admin/scheduled-mails/?${p}`)
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Could not load the scheduled mails.')
      setData(await res.json())
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [section, status, q, page])

  useEffect(() => {
    if (!mayView) return undefined
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [mayView, load, q])
  useEffect(() => {
    if (!mayView) return undefined
    const t = setInterval(load, 60000) // keep the page fresh while it is open
    return () => clearInterval(t)
  }, [mayView, load])

  if (!mayView) return <AccessDenied />

  async function act(item, kind) {
    setBusy(`${item.id}:${kind}`)
    try {
      const res = await apiFetch(`/api/admin/scheduled-mails/${item.id}/${kind}/`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) toast.success(body.detail || 'Done.')
      else toast.error(body.detail || 'That could not be done.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setBusy(null)
      setConfirm(null)
      load()
    }
  }

  async function switchJob(job) {
    const res = await apiFetch(`/api/admin/scheduled-mails/jobs/${job.key}/${job.enabled ? 'pause' : 'resume'}/`, { method: 'POST' })
    if (res.ok) toast.success(job.enabled ? `${job.name} is paused. Nothing will be planned or sent.` : `${job.name} is on again.`)
    else toast.error((await res.json().catch(() => null))?.detail || 'That could not be changed.')
    load()
  }

  async function runNow() {
    setRunning(true)
    try {
      const res = await apiFetch('/api/admin/scheduled-mails/run-now/', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) toast.success('The scheduler ran. ' + Object.values(body.jobs || {}).map((j) => (j.paused ? 'Paused.' : `Planned ${j.planned || 0}, sent ${j.sent || 0}, failed ${j.failed || 0}.`)).join(' '))
      else toast.error(body.errors?.[0] || body.detail || 'It could not run.')
    } finally {
      setRunning(false)
      load()
    }
  }

  const rows = data?.results || []
  const pages = data ? Math.max(1, Math.ceil(data.count / data.page_size)) : 1
  const ask = (item, kind) => setConfirm({ item, kind })
  const CONFIRM = {
    'send-now': ['Send this mail now?', 'It goes out straight away to the people on the alert, without waiting for its time.'],
    resend: ['Send this mail again?', 'A second copy goes out to the same people. The first one stays in the log.'],
    skip: ['Skip this mail?', 'It will not be sent. You can undo this until its day has passed.'],
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Scheduled Mails</h1>
        <p className="text-sm text-muted-foreground">Every automatic mail the system sends: what is coming, what went today and what went before. Each one is also in the Email Log.</p>
      </div>

      {data && <HealthBanner health={data.health} mayRun={mayEdit} onRun={runNow} running={running} />}
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {data && (
        <div className="flex flex-wrap gap-3">
          {data.jobs.map((j) => <JobCard key={j.key} job={j} mayEdit={mayEdit} onSwitch={switchJob} />)}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="flex gap-1" role="tablist" aria-label="Which mails">
            {TABS.map(([key, label, hint]) => (
              <button key={key} type="button" role="tab" aria-selected={section === key} title={hint} onClick={() => { setSection(key); setPage(1) }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                {label}
                {data && <span className={`ml-1.5 text-xs ${section === key ? 'opacity-80' : 'text-muted-foreground'}`}>{data.counts[key]}</span>}
              </button>
            ))}
          </div>
          <Input placeholder="Search name or error…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="ml-auto h-9 w-56" aria-label="Search" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
            <option value="">All statuses</option>
            {(data?.statuses || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Automation</th>
                <th className="px-4 py-2.5 font-medium">Mail</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!data && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {data && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {section === 'upcoming' ? 'Nothing is planned for the next 7 days.' : section === 'today' ? 'Nothing is scheduled for today.' : 'Nothing found.'}
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-border/60 last:border-b-0 ${r.status === 'skipped' || r.status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <p className="font-medium">{fmtDay(r.send_date)}</p>
                    <p className="text-xs text-muted-foreground">{fmtTime(r.due_at)} · {inDays(r.send_date)}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.job_name}</td>
                  <td className="px-4 py-2.5 font-medium">{r.label}</td>
                  <td className="whitespace-nowrap px-4 py-2.5"><StatusPill row={r} /></td>
                  <td className="max-w-[22rem] px-4 py-2.5 text-xs text-muted-foreground">
                    {r.status === 'sent' && <p>Sent {fmtTime(r.sent_at)}{r.smtp_used === 'default' ? ' · default account' : ''}{r.resend_count ? ` · resent ${r.resend_count}×` : ''}</p>}
                    {r.attempts > 0 && r.status !== 'sent' && <p>Tried {r.attempts} of {r.max_attempts} times</p>}
                    {r.last_error && <p className="line-clamp-2 text-red-600" title={r.last_error}>{r.last_error}</p>}
                    {r.status === 'skipped' && <p>Skipped{r.skipped_by ? ` by ${r.skipped_by}` : ''}</p>}
                    {r.note && !['sent', 'skipped'].includes(r.status) && <p>{r.note}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      {r.email_log_id && <Button type="button" variant="ghost" size="icon-sm" title="View the email" aria-label="View the email" onClick={() => setEmail(r)}><Eye /></Button>}
                      {mayEdit && r.can.send_now && <Button type="button" variant="ghost" size="icon-sm" title="Send now" aria-label="Send now" disabled={!!busy} onClick={() => ask(r, 'send-now')}><FastForward /></Button>}
                      {mayEdit && r.can.resend && <Button type="button" variant="ghost" size="icon-sm" title="Send again" aria-label="Send again" disabled={!!busy} onClick={() => ask(r, 'resend')}><RotateCw /></Button>}
                      {mayEdit && r.can.skip && <Button type="button" variant="ghost" size="icon-sm" title="Skip this mail" aria-label="Skip this mail" disabled={!!busy} onClick={() => ask(r, 'skip')}><SkipForward /></Button>}
                      {mayEdit && r.can.unskip && <Button type="button" variant="ghost" size="icon-sm" title="Undo the skip" aria-label="Undo the skip" disabled={!!busy} onClick={() => act(r, 'unskip')}><Undo2 /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>{data.count} mails</span>
            <div className="flex items-center gap-2">
              <Button type="button" size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>Page {page} of {pages}</span>
              <Button type="button" size="xs" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <EmailDialog item={email} onClose={() => setEmail(null)} isAdmin={!!user?.is_app_admin} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm && CONFIRM[confirm.kind][0]}</DialogTitle>
            <DialogDescription>{confirm && <><b>{confirm.item.label}</b>, {fmtDay(confirm.item.send_date)}. {CONFIRM[confirm.kind][1]}</>}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button type="button" onClick={() => act(confirm.item, confirm.kind)} disabled={!!busy}>{busy ? 'Working…' : 'Yes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
