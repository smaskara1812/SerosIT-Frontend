import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, FastForward, RefreshCw, RotateCw, Search, SkipForward, Undo2, Users, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { can } from '@/lib/permissions'
import { localDateStr } from '@/lib/naiveDateTime'
import { STATUS_STYLE, agoText, fmtDay, fmtTime, fmtWhen, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AccessDenied from '@/components/AccessDenied'
import { RecipientsDialog } from '@/components/admin/RecipientsPreview'

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
        {never && <p className="font-medium">The scheduler service is not running.</p>}
        {health.state === 'running' && <p className="font-medium">The scheduler is running. Last run {agoText(health.minutes_ago)} ({fmtWhen(health.last_run)}).</p>}
        {stale && <p className="font-medium">The scheduler service last ran {agoText(health.minutes_ago)}. It should run at the top of every hour.</p>}
        <p className="text-xs text-muted-foreground">
          {stale || never
            ? 'Nothing goes out by itself until the scheduler service is running on the server (python manage.py run_scheduler, or the Windows service). “Run it now” sends what is due, once.'
            : health.ok ? 'It looks after every automatic mail, once an hour on the hour.' : `The last run had a problem: ${health.message}`}
          {health.manual_at && (stale || never) ? ` The last run was started by hand ${agoText(health.manual_minutes_ago)} (${fmtWhen(health.manual_at)}).` : ''}
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

// The on/off switch of one automation. On = it is planned and sent every hour; Paused = nothing is planned or sent for it (what is already planned stays as it is).
// Someone without the Edit right sees the state as a plain label.
function RunSwitch({ job, editable, busy, onSwitch }) {
  const on = job.enabled
  if (!editable) {
    return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>{on ? 'On' : 'Paused'}</span>
  }
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${job.name}: ${on ? 'on, click to pause' : 'paused, click to turn on'}`} disabled={busy}
      title={on ? 'Pause: nothing will be planned or sent for it' : 'Turn it on again'} onClick={(e) => { e.stopPropagation(); onSwitch(job) }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${on ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}>
      <span className={`relative h-3.5 w-6 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}>
        <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all ${on ? 'left-3' : 'left-0.5'}`} />
      </span>
      {on ? 'On' : 'Paused'}
    </button>
  )
}

// One automation, as a tile: its schedule, what it did today, and its on/off switch. Clicking the tile shows only that automation's mails below.
function JobTile({ job, active, mayEdit, switching, onSwitch, onPick }) {
  return (
    <div role="button" tabIndex={0} aria-pressed={active} onClick={() => onPick(job.key)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(job.key))}
      className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/40'} ${job.enabled ? '' : 'border-amber-500/40 bg-amber-500/5'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-semibold leading-tight">{job.name}</p>
        <RunSwitch job={job} editable={mayEdit} busy={switching} onSwitch={onSwitch} />
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground" title={job.schedule}>{job.schedule}</p>
      <div className="flex items-center gap-3 text-xs">
        <span><b className="text-sm">{job.sent_today}</b> <span className="text-muted-foreground">sent today</span></span>
        <span className={job.failed ? 'font-semibold text-red-600' : 'text-muted-foreground'}><b className="text-sm">{job.failed}</b> failed</span>
      </div>
      <p className="truncate text-[11px] text-muted-foreground" title={job.last_run_note || ''}>Last run {job.last_run_at ? fmtWhen(job.last_run_at) : 'never'}{job.last_run_note ? ` · ${job.last_run_note}` : ''}</p>
      {!job.enabled && <p className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200">Paused: nothing is planned or sent for it.</p>}
    </div>
  )
}

// "Today · Tue 27 Oct", "Tomorrow · Wed 28 Oct", otherwise the date and how far away it is.
function dayHeading(iso) {
  const rel = inDays(iso)
  return rel === 'today' || rel === 'tomorrow' || rel === 'yesterday' ? `${rel[0].toUpperCase()}${rel.slice(1)} · ${fmtDay(iso)}` : `${fmtDay(iso)} · ${rel}`
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

const fmtDate = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')

// Pausing or resuming an automation, after saying what it really does (checked by scripts/check_pause_resume.py).
function SwitchDialog({ job, onClose, onConfirm, busy }) {
  const pausing = job.enabled
  const cycle = job.kind === 'cycle'
  const nextPassed = cycle && !!job.next_mail_dt && job.next_mail_dt.slice(0, 10) <= localDateStr() // the date is today or earlier: it goes at the next run
  const items = []
  if (pausing && !cycle) {
    items.push('Nothing is planned or sent for it while it is paused.')
    items.push('A mail whose day goes by during the pause is not sent when you resume. If it was already planned it shows as Missed on Scheduled Mails (it can still be sent by hand); if it was not planned yet it never appears at all.')
    if (job.planned) items.push(`${job.planned} ${job.planned === 1 ? 'mail is' : 'mails are'} planned right now. They stay as they are; any whose day has passed by the time you resume become Missed.`)
    items.push('On the day you resume, that day’s mail goes out at the next scheduler run (late, if its hour has already passed). Later days carry on as normal.')
  } else if (pausing && cycle) {
    items.push(`The report is not sent while it is paused. Next Mail (${job.next_mail_dt ? fmtDate(job.next_mail_dt) : 'not set'}) keeps its place.`)
    items.push(`If that date passes during the pause, the report is sent once as soon as you resume (one catch-up, not one for every cycle that went by), and Next Mail then moves on by ${job.freq || 'its frequency in'} days.`)
    items.push('If you do not want that catch-up, set a later Next Mail on Report Mails (Change) before you resume.')
  } else if (!cycle) {
    items.push('It will plan the next 7 days and send what is due at the next scheduler run.')
    items.push('Mails for days that went by while it was paused are not sent.' + (job.overdue_planned ? ` ${job.overdue_planned} planned ${job.overdue_planned === 1 ? 'mail is' : 'mails are'} for days that have passed: ${job.overdue_planned === 1 ? 'it' : 'they'} will be marked Missed, and can be sent by hand.` : ''))
    items.push('Today’s mail, if its hour has passed, goes out at the next run.')
  } else if (nextPassed) {
    items.push(`Next Mail (${fmtDate(job.next_mail_dt)}) has already passed, so the report is sent once at the next scheduler run, then Next Mail moves on by ${job.freq} days.`)
    items.push('If you do not want that, set a later Next Mail on Report Mails (Change) first, then resume.')
  } else {
    items.push(`Next Mail is ${job.next_mail_dt ? fmtDate(job.next_mail_dt) : 'not set'}: the report goes out then, as usual.`)
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pausing ? `Pause the ${job.name}?` : `Turn the ${job.name} on again?`}</DialogTitle>
          <DialogDescription>{pausing ? 'Read what happens to its mails first.' : 'What happens when it runs again:'}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" /><span>{t}</span></li>)}
        </ul>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" variant={pausing ? 'destructive' : 'default'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : pausing ? 'Pause it' : 'Turn it on'}</Button>
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
  const [jobFilter, setJobFilter] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [running, setRunning] = useState(false)
  const [email, setEmail] = useState(null)
  const [who, setWho] = useState(null)
  const [confirm, setConfirm] = useState(null) // { item, kind }
  const acting = useRef(false) // a second click before the screen has caught up must not act twice
  const [switching, setSwitching] = useState('') // the automation whose switch is being changed
  const [switchAsk, setSwitchAsk] = useState(null) // the automation the person is about to pause or resume

  const load = useCallback(async () => {
    const p = new URLSearchParams({ section, page: String(page), page_size: '40' })
    if (status) p.set('status', status)
    if (jobFilter) p.set('job', jobFilter)
    if (q.trim()) p.set('q', q.trim())
    try {
      const res = await apiFetch(`/api/admin/scheduled-mails/?${p}`)
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Could not load the scheduled mails.')
      setData(await res.json())
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [section, status, jobFilter, q, page])

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
    if (acting.current) return
    acting.current = true
    setBusy(`${item.id}:${kind}`)
    try {
      const res = await apiFetch(`/api/admin/scheduled-mails/${item.id}/${kind}/`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) toast.success(body.detail || 'Done.')
      else toast.error(body.detail || 'That could not be done.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      acting.current = false
      setBusy(null)
      setConfirm(null)
      load()
    }
  }

  async function switchJob(job) {
    if (switching) return
    setSwitching(job.key)
    try {
      const res = await apiFetch(`/api/admin/scheduled-mails/jobs/${job.key}/${job.enabled ? 'pause' : 'resume'}/`, { method: 'POST' })
      if (res.ok) toast.success(job.enabled ? `${job.name} is paused. Nothing will be planned or sent.` : `${job.name} is on again.`)
      else toast.error((await res.json().catch(() => null))?.detail || 'That could not be changed.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      await load()
      setSwitching('')
      setSwitchAsk(null)
    }
  }

  async function runNow() {
    if (acting.current) return
    acting.current = true
    setRunning(true)
    try {
      const res = await apiFetch('/api/admin/scheduled-mails/run-now/', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) toast.success('The scheduler ran. ' + Object.values(body.jobs || {}).map((j) => (j.paused ? 'Paused.' : `Planned ${j.planned || 0}, sent ${j.sent || 0}, failed ${j.failed || 0}.`)).join(' '))
      else toast.error(body.errors?.[0] || body.detail || 'It could not run.')
    } finally {
      acting.current = false
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

  const pick = (key) => { setJobFilter((cur) => (cur === key ? '' : key)); setPage(1) }
  const picked = (data?.jobs || []).find((j) => j.key === jobFilter)
  const groups = []
  for (const r of rows) {
    const last = groups[groups.length - 1]
    if (last && last.date === r.send_date) last.rows.push(r)
    else groups.push({ date: r.send_date, rows: [r] })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-semibold">Scheduled Mails</h1>
        <p className="text-sm text-muted-foreground">Every automatic mail the system sends: what is coming, what went today and what went before. Each one is also in the Email Log.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {data && <HealthBanner health={data.health} mayRun={mayEdit} onRun={runNow} running={running} />}
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        {data && (
          <section aria-label="Automations">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Automations <span className="font-normal normal-case">· click one to see only its mails</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.jobs.map((j) => <JobTile key={j.key} job={j} active={jobFilter === j.key} mayEdit={mayEdit} switching={!!switching} onSwitch={setSwitchAsk} onPick={pick} />)}
            </div>
          </section>
        )}

        <section className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-border" aria-label="Mails">
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
            {picked && (
              <button type="button" onClick={() => pick(picked.key)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15" title="Show every automation again">
                {picked.name} <X className="h-3 w-3" />
              </button>
            )}
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name or error…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="h-9 w-60 pl-8" aria-label="Search" />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
              <option value="">All statuses</option>
              {(data?.statuses || []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {!data && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>}
            {data && rows.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                {section === 'upcoming' ? 'Nothing is planned for the next 7 days.' : section === 'today' ? 'Nothing is scheduled for today.' : 'Nothing found.'}
              </p>
            )}
            {groups.map((g) => (
              <div key={g.date}>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
                  <CalendarClock className="h-3.5 w-3.5" /> {dayHeading(g.date)} <span className="font-normal">· {g.rows.length} {g.rows.length === 1 ? 'mail' : 'mails'}</span>
                </div>
                <ul>
                  {g.rows.map((r) => (
                    <li key={r.id} className={`grid items-start gap-x-4 gap-y-1 border-b border-border/60 px-4 py-2.5 last:border-b-0 md:grid-cols-[4.5rem_minmax(0,1.6fr)_auto_minmax(0,1.4fr)_auto] ${r.status === 'skipped' || r.status === 'cancelled' ? 'opacity-60' : ''}`}>
                      <span className="text-sm font-medium tabular-nums text-muted-foreground">{fmtTime(r.due_at)}</span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{r.label}</p>
                        {!jobFilter && <p className="text-xs text-muted-foreground">{r.job_name}</p>}
                      </div>
                      <div className="whitespace-nowrap"><StatusPill row={r} /></div>
                      <div className="min-w-0 text-xs text-muted-foreground">
                        {r.status === 'sent' && <p>Sent {fmtTime(r.sent_at)}{r.smtp_used === 'default' ? ' · default account' : r.smtp_used === 'alert' ? ' · the alert’s own account' : ''}{r.resend_count ? ` · resent ${r.resend_count}×` : ''}</p>}
                        {r.attempts > 0 && r.status !== 'sent' && <p>Tried {r.attempts} of {r.max_attempts} times</p>}
                        {r.last_error && <p className="line-clamp-2 text-red-600" title={r.last_error}>{r.last_error}</p>}
                        {r.status === 'skipped' && <p>Skipped{r.skipped_by ? ` by ${r.skipped_by}` : ''}</p>}
                        {r.note && !['sent', 'skipped'].includes(r.status) && <p>{r.note}</p>}
                      </div>
                      <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                        <Button type="button" variant="ghost" size="icon-sm" title="Who it goes to" aria-label="Who it goes to" onClick={() => setWho(r)}><Users /></Button>
                        {r.email_log_id && <Button type="button" variant="ghost" size="icon-sm" title="View the email" aria-label="View the email" onClick={() => setEmail(r)}><Eye /></Button>}
                        {mayEdit && r.can.send_now && <Button type="button" variant="ghost" size="icon-sm" title="Send now" aria-label="Send now" disabled={!!busy} onClick={() => ask(r, 'send-now')}><FastForward /></Button>}
                        {mayEdit && r.can.resend && <Button type="button" variant="ghost" size="icon-sm" title="Send again" aria-label="Send again" disabled={!!busy} onClick={() => ask(r, 'resend')}><RotateCw /></Button>}
                        {mayEdit && r.can.skip && <Button type="button" variant="ghost" size="icon-sm" title="Skip this mail" aria-label="Skip this mail" disabled={!!busy} onClick={() => ask(r, 'skip')}><SkipForward /></Button>}
                        {mayEdit && r.can.unskip && <Button type="button" variant="ghost" size="icon-sm" title="Undo the skip" aria-label="Undo the skip" disabled={!!busy} onClick={() => act(r, 'unskip')}><Undo2 /></Button>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
        </section>
      </div>

      <EmailDialog item={email} onClose={() => setEmail(null)} isAdmin={!!user?.is_app_admin} />
      <RecipientsDialog item={who} onClose={() => setWho(null)} />
      {switchAsk && <SwitchDialog job={switchAsk} busy={!!switching} onClose={() => setSwitchAsk(null)} onConfirm={() => switchJob(switchAsk)} />}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm && CONFIRM[confirm.kind][0]}</DialogTitle>
            <DialogDescription>{confirm && <><b>{confirm.item.label}</b>, {fmtDay(confirm.item.send_date)}. {CONFIRM[confirm.kind][1]}</>}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirm(null)} disabled={!!busy}>Cancel</Button>
            <Button type="button" onClick={() => act(confirm.item, confirm.kind)} disabled={!!busy}>{busy ? 'Working…' : 'Yes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
