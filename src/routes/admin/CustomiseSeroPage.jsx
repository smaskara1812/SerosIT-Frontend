import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Copy, Pencil, Plus, Shirt, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { bannerChanged } from '@/lib/activeBanner'
import { can } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import { Card, SaveBar } from '@/components/admin/mail/shared'
import { useDraft } from '@/lib/mailControls'
import { Choice } from '@/components/admin/banner/controls'
import OutfitEditor, { SeroPreview } from '@/components/admin/sero/OutfitEditor'

const MENU_KEY = 'admin.sero_look'
const MODES = [
  { key: 'plain', label: 'His usual look' },
  { key: 'fixed', label: 'One outfit' },
  { key: 'daily', label: 'A different one each day' },
]

async function readError(res) {
  const d = await res.json().catch(() => null)
  return d?.detail || "That didn't work. Please try again."
}

// Where an outfit is used, in words, for the warning before it is deleted.
function usedLine(u) {
  const parts = []
  if (u.banners.length) parts.push(`${u.banners.length === 1 ? 'the banner' : 'the banners'} ${u.banners.map((b) => `“${b}”`).join(', ')}`)
  if (u.weekdays) parts.push('weekdays')
  if (u.weekends) parts.push('weekends')
  return parts.join(', ')
}

// Sero is drawn on a card only once the card is near the screen: a long list stays light.
function LazyPreview({ look, name }) {
  const box = useRef(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = box.current
    if (!el || seen) return undefined
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setSeen(true); io.disconnect() } }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return <div ref={box} style={{ minHeight: 118 }}>{seen && <SeroPreview look={look} size={104} label={`Sero in ${name}`} />}</div>
}

function OutfitCard({ o, may, onEdit, onCopy, onDelete, onPool }) {
  const used = usedLine(o.used_by)
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--edge)] bg-card p-3 shadow-[var(--elev-1)]">
      <div className="rounded-lg bg-gradient-to-b from-[var(--seros-navy-50)] to-card px-3 pt-2"><LazyPreview look={o.look} name={o.name} /></div>
      <p className="w-full truncate text-center text-sm font-semibold" title={o.name}>{o.name}</p>
      <label className={`flex items-center gap-1.5 text-xs ${may.edit ? 'cursor-pointer' : 'opacity-70'}`}>
        <input type="checkbox" checked={o.in_pool} disabled={!may.edit} onChange={(e) => onPool(o, e.target.checked)} className="h-3.5 w-3.5 accent-[#1c448a]" />
        In the daily pool
      </label>
      {used && <p className="w-full truncate text-center text-[11px] text-muted-foreground" title={used}>Used on {used}</p>}
      <div className="mt-auto flex gap-1.5">
        {may.edit && <Button type="button" variant="outline" size="sm" onClick={() => onEdit(o)} aria-label={`Change ${o.name}`}><Pencil /></Button>}
        {may.add && <Button type="button" variant="outline" size="sm" onClick={() => onCopy(o)} aria-label={`Duplicate ${o.name}`}><Copy /></Button>}
        {may.delete && <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(o)} aria-label={`Delete ${o.name}`}><Trash2 /></Button>}
      </div>
    </div>
  )
}

