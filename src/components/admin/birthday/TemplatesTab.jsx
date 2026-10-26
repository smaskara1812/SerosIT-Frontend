import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useMediaUrl } from '@/lib/authedMedia'
import { fmtDayYear } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MediaImage from '@/components/MediaImage'

const API = '/api/admin/birthday-templates/'
const SAMPLES = [['A short name', 'Raj'], ['A usual name', 'Priya Sharma'], ['A very long name', 'Venkata Subrahmanyam Chandrasekharan Iyer']]
const ALIGN_H = [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']]
const ALIGN_V = [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']]
const CASES = [['title', 'Title Case'], ['upper', 'UPPERCASE'], ['asis', 'As typed']]
const HANDLES = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
const CURSORS = { '-1,-1': 'nwse-resize', '0,-1': 'ns-resize', '1,-1': 'nesw-resize', '-1,0': 'ew-resize', '1,0': 'ew-resize', '-1,1': 'nesw-resize', '0,1': 'ns-resize', '1,1': 'nwse-resize' }
const SNAP = 0.012 // within about 1% of a guide the box jumps onto it
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const pct = (v) => `${Math.round(v * 1000) / 10}%`

function Seg({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="inline-flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${value === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>{l}</button>
        ))}
      </div>
    </div>
  )
}

