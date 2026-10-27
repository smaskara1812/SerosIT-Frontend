import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fmtDayYear, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MediaImage from '@/components/MediaImage'

const API = '/api/admin/holiday-events/'
const VIEWS = [['upcoming', 'Upcoming'], ['over', 'Over'], ['all', 'All']]
const MAX_DAYS = 14
const dayShort = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '')

// "Wed 12 Nov 2026 (in 16 days)", "Every 26 Jan", "5 to 7 Nov 2026"
function whenText(ev) {
  if (ev.over) return `Was on ${fmtDayYear(ev.send_on)}${ev.send_days > 1 ? ` for ${ev.send_days} days` : ''}`
  const span = ev.send_days > 1 ? `${dayShort(ev.run_from)} to ${dayShort(ev.run_to)} ${(ev.run_to || '').slice(0, 4)}` : fmtDayYear(ev.next_send)
  return ev.repeat_yearly ? `${span} · comes back every year` : span
}

function EventDialog({ event, onClose, onSaved }) {
  const editing = !!event
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [f, setF] = useState(() => ({
    name: event?.name || '', subject: event?.subject || '', send_on: event?.send_on || '', send_days: event?.send_days || 1, repeat_yearly: !!event?.repeat_yearly,
    active: event ? event.active : true, note: event?.note || '',
  }))
  const [several, setSeveral] = useState((event?.send_days || 1) > 1)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  const set = (patch) => setF((x) => ({ ...x, ...patch }))

  function choose(file2) {
    if (!file2) return
    if (!/\.(png|jpe?g)$/i.test(file2.name)) return toast.error('The picture must be a PNG (or JPG).')
    if (file2.size > 5 * 1048576) return toast.error('That file is over 5 MB.')
    setFile(file2)
    setPreview(URL.createObjectURL(file2))
    if (!f.name) set({ name: file2.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') })
  }
  async function save() {
    setBusy(true)
    try {
      const days = several ? Number(f.send_days) || 1 : 1
      let res
      if (file || !editing) {
        const body = new FormData()
        if (file) body.append('file', file)
        Object.entries({ ...f, send_days: days }).forEach(([k, v]) => body.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)))
        res = await apiFetch(editing ? `${API}${event.id}/` : API, { method: editing ? 'PATCH' : 'POST', body })
      } else {
        res = await apiFetch(`${API}${event.id}/`, { method: 'PATCH', body: JSON.stringify({ ...f, send_days: days }) })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.detail || "The event wasn't saved.")
      toast.success(editing ? 'Event saved' : 'Event added')
      onSaved(data)
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const ready = f.name.trim() && f.send_on && (editing || file)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Change “${event.name}”` : 'Add a holiday event'}</DialogTitle>
          <DialogDescription>The picture is sent exactly as it is, to everyone on the “Holiday Events” alert, on the date set here. Nothing is written on it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => input.current?.click()} className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50">
              {preview ? <img src={preview} alt="The picture you chose" className="max-h-72 w-full object-contain" />
                : editing ? <MediaImage url={event.url} alt={event.name} className="max-h-72 w-full object-contain" /> : 'Click to choose the finished picture'}
            </button>
            <input ref={input} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" className="sr-only" aria-label="Choose a picture" onChange={(e) => choose(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">PNG (or JPG), up to 5 MB. It goes out about 900 px wide, so a wide banner works well. {editing && 'Choose another file to replace the picture.'}</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5"><Label htmlFor="ev-name">Event name</Label><Input id="ev-name" value={f.name} maxLength={80} placeholder="Diwali" onChange={(e) => set({ name: e.target.value })} /></div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-subject">Subject of the mail</Label>
              <Input id="ev-subject" value={f.subject} maxLength={200} placeholder="Happy Diwali from all of us at Seros" onChange={(e) => set({ subject: e.target.value })} />
              <p className="text-xs text-muted-foreground">Leave blank to use the alert’s subject. <code>{'{name}'}</code> becomes the event name and <code>{'{year}'}</code> the year.</p>
            </div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="ev-date">Goes out on</Label><Input id="ev-date" type="date" value={f.send_on} onChange={(e) => set({ send_on: e.target.value })} className="w-44" /></div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">How many days</span>
              <div className="inline-flex gap-1.5" role="radiogroup" aria-label="How many days">
                {[[false, 'Only that day'], [true, 'Several days in a row']].map(([v, l]) => (
                  <button key={l} type="button" role="radio" aria-checked={several === v} onClick={() => setSeveral(v)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${several === v ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>{l}</button>
                ))}
              </div>
              {several && (
                <div className="flex items-center gap-2 text-sm">
                  <span>Send on</span>
                  <Input type="number" min={2} max={MAX_DAYS} value={f.send_days} onChange={(e) => set({ send_days: e.target.value })} aria-label="Number of days" className="h-8 w-20" />
                  <span>days in a row, starting on that date (the same mail each day).</span>
                </div>
              )}
            </div>
            <label className="inline-flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.repeat_yearly} onChange={(e) => set({ repeat_yearly: e.target.checked })} /> <span>Comes back every year on this date <span className="text-muted-foreground">(for fixed dates like 1 January or 26 January; leave off for festivals whose date changes each year)</span></span></label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> In use (switch off to keep it but not send it)</label>
            <div className="flex flex-col gap-1.5"><Label htmlFor="ev-note">Note (only shown here)</Label><Input id="ev-note" value={f.note} maxLength={200} onChange={(e) => set({ note: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" onClick={save} disabled={!ready || busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Add event'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EventsTab({ mayAdd, mayEdit, mayDelete, onChanged }) {
  const [view, setView] = useState('upcoming')
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null) // null | 'new' | an event
  const [remove, setRemove] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    const p = new URLSearchParams({ when: view })
    if (q.trim()) p.set('q', q.trim())
    apiFetch(`${API}?${p}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'The events could not be loaded.')
        const d = await res.json()
        if (live) { setData(d); setError('') }
      })
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [view, q, reload])

  const changed = () => {
    setReload((n) => n + 1)
    onChanged?.()
  }
  async function toggle(ev) {
    const res = await apiFetch(`${API}${ev.id}/`, { method: 'PATCH', body: JSON.stringify({ active: !ev.active }) })
    if (res.ok) changed()
    else toast.error((await res.json().catch(() => null))?.detail || "That couldn't be changed.")
  }
  async function confirmRemove() {
    const ev = remove
    setRemove(null)
    const res = await apiFetch(`${API}${ev.id}/`, { method: 'DELETE' })
    if (res.ok || res.status === 204) { toast.success('Event removed'); changed() } else toast.error("The event couldn't be removed.")
  }
  const rows = data?.results || []

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1" role="tablist" aria-label="Show">
          {VIEWS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === k ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}>
              {l}{data ? <span className="ml-1.5 text-xs text-muted-foreground">{data.counts[k]}</span> : null}
            </button>
          ))}
        </div>
        <Input placeholder="Search events" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" className="h-9 w-56" />
        {mayAdd && <Button type="button" size="sm" className="ml-auto" onClick={() => setDialog('new')}><Plus /> Add an event</Button>}
      </div>
      {error && <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{q ? 'No event matches that search.' : view === 'over' ? 'No past events.' : 'No holiday events yet. Add a festival picture and the date it should go out.'}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((ev) => (
          <div key={ev.id} className={`flex flex-col overflow-hidden rounded-xl border border-border ${ev.active && !ev.over ? '' : 'opacity-70'}`}>
            <button type="button" onClick={() => setDialog(ev)} className="block bg-muted/40 text-left" aria-label={`Open ${ev.name}`}>
              {ev.thumb ? <img src={ev.thumb} alt={ev.name} loading="lazy" className="block aspect-[3/2] w-full object-contain" /> : <MediaImage url={ev.url} alt={ev.name} className="block aspect-[3/2] w-full object-contain" />}
            </button>
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words font-semibold" title={ev.name}>{ev.name}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ev.over ? 'bg-muted text-muted-foreground' : ev.active ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{ev.over ? 'Over' : ev.active ? 'In use' : 'Off'}</span>
              </div>
              <p className="flex items-start gap-1.5 text-sm"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{whenText(ev)}{!ev.over && ev.next_send && <span className="text-muted-foreground"> · {inDays(ev.next_send)}</span>}</span></p>
              {ev.subject && <p className="break-words text-xs text-muted-foreground">Subject: {ev.subject}</p>}
              {ev.repeat_yearly && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Repeat className="h-3.5 w-3.5" /> Every year on {dayShort(ev.send_on)}</p>}
              {ev.note && <p className="break-words text-xs text-muted-foreground">{ev.note}</p>}
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialog(ev)}><Pencil /> {mayEdit ? 'Change' : 'Open'}</Button>
                {mayEdit && <Button type="button" variant="ghost" size="sm" onClick={() => toggle(ev)}>{ev.active ? 'Switch off' : 'Switch on'}</Button>}
                {mayDelete && <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" title="Remove" aria-label={`Remove ${ev.name}`} onClick={() => setRemove(ev)}><Trash2 className="text-destructive" /></Button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {dialog && <EventDialog key={dialog === 'new' ? 'new' : dialog.id} event={dialog === 'new' ? null : dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); changed() }} />}
      <Dialog open={!!remove} onOpenChange={(o) => !o && setRemove(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove “{remove?.name}”?</DialogTitle><DialogDescription>The event and its picture are deleted, and any mail planned for it is cancelled. Mails already sent are not affected.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="secondary" onClick={() => setRemove(null)}>Cancel</Button><Button type="button" variant="destructive" onClick={confirmRemove}>Remove</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
