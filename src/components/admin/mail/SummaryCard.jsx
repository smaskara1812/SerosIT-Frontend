import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, ClipboardList, MailWarning, Send } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fmtTime, fmtWhen, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { goesAround, sameList, useDraft } from '@/lib/mailControls'
import { Addresses, BigSwitch, Card, Choice, SaveBar, SectionLabel } from './shared'

// The Daily Mail Summary: on or off, when, who gets it, what is in it, and a test button. `data` is the Mail Summary payload; `redirect` the redirect's.
export default function SummaryCard({ data, redirect, onData }) {
  const s = data.summary
  const every = data.run_every || 30
  const draft = useDraft(
    { on: s.on, time: s.time, same: s.same_as_error, list: s.to, quiet: s.send_when_quiet, grouped: s.grouped },
    (a, b) => (Array.isArray(a) ? sameList(a, b) : a === b),
  )
  const [on, time, same, list, quiet, grouped] = ['on', 'time', 'same', 'list', 'quiet', 'grouped'].map(draft.get)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const people = same ? data.error.to : list
  const cantOn = on && people.length === 0
  const last = data.status.last
  const around = goesAround(time, every)

  async function save() {
    setSaving(true)
    const res = await apiFetch('/api/admin/mail-summary/', { method: 'PUT', body: JSON.stringify({ section: 'summary', on, time, to: list, same_as_error: same, send_when_quiet: quiet, grouped }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok) {
      onData(d)
      draft.reset()
      toast.success(d.summary.on ? `The daily summary is ON, around ${goesAround(d.summary.time, d.run_every || 30)}` : 'The daily summary is OFF')
    } else toast.error(d.detail || 'Could not save.')
  }

  async function sendTest() {
    setTesting(true)
    const res = await apiFetch('/api/admin/mail-summary/test/', { method: 'POST' })
    const d = await res.json().catch(() => ({}))
    setTesting(false)
    if (res.ok) {
      toast.success(`A test summary was sent to ${d.to.join(', ')}`)
      onData({ ...data, status: d.status })
    } else toast.error(d.detail || 'The test could not be sent.')
  }

  return (
    <Card
      id="summary"
      icon={ClipboardList}
      tone="teal"
      title="Daily mail summary"
      subtitle="One mail a day listing every mail the system sent, with the failures first."
      footer={draft.dirty && <SaveBar onDiscard={draft.reset} disabled={cantOn} busy={saving} onSave={save} />}
    >
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${on ? 'border-[var(--seros-teal-200)] bg-[var(--seros-teal-50)]' : 'border-border bg-[var(--seros-navy-50)]/60'}`}>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-semibold">{on ? 'The daily summary is ON' : 'The daily summary is OFF'}</p>
          <p className="text-xs text-muted-foreground">
            {on ? `Every day at ${time}${time !== around ? ` (about ${around}, when the scheduler next runs)` : ''}, to ${people.length ? people.join(', ') : 'nobody yet'}.` : 'Nothing is sent. Switch it on to get one mail a day with the mails that went out and which failed.'}
          </p>
          {on !== s.on && <p className="mt-1 text-xs font-medium text-primary">Not saved yet. It is {s.on ? 'ON' : 'OFF'} until you save.</p>}
        </div>
        <BigSwitch on={on} onChange={(v) => draft.set('on', v)} label="Send the daily summary" />
      </div>

      {(s.on || last) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {s.on && data.status.next_at && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Next: {inDays(data.status.next_at)} {fmtTime(data.status.next_at)}</span>}
          {last && <span>Last: {last.status === 'sent' ? 'sent' : <b className="text-destructive">failed</b>} {fmtWhen(last.at)}{last.status === 'failed' && last.error ? `: ${last.error.slice(0, 80)}` : ''}</span>}
          {data.status.paused && <b className="text-amber-700">Paused on Scheduled Mails, so nothing goes out.</b>}
        </div>
      )}

      {redirect.on && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Mail redirect is ON for this server, so the summary (like every mail) goes only to {redirect.to.length ? redirect.to.join(', ') : 'nobody'}.</span>
        </p>
      )}

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <SectionLabel>When</SectionLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Input type="time" value={time} onChange={(e) => e.target.value && draft.set('time', e.target.value)} aria-label="Time of day" className="h-9 w-32" />
              <p className="min-w-0 flex-1 basis-44 text-xs text-muted-foreground">Every day. The scheduler runs every {every} minutes, so it goes at the first run at or after this time{time !== around ? ` (${around} for ${time})` : ''}. It covers everything since the last summary.</p>
            </div>
          </div>
          <div>
            <SectionLabel>What is in it</SectionLabel>
            <div className="flex flex-col gap-2">
              <Choice checked={grouped} onChange={() => draft.set('grouped', true)} hint="Holiday Mailer: 2 sent. Easy to scan.">One row for each kind of mail</Choice>
              <Choice checked={!grouped} onChange={() => draft.set('grouped', false)} hint="Every mail on its own line (the first 200).">One row for each mail</Choice>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={quiet} onChange={(e) => draft.set('quiet', e.target.checked)} className="mt-1 accent-[var(--seros-teal-500)]" />
              <span><span className="font-medium">Send it even when no mail went out</span><span className="block text-xs text-muted-foreground">A quiet day is worth knowing about: it can mean the scheduler was not running.</span></span>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Each row shows the mail type, its subject, who it was sent from, when and whether it worked.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <SectionLabel>Who receives it</SectionLabel>
            <div className="flex flex-col gap-2">
              <Choice checked={same} onChange={() => draft.set('same', true)} hint={data.error.to.length ? data.error.to.join(', ') : 'Nobody is chosen under failure alerts yet'}>The same people who get the failure alerts</Choice>
              <Choice checked={!same} onChange={() => draft.set('same', false)} hint="Choose the addresses here instead">Its own list</Choice>
            </div>
            {!same && <div className="mt-3"><Addresses list={list} onChange={(v) => draft.set('list', v)} label="Add an address for the summary" empty="Nobody yet. Add at least one mailbox before switching the summary on." /></div>}
            {cantOn && <p className="mt-2 text-sm text-amber-700">Add at least one address, or the summary cannot be switched on.</p>}
          </div>
          <div className="rounded-lg border border-[var(--seros-navy-100)] bg-[var(--seros-navy-50)]/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" disabled={testing || draft.dirty || people.length === 0} onClick={sendTest}><Send /> {testing ? 'Sending…' : 'Send a test now'}</Button>
              <span className="min-w-0 flex-1 basis-40 text-xs text-muted-foreground">{draft.dirty ? 'Save first, then you can send a test.' : `Sends today's summary so far to ${people.join(', ') || 'nobody yet'}.`}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {s.source === 'page'
          ? `Last saved here${s.changed_by ? ` by ${s.changed_by}` : ''}${s.changed_at ? `, ${fmtWhen(s.changed_at)}` : ''}. Used instead of the server's .env file.`
          : `Not saved here yet, so the server's .env file decides (${s.env.on ? 'on' : 'off'}, ${s.env.time}). Saving overrides it. A change reaches the scheduler within about 10 seconds.`}
      </p>
    </Card>
  )
}
