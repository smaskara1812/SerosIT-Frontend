import { MousePointerClick, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EFFECTS, GLOWS, ICONS, KINDS, MAX_ACTIONS, SHAPES, SIZES, STYLES, lookOf, newAction, runAction } from '@/lib/bannerActions'
import { navSections } from '@/config/nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Choice, ColorField, Section, SliderField } from '@/components/admin/banner/controls'

const pages = navSections.filter((i) => i.path).map((i) => ({ path: i.path, label: i.label }))

// Buttons on the banner. Every event has its own, so the same button can be added to any occasion, whichever template it started from.
export default function ActionsPanel({ actions, edit }) {
  const set = (i, fn, key) => edit((d) => { fn(d.actions[i]) }, key ? `${key}-${i}` : undefined)
  return (
    <Section title="Buttons" hint="A button on the banner that plays a show on the page, or opens one of the app's own pages. It shows for as long as this banner does, and can be pressed again and again.">
      {actions.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground"><MousePointerClick className="h-4 w-4" /> No buttons yet.</p>
      )}
      {actions.map((a, i) => (
        <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Button {i + 1}</span>
            <div className="flex items-center gap-1">
              {a.kind === 'effect' && <Button type="button" variant="outline" size="sm" onClick={() => runAction(a)}><Play /> Try it</Button>}
              <Button type="button" variant="ghost" size="sm" onClick={() => edit((d) => { d.actions.splice(i, 1) })}><Trash2 /> Remove</Button>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Words on the button
            <Input value={a.label} maxLength={24} onChange={(e) => set(i, (x) => { x.label = e.target.value }, 'albl')} aria-label="Words on the button" />
          </label>
          <Choice label="What it does" value={a.kind} onChange={(v) => set(i, (x) => {
            if (v === x.kind) return
            Object.assign(x, newAction(v), { id: x.id, label: x.label, color: x.color, style: x.style, size: x.size, glow: x.glow, shape: x.shape })
          })} options={KINDS} />

          {a.kind === 'effect' ? (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">Show
                <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal" value={a.effect} onChange={(ev) => set(i, (x) => { const e = EFFECTS.find((f) => f.key === ev.target.value); x.effect = e.key; x.colors = [...e.defaults.colors]; x.bursts = e.defaults.bursts })}>
                  {EFFECTS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
                <span className="text-xs font-normal text-muted-foreground">{EFFECTS.find((e) => e.key === a.effect)?.hint}</span>
              </label>
              <SliderField label={{ holi: 'How many throws', christmas: 'How snowy', newyear: 'How big the finale', flag: 'How big the shower', navratri: 'How many embers', ganesh: 'How many flowers', janmashtami: 'How many petals and drops' }[a.effect] || 'How many shells'} value={a.bursts} min={3} max={14} step={1} onChange={(v) => set(i, (x) => { x.bursts = v }, 'abur')} lo={a.effect === 'christmas' ? 'A flurry' : 'A short show'} hi={a.effect === 'christmas' ? 'A blizzard (10 or more adds a second pass)' : 'A long show'} />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{{ holi: 'Colours of the powder', christmas: 'Colours: snow, sparkle trail, then the gift wraps', newyear: 'Colours of the fireworks, sparks and confetti', flag: 'Colours: top band, middle band, bottom band, then the wheel', navratri: 'Colours of the nine nights, one for each ring', ganesh: 'Colours: lamps and glow, hibiscus, soft light, then the lotus', janmashtami: 'Colours: orbs and glow, butter, flute notes, then petals' }[a.effect] || 'Colours of the shells'}</span>
                {a.colors.map((c, k) => (
                  <div key={k} className="flex items-end gap-2">
                    <div className="flex-1"><ColorField label={`Colour ${k + 1}`} value={c} onChange={(v) => set(i, (x) => { x.colors[k] = v }, `acol${k}`)} /></div>
                    {a.colors.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Remove this colour" onClick={() => set(i, (x) => { x.colors.splice(k, 1) })}><Trash2 /></Button>}
                  </div>
                ))}
                {a.colors.length < (EFFECTS.find((e) => e.key === a.effect)?.max || 6) && <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => set(i, (x) => { x.colors.push('#ffffff') })}><Plus /> Add a colour</Button>}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-sm font-medium">Page to open
                <Input value={a.link} maxLength={100} onChange={(e) => set(i, (x) => { x.link = e.target.value }, 'alnk')} placeholder="/admin/notice-board" aria-label="Page to open" />
              </label>
              <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm" value="" onChange={(ev) => ev.target.value && set(i, (x) => { x.link = ev.target.value })} aria-label="Pick a page">
                <option value="">Or pick a page…</option>
                {pages.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Only pages inside this app. People still need the rights to open the page.</p>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
            <span className="text-sm font-semibold">How it looks</span>
            <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">Style</span><Choice label="Style" value={lookOf(a).style} onChange={(v) => set(i, (x) => { x.style = v })} options={STYLES} /></div>
            <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">Size</span><Choice label="Size" value={lookOf(a).size} onChange={(v) => set(i, (x) => { x.size = v })} options={SIZES} /></div>
            <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">Glow that invites a click</span><Choice label="Glow" value={lookOf(a).glow} onChange={(v) => set(i, (x) => { x.glow = v })} options={GLOWS} /></div>
            <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">Shape</span><Choice label="Shape" value={lookOf(a).shape} onChange={(v) => set(i, (x) => { x.shape = v })} options={SHAPES} /></div>
            <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">Icon</span><Choice label="Icon" value={lookOf(a).icon} onChange={(v) => set(i, (x) => { x.icon = v })} options={ICONS} /></div>
          </div>
          <div className="flex flex-col gap-2">
            <ColorField label="Button colour" value={a.color || '#ffffff'} onChange={(v) => set(i, (x) => { x.color = v }, 'acl')} />
            {a.color && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => set(i, (x) => { x.color = null })}>Follow the banner's colours</Button>}
          </div>
        </div>
      ))}
      {actions.length < MAX_ACTIONS && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => { edit((d) => { d.actions.push(newAction()) }); toast.success('Button added. Change its words and colours below.') }}>
          <Plus /> Add a button
        </Button>
      )}
    </Section>
  )
}
