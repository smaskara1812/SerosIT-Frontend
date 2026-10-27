import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, CheckCircle2, Download, ExternalLink, FileSpreadsheet, Pencil, Repeat, Search, Send, Users, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { can } from '@/lib/permissions'
import { STATUS_STYLE, fmtDay, fmtDayYear, fmtTime, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AccessDenied from '@/components/AccessDenied'
import SentAs from '@/components/admin/SentAs'
import { RecipientsPreview } from '@/components/admin/RecipientsPreview'

const MENU_KEY = 'admin.report_mails'
const TABS = [['overview', 'Overview'], ['recipients', 'Recipients'], ['runs', 'Runs']]

// What state a report is in, for the list and the badge: needs attention (something on the alert or trigger is wrong), due (its date has passed, so it goes at the
// scheduler's next run), or ready.
function stateOf(report) {
  const s = report.setup
  const problems = s.warnings.filter((w) => !w.startsWith('SCHEDULER_ERROR_MAIL_TO'))
  if (!s.trigger_found || !s.trigger_active || !s.alert?.active || problems.length) return ['attention', 'Needs attention']
  if (report.overdue) return ['due', 'Due now']
  return ['ready', 'Ready']
}
const STATE_STYLE = {
  ready: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  due: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  attention: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
}
const nextText = (s) => (s.next_mail_dt ? `${fmtDay(s.next_mail_dt)} · ${String(s.send_hour).padStart(2, '0')}:00` : 'No date set')

function StateBadge({ report }) {
  const [state, label] = stateOf(report)
  const Icon = state === 'attention' ? AlertTriangle : state === 'due' ? CalendarClock : CheckCircle2
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[state]}`}><Icon className="h-3 w-3" />{label}</span>
}

async function saveFile(res, fallback) {
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallback
  const a = document.createElement('a')
  a.href = URL.createObjectURL(await res.blob())
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30000)
}

function Tile({ icon: Icon, label, children, foot, action }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}{action && <span className="ml-auto">{action}</span>}</p>
      <p className="mt-1 text-base font-semibold leading-tight">{children}</p>
      {foot && <p className="mt-0.5 text-xs text-muted-foreground">{foot}</p>}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

function TestDialog({ report, onClose, onDone }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const going = useRef(false)
  async function send() {
    if (going.current) return
    going.current = true
    setBusy(true)
    try {
      const res = await apiFetch(`/api/admin/report-mails/${report.key}/test-send/`, { method: 'POST', body: JSON.stringify({ email }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.fell_back) toast.warning(`A test mail went to ${email}, but not through the first account: it failed and the ${d.smtp_used} account was used. Check the Email Log.`)
      else if (res.ok) toast.success(`A test mail (${d.summary}) went to ${email}.`)
      else toast.error(d.error || d.detail || 'The test mail could not be sent.')
      if (res.ok) onClose()
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      going.current = false
      setBusy(false)
      onDone()
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a test of the {report.name}</DialogTitle>
          <DialogDescription>It goes to this address only, never to the people on the alert, the way the real one goes. It does not move Next Mail.</DialogDescription>
        </DialogHeader>
        <Input type="email" autoFocus placeholder="you@seros.co.in" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && !busy && send()} aria-label="Send the test to" />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={send} disabled={busy || !email.includes('@')}><Send /> {busy ? 'Sending…' : 'Send test'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const fmtNext = (iso) => (iso ? `${fmtDayYear(iso)} at ${iso.slice(11, 16)}` : 'no date')

// Sends the report now, after a confirmation that says who gets it and lets the person choose what happens to Next Mail.
const MODE_TEXT = {
  copy: ['Send an extra copy', (d) => <>Next Mail stays <b>{d}</b>. Nothing else changes.</>],
  count: ['Count it as the next send', (d) => <>Next Mail becomes <b>{d}</b>: the cycle keeps its days, this send takes the place of the next one.</>],
  restart: ['Start a new cycle from today', (d) => <>Next Mail becomes <b>{d}</b>: today plus the frequency, and the cycle follows from there.</>],
}

function SendNowDialog({ report, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const going = useRef(false) // a second click before the screen has caught up must not send a second mail
  const eff = report.run_now
  const [mode, setMode] = useState(eff.default_mode)
  const s = report.setup
  const r = s.recipients
  const n = r.to.length + r.cc.length + r.bcc.length
  async function send() {
    if (going.current) return
    going.current = true
    setBusy(true)
    try {
      const res = await apiFetch(`/api/admin/report-mails/${report.key}/run-now/`, { method: 'POST', body: JSON.stringify({ mode }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`The ${report.name} was sent to ${n} people.${d.moved ? ` Next Mail is now ${fmtNext(d.next_mail_dt)}.` : ''}`)
        onClose()
      } else toast.error(d.error || d.detail || 'It could not be sent.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      going.current = false
      setBusy(false)
      onDone()
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send the {report.name} now?</DialogTitle>
          <DialogDescription>It goes to the people on the alert straight away, the way the real one goes, and is recorded on Scheduled Mails as sent by hand.</DialogDescription>
        </DialogHeader>
        <p className="flex items-start gap-2 text-sm"><Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span><b>{n} people</b>: {r.to.length} To, {r.cc.length} Cc, {r.bcc.length} Bcc.</span></p>
        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="mb-1 text-sm font-medium">What should happen to Next Mail{eff.from ? ` (now ${fmtNext(eff.from)})` : ''}?</legend>
          {['copy', 'count', 'restart'].map((m) => {
            const info = eff.modes[m]
            const [title, text] = MODE_TEXT[m]
            return (
              <label key={m} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${mode === m ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'} ${info.allowed ? '' : 'cursor-not-allowed opacity-50'}`}>
                <input type="radio" name="send-mode" className="mt-1 accent-[#1a3f7a]" checked={mode === m} disabled={!info.allowed} onChange={() => setMode(m)} />
                <span className="min-w-0">
                  <span className="block font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {info.allowed ? text(fmtNext(info.next)) : m === 'copy' ? 'Not possible now: Next Mail is due, so the scheduler sends it at its next run.' : 'The alert has no Frequency or Next Mail date.'}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={send} disabled={busy || !eff.modes[mode]?.allowed}><Zap /> {busy ? 'Sending…' : 'Send now'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Changes the alert's Next Mail date and Start Time (the hour) for this report, without opening the alert.
