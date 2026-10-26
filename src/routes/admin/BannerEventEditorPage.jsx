import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Copy, Eye, Grid3x3, LayoutTemplate, Palette, Redo2, RotateCcw, Shapes, Spline, Sparkles, Type, Undo2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { can } from '@/lib/permissions'
import { buildFieldErrors } from '@/lib/errors'
import { localDateStr } from '@/lib/naiveDateTime'
import { pickGreeting } from '@/lib/greeting'
import { DEFAULT_DESIGN, LAYOUTS, PATTERNS, PRESETS, SOFT_TINTS, applyPreset, autoTextColor, backgroundCss, cloneDesign, readability, shapesAlign, noticeLook, softenTint, toneOf, withDefaults } from '@/lib/bannerDesign'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IconSearch } from '@/components/icons'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import BannerView from '@/components/home/BannerView'
import BannerArt from '@/components/home/BannerArt'
import NoticeCard from '@/components/home/NoticeCard'
import EdgesPanel from '@/components/admin/banner/EdgesPanel'
import FontPicker from '@/components/admin/banner/FontPicker'
import { ColorField, Choice, FitPreview, Section, SliderField } from '@/components/admin/banner/controls'
import ShapeCanvas from '@/components/admin/banner/ShapeCanvas'
import ShapesPanel from '@/components/admin/banner/ShapesPanel'
import TemplatesDialog from '@/components/admin/banner/TemplatesDialog'
import { templateDates } from '@/lib/bannerTemplates'
import { MAX_LAYERS, MAX_PICTURES, defaultLayer, defaultText, newLayerId, pictureLayer, scatterLayers, textBox } from '@/lib/bannerShapes'

const MENU_KEY = 'admin.banner_events'
const SIZES = [
  { key: 'wide', label: 'Wide screen', width: 1100 }, // fills the room it is given, never narrower than this
  { key: 'phone', label: 'Phone', width: 400 },
]
const TABS = [
  { key: 'when', label: 'When', icon: CalendarDays },
  { key: 'words', label: 'Words', icon: Type },
  { key: 'colours', label: 'Colours', icon: Palette },
  { key: 'pattern', label: 'Pattern', icon: Grid3x3 },
  { key: 'lines', label: 'Lines & edges', icon: Spline },
  { key: 'shapes', label: 'Shapes', icon: Shapes },
  { key: 'layout', label: 'Layout', icon: LayoutTemplate },
]
const PRIORITIES = [
  { key: -10, label: 'Lower' },
  { key: 0, label: 'Normal' },
  { key: 10, label: 'Higher' },
]
const DURATIONS = [['Just one day', 0], ['2 days', 1], ['A week', 6], ['2 weeks', 13]]
const SAMPLE_NOTICE = { notice_id: 0, kind: 'I', title: 'A notice would appear here', message: 'Live notices keep their place in the banner, whatever the design.', is_pinned: false, link_url: null }

const addDays = (day, n) => {
  const [y, m, d] = day.split('-').map(Number)
  return localDateStr(new Date(y, m - 1, d + n))
}
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function blankMeta() {
  const today = localDateStr()
  return { name: '', starts_on: today, ends_on: today, repeat_yearly: 'N', priority: 0, is_published: 'Y' }
}

// A stand-in for the real search box, drawn the same way.
function FakeSearch() {
  return (
    <div className="flex h-13 items-center gap-3 rounded-2xl bg-[var(--search-tint,#ffffff)] pl-4 text-[15px] text-slate-500 shadow-lg shadow-black/15" aria-hidden="true">
      <IconSearch className="h-5 w-5 text-slate-500" />
      Where would you like to go?
    </div>
  )
}

// A tiny drawing of each layout for the Layout tab.
function LayoutPicture({ layout }) {
  const text = { standard: [6, 6, 22, 5], mirrored: [32, 6, 22, 5], centred: [18, 6, 22, 5] }[layout]
  const search = { standard: [6, 24, 28, 6], mirrored: [26, 24, 28, 6], centred: [16, 24, 28, 6] }[layout]
  const notice = { standard: [38, 6, 16, 14], mirrored: [6, 6, 16, 14], centred: [20, 32, 20, 6] }[layout]
  return (
    <svg viewBox="0 0 60 42" className="h-16 w-full" aria-hidden="true">
      <rect width="60" height="42" rx="4" fill="#1c448a" />
      <rect x={text[0]} y={text[1]} width={text[2]} height={text[3]} rx="1.5" fill="#fff" />
      <rect x={search[0]} y={search[1]} width={search[2]} height={search[3]} rx="2" fill="#fff" fillOpacity=".85" />
      <rect x={notice[0]} y={notice[1]} width={notice[2]} height={notice[3]} rx="2" fill="#7fe3d6" fillOpacity=".7" />
    </svg>
  )
}

