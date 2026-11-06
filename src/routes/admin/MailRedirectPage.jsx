import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Mail, MailCheck, MailWarning, Plus, RotateCcw, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fmtWhen } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const split = (t) => t.split(/[\n,;\s]+/).map((a) => a.trim()).filter(Boolean)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The big on/off switch. It only changes the draft; nothing is saved until the person confirms.
function BigSwitch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Redirect all mail"
      onClick={() => onChange(!on)}
      className={`relative h-7 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${on ? 'border-amber-500 bg-amber-500' : 'border-border bg-muted'}`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-bold tracking-wider ${on ? 'left-2 text-white' : 'right-2 text-muted-foreground'}`}>{on ? 'ON' : 'OFF'}</span>
      <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${on ? 'left-[calc(100%-1.5rem)]' : 'left-0.5'}`} />
    </button>
  )
}

export default function MailRedirectPage() {
  const [data, setData] = useState(null)
  const [enabled, setEnabled] = useState(false)
  const [list, setList] = useState([])
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState('')
  const [asking, setAsking] = useState(false)
  const [typed, setTyped] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const apply = useCallback((d) => {
    setData(d)
    setEnabled(d.on)
    setList(d.to)
    setDraft('')
    setBad('')
  }, [])

  useEffect(() => {
    let live = true
    apiFetch('/api/admin/mail-redirect/').then(async (r) => { if (live && r.ok) apply(await r.json()) })
    return () => { live = false }
  }, [apply])

  function addFromDraft(text = draft) {
    const parts = split(text)
    if (!parts.length) return
    const wrong = parts.find((p) => !EMAIL.test(p))
    if (wrong) { setBad(`'${wrong}' is not a valid e-mail address.`); return }
    setList((l) => [...new Set([...l, ...parts])])
    setDraft('')
    setBad('')
  }

  if (!data) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>

  const pending = split(draft).length > 0
  const dirty = enabled !== data.on || list.join(',') !== data.to.join(',') || pending
  const cantOn = enabled && list.length === 0 && !pending

  async function save() {
    setSaving(true)
    setError('')
    const res = await apiFetch('/api/admin/mail-redirect/', { method: 'PUT', body: JSON.stringify({ enabled, redirect_to: list, confirm: typed }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok) {
      apply(d)
      setAsking(false)
      setTyped('')
      toast.success(d.on ? 'Mail redirect is ON' : 'Mail redirect is OFF')
    } else setError(d.detail || 'Could not save.')
  }

  const live = data.on
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
      <div>
        <h1 className="text-xl font-semibold">Mail Redirect</h1>
        <p className="mt-1 text-sm text-muted-foreground">A safety net for test and training servers: keep real people from receiving mail that was only meant to be tried out.</p>
      </div>

      {/* The state, and the switch */}
      <section className={`overflow-hidden rounded-xl border ${enabled ? 'border-amber-400 bg-amber-50' : 'border-border bg-card'} transition-colors`}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
            {enabled ? <MailWarning className="h-[18px] w-[18px]" /> : <MailCheck className="h-[18px] w-[18px]" />}
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <p className={`text-sm font-semibold ${enabled ? 'text-amber-900' : ''}`}>{enabled ? 'Redirect is ON' : 'Redirect is OFF'}</p>
            <p className={`text-xs ${enabled ? 'text-amber-900/80' : 'text-muted-foreground'}`}>
              {enabled ? 'Every mail the application sends goes only to the addresses below. Nobody else receives anything.' : 'Mail goes to the people named in each alert, approval and report.'}
            </p>
            {enabled !== live && <p className="mt-1 text-xs font-medium text-primary">Not saved yet. It is {live ? 'ON' : 'OFF'} for the server until you save.</p>}
          </div>
          <BigSwitch on={enabled} onChange={setEnabled} />
        </div>
      </section>

      {/* Where it goes */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Send everything to</h2>
          <span className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? 'address' : 'addresses'}</span>
        </div>
        {list.length === 0 ? (
          <p className="mb-3 rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">Nowhere to send to yet: mail would vanish into the void. Add a mailbox.</p>
        ) : (
          <ul className="mb-3 flex flex-wrap gap-2">
            {list.map((a) => (
              <li key={a} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1.5 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-[13px]">{a}</span>
                <button type="button" aria-label={`Remove ${a}`} onClick={() => setList((l) => l.filter((x) => x !== a))} className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-700"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setBad('') }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFromDraft() } }}
            onPaste={(e) => { const t = e.clipboardData.getData('text'); if (split(t).length > 1) { e.preventDefault(); addFromDraft(t) } }}
            placeholder="name@company.com, then press Enter"
            aria-label="Add an address"
            className="h-9"
          />
          <Button type="button" variant="outline" className="h-9" disabled={!draft.trim()} onClick={() => addFromDraft()}><Plus /> Add</Button>
        </div>
        {bad && <p className="mt-2 text-sm text-destructive">{bad}</p>}
        {cantOn && <p className="mt-2 text-sm text-amber-700">Add at least one address, or the redirect cannot be switched on.</p>}
        <p className="mt-2 text-xs text-muted-foreground">Everyone here receives each mail as the To address. Nobody is put in Cc or Bcc. You can paste several addresses at once.</p>
      </section>

      <details className="group rounded-xl border border-border bg-card px-4 py-2.5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground group-open:text-foreground">Peek at a redirected mail</summary>
        <div className="mt-3 overflow-hidden rounded-lg border border-border text-sm">
          <div className="border-b border-border bg-muted/40 px-3 py-1.5"><span className="text-muted-foreground">Subject: </span><b>[Redirected]</b> Drilling Info Status</div>
          <div className="px-3 py-2.5">
            <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>Redirected mail.</b> This mail was meant for: To: rig.manager@example.com, cc: it@example.com. It was sent to you instead because mail redirect is switched on for this server.</div>
            <p className="mt-2 text-xs text-muted-foreground">…the normal mail follows…</p>
          </div>
        </div>
      </details>

      <p className="text-xs text-muted-foreground">
        {data.source === 'page'
          ? `Last saved on this page${data.changed_by ? ` by ${data.changed_by}` : ''}${data.changed_at ? `, ${fmtWhen(data.changed_at)}` : ''}. This setting is used instead of the server's .env file.`
          : `Not saved on this page yet, so the server's .env file decides (${data.env.on ? 'on' : 'off'}). Saving here overrides it. A change reaches the scheduler within about 10 seconds.`}
      </p>

      {/* Save bar */}
      {dirty && (
        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-lg">
          <p className="text-sm font-medium">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => apply(data)}><RotateCcw /> Discard</Button>
            <Button type="button" disabled={cantOn || !!bad} onClick={() => { if (pending) addFromDraft(); setError(''); setTyped(''); setAsking(true) }}>Save changes</Button>
          </div>
        </div>
      )}

      <Dialog open={asking} onOpenChange={(o) => !o && !saving && setAsking(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> {enabled ? 'Switch the redirect on?' : 'Switch the redirect off?'}</DialogTitle>
            <DialogDescription>
              {enabled ? `All mail will go only to ${list.join(', ') || 'nobody'} from now on.` : 'Mail will go to its real recipients from now on. Everyone named in an alert will receive it.'}{' '}
              Type <b className="font-mono">{data.phrase}</b> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={data.phrase} autoFocus aria-label="Confirmation" />
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setAsking(false)}>Cancel</Button>
            <Button type="button" variant={enabled ? 'default' : 'destructive'} disabled={saving || typed.trim() !== data.phrase} onClick={save}>{saving ? 'Saving…' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
