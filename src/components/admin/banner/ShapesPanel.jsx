import { useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Shuffle, Trash2, Type } from 'lucide-react'
import { CATEGORIES, FONTS, MAX_LAYERS, SHAPES, SHAPE_SETTINGS, shapeInfo } from '@/lib/bannerShapes'
import { ShapeGlyph } from '@/components/home/BannerShapes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isArt } from '@/lib/bannerArt'
import { Choice, ColorField, Section, SliderField } from '@/components/admin/banner/controls'

const SCATTERABLE = SHAPES.filter((s) => s.key !== 'line' && s.key !== 'wave')

// The Shapes tab: add a shape or a text label, pick one to change, scatter a handful, and tidy the stack. Dragging on the
// preview does the same by hand.
export default function ShapesPanel({ layers, selectedId, onSelect, onAdd, onAddText, onUpdate, onRemove, onDuplicate, onMove, onScatter, zones, onZones, keepRatio, onKeepRatio }) {
  const [cat, setCat] = useState('basic')
  const [sc, setSc] = useState({ type: 'star', count: 12, minW: 18, maxW: 46, mix: true, color: '#fde68a', rotate: true, vary: true, avoid: true })
  const sel = layers.find((l) => l.id === selectedId)
  const room = MAX_LAYERS - layers.length
  const full = room <= 0
  const settings = sel ? SHAPE_SETTINGS[sel.type] || [] : []
  const isText = sel?.type === 'text'
  const picture = !!sel && isArt(sel.type)
  const set = (patch, key) => onUpdate(sel.id, patch, key ? `${key}-${sel.id}` : undefined)
  const setSize = (key, v) => {
    if (keepRatio && key === 'w') set({ w: v, h: Math.max(2, Math.round((sel.h * v) / sel.w)) }, 'size')
    else if (keepRatio && key === 'h') set({ h: v, w: Math.max(2, Math.round((sel.w * v) / sel.h)) }, 'size')
    else set({ [key]: v }, 'size')
  }
  const shown = SHAPES.filter((s) => s.cat === cat)
  const count = Math.min(sc.count, Math.max(room, 0))

  return (
    <>
      <Section title="Add to the banner" hint="Click one and it appears. Then drag it where you want it.">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Kinds of shape">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" role="tab" aria-selected={cat === c.key} onClick={() => setCat(c.key)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${cat === c.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {shown.map((s) => (
            <button key={s.key} type="button" disabled={full} onClick={() => onAdd(s.key)} title={s.label} className="flex flex-col items-center gap-0.5 rounded-lg border border-border p-1.5 text-[10px] font-medium text-muted-foreground outline-none transition-colors hover:border-foreground/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
              <ShapeGlyph type={s.key} size={34} />
              <span className="w-full truncate text-center">{s.label}</span>
            </button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="self-start" disabled={full} onClick={onAddText}><Type /> Add some text</Button>
        {full && <p className="text-xs text-amber-700 dark:text-amber-300">That is the most a banner can hold ({MAX_LAYERS}). Remove one to add another.</p>}
        <p className="text-xs text-muted-foreground">On the preview: drag to move, drag a corner to resize, drag the round handle to turn. Arrow keys nudge (Shift for bigger steps), Delete removes.</p>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={zones} onChange={(e) => onZones(e.target.checked)} /> Show where the words and search go
        </label>
      </Section>

      {sel && (
        <Section title={isText ? 'Change this text' : `Change this ${shapeInfo(sel.type).label.toLowerCase()}`}>
          {isText && (
            <>
              <Input value={sel.text} maxLength={40} onChange={(e) => set({ text: e.target.value || ' ' }, 'text')} aria-label="The words" />
              <SliderField label="Size" value={sel.size} min={10} max={200} step={1} onChange={(v) => set({ size: v }, 'tsize')} lo="Small" hi="Huge" />
              <SliderField label="Space between letters" value={sel.spacing ?? 0} min={0} max={20} step={0.5} onChange={(v) => set({ spacing: v }, 'spacing')} lo="Tight" hi="Wide" />
              <div className="flex flex-wrap items-center gap-3">
                <Choice label="Style of letters" value={sel.font || 'sans'} onChange={(v) => set({ font: v })} options={[{ key: 'sans', label: 'Clean' }, { key: 'serif', label: 'Classic' }]} />
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sel.bold !== false} onChange={(e) => set({ bold: e.target.checked })} /> Bold</label>
              </div>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: FONTS[sel.font || 'sans'] }}>Letters look like this.</p>
              <p className="text-xs text-muted-foreground">Type {'{newyear}'} for the coming new year or {'{year}'} for this year, and it changes by itself every year.</p>
            </>
          )}

          {picture && <p className="text-xs text-muted-foreground">This is a ready-made picture, so its colours are fixed. You can move, resize, turn and fade it.</p>}
          {!picture && (<>
          <Choice label="Fill" value={sel.fill2 ? 'blend' : 'solid'} onChange={(v) => set(v === 'blend' ? { fill2: '#ec4899', grad: sel.grad ?? 90 } : { fill2: undefined, grad: undefined })} options={[{ key: 'solid', label: 'One colour' }, { key: 'blend', label: 'Blend of two' }]} />
          <ColorField label={sel.fill2 ? 'First colour' : 'Colour'} value={sel.fill} onChange={(c) => set({ fill: c }, 'fill')} />
          {sel.fill2 && (
            <>
              <ColorField label="Second colour" value={sel.fill2} onChange={(c) => set({ fill2: c }, 'fill2')} />
              <SliderField label="Direction of the blend" value={sel.grad ?? 90} min={0} max={360} step={5} onChange={(v) => set({ grad: v }, 'grad')} lo="Left to right" hi="Round full circle" />
            </>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={!!sel.stroke} onChange={(e) => set(e.target.checked ? { stroke: '#111827', sw: 4 } : { stroke: undefined, sw: undefined })} /> Add an outline
            </label>
            {sel.stroke && (
              <>
                <ColorField label="Outline colour" value={sel.stroke} onChange={(c) => set({ stroke: c }, 'stroke')} />
                <SliderField label="Outline thickness" value={sel.sw ?? 4} min={1} max={30} step={1} onChange={(v) => set({ sw: v }, 'sw')} lo="Thin" hi="Thick" />
              </>
            )}
          </div>
          </>)}

          <SliderField label="How solid" value={sel.opacity} min={0.05} max={1} step={0.05} onChange={(v) => set({ opacity: v }, 'op')} lo="See-through" hi="Solid" />
          {!isText && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <SliderField label="Width" value={sel.w} min={4} max={1200} step={1} onChange={(v) => setSize('w', v)} lo="Narrow" hi="Wide" />
              <SliderField label="Height" value={sel.h} min={2} max={600} step={1} onChange={(v) => setSize('h', v)} lo="Short" hi="Tall" />
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={keepRatio} onChange={(e) => onKeepRatio(e.target.checked)} /> Keep the shape’s proportions
              </label>
            </div>
          )}
          <SliderField label="Turn" value={sel.rot} min={-180} max={180} step={1} onChange={(v) => set({ rot: v }, 'rot')} lo="Left" hi="Right" />
          {settings.map((st) => (
            <SliderField key={st.key} label={st.label} value={sel[st.key] ?? shapeInfo(sel.type)[st.key]} min={st.min} max={st.max} step={st.step} onChange={(v) => set({ [st.key]: v }, st.key)} lo={st.lo} hi={st.hi} />
          ))}
          <div className="grid grid-cols-2 gap-3">
            <SliderField label="Across" value={sel.x} min={-100} max={1300} step={1} onChange={(v) => set({ x: v }, 'x')} lo="Left" hi="Right" />
            <SliderField label="Up and down" value={sel.y} min={-100} max={460} step={1} onChange={(v) => set({ y: v }, 'y')} lo="Top" hi="Bottom" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => onMove(sel.id, 1)}><ArrowUp /> Bring forward</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onMove(sel.id, -1)}><ArrowDown /> Send back</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onDuplicate(sel.id)} disabled={full}><Copy /> Copy</Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => onRemove(sel.id)}><Trash2 /> Delete</Button>
          </div>
        </Section>
      )}

      <Section title="Scatter" hint="Sprinkle a handful of one shape over the banner, like confetti, stars or leaves. Each one can still be moved or changed afterwards.">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium" htmlFor="sc-shape">Shape</label>
          <select id="sc-shape" value={sc.type} onChange={(e) => setSc({ ...sc, type: e.target.value })} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
            {SCATTERABLE.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <SliderField label="How many" value={sc.count} min={3} max={40} step={1} onChange={(v) => setSc({ ...sc, count: v })} lo="A few" hi="Lots" />
        <SliderField label="Smallest size" value={sc.minW} min={8} max={120} step={1} onChange={(v) => setSc({ ...sc, minW: v, maxW: Math.max(sc.maxW, v) })} lo="Tiny" hi="Big" />
        <SliderField label="Biggest size" value={sc.maxW} min={8} max={160} step={1} onChange={(v) => setSc({ ...sc, maxW: v, minW: Math.min(sc.minW, v) })} lo="Tiny" hi="Big" />
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sc.mix} onChange={(e) => setSc({ ...sc, mix: e.target.checked })} /> Use a mix of cheerful colours</label>
        {!sc.mix && <ColorField label="Colour" value={sc.color} onChange={(c) => setSc({ ...sc, color: c })} />}
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sc.rotate} onChange={(e) => setSc({ ...sc, rotate: e.target.checked })} /> Turn each one a different way</label>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sc.vary} onChange={(e) => setSc({ ...sc, vary: e.target.checked })} /> Make some more see-through</label>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sc.avoid} onChange={(e) => setSc({ ...sc, avoid: e.target.checked })} /> Keep clear of the words and notice</label>
        <Button type="button" size="sm" className="self-start" disabled={full} onClick={() => onScatter({ ...sc, count, fills: [sc.color] })}>
          <Shuffle /> Scatter {count} {shapeInfo(sc.type).label.toLowerCase()}{count === 1 ? '' : 's'}
        </Button>
        <p className="text-xs text-muted-foreground">Not happy with it? Undo, and scatter again for a different arrangement.</p>
      </Section>

      <Section title={`On the banner (${layers.length})`} hint={layers.length ? 'The top of the list is in front. Click one to change it.' : 'Nothing yet. Add a shape above.'}>
        <ul className="flex flex-col gap-1">
          {[...layers].reverse().map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => onSelect(l.id)} aria-pressed={l.id === selectedId} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${l.id === selectedId ? 'border-primary bg-primary/8' : 'border-border hover:bg-muted'}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted"><ShapeGlyph type={l.type} fill={l.fill} size={24} /></span>
                <span className="truncate">{l.type === 'text' ? `“${l.text}”` : shapeInfo(l.type).label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