function ScheduleDialog({ report, onClose, onDone }) {
  const s = report.setup
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [date, setDate] = useState(() => (s.next_mail_dt ? s.next_mail_dt.slice(0, 10) : todayIso))
  const [hour, setHour] = useState(s.send_hour ?? 7)
  const [busy, setBusy] = useState(false)
  const passed = date === todayIso && Number(hour) <= today.getHours()
  async function save() {
    setBusy(true)
    try {
      const res = await apiFetch(`/api/admin/report-mails/${report.key}/schedule/`, { method: 'POST', body: JSON.stringify({ date, hour: Number(hour) }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Next Mail is now ${fmtNext(d.next_mail_dt)}.`)
        onClose()
        onDone()
      } else toast.error(d.detail || 'The date could not be changed.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>When should the {report.name} go out next?</DialogTitle>
          <DialogDescription>This sets Next Mail and Start Time on the alert “{s.alert?.name}”. After it goes out, Next Mail moves on by {s.freq} days.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5"><label htmlFor="sd-date" className="text-sm font-medium">Date</label><Input id="sd-date" type="date" min={todayIso} value={date} onChange={(e) => setDate(e.target.value)} className="w-44" /></div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sd-hour" className="text-sm font-medium">Hour</label>
            <select id="sd-hour" value={hour} onChange={(e) => setHour(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        </div>
        {passed && <p className="text-xs text-amber-700 dark:text-amber-300">That hour has already passed today, so it goes at the scheduler’s next run.</p>}
        <p className="text-xs text-muted-foreground">The scheduler checks once an hour, so it goes out at that hour. To send it right now, use Send now instead.</p>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={save} disabled={busy || !date}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Overview({ report }) {
  const s = report.setup
  return (
    <dl className="divide-y divide-border/60">
      <Row label="Alert">
        {s.alert ? <>{s.alert.name} <span className="text-muted-foreground">(alert {s.alert.id})</span>{s.links?.alert && <Link to={s.links.alert} className="ml-2 inline-flex items-center gap-0.5 text-xs text-primary hover:underline">Open the alert <ExternalLink className="h-3 w-3" /></Link>}</> : <span className="text-muted-foreground">Not connected to an alert yet</span>}
      </Row>
      <Row label="Subject">{s.subject ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s.subject}</code> : '—'}</Row>
      <Row label="Sent as"><SentAs name={s.from_name} address={s.from_address} /></Row>
      <Row label="Account">{s.smtp.sender ? <>The alert’s own account (<code className="text-xs">{s.smtp.sender.host}</code>)</> : <>The default system account (<code className="text-xs">{s.smtp.default_host}</code>)</>}</Row>
      <Row label="Goes out">{report.schedule}</Row>
      <Row label="If it fails">Retried at the next hourly runs, at most twice more. After that {s.error_mail_to.length ? <b>{s.error_mail_to.join(', ')}</b> : 'nobody (not set)'} is told by e-mail, and it shows as Failed on Scheduled Mails.</Row>
    </dl>
  )
}

function Runs({ report }) {
  if (!report.runs.length) return <p className="py-6 text-center text-sm text-muted-foreground">It has not run yet.</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Details</th></tr></thead>
        <tbody>
          {report.runs.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-b-0">
              <td className="whitespace-nowrap px-3 py-2">{fmtDayYear(r.send_date)}</td>
              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] || ''}`}>{r.status}</span></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.note}{r.sent_at ? ` · sent ${fmtTime(r.sent_at)}` : ''}{r.last_error && <span className="block text-red-600">{r.last_error}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border px-3 py-2 text-xs"><Link to="/admin/scheduled-mails" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Scheduled Mails: skip, send now, send again</Link></div>
    </div>
  )
}

function ReportDetail({ report, mayEdit, mayExport, onChanged }) {
  const s = report.setup
  const [tab, setTab] = useState('overview')
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [state] = stateOf(report)

  async function download() {
    setDownloading(true)
    try {
      const res = await apiFetch(`/api/admin/report-mails/${report.key}/download/`)
      if (res.ok) await saveFile(res, `${report.key}.xlsx`)
      else toast.error((await res.json().catch(() => null))?.detail || 'The report could not be downloaded.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5"><h2 className="text-xl font-semibold">{report.name}</h2><StateBadge report={report} /></div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {mayExport && <Button type="button" variant="outline" size="sm" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-emerald-100" onClick={download} disabled={downloading || !s.alert} title="The report as it would be built this minute. Nothing is sent."><Download /> {downloading ? 'Preparing…' : 'Download Excel'}</Button>}
          {mayEdit && <Button type="button" variant="outline" size="sm" onClick={() => setTesting(true)} disabled={!s.alert}><Send /> Send a test</Button>}
          {mayEdit && <Button type="button" size="sm" onClick={() => setSending(true)} disabled={!s.alert || !s.trigger_active || !s.alert?.active} title="Sends it to the people on the alert now"><Zap /> Send now</Button>}
        </div>
      </header>

      {s.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {s.warnings.map((w) => <li key={w} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}</li>)}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={CalendarClock} label="Next mail" action={mayEdit && s.alert ? <button type="button" onClick={() => setScheduling(true)} className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"><Pencil className="h-3 w-3" /> Change</button> : null} foot={s.next_mail_dt ? (state === 'due' ? 'Date has passed: goes at the next scheduler run' : inDays(s.next_mail_dt.slice(0, 10))) : 'Set Next Mail on the alert'}>{nextText(s)}</Tile>
        <Tile icon={Repeat} label="Repeats every" foot="Frequency on the alert">{s.freq ? `${s.freq} days` : '—'}</Tile>
        <Tile icon={FileSpreadsheet} label="Looks back" foot="Window on the alert">{s.window} days</Tile>
        <Tile icon={Users} label="Goes to" foot={s.links?.recipients ? <Link to={s.links.recipients} className="inline-flex items-center gap-1 text-primary hover:underline">Edit recipients <ExternalLink className="h-3 w-3" /></Link> : 'Not connected'}>
          {s.recipients.to.length} To · {s.recipients.cc.length} Cc · {s.recipients.bcc.length} Bcc
        </Tile>
      </div>

      <div className="flex gap-1 border-b border-border" role="tablist" aria-label={`${report.name} sections`}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${tab === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}{k === 'runs' && report.runs.length ? <span className="ml-1.5 text-xs text-muted-foreground">{report.runs.length}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview report={report} />}
      {tab === 'recipients' && <RecipientsPreview data={report.preview} compact />}
      {tab === 'runs' && <Runs report={report} />}
      {testing && <TestDialog report={report} onClose={() => setTesting(false)} onDone={onChanged} />}
      {sending && <SendNowDialog report={report} onClose={() => setSending(false)} onDone={onChanged} />}
      {scheduling && <ScheduleDialog report={report} onClose={() => setScheduling(false)} onDone={onChanged} />}
    </article>
  )
}

// Admin > Report Mails: the report-style automatic mails (built from the data on a cycle, such as the HAZ ID Register). A list of the reports on the left, each with
// its state and next date; the selected one on the right, in three parts: how it is set up, who it goes to, and how its runs went.
export default function ReportMailsPage() {
  const { user } = useAuth()
  const mayView = can(user, MENU_KEY, 'view')
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [again, setAgain] = useState(0)
  const [q, setQ] = useState('')

  const load = useCallback(() => setAgain((n) => n + 1), [])
  useEffect(() => {
    if (!mayView) return undefined
    let live = true
    apiFetch('/api/admin/report-mails/')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Could not load the report mails.')
        const d = await res.json()
        if (live) { setData(d.results); setError('') }
      })
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [mayView, again])

  const shown = useMemo(() => (data || []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q])
  if (!mayView) return <AccessDenied />
  const selected = (data || []).find((r) => r.key === params.get('r')) || shown[0] || (data || [])[0]

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-semibold">Report Mails</h1>
        <p className="text-sm text-muted-foreground">Reports built from the data and e-mailed on a cycle, for example every 15 days. The alert says when and to whom; the scheduler sends them.</p>
      </div>
      {error && <p className="m-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
      {data && (
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[18rem_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
            {data.length > 5 && (
              <div className="relative border-b border-border p-2.5">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a report" aria-label="Find a report" className="h-9 pl-8" />
              </div>
            )}
            <ul className="min-h-0 flex-1 overflow-auto p-2" aria-label="Reports">
              {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No report matches.</li>}
              {shown.map((r) => {
                const active = r.key === selected?.key
                const last = r.runs[0]
                return (
                  <li key={r.key}>
                    <button type="button" onClick={() => setParams({ r: r.key })} aria-current={active ? 'true' : undefined}
                      className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-muted/60'}`}>
                      <span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold">{r.name}</span><StateBadge report={r} /></span>
                      <span className="text-xs text-muted-foreground">Next: {nextText(r.setup)}</span>
                      <span className="text-xs text-muted-foreground">{last ? `Last: ${last.status} ${fmtDay(last.send_date)}` : 'Not run yet'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>
          <section className="min-h-0 overflow-auto p-4 sm:p-5">
            {selected ? <ReportDetail key={selected.key} report={selected} mayEdit={can(user, MENU_KEY, 'edit')} mayExport={can(user, MENU_KEY, 'export')} onChanged={load} /> : <p className="text-sm text-muted-foreground">No report mails are set up yet.</p>}
          </section>
        </div>
      )}
    </div>
  )
}
