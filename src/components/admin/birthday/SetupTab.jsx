import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ExternalLink, Send } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { agoText, fmtDay, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SentAs from '@/components/admin/SentAs'

function Chips({ list, empty }) {
  if (!list.length) return <span className="text-muted-foreground">{empty}</span>
  return <span className="flex flex-wrap gap-1.5">{list.map((a) => <span key={a} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{a}</span>)}</span>
}

function Row({ label, children }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

// A read-only picture of how the birthday mail is wired: which alert it uses, who it goes to, when, and with which account. Nothing here is edited;
// the recipients and the trigger are changed where they always are (Alert To Users, Notification Triggers), and the sending account is in the server's
// environment settings.
export default function SetupTab({ mayEdit, refreshKey }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const [again, setAgain] = useState(0)
  const load = () => setAgain((n) => n + 1)
  useEffect(() => {
    let live = true
    apiFetch('/api/admin/birthday-mailer/overview/')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Could not load the setup.')
        const d = await res.json()
        if (live) { setData(d); setError('') }
      })
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [refreshKey, again])

  async function test() {
    setSending(true)
    try {
      const res = await apiFetch('/api/admin/birthday-mailer/test-send/', { method: 'POST', body: JSON.stringify({ email }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.fell_back) toast.warning(`A test mail went to ${email}, but not through the first account: it failed and the ${d.smtp_used} account was used. Check Alert Senders and the Email Log.`)
      else if (res.ok) toast.success(`A test mail went to ${email} (picture: ${d.template}, ${d.smtp_used} account).`)
      else toast.error(d.error || d.detail || 'The test mail could not be sent.')
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setSending(false)
      load()
    }
  }

  if (error) return <p className="m-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
  if (!data) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  const { setup, scheduler, counts, coming, links } = data
  const r = setup.recipients
  const ok = setup.trigger_found && setup.trigger_active && setup.alert?.active && Object.values(r).some((l) => l.length)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${ok && !setup.warnings.length ? 'border-emerald-500/30 bg-emerald-500/8' : 'border-amber-500/40 bg-amber-500/10'}`}>
        {ok && !setup.warnings.length ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
        <div className="min-w-0 flex-1 text-sm">
          {setup.alert
            ? <p className="font-medium">The birthday mail uses the alert “{setup.alert.name}” (alert {setup.alert.id}).</p>
            : <p className="font-medium">The birthday mail is not connected to an alert yet.</p>}
          {setup.warnings.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{setup.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          {!setup.warnings.length && <p className="text-xs text-muted-foreground">Everything it needs is in place.</p>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">How the mail is set up</h2>
          <p className="mb-1 text-xs text-muted-foreground">This is read from the alert and its trigger. It is shown here so you can see it at a glance; it is changed where it always is.</p>
          <dl className="divide-y divide-border/60">
            <Row label="Sent as"><SentAs name={setup.from_name} address={setup.from_address} /></Row>
            <Row label="Subject">{setup.subject ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{setup.subject}</code> : '—'} <span className="text-xs text-muted-foreground">{'{name}'} becomes the person’s name.</span></Row>
            <Row label="When">Every day at {String(setup.send_hour).padStart(2, '0')}:00. The scheduler checks once an hour, so it goes out at that hour.</Row>
            <Row label="To"><Chips list={r.to} empty="Nobody" /></Row>
            <Row label="Cc"><Chips list={r.cc} empty="Nobody" /></Row>
            <Row label="Bcc"><Chips list={r.bcc} empty="Nobody" /></Row>
            <Row label="Not sent to">The person whose birthday it is.</Row>
            <Row label="Sending account">
              {setup.smtp.sender
                ? <>The sender set for this alert (<code className="text-xs">{setup.smtp.sender.from_address}</code> through <code className="text-xs">{setup.smtp.sender.host}</code>). If that fails, {setup.smtp.designated ? <>the birthday account (<code className="text-xs">{setup.smtp.designated_host}</code>) and then </> : null}the default account (<code className="text-xs">{setup.smtp.default_host}</code>) is used straight away.</>
                : setup.smtp.designated ? <>The birthday account (<code className="text-xs">{setup.smtp.designated_host}</code>). If that fails the default account (<code className="text-xs">{setup.smtp.default_host}</code>) is used straight away.</>
                  : <>The default account (<code className="text-xs">{setup.smtp.default_host}</code>). No sender is set for this alert and no separate birthday account is set on the server.</>}
              {' '}<Link to="/masters/alert-senders" className="text-primary hover:underline">Alert Senders</Link>
            </Row>
            <Row label="If it fails">It is tried again at the next hourly run, at most twice more. After that it shows as Failed on Scheduled Mails, where it can be sent again by hand.</Row>
          </dl>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {links.recipients && <Link to={links.recipients} className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Change who it goes to</Link>}
            <Link to={links.trigger} className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Notification triggers</Link>
            <Link to="/admin/scheduled-mails" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Scheduled Mails</Link>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold">The scheduler</h2>
            <p className="mt-1 text-sm">
              {scheduler.state === 'running' && <>Running. Last run {agoText(scheduler.minutes_ago)}.</>}
              {scheduler.state === 'stale' && <span className="text-amber-700 dark:text-amber-300">The service last ran {agoText(scheduler.minutes_ago)}. Check it on the server.</span>}
              {scheduler.state === 'never' && <span className="text-amber-700 dark:text-amber-300">The scheduler service is not running: nothing goes out by itself until it is started on the server.</span>}
              {scheduler.state === 'stopped' && <span className="text-amber-700 dark:text-amber-300">The scheduler service was stopped {agoText(scheduler.minutes_ago)}. Start it on the server.</span>}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{counts.active} active of {counts.people} people · {counts.templates_active} of {counts.templates} templates in use</p>
          </section>

          <section className="rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold">Next birthdays</h2>
            {coming.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No one on the list yet.</p> : (
              <ul className="mt-2 divide-y divide-border/60 text-sm">
                {coming.map((c) => <li key={`${c.date}${c.name}`} className="flex justify-between gap-3 py-1.5"><span className="truncate">{c.name}</span><span className="shrink-0 text-muted-foreground">{fmtDay(c.date)} · {inDays(c.date)}</span></li>)}
              </ul>
            )}
          </section>

          {mayEdit && (
            <section className="rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold">Send a test</h2>
              <p className="mb-2 mt-1 text-xs text-muted-foreground">Sends one sample card (“Test Person”) to this address only, never to the people on the alert. It uses the next template in turn and the real sending account.</p>
              <div className="flex gap-2">
                <Input type="email" placeholder="you@seros.co.in" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Send the test to" className="h-9" />
                <Button type="button" size="sm" className="h-9" onClick={test} disabled={sending || !email.includes('@')}><Send /> {sending ? 'Sending…' : 'Send'}</Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
