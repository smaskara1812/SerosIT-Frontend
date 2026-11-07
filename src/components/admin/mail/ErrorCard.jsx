import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, BellRing } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sameList, useDraft } from '@/lib/mailControls'
import { Addresses, Card, SaveBar } from './shared'

// Who is told when an automatic mail has failed for good. Saving or going back to the .env list needs the typed phrase. `data` is the Mail Summary payload.
export default function ErrorCard({ data, onData }) {
  const e = data.error
  const draft = useDraft({ list: e.to }, sameList)
  const list = draft.get('list')
  const [asking, setAsking] = useState(null) // null, 'save' or 'reset'
  const [typed, setTyped] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(reset) {
    setSaving(true)
    setMsg('')
    const res = await apiFetch('/api/admin/mail-summary/', { method: 'PUT', body: JSON.stringify({ section: 'error', to: reset ? null : list, confirm: typed }) })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok) {
      onData(d)
      draft.reset()
      setAsking(null)
      setTyped('')
      toast.success(reset ? "Back to the server's .env list" : 'The failure alert recipients are saved')
    } else setMsg(d.detail || 'Could not save.')
  }

  const ask = (what) => { setMsg(''); setTyped(''); setAsking(what) }

  return (
    <Card
      id="failures"
      icon={BellRing}
      tone="ocean"
      title="Failure alerts"
      subtitle="Who is told when an automatic mail fails for good."
      badge={<span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${e.source === 'page' ? 'bg-[var(--seros-navy-100)] text-[var(--seros-navy-700)]' : 'bg-muted text-muted-foreground'}`}>{e.source === 'page' ? 'Chosen here' : "From .env"}</span>}
      footer={draft.dirty && <SaveBar onDiscard={draft.reset} saveLabel="Save these people" onSave={() => ask('save')} />}
    >
      <p className="mb-3 text-xs text-muted-foreground">An automatic mail is tried again once the next hour starts (at most once an hour). If it still fails after its last try, these people get one e-mail about it. The scheduler watchdog's alerts go to them as well.</p>
      <Addresses list={list} onChange={(v) => draft.set('list', v)} label="Add an address for failure alerts" empty="Nobody is told when a mail fails for good. It still shows on Scheduled Mails." />
      {e.source === 'page' && !draft.dirty && (
        <div className="mt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => ask('reset')}>Use the .env list{e.env_to.length ? ` (${e.env_to.join(', ')})` : ' (empty)'}</Button>
        </div>
      )}

      <Dialog open={!!asking} onOpenChange={(o) => !o && !saving && setAsking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> {asking === 'reset' ? 'Go back to the .env list?' : 'Change who hears about failures?'}</DialogTitle>
            <DialogDescription>
              {asking === 'reset'
                ? `Failures will be e-mailed to ${e.env_to.join(', ') || 'nobody'}, as set in the server's .env file.`
                : list.length ? `Failures will be e-mailed to ${list.join(', ')}.` : 'Nobody will be e-mailed when a mail fails for good.'}{' '}
              Type <b className="font-mono">{e.phrase}</b> below to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(ev) => setTyped(ev.target.value)} placeholder={e.phrase} autoFocus aria-label="Confirmation" />
          {msg && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{msg}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setAsking(null)}>Cancel</Button>
            <Button type="button" disabled={saving || typed.trim() !== e.phrase} onClick={() => save(asking === 'reset')}>{saving ? 'Saving…' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