function PatternChip({ pattern, design, active, onPick }) {
  const mini = useMemo(() => ({ ...design, pattern: { ...design.pattern, type: pattern.key, opacity: Math.max(design.pattern.opacity, 0.25) }, contours: { ...design.contours, on: false } }), [design, pattern.key])
  return (
    <button type="button" onClick={onPick} aria-pressed={active} className={`overflow-hidden rounded-lg border text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-foreground/30'}`}>
      <div className="relative h-12 w-full" style={{ background: backgroundCss(design) }}>
        {pattern.key !== 'none' && <BannerArt design={mini} />}
      </div>
      <div className="px-2 py-1.5">{pattern.label}</div>
    </button>
  )
}

const NOTICE_LOOKS = [
  { key: 'auto', label: 'Automatic' },
  { key: 'dark', label: 'Dark card' },
  { key: 'light', label: 'Light card' },
  { key: 'custom', label: 'My own colour' },
]

// What the notice card looks like. Automatic follows the banner. When a picture or a bright area sits behind the card and makes it hard to read, give
// the card its own dark, light or chosen colour; the words on it follow the card.
function NoticeLookControls({ design, edit }) {
  const n = design.notice
  return (
    <div className="flex flex-col gap-3">
      <Choice label="Card" value={n.look || 'auto'} onChange={(v) => edit((d) => { d.notice.look = v; if (v === 'custom' && !d.notice.color) d.notice.color = '#0f2650' })} options={NOTICE_LOOKS} />
      {n.look === 'custom' && <ColorField label="Card colour" value={n.color || '#0f2650'} onChange={(c) => edit((d) => { d.notice.color = c }, 'nc')} />}
      {(n.look || 'auto') !== 'auto' && <SliderField label="How solid" value={n.strength ?? 0.85} min={0.3} max={1} step={0.05} onChange={(v) => edit((d) => { d.notice.strength = v }, 'ns')} lo="See-through" hi="Solid" />}
    </div>
  )
}

