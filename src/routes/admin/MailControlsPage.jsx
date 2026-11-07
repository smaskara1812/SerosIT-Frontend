import { useEffect, useState } from 'react'
import { BellRing, ClipboardList, MailCheck, MailWarning } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fmtTime, inDays } from '@/lib/scheduledMail'
import RedirectCard from '@/components/admin/mail/RedirectCard'
import SummaryCard from '@/components/admin/mail/SummaryCard'
import ErrorCard from '@/components/admin/mail/ErrorCard'

// One of the three live-state tiles in the page's header band. It jumps to its card.
function Tile({ href, icon: Icon, label, value, line, warn }) {
  return (
    <a href={href} className={`group flex items-center gap-3 rounded-xl px-4 py-3 ring-1 backdrop-blur-sm transition-colors ${warn ? 'bg-amber-400/20 ring-amber-300/50 hover:bg-amber-400/30' : 'bg-white/10 ring-white/15 hover:bg-white/15'}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${warn ? 'bg-amber-400 text-amber-950' : 'bg-white/15 text-white'}`}><Icon className="h-[18px] w-[18px]" /></div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">{label}</p>
        <p className="truncate text-base font-semibold leading-tight">{value}</p>
        <p className="truncate text-xs text-white/75">{line}</p>
      </div>
    </a>
  )
}

// Admin > Mail Controls (App Admin only): the mail redirect, the daily mail summary and the failure alerts, which used to be two pages.
export default function MailControlsPage() {
  const [redirect, setRedirect] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let live = true
    Promise.all([apiFetch('/api/admin/mail-redirect/'), apiFetch('/api/admin/mail-summary/')]).then(async ([a, b]) => {
      if (!live || !a.ok || !b.ok) return
      const [r, s] = await Promise.all([a.json(), b.json()])
      if (live) { setRedirect(r); setSummary(s) }
    })
    return () => { live = false }
  }, [])

  if (!redirect || !summary) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>

  const s = summary.summary
  const people = summary.error.to
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-5">
      <header className="@container relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--seros-navy-800)] via-[var(--seros-navy-700)] to-[var(--seros-navy-600)] p-5 text-white shadow-[var(--elev-2)]">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--seros-teal-500)]/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[var(--seros-ocean-400)]/25 blur-3xl" />
        <div className="relative">
          <h1 className="text-xl font-semibold">Mail Controls</h1>
          <p className="mt-1 max-w-3xl text-sm text-white/80">Where the server's mail is kept safe and kept an eye on: redirect it while testing, get a daily summary of what went out, and choose who hears when something fails.</p>
          <div className="mt-4 grid gap-3 @2xl:grid-cols-3">
            <Tile href="#redirect" icon={redirect.on ? MailWarning : MailCheck} label="Mail redirect" warn={redirect.on} value={redirect.on ? 'ON' : 'OFF'} line={redirect.on ? `All mail goes to ${redirect.to.join(', ') || 'nobody'}` : 'Mail goes to the real people'} />
            <Tile href="#summary" icon={ClipboardList} label="Daily summary" value={s.on ? `ON · ${s.time}` : 'OFF'} line={s.on ? (summary.status.next_at ? `Next: ${inDays(summary.status.next_at)} ${fmtTime(summary.status.next_at)}` : 'Waiting for its first run') : 'Nothing is sent'} />
            <Tile href="#failures" icon={BellRing} label="Failure alerts" value={people.length ? `${people.length} ${people.length === 1 ? 'person' : 'people'}` : 'Nobody'} line={people.length ? people.join(', ') : 'Failures only show on Scheduled Mails'} />
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SummaryCard data={summary} redirect={redirect} onData={setSummary} />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <RedirectCard data={redirect} onData={setRedirect} />
          <ErrorCard data={summary} onData={setSummary} />
        </div>
      </div>
    </div>
  )
}