function DayRow({ title, mode, outfit, outfits, poolCount, disabled, onMode, onOutfit }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <Choice label={title} options={MODES} value={mode} onChange={disabled ? () => {} : onMode} />
      {mode === 'fixed' && (
        <select value={outfit ?? ''} disabled={disabled} onChange={(e) => onOutfit(e.target.value ? Number(e.target.value) : null)} aria-label={`Outfit for ${title.toLowerCase()}`} className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2 text-sm">
          <option value="">Choose an outfit…</option>
          {outfits.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}
      {mode === 'daily' && (
        <p className="text-xs text-muted-foreground">{poolCount ? `One of the ${poolCount} outfits in the pool each day, the same for everyone. Every outfit gets a turn before any repeats.` : 'The pool is empty. Tick “In the daily pool” on some outfits below.'}</p>
      )}
    </div>
  )
}

// Admin > Home Page > Customise Sero: the outfits Sero can wear, and which he wears on days with no banner that names one.
export default function CustomiseSeroPage() {
  const { user } = useAuth()
  const may = { view: can(user, MENU_KEY, 'view'), add: can(user, MENU_KEY, 'add'), edit: can(user, MENU_KEY, 'edit'), delete: can(user, MENU_KEY, 'delete') }
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(null) // an outfit, {} for a new one, or null
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!may.view) return undefined
    let live = true
    apiFetch('/api/sero/outfits/').then(async (res) => {
      if (!live) return
      if (res.ok) setData(await res.json())
      else toast.error(await readError(res))
    })
    return () => { live = false }
  }, [may.view])

  const draft = useDraft(data?.settings || {})

  if (!may.view) return <AccessDenied />
  if (!data) return <RigLoading />

  const poolCount = data.outfits.filter((o) => o.in_pool).length
  const st = data.settings
  const val = (k) => draft.get(k)
  const mode = (part) => val(`${part}_mode`) ?? 'plain'
  const outfitId = (part) => val(`${part}_outfit`) ?? null

  async function saveSettings() {
    setBusy(true)
    const body = { weekday_mode: mode('weekday'), weekday_outfit: outfitId('weekday'), weekend_mode: mode('weekend'), weekend_outfit: outfitId('weekend') }
    const res = await apiFetch('/api/sero/settings/', { method: 'PUT', body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) return toast.error(await readError(res))
    setData(await res.json())
    draft.reset()
    bannerChanged()
    toast.success('Saved. Sero will wear this from now on.')
  }

  async function saveOutfit(body) {
    setSaving(true)
    setFormError('')
    const isNew = !editing?.id
    const res = await apiFetch(isNew ? '/api/sero/outfits/' : `/api/sero/outfits/${editing.id}/`, { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) return setFormError(await readError(res))
    setData(await res.json())
    setEditing(null)
    bannerChanged()
    toast.success(isNew ? 'Outfit added' : 'Outfit saved')
  }

  async function togglePool(o, on) {
    const res = await apiFetch(`/api/sero/outfits/${o.id}/`, { method: 'PATCH', body: JSON.stringify({ in_pool: on }) })
    if (!res.ok) return toast.error(await readError(res))
    setData(await res.json())
    bannerChanged()
  }

  async function confirmDelete() {
    const o = deleting
    setBusy(true)
    const res = await apiFetch(`/api/sero/outfits/${o.id}/?confirm=1`, { method: 'DELETE' })
    setBusy(false)
    setDeleting(null)
    if (!res.ok) return toast.error(await readError(res))
    setData(await res.json())
    draft.reset()
    bannerChanged()
    toast.success('Outfit deleted')
  }

  const today = data.today
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-5">
      <header className="@container relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--seros-navy-800)] via-[var(--seros-navy-700)] to-[var(--seros-navy-600)] p-5 text-white shadow-[var(--elev-2)]">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--seros-teal-500)]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-xl font-semibold">Customise Sero</h1>
            <p className="mt-1 text-sm text-white/80">Dress Sero, the mascot, and choose when he wears what. A banner can name its own outfit in the banner editor; on every other day he wears what is set below.</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm ring-1 ring-white/15"><CalendarDays className="h-4 w-4" /> Today ({data.today_is}) he wears: <strong>{today ? today.name : 'his usual look'}</strong></p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 pt-3 ring-1 ring-white/15"><SeroPreview look={today?.look} size={96} label="Sero as he is dressed today" /></div>
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <Card icon={CalendarDays} title="When he wears what" subtitle="For days with no banner that names an outfit" tone="teal"
            footer={draft.dirty ? <SaveBar onDiscard={draft.reset} onSave={saveSettings} busy={busy} note="Unsaved changes" /> : null}>
            <div className="flex flex-col gap-5">
              <DayRow title="Weekdays" mode={mode('weekday')} outfit={outfitId('weekday')} outfits={data.outfits} poolCount={poolCount} disabled={!may.edit}
                onMode={(m) => { draft.set('weekday_mode', m); if (m !== 'fixed') draft.set('weekday_outfit', null) }} onOutfit={(v) => draft.set('weekday_outfit', v)} />
              <DayRow title="Weekends" mode={mode('weekend')} outfit={outfitId('weekend')} outfits={data.outfits} poolCount={poolCount} disabled={!may.edit}
                onMode={(m) => { draft.set('weekend_mode', m); if (m !== 'fixed') draft.set('weekend_outfit', null) }} onOutfit={(v) => draft.set('weekend_outfit', v)} />
              {st.changed_by && <p className="text-xs text-muted-foreground">Last changed by {st.changed_by}.</p>}
              {!may.edit && <p className="text-xs text-muted-foreground">You can look at these settings but not change them.</p>}
            </div>
          </Card>
        </div>
        <div className="xl:col-span-8">
          <Card icon={Shirt} title="Outfits" subtitle={`${data.outfits.length} outfit${data.outfits.length === 1 ? '' : 's'} · ${poolCount} in the daily pool`} tone="navy"
            badge={may.add ? <Button type="button" size="sm" onClick={() => { setFormError(''); setEditing({}) }}><Plus /> New outfit</Button> : null}>
            {data.outfits.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" /> No outfits yet. Make the first one.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.outfits.map((o) => (
                  <OutfitCard key={o.id} o={o} may={may} onEdit={(x) => { setFormError(''); setEditing(x) }} onCopy={(x) => { setFormError(''); setEditing({ name: `${x.name} copy`.slice(0, 60), look: x.look, in_pool: x.in_pool }) }} onDelete={setDeleting} onPool={togglePool} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {editing && <OutfitEditor outfit={editing} onClose={() => setEditing(null)} onSave={saveOutfit} saving={saving} error={formError} />}

      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          {deleting && usedLine(deleting.used_by) && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>It is used on {usedLine(deleting.used_by)}. {deleting.used_by.banners.length ? 'Those banners will wear the day’s outfit instead. ' : ''}{deleting.used_by.weekdays || deleting.used_by.weekends ? 'Days set to this outfit will go back to his usual look.' : ''}</span>
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>Keep it</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={confirmDelete}>Delete outfit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