// The notice's position: nine quick spots on a little banner, and two sliders for anything in between.
function NoticePlacer({ design, edit }) {
  const nx = design.notice.x ?? (design.layout === 'mirrored' ? 0 : 100)
  const ny = design.notice.y
  const word = (v, lo, mid, hi) => (v === 0 ? lo : v === 50 ? mid : hi)
  return (
    <fieldset disabled={design.layout === 'centred'} className="flex flex-col gap-3 disabled:opacity-40">
      <div className="flex items-center gap-4">
        <div className="grid w-32 grid-cols-3 gap-1 rounded-lg bg-[#1c448a] p-1.5" role="group" aria-label="Quick spots for the notice">
          {[0, 50, 100].flatMap((yy) =>
            [0, 50, 100].map((xx) => (
              <button
                key={`${xx},${yy}`}
                type="button"
                aria-label={`Notice ${word(yy, 'top', 'middle', 'bottom')} ${word(xx, 'left', 'centre', 'right')}`}
                aria-pressed={nx === xx && ny === yy}
                onClick={() => edit((d) => { d.notice.x = xx; d.notice.y = yy })}
                className={`h-6 rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${nx === xx && ny === yy ? 'bg-[#7fe3d6]' : 'bg-white/25 hover:bg-white/45'}`}
              />
            )),
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => edit((d) => { d.notice.x = null; d.notice.y = 0 })}>Back to the usual spot</Button>
      </div>
      <SliderField label="Across" value={nx} min={0} max={100} step={1} onChange={(v) => edit((d) => { d.notice.x = v }, 'nx')} lo="Left" hi="Right" />
      <SliderField label="Up and down" value={ny} min={0} max={100} step={1} onChange={(v) => edit((d) => { d.notice.y = v }, 'ny')} lo="Top" hi="Bottom" />
    </fieldset>
  )
}

export default function BannerEventEditorPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const copyFrom = search.get('copy')
  const mayView = can(user, MENU_KEY, 'view')
  const mayWrite = isNew ? can(user, MENU_KEY, 'add') : can(user, MENU_KEY, 'edit')

  const [loading, setLoading] = useState(!isNew || !!copyFrom)
  const [failed, setFailed] = useState(false)
  const [meta, setMeta] = useState(blankMeta)
  const [doc, setDoc] = useState({ design: cloneDesign(DEFAULT_DESIGN), past: [], future: [] })
  const docRef = useRef(doc)
  const lastEdit = useRef({ key: '', at: 0 })
  const [saved, setSaved] = useState(() => ({ meta: blankMeta(), design: cloneDesign(DEFAULT_DESIGN) }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('when')
  const [size, setSize] = useState('wide')
  const [showNotice, setShowNotice] = useState(true)
  const [eventId, setEventId] = useState(isNew ? null : id)
  const [selectedId, setSelectedId] = useState(null)
  const fromTemplate = useRef(null) // TEMPORARY (with the copy button below): the template this design was started from
  const [templatesOpen, setTemplatesOpen] = useState(isNew && !copyFrom) // a new event starts by offering the templates
  const [zones, setZones] = useState(true)
  const [keepRatio, setKeepRatio] = useState(true)
  const gesture = useRef(true) // has the current drag already been recorded as one Undo step?

  const design = doc.design
  const setDocBoth = (next) => {
    docRef.current = next
    setDoc(next)
  }
  // Every change goes through here so Undo and Redo work. Changes of the same kind in quick succession (a slider being
  // dragged) count as one step.
  const edit = useCallback((mutate, key = '') => {
    const cur = docRef.current
    const next = cloneDesign(cur.design)
    mutate(next)
    const now = Date.now()
    const together = key && lastEdit.current.key === key && now - lastEdit.current.at < 700
    lastEdit.current = { key, at: now }
    setDocBoth({ design: next, past: together ? cur.past : [...cur.past.slice(-49), cur.design], future: [] })
  }, [])
  const undo = useCallback(() => {
    const { design: d, past, future } = docRef.current
    if (past.length) setDocBoth({ design: past[past.length - 1], past: past.slice(0, -1), future: [d, ...future] })
  }, [])
  const redo = useCallback(() => {
    const { design: d, past, future } = docRef.current
    if (future.length) setDocBoth({ design: future[0], past: [...past, d], future: future.slice(1) })
  }, [])
  // Shapes: every change is an ordinary edit (so Undo works), except a drag, which counts as one step however long it is.
  const updateLayer = useCallback((id, patch, key) => edit((d) => {
    const l = d.layers.find((x) => x.id === id)
    if (!l) return
    Object.assign(l, patch)
    Object.keys(l).forEach((k) => l[k] === undefined && delete l[k]) // a cleared setting (no blend, no outline) leaves the design
    if (l.type === 'text') Object.assign(l, textBox(l)) // the box follows the words
  }, key || `layer-${id}`), [edit])
  const liveLayer = useCallback((id, patch) => {
    const cur = docRef.current
    const next = cloneDesign(cur.design)
    Object.assign(next.layers.find((l) => l.id === id) || {}, patch)
    const past = gesture.current ? cur.past : [...cur.past.slice(-49), cur.design]
    gesture.current = true
    setDocBoth({ design: next, past, future: [] })
  }, [])
  const addLayer = useCallback((type) => {
    const cur = docRef.current.design
    if (cur.layers.length >= MAX_LAYERS) return
    const id = newLayerId()
    const fill = toneOf(cur) === 'light' ? '#1c448a' : '#fde68a'
    edit((d) => { d.layers.push(defaultLayer(type, id, fill, d.layers.length)) })
    setSelectedId(id)
  }, [edit])
  const addPicture = useCallback((asset) => {
    const cur = docRef.current.design
    if (cur.layers.length >= MAX_LAYERS || cur.layers.filter((l) => l.type === 'picture').length >= MAX_PICTURES) return
    const id = newLayerId()
    edit((d) => { d.layers.push(pictureLayer(asset, id, d.layers.length)) })
    setSelectedId(id)
  }, [edit])
  const addText = useCallback(() => {
    const cur = docRef.current.design
    if (cur.layers.length >= MAX_LAYERS) return
    const id = newLayerId()
    edit((d) => { d.layers.push(defaultText(id, toneOf(cur) === 'light' ? '#0f2650' : '#ffffff', d.layers.length)) })
    setSelectedId(id)
  }, [edit])
  const scatter = useCallback((opts) => {
    const cur = docRef.current.design
    const room = MAX_LAYERS - cur.layers.length
    const count = Math.min(opts.count, room)
    if (count <= 0) return
    const made = scatterLayers({ ...opts, count, layout: cur.layout, ids: Array.from({ length: count }, (_, i) => `${newLayerId()}${i}`) })
    edit((d) => { d.layers.push(...made) })
    setSelectedId(null)
  }, [edit])
  // Starting from a template: its design replaces the current one (Undo brings the old one back); the name and the dates are
  // filled in only where the person has not already chosen them.
  const pickTemplate = useCallback((t) => {
    setTemplatesOpen(false)
    fromTemplate.current = t ? t.key : null
    if (!t) return
    edit((d) => Object.assign(d, cloneDesign(t.design)), 'template')
    setSelectedId(null)
    setMeta((m) => {
      const dates = templateDates(t)
      const untouched = m.starts_on === localDateStr() && m.ends_on === localDateStr()
      return { ...m, name: m.name || t.label, repeat_yearly: t.when ? 'Y' : m.repeat_yearly, ...(dates && untouched ? dates : {}) }
    })
  }, [edit])
  const removeLayer = useCallback((id) => {
    edit((d) => { d.layers = d.layers.filter((l) => l.id !== id) })
    setSelectedId((s) => (s === id ? null : s))
  }, [edit])
  const duplicateLayer = useCallback((id) => {
    const cur = docRef.current.design
    const src = cur.layers.find((l) => l.id === id)
    if (!src || cur.layers.length >= MAX_LAYERS) return
    const copy = { ...src, id: newLayerId(), x: Math.min(1300, src.x + 24), y: Math.min(460, src.y + 24) }
    edit((d) => { d.layers.splice(d.layers.findIndex((l) => l.id === id) + 1, 0, copy) })
    setSelectedId(copy.id)
  }, [edit])
  const moveLayer = useCallback((id, dir) => edit((d) => {
    const i = d.layers.findIndex((l) => l.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= d.layers.length) return
    ;[d.layers[i], d.layers[j]] = [d.layers[j], d.layers[i]]
  }), [edit])

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (typing || !selectedId || tab !== 'shapes') return
      const l = docRef.current.design.layers.find((x) => x.id === selectedId)
      if (!l) return
      const step = e.shiftKey ? 10 : 1
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (moves[e.key]) {
        e.preventDefault()
        updateLayer(selectedId, { x: Math.min(1300, Math.max(-100, l.x + moves[e.key][0])), y: Math.min(460, Math.max(-100, l.y + moves[e.key][1])) }, `nudge-${selectedId}`)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeLayer(selectedId)
      } else if (e.key === 'Escape') setSelectedId(null)
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateLayer(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedId, tab, updateLayer, removeLayer, duplicateLayer])

  // Open an existing event, or the one being copied.
  useEffect(() => {
    const source = isNew ? copyFrom : id
    if (!source || !mayView) return undefined
    let cancelled = false
    apiFetch(`/api/admin/banner-events/${source}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((ev) => {
        if (cancelled) return
        const d = withDefaults(ev.design)
        let m = { name: ev.name, starts_on: ev.starts_on, ends_on: ev.ends_on, repeat_yearly: ev.repeat_yearly, priority: ev.priority, is_published: ev.is_published }
        if (isNew) m = { ...blankMeta(), name: `Copy of ${ev.name}`, repeat_yearly: ev.repeat_yearly, priority: ev.priority, is_published: 'N' }
        setMeta(m)
        setDocBoth({ design: d, past: [], future: [] })
        setSaved(isNew ? { meta: blankMeta(), design: cloneDesign(DEFAULT_DESIGN) } : { meta: m, design: cloneDesign(d) })
        setLoading(false)
      })
      .catch(() => !cancelled && (setFailed(true), setLoading(false)))
    return () => {
      cancelled = true
    }
  }, [id, isNew, copyFrom, mayView])

  const dirty = !sameJson(meta, saved.meta) || !sameJson(design, saved.design)
  const firstName = (user?.display_name || user?.username || '').split(' ')[0]
  const greeting = useMemo(() => pickGreeting(firstName), [firstName])
  const read = readability(design)
  const tone = toneOf(design)
  const look = noticeLook(design.notice, tone) // the notice card's own look, if the design gives it one
  // Wide screen shows the banner at the width the home page really gives it
  // (the window minus the collapsed sidebar and the page margins), scaled to fit.
  const [winW, setWinW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setWinW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const width = size === 'wide' ? Math.max(1100, winW - 110) : SIZES.find((s) => s.key === size).width
  const setM = (patch) => setMeta((m) => ({ ...m, ...patch }))

  async function save() {
    const next = {}
    if (!meta.name.trim()) next.name = 'Give the event a name.'
    if (!meta.starts_on) next.starts_on = 'Choose the first day.'
    if (!meta.ends_on) next.ends_on = 'Choose the last day.'
    else if (meta.starts_on && meta.ends_on < meta.starts_on) next.ends_on = 'The last day cannot be before the first day.'
    setErrors(next)
    if (Object.keys(next).length) {
      setTab('when')
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch(eventId ? `/api/admin/banner-events/${eventId}/` : '/api/admin/banner-events/', {
        method: eventId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...meta, name: meta.name.trim(), design }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const fe = buildFieldErrors(data)
        setErrors(fe)
        if (fe.name || fe.starts_on || fe.ends_on) setTab('when')
        toast.error(fe.design || fe.name || fe.ends_on || "The banner wasn't saved. Please check the settings and try again.")
        return
      }
      setSaved({ meta: { ...meta, name: meta.name.trim() }, design: cloneDesign(design) })
      setErrors({})
      toast.success(meta.is_published === 'Y' ? 'Saved. It shows on its days.' : 'Saved as a draft.')
      if (!eventId) {
        setEventId(String(data.event_id))
        navigate(`/admin/banner-events/${data.event_id}`, { replace: true })
      }
    } catch {
      toast.error("The banner wasn't saved. Please check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  function leave() {
    if (dirty && !window.confirm('You have changes that are not saved. Leave without saving?')) return
    navigate('/admin/banner-events')
  }

  if (!mayView) return <AccessDenied />
  if (loading) return <RigLoading />
  if (failed) return <p className="py-10 text-center text-sm text-muted-foreground">Could not open this event. It may have been deleted.</p>

  return (
    <div className="flex flex-col gap-4">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <Button variant="ghost" size="sm" onClick={leave}><ArrowLeft /> All events</Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold tracking-tight">{meta.name || (isNew ? 'New banner event' : 'Banner event')}</p>
          <p className="text-xs text-muted-foreground">{dirty ? 'You have unsaved changes' : 'All changes saved'}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={undo} disabled={!doc.past.length} aria-label="Undo"><Undo2 /></Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!doc.future.length} aria-label="Redo"><Redo2 /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}><Sparkles /> Templates</Button>
        {import.meta.env.DEV && (
          // TEMPORARY, development only: copies the whole design as JSON (and logs it) so template tweaks can be pasted back to be applied in code.
          <Button variant="outline" size="sm" title="Development only: copy this design as JSON" onClick={() => {
            const out = JSON.stringify({ template: fromTemplate.current, name: meta.name, design }, null, 1)
            console.log(out)
            navigator.clipboard?.writeText(out).then(() => toast.success('Design copied to the clipboard'), () => toast.error('Could not copy; it is in the console instead'))
          }}>
            <Copy /> Copy design
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => edit((d) => Object.assign(d, cloneDesign(DEFAULT_DESIGN), { text: d.text, layers: d.layers, layout: d.layout }), 'reset')} title="Put the colours, pattern and lines back to the normal banner look (your words and shapes are kept)">
          <RotateCcw /> Normal look
        </Button>
        {eventId && (
          <Link to={`/?bannerPreview=${eventId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Eye /> See it on my home page
          </Link>
        )}
        {mayWrite && <Button onClick={save} disabled={saving || (!dirty && !!eventId)}>{saving ? 'Saving…' : 'Save'}</Button>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        {/* the live preview */}
        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-2 xl:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Choice label="Preview size" value={size} onChange={setSize} options={SIZES} />
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showNotice} onChange={(e) => setShowNotice(e.target.checked)} /> Show a sample notice
            </label>
          </div>
          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <FitPreview width={width} fluid={size === 'wide'} center={size === 'phone'}>
              <BannerView
                design={design}
                firstName={firstName}
                todayLabel={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                fallbackTitle={greeting.title}
                fallbackSub={greeting.sub}
                lastSigned="15 Oct, 11:53"
                search={<FakeSearch />}
                notice={showNotice ? <NoticeCard notice={SAMPLE_NOTICE} tone={look.tone} look={look} /> : null}
                zones={tab === 'shapes' && zones}
                overlay={tab === 'shapes' ? <ShapeCanvas layers={design.layers} selectedId={selectedId} onSelect={setSelectedId} onStart={() => { gesture.current = false }} onLive={liveLayer} align={shapesAlign(design.layout)} /> : null}
              />
            </FitPreview>
          </div>
          {!read.ok && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <span className="flex-1">The words may be hard to read on this background. {design.text.color ? 'Letting the editor choose the text colour usually fixes it.' : 'Try making the background lighter or darker.'}</span>
              {design.text.color && <Button size="sm" variant="outline" onClick={() => edit((d) => { d.text.color = null })}>Fix it for me</Button>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">This is how the banner will look on its days, with the real search box and any live notice. Nothing is shown to others until you save with “Published”.</p>
        </div>

        {/* the settings */}
        <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap gap-1 border-b border-border p-2" role="tablist" aria-label="Banner settings">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <fieldset disabled={!mayWrite} className="flex flex-col gap-6 p-4">
            {tab === 'when' && (
              <>
                <Section title="Name this event" hint="Only you and other admins see the name.">
                  <Input value={meta.name} maxLength={80} onChange={(e) => setM({ name: e.target.value })} placeholder="For example, Republic Day" aria-label="Event name" aria-invalid={!!errors.name} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </Section>
                <Section title="Which days?" hint="The banner changes from the first day to the last day, both included.">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="be-from">First day</Label>
                      <Input id="be-from" type="date" value={meta.starts_on} onChange={(e) => setM({ starts_on: e.target.value, ends_on: meta.ends_on < e.target.value ? e.target.value : meta.ends_on })} />
                      {errors.starts_on && <p className="text-xs text-destructive">{errors.starts_on}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="be-to">Last day</Label>
                      <Input id="be-to" type="date" min={meta.starts_on} value={meta.ends_on} onChange={(e) => setM({ ends_on: e.target.value })} aria-invalid={!!errors.ends_on} />
                      {errors.ends_on && <p className="text-xs text-destructive">{errors.ends_on}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Quick:</span>
                    {DURATIONS.map(([label, n]) => (
                      <Button key={label} type="button" variant="outline" size="xs" onClick={() => setM({ ends_on: addDays(meta.starts_on || localDateStr(), n) })}>{label}</Button>
                    ))}
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={meta.repeat_yearly === 'Y'} onChange={(e) => setM({ repeat_yearly: e.target.checked ? 'Y' : 'N' })} />
                    Repeat every year on the same dates
                  </label>
                </Section>
                <Section title="If two events fall on the same day" hint="The one with the higher importance is shown.">
                  <Choice label="Importance" value={meta.priority} onChange={(v) => setM({ priority: v })} options={PRIORITIES} />
                </Section>
                <Section title="Is it ready?">
                  <Choice label="Status" value={meta.is_published} onChange={(v) => setM({ is_published: v })} options={[{ key: 'Y', label: 'Published' }, { key: 'N', label: 'Draft' }]} />
                  <p className="text-xs text-muted-foreground">{meta.is_published === 'Y' ? 'It shows for everyone on its days.' : 'A draft is not shown to anyone. Use “See it on my home page” to check it.'}</p>
                </Section>
              </>
            )}

            {tab === 'words' && (
              <>
                <Section title="Greeting" hint="Leave it empty to keep the usual greeting.">
                  <Input value={design.text.greeting} maxLength={80} onChange={(e) => edit((d) => { d.text.greeting = e.target.value }, 'greeting')} placeholder={greeting.title} aria-label="Greeting" />
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="outline" size="xs" onClick={() => edit((d) => { d.text.greeting = `${d.text.greeting}${d.text.greeting && !d.text.greeting.endsWith(' ') ? ' ' : ''}{name}`.slice(0, 80) })}>Add the person’s name</Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => edit((d) => { d.text.greeting = `${d.text.greeting}${d.text.greeting && !d.text.greeting.endsWith(' ') ? ' ' : ''}{date}`.slice(0, 80) })}>Add today’s date</Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => edit((d) => { d.text.greeting = `${d.text.greeting}${d.text.greeting && !d.text.greeting.endsWith(' ') ? ' ' : ''}{newyear}`.slice(0, 80) })}>Add the coming year</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">For example “Happy Republic Day, {'{name}'}”. Each person sees their own first name.</p>
                </Section>
                <Section title="Message" hint="A line under the greeting.">
                  <Textarea rows={3} value={design.text.message} maxLength={200} onChange={(e) => edit((d) => { d.text.message = e.target.value }, 'message')} placeholder="Wishing every crew a safe and proud day." aria-label="Message" />
                  <p className="text-right text-[11px] text-muted-foreground">{design.text.message.length}/200</p>
                </Section>
                <Section title="Greeting font" hint="The look of the big greeting. The picture and the live banner update straight away.">
                  <FontPicker label="Greeting font" value={design.text.titleFont} onChange={(v) => edit((d) => { d.text.titleFont = v })} />
                </Section>
                <Section title="Message font" hint="The look of the line under the greeting.">
                  <FontPicker label="Message font" value={design.text.bodyFont} onChange={(v) => edit((d) => { d.text.bodyFont = v })} />
                </Section>
                <Section title="Small tag" hint="A short label shown as a pill, like “Safety week”.">
                  <Input value={design.text.caption} maxLength={40} onChange={(e) => edit((d) => { d.text.caption = e.target.value }, 'caption')} placeholder="Optional" aria-label="Small tag" />
                </Section>
                <Section title="Text colour">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!design.text.color} onChange={(e) => edit((d) => { d.text.color = e.target.checked ? null : autoTextColor(d) })} />
                    Let the editor choose, so it is always readable (recommended)
                  </label>
                  {design.text.color && <ColorField value={design.text.color} onChange={(c) => edit((d) => { d.text.color = c }, 'textcolor')} />}
                </Section>
              </>
            )}

            {tab === 'colours' && (
              <>
                <Section title="Start from a ready-made look" hint="This sets the colours, pattern and lines. Your words are kept.">
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((p) => (
                      <button key={p.key} type="button" onClick={() => edit((d) => Object.assign(d, applyPreset(d, p)))} className="overflow-hidden rounded-lg border border-border text-left text-xs font-medium outline-none transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="h-9 w-full" style={{ background: backgroundCss({ background: p.background }) }} />
                        <div className="px-2 py-1.5">{p.label}</div>
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="Background">
                  <Choice label="Background type" value={design.background.type} onChange={(v) => edit((d) => { d.background.type = v; if (v === 'gradient' && d.background.colors.length < 2) d.background.colors = [d.background.colors[0], '#0f2650'] })} options={[{ key: 'solid', label: 'One colour' }, { key: 'gradient', label: 'Blend of colours' }]} />
                  {(design.background.type === 'solid' ? design.background.colors.slice(0, 1) : design.background.colors).map((c, i) => (
                    <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                      <ColorField label={design.background.type === 'solid' ? 'Colour' : `Colour ${i + 1}`} value={c} onChange={(v) => edit((d) => { d.background.colors[i] = v }, `bg${i}`)} />
                      {design.background.type === 'gradient' && design.background.colors.length > 2 && (
                        <Button type="button" variant="ghost" size="xs" className="self-start" onClick={() => edit((d) => { d.background.colors.splice(i, 1) })}>Remove this colour</Button>
                      )}
                    </div>
                  ))}
                  {design.background.type === 'gradient' && design.background.colors.length < 3 && (
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => edit((d) => { d.background.colors.push('#3dbdb0') })}>Add a third colour</Button>
                  )}
                  {design.background.type === 'gradient' && (
                    <SliderField label="Direction of the blend" value={design.background.angle} min={0} max={360} step={5} onChange={(v) => edit((d) => { d.background.angle = v }, 'angle')} lo="Top to bottom" hi="Round full circle" />
                  )}
                </Section>
                <Section title="Search box tint" hint="A light, soft tint so the search box sits comfortably in the theme. White is the default, and it always stays light so the words stay readable.">
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Search box tint">
                    {SOFT_TINTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => edit((d) => { d.search.tint = c }, 'tint')}
                        aria-label={`Use the tint ${c}`}
                        aria-pressed={design.search.tint.toLowerCase() === c}
                        className={`h-7 w-7 rounded-full border border-black/15 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring ${design.search.tint.toLowerCase() === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        style={{ background: c }}
                      />
                    ))}
                    <label className="relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-2 text-xs text-muted-foreground hover:bg-muted">
                      <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: 'conic-gradient(#fecaca, #fde68a, #bbf7d0, #bae6fd, #ddd6fe, #fbcfe8, #fecaca)' }} />
                      Any light colour
                      <input type="color" value={design.search.tint} onChange={(e) => edit((d) => { d.search.tint = softenTint(e.target.value) }, 'tint')} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Pick any light colour for the search box" />
                    </label>
                  </div>
                </Section>
                <Section title="Edge around the banner" hint="A thin edge and soft shadow so the banner stands out from the page. Automatic adds one to a light banner by itself.">
                  <Choice label="Edge" value={design.frame.mode} onChange={(v) => edit((d) => { d.frame.mode = v })} options={[{ key: 'auto', label: 'Automatic' }, { key: 'on', label: 'Always' }, { key: 'off', label: 'None' }]} />
                  {design.frame.mode !== 'off' && (
                    <>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!design.frame.color} onChange={(e) => edit((d) => { d.frame.color = e.target.checked ? '#475569' : null })} /> Choose the edge colour myself
                      </label>
                      {design.frame.color && <ColorField label="Edge colour" value={design.frame.color} onChange={(c) => edit((d) => { d.frame.color = c }, 'fcolor')} />}
                    </>
                  )}
                </Section>
              </>
            )}

            {tab === 'pattern' && (
              <>
                <Section title="Choose a pattern" hint="A soft pattern over the background.">
                  <div className="grid grid-cols-3 gap-2">
                    {PATTERNS.map((p) => (
                      <PatternChip key={p.key} pattern={p} design={design} active={design.pattern.type === p.key} onPick={() => edit((d) => { d.pattern.type = p.key })} />
                    ))}
                  </div>
                </Section>
                {design.pattern.type !== 'none' && (
                  <Section title="Adjust it">
                    <ColorField label="Pattern colour" value={design.pattern.color} onChange={(c) => edit((d) => { d.pattern.color = c }, 'pcolor')} />
                    <SliderField label="How strong" value={design.pattern.opacity} min={0.03} max={0.5} step={0.01} onChange={(v) => edit((d) => { d.pattern.opacity = v }, 'popacity')} lo="Subtle" hi="Strong" />
                    <SliderField label="How big" value={design.pattern.scale} min={0.5} max={3} step={0.1} onChange={(v) => edit((d) => { d.pattern.scale = v }, 'pscale')} lo="Small" hi="Large" />
                  </Section>
                )}
              </>
            )}

            {tab === 'lines' && <EdgesPanel edges={design.edges} edit={edit} />}

            {tab === 'lines' && (
              <Section title="Contour lines" hint="The wavy chart-like lines behind the greeting.">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={design.contours.on} onChange={(e) => edit((d) => { d.contours.on = e.target.checked })} /> Show contour lines
                </label>
                {design.contours.on && (
                  <>
                    <ColorField label="Line colour" value={design.contours.color} onChange={(c) => edit((d) => { d.contours.color = c }, 'ccolor')} />
                    <SliderField label="How strong" value={design.contours.opacity} min={0.04} max={0.4} step={0.01} onChange={(v) => edit((d) => { d.contours.opacity = v }, 'copacity')} lo="Subtle" hi="Strong" />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">How many lines</span>
                      <Choice label="How many lines" value={design.contours.density} onChange={(v) => edit((d) => { d.contours.density = v })} options={[{ key: 1, label: 'Few' }, { key: 2, label: 'Some' }, { key: 3, label: 'Many' }]} />
                    </div>
                  </>
                )}
              </Section>
            )}

            {tab === 'shapes' && (
              <ShapesPanel
                layers={design.layers}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={addLayer}
                onAddText={addText}
                onAddPicture={addPicture}
                onScatter={scatter}
                onUpdate={updateLayer}
                onRemove={removeLayer}
                onDuplicate={duplicateLayer}
                onMove={moveLayer}
                zones={zones}
                onZones={setZones}
                keepRatio={keepRatio}
                onKeepRatio={setKeepRatio}
              />
            )}

            {tab === 'layout' && (
              <>
                <Section title="Where things go" hint="The search box is always there. The layout decides where it and the notice sit.">
                  <div className="grid grid-cols-3 gap-2">
                    {LAYOUTS.map((l) => (
                      <button key={l.key} type="button" onClick={() => edit((d) => { d.layout = l.key })} aria-pressed={design.layout === l.key} className={`rounded-lg border p-2 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${design.layout === l.key ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-foreground/30'}`}>
                        <LayoutPicture layout={l.key} />
                        <div className="mt-1">{l.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{LAYOUTS.find((l) => l.key === design.layout)?.hint}</p>
                </Section>
                <Section title="What the notice card looks like" hint="Use a dark or light card when a picture behind the notice makes it hard to read. The words on the card change to suit it.">
                  <NoticeLookControls design={design} edit={edit} />
                </Section>
                <Section title="Where the notice sits" hint={design.layout === 'centred' ? 'In the Centred layout the notice goes underneath, so this does not apply.' : 'Move the notice anywhere on the banner to keep it clear of the artwork. Pick a spot below, or fine-tune with the sliders.'}>
                  <NoticePlacer design={design} edit={edit} />
                </Section>
                <Section title="Extras">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={design.showLastSignIn} onChange={(e) => edit((d) => { d.showLastSignIn = e.target.checked })} /> Show “Last signed in”
                  </label>
                </Section>
              </>
            )}
          </fieldset>
        </div>
      </div>
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} onPick={pickTemplate} />
    </div>
  )
}
