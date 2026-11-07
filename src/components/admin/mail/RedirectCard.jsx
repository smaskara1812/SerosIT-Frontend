import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, MailCheck, MailWarning } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fmtWhen } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sameList, useDraft } from '@/lib/mailControls'
import { Addresses, BigSwitch, Card, SaveBar } from './shared'

// The mail redirect: a safety net for test and training servers. Saving always needs the typed phrase.
export default function RedirectCard({ data, onData }) {
  const draft = useDraft({ enabled: data.on, list: data.to }, (a, b) => (Array.isArray(a) ? sameList(a, b) : a === b))
  const enabled = draft.get('enabled')
  const list = draft.get('list')
  const [asking, setAsking] = useState(false)
  const [typed, setTyped] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cantOn = enabled && list.length === 0
  const live = data.on

  async function save() {
    setSaving(true)
    setError('')
    const res = await apiFetch('/api/admin/mail-redirect/', { method: 'PUT', body: JSON.stringify({ enabled, redirect_to: list, confirm: typed }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok) {
      onData(d)
      draft.reset()
      setAsking(false)
      setTyped('')
      toast.success(d.on ? 'Mail redirect is ON' : 'Mail redirect is OFF')
    } else setError(d.detail || 'Could not save.')
  }

  return (
    <Card
      id="redirect"
      icon={enabled ? MailWarning : MailCheck}
      tone={enabled ? 'amber' : 'navy'}
      title="Mail redirect"
      subtitle="Keeps real people from getting mail that was only meant to be tried out."
      footer={draft.dirty && <SaveBar onDiscard={draft.reset} disabled={cantOn} onSave={() => { setError(''); setTyped(''); setAsking(true) }} />}
    >
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 ${enabled ? 'border-amber-300 bg-amber-50' : 'border-border bg-[var(--seros-navy-50)]/60'}`}>
        <div className="min-w-0 flex-1 basis-48">
          <p className={`text-sm font-semibold ${enabled ? 'text-amber-900' : ''}`}>{enabled ? 'Redirect is ON' : 'Redirect is OFF'}</p>
          <p className={`text-xs ${enabled ? 'text-amber-900/80' : 'text-muted-foreground'}`}>
            {enabled ? 'Every mail the application sends goes only to the addresses below.' : 'Mail goes to the people named in each alert, approval and report.'}
          </p>
          {enabled !== live && <p className="mt-1 text-xs font-medium text-primary">Not saved yet. It is {live ? 'ON' : 'OFF'} for the server until you save.</p>}
        </div>
        <BigSwitch on={enabled} onChange={(v) => draft.set('enabled', v)} label="Redirect all mail" tone="amber" />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Send everything to</h3>
          <span className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? 'address' : 'addresses'}</span>
        </div>
        <Addresses list={list} onChange={(v) => draft.set('list', v)} label="Add an address for the redirect" empty="Nowhere to send to yet: mail would vanish into the void. Add a mailbox." />
        {cantOn && <p className="mt-2 text-sm text-amber-700">Add at least one address, or the redirect cannot be switched on.</p>}
        <p className="mt-2 text-xs text-muted-foreground">Everyone here receives each mail as the To address. Nobody is put in Cc or Bcc.</p>
      </div>

      <details className="group mt-3 rounded-lg border border-border px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground group-open:text-foreground">Peek at a redirected mail</summary>
        <div className="mt-2 overflow-hidden rounded-lg border border-border text-sm">
          <div className="border-b border-border bg-muted/40 px-3 py-1.5"><span className="text-muted-foreground">Subject: </span><b>[Redirected]</b> Drilling Info Status</div>
          <div className="px-3 py-2.5">
            <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>Redirected mail.</b> This mail was meant for: To: rig.manager@example.com, cc: it@example.com. It was sent to you instead because mail redirect is switched on for this server.</div>
            <p className="mt-2 text-xs text-muted-foreground">…the normal mail follows…</p>
          </div>
        </div>
      </details>

      <p className="mt-3 text-xs text-muted-foreground">
        {data.source === 'page'
          ? `Last saved here${data.changed_by ? ` by ${data.changed_by}` : ''}${data.changed_at ? `, ${fmtWhen(data.changed_at)}` : ''}. Used instead of the server's .env file.`
          : `Not saved here yet, so the server's .env file decides (${data.env.on ? 'on' : 'off'}). Saving overrides it. A change reaches the scheduler within about 10 seconds.`}
      </p>

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
    </Card>
  )
}