// The picture with the name box on it. Drag the box to move it, drag a handle to resize, arrow keys nudge it (Shift for bigger steps).
// The box snaps to the centre lines and the edges of the picture; the guides show when it does.
function BoxCanvas({ url, box, onChange, thirds, ratio }) {
  const src = useMediaUrl(url)
  const wrap = useRef(null)
  const drag = useRef(null)
  const [guides, setGuides] = useState({ x: false, y: false })

  const rect = () => wrap.current.getBoundingClientRect()
  function begin(e, mode, handle) {
    e.preventDefault()
    e.stopPropagation()
    wrap.current.setPointerCapture?.(e.pointerId)
    drag.current = { mode, handle, sx: e.clientX, sy: e.clientY, orig: { ...box } }
  }
  function move(e) {
    const g = drag.current
    if (!g) return
    const r = rect()
    const dx = (e.clientX - g.sx) / r.width
    const dy = (e.clientY - g.sy) / r.height
    let { x, y, w, h } = g.orig
    if (g.mode === 'move') {
      x = clamp(x + dx, 0, 1 - w)
      y = clamp(y + dy, 0, 1 - h)
    } else {
      const [hx, hy] = g.handle
      if (hx === 1) w = clamp(w + dx, 0.03, 1 - x)
      if (hx === -1) { const nx = clamp(x + dx, 0, x + w - 0.03); w += x - nx; x = nx }
      if (hy === 1) h = clamp(h + dy, 0.03, 1 - y)
      if (hy === -1) { const ny = clamp(y + dy, 0, y + h - 0.03); h += y - ny; y = ny }
    }
    const sg = { x: false, y: false }
    if (g.mode === 'move') {
      if (Math.abs(x + w / 2 - 0.5) < SNAP) { x = 0.5 - w / 2; sg.x = true }
      if (Math.abs(y + h / 2 - 0.5) < SNAP) { y = 0.5 - h / 2; sg.y = true }
    }
    setGuides(sg)
    onChange({ x, y, w, h })
  }
  function end() {
    drag.current = null
    setGuides({ x: false, y: false })
  }
  function key(e) {
    const step = e.shiftKey ? 0.02 : 0.004
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!d) return
    e.preventDefault()
    onChange({ ...box, x: clamp(box.x + d[0], 0, 1 - box.w), y: clamp(box.y + d[1], 0, 1 - box.h) })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(#d4d8de_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]">
      <div ref={wrap} className="relative mx-auto select-none" style={{ aspectRatio: String(ratio), touchAction: 'none' }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        {src && <img src={src} alt="The template picture" className="absolute inset-0 h-full w-full" draggable={false} />}
        {thirds && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 3 3" preserveAspectRatio="none" aria-hidden="true">
            {[1, 2].map((i) => (<g key={i}><line x1={i} y1="0" x2={i} y2="3" stroke="rgba(255,255,255,.7)" strokeWidth="0.012" /><line x1="0" y1={i} x2="3" y2={i} stroke="rgba(255,255,255,.7)" strokeWidth="0.012" /></g>))}
          </svg>
        )}
        {guides.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-fuchsia-500" />}
        {guides.y && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-fuchsia-500" />}
        <div
          role="group" tabIndex={0} aria-label="The name box. Drag to move; arrow keys nudge it."
          onPointerDown={(e) => begin(e, 'move')} onKeyDown={key}
          className="absolute cursor-move rounded-sm border-2 border-dashed border-sky-400 bg-sky-400/15 outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white/90 [text-shadow:0_0_3px_rgba(0,0,0,.8)]">The name goes here</span>
          {HANDLES.map(([hx, hy]) => (
            <span key={`${hx},${hy}`} onPointerDown={(e) => begin(e, 'resize', [hx, hy])}
              className="absolute h-3 w-3 rounded-sm border border-sky-500 bg-white shadow"
              style={{ left: `${(hx + 1) * 50}%`, top: `${(hy + 1) * 50}%`, transform: 'translate(-50%,-50%)', cursor: CURSORS[`${hx},${hy}`] }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// One sample name drawn by the server with the settings as they are now (nothing saved), so what is shown is what will be sent.
function SamplePreview({ label, text, id, settings }) {
  const [state, setState] = useState({ url: null, meta: null, error: '' })
  const body = useMemo(() => JSON.stringify({ template_id: id, sample: text, ...settings }), [id, text, settings])
  useEffect(() => {
    let live = true
    let made = null
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch(`${API}preview/`, { method: 'POST', body })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          if (live) setState((s) => ({ ...s, error: d.detail || 'No preview' }))
          return
        }
        const meta = JSON.parse(res.headers.get('X-Card-Meta') || 'null')
        made = URL.createObjectURL(await res.blob())
        if (live) setState({ url: made, meta, error: '' })
        else URL.revokeObjectURL(made)
      } catch {
        if (live) setState((s) => ({ ...s, error: 'No preview' }))
      }
    }, 450)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [body])
  useEffect(() => () => state.url && URL.revokeObjectURL(state.url), [state.url])
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
        {state.url ? <img src={state.url} alt={`${label}: ${text}`} className="block w-full" /> : <div className="aspect-[3/2] w-full animate-pulse" />}
      </div>
      <figcaption className="text-xs text-muted-foreground">
        <b className="text-foreground">{label}</b> · “{text}”
        {state.meta && <span> · {state.meta.size}px{state.meta.lines > 1 ? `, ${state.meta.lines} lines` : ''}</span>}
        {state.meta?.below_min && !state.meta.truncated && <span className="ml-1 text-amber-700 dark:text-amber-300">· smaller than your smallest size, so the name is not cut off (widen or heighten the box for a bigger name)</span>}
        {state.meta?.truncated && <span className="ml-1 inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3 w-3" /> still cut off: make the box wider or taller</span>}
        {state.error && <span className="text-red-600"> · {state.error}</span>}
      </figcaption>
    </figure>
  )
}

function Editor({ template, fonts, mayEdit, onClose, onSaved }) {
  const initial = useMemo(() => ({ name: template.name, font: template.font, color: template.color, size_max: template.size_max, size_min: template.size_min, align_h: template.align_h, align_v: template.align_v, text_case: template.text_case, active: template.active, box: { ...template.box } }), [template])
  const [s, setS] = useState(initial)
  const [thirds, setThirds] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ask, setAsk] = useState(false)
  const dirty = JSON.stringify(s) !== JSON.stringify(initial)
  const set = (patch) => setS((x) => ({ ...x, ...patch }))
  const setBox = (b) => setS((x) => ({ ...x, box: b }))
  const preview = useMemo(() => ({ box: s.box, font: s.font, color: s.color, size_max: s.size_max, size_min: s.size_min, align_h: s.align_h, align_v: s.align_v, text_case: s.text_case }), [s])

  async function save() {
    setSaving(true)
    try {
      const res = await apiFetch(`${API}${template.id}/`, { method: 'PATCH', body: JSON.stringify(s) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.detail || "The template wasn't saved.")
        return
      }
      toast.success('Template saved')
      onSaved(data)
    } catch {
      toast.error("The template wasn't saved. Please check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }
  const tryClose = () => (dirty ? setAsk(true) : onClose())
  const b = s.box
  // Typing into a number can never put the box outside the picture: it is pulled back inside (and kept a usable size).
  const num = (k, v) => {
    const n = { ...b, [k]: clamp(Number(v) / 100 || 0, 0, 1) }
    n.w = clamp(n.w, 0.03, 1)
    n.h = clamp(n.h, 0.03, 1)
    n.x = clamp(n.x, 0, 1 - n.w)
    n.y = clamp(n.y, 0, 1 - n.h)
    setBox(n)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && tryClose()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Place the name on “{template.name}”</DialogTitle>
          <DialogDescription>Drag the blue box to where the name should go, and size it. The pictures below show how short, usual and very long names will look; the name is made smaller, or put on two lines, to fit the box.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col gap-3">
            <BoxCanvas url={template.url} box={b} onChange={mayEdit ? setBox : () => {}} thirds={thirds} ratio={template.width / template.height} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={thirds} onChange={(e) => setThirds(e.target.checked)} /> Show thirds</label>
              <Button type="button" variant="outline" size="xs" onClick={() => setBox({ ...b, x: (1 - b.w) / 2 })}>Centre across</Button>
              <Button type="button" variant="outline" size="xs" onClick={() => setBox({ ...b, y: (1 - b.h) / 2 })}>Centre up and down</Button>
              <Button type="button" variant="outline" size="xs" onClick={() => setBox({ ...b, x: 0.1, w: 0.8 })}>Use 80% of the width</Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[['x', 'Left'], ['y', 'Top'], ['w', 'Width'], ['h', 'Height']].map(([k, l]) => (
                <div key={k} className="flex flex-col gap-1"><Label htmlFor={`bx-${k}`} className="text-xs">{l} (%)</Label>
                  <Input id={`bx-${k}`} type="number" min={0} max={100} step={0.5} value={Math.round(b[k] * 1000) / 10} onChange={(e) => num(k, e.target.value)} disabled={!mayEdit} className="h-8" /></div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5"><Label htmlFor="tp-name">Template name</Label><Input id="tp-name" value={s.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} disabled={!mayEdit} /></div>
            <Seg label="Font" value={s.font} options={fonts.map((f) => [f.key, f.label])} onChange={(v) => set({ font: v })} />
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5"><Label htmlFor="tp-color">Colour</Label>
                <div className="flex items-center gap-2"><input id="tp-color" type="color" value={s.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-input" /><code className="text-xs text-muted-foreground">{s.color}</code></div></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="tp-max">Biggest size (px)</Label><Input id="tp-max" type="number" min={8} max={800} value={s.size_max} onChange={(e) => set({ size_max: Number(e.target.value) })} className="h-8 w-28" /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="tp-min">Smallest size (px)</Label><Input id="tp-min" type="number" min={8} max={800} value={s.size_min} onChange={(e) => set({ size_min: Number(e.target.value) })} className="h-8 w-28" /></div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">Sizes are in pixels of the picture ({template.width}×{template.height}). A name that does not fit at the biggest size is made smaller, down to the smallest, and then put on two lines.</p>
            <Seg label="Across the box" value={s.align_h} options={ALIGN_H} onChange={(v) => set({ align_h: v })} />
            <Seg label="Up and down in the box" value={s.align_v} options={ALIGN_V} onChange={(v) => set({ align_v: v })} />
            <Seg label="Capital letters" value={s.text_case} options={CASES} onChange={(v) => set({ text_case: v })} />
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={s.active} onChange={(e) => set({ active: e.target.checked })} disabled={!mayEdit} /> In use (cards take turns between the templates that are in use)</label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">How it will look</p>
          <div className="grid gap-3 md:grid-cols-3">
            {SAMPLES.map(([label, text]) => <SamplePreview key={label} label={label} text={text} id={template.id} settings={preview} />)}
          </div>
        </div>

        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <Button type="button" variant="secondary" onClick={tryClose}>Close</Button>
          {mayEdit && <Button type="button" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>}
        </DialogFooter>

        <Dialog open={ask} onOpenChange={setAsk}>
          <DialogContent>
            <DialogHeader><DialogTitle>Close without saving?</DialogTitle><DialogDescription>Your changes to this template will be lost.</DialogDescription></DialogHeader>
            <DialogFooter><Button type="button" variant="secondary" onClick={() => setAsk(false)}>Keep editing</Button><Button type="button" variant="destructive" onClick={onClose}>Close without saving</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

function NewTemplateDialog({ onClose, onCreated }) {
  const open = true
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])
  function choose(f) {
    if (!f) return
    if (!/\.(png|jpe?g)$/i.test(f.name)) return toast.error('A template must be a PNG (or JPG) picture.')
    if (f.size > 5 * 1048576) return toast.error('That file is over 5 MB.')
    setFile(f)
    setUrl(URL.createObjectURL(f))
    setName((n) => n || f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
  }
  async function create() {
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('name', name.trim() || 'Template')
      const res = await apiFetch(API, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.detail || 'That picture could not be added.')
      toast.success('Template added. Now place the name on it.')
      onCreated(data)
    } catch {
      toast.error('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add a template</DialogTitle><DialogDescription>Choose the birthday picture (PNG, or JPG; up to 5 MB). Next you mark where the name goes.</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-4">
          <button type="button" onClick={() => input.current?.click()} className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40">
            {url ? <img src={url} alt="The picture you chose" className="max-h-64 w-full object-contain" /> : 'Click to choose a picture'}
          </button>
          <input ref={input} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" className="sr-only" aria-label="Choose a picture" onChange={(e) => choose(e.target.files?.[0])} />
          <div className="flex flex-col gap-1.5"><Label htmlFor="nt-name">Template name</Label><Input id="nt-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
        </div>
        <DialogFooter><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" onClick={create} disabled={!file || busy}>{busy ? 'Adding…' : 'Add and place the name'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TemplatesTab({ mayAdd, mayEdit, mayDelete, onChanged }) {
  const [items, setItems] = useState(null)
  const [fonts, setFonts] = useState([])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [remove, setRemove] = useState(null)

  const [reload, setReload] = useState(0)
  useEffect(() => {
    let live = true
    apiFetch(API)
      .then(async (res) => {
        if (!res.ok) throw new Error('load')
        const data = await res.json()
        if (live) { setItems(data.results); setFonts(data.fonts); setError('') }
      })
      .catch(() => live && setError('The templates could not be loaded.'))
    return () => {
      live = false
    }
  }, [reload])

  const changed = () => {
    setReload((n) => n + 1)
    onChanged?.()
  }
  async function toggle(t) {
    const res = await apiFetch(`${API}${t.id}/`, { method: 'PATCH', body: JSON.stringify({ active: !t.active }) })
    if (res.ok) changed()
    else toast.error((await res.json().catch(() => null))?.detail || "That couldn't be changed.")
  }
  async function confirmRemove() {
    const t = remove
    setRemove(null)
    const res = await apiFetch(`${API}${t.id}/`, { method: 'DELETE' })
    if (res.ok || res.status === 204) { toast.success('Template removed'); changed() } else toast.error("The template couldn't be removed.")
  }
  const active = (items || []).filter((t) => t.active).length

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">Each birthday card is one of these pictures with the person’s name written on it. When several are in use, they take turns: the one used longest ago goes next, so two birthdays on the same day get different pictures.</p>
        {mayAdd && <Button type="button" size="sm" className="ml-auto" onClick={() => setAdding(true)}><Plus /> Add a template</Button>}
      </div>
      {items && active === 0 && <p className="mb-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> No template is in use, so no birthday mail can be sent. Add one, or switch one on.</p>}
      {error && <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!items && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
      {items && items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No templates yet. Add a birthday picture to begin.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(items || []).map((t) => (
          <div key={t.id} className={`flex flex-col overflow-hidden rounded-xl border border-border ${t.active ? '' : 'opacity-70'}`}>
            <button type="button" onClick={() => setEditing(t)} className="block bg-muted/40 text-left" aria-label={`Open ${t.name}`}>
              {t.thumb ? <img src={t.thumb} alt={t.name} loading="lazy" className="block aspect-[3/2] w-full object-contain" /> : <MediaImage url={t.url} alt={t.name} className="block aspect-[3/2] w-full object-contain" />}
            </button>
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-semibold" title={t.name}>{t.name}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.active ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>{t.active ? 'In use' : 'Off'}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.width}×{t.height} · {fonts.find((f) => f.key === t.font)?.label.split(' (')[0] || t.font} · used {t.times_used}×{t.last_used_at ? `, last ${fmtDayYear(t.last_used_at)}` : ''}</p>
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(t)}><Pencil /> {mayEdit ? 'Place the name' : 'Open'}</Button>
                {mayEdit && <Button type="button" variant="ghost" size="sm" onClick={() => toggle(t)}>{t.active ? 'Switch off' : 'Switch on'}</Button>}
                {mayDelete && <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" title="Remove" aria-label={`Remove ${t.name}`} onClick={() => setRemove(t)}><Trash2 className="text-destructive" /></Button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding && <NewTemplateDialog onClose={() => setAdding(false)} onCreated={(t) => { setAdding(false); changed(); setEditing(t) }} />}
      {editing && <Editor key={editing.id} template={editing} fonts={fonts} mayEdit={mayEdit} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); changed() }} />}
      <Dialog open={!!remove} onOpenChange={(o) => !o && setRemove(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove “{remove?.name}”?</DialogTitle><DialogDescription>The picture is deleted. Mails already sent are not affected.</DialogDescription></DialogHeader>
          <DialogFooter><Button type="button" variant="secondary" onClick={() => setRemove(null)}>Cancel</Button><Button type="button" variant="destructive" onClick={confirmRemove}>Remove</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
