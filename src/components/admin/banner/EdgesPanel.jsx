import { Plus, Trash2 } from 'lucide-react'
import { EDGE_TYPES } from '@/lib/bannerDesign'
import { Button } from '@/components/ui/button'
import { Choice, ColorField, Section, SliderField } from '@/components/admin/banner/controls'

const MAX_EDGES = 2
const NEW_EDGE = { edge: 'top', type: 'garland', size: 44, opacity: 1, colors: ['#fbbf24', '#f59e0b', '#f97316'] }

// Border strips that run the whole width of the banner, along its top and/or bottom.
export default function EdgesPanel({ edges, edit }) {
  const set = (i, fn, key) => edit((d) => { fn(d.edges[i]) }, key ? `${key}-${i}` : undefined)
  return (
    <Section title="Border strips" hint="A garland, flags or lights that run the whole way along the top or bottom, however wide the screen is.">
      {edges.map((e, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Strip {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => edit((d) => { d.edges.splice(i, 1) })}><Trash2 /> Remove</Button>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">Kind
            <select className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal" value={e.type} onChange={(ev) => set(i, (x) => { x.type = ev.target.value })}>
              {EDGE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>
          <Choice label="Where" value={e.edge} onChange={(v) => set(i, (x) => { x.edge = v })} options={[{ key: 'top', label: 'Along the top' }, { key: 'bottom', label: 'Along the bottom' }]} />
          <SliderField label="How thick" value={e.size} min={16} max={90} step={1} onChange={(v) => set(i, (x) => { x.size = v }, 'esize')} lo="Slim" hi="Deep" />
          <SliderField label="How close together" value={e.spacing ?? 1} min={0.6} max={1.8} step={0.05} onChange={(v) => set(i, (x) => { x.spacing = v }, 'esp')} lo="Packed" hi="Spread out" />
          <SliderField label="How strong" value={e.opacity} min={0.2} max={1} step={0.05} onChange={(v) => set(i, (x) => { x.opacity = v }, 'eop')} lo="Faint" hi="Full" />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Colours (they repeat along the strip)</span>
            {e.colors.map((c, k) => (
              <div key={k} className="flex items-end gap-2">
                <div className="flex-1"><ColorField label={`Colour ${k + 1}`} value={c} onChange={(v) => set(i, (x) => { x.colors[k] = v }, `ec${k}`)} /></div>
                {e.colors.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Remove this colour" onClick={() => set(i, (x) => { x.colors.splice(k, 1) })}><Trash2 /></Button>}
              </div>
            ))}
            {e.colors.length < 4 && <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => set(i, (x) => { x.colors.push('#ffffff') })}><Plus /> Add a colour</Button>}
          </div>
        </div>
      ))}
      {edges.length < MAX_EDGES && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => edit((d) => { d.edges.push({ ...NEW_EDGE, edge: d.edges.some((x) => x.edge === 'top') ? 'bottom' : 'top', colors: [...NEW_EDGE.colors] }) })}>
          <Plus /> Add a border strip
        </Button>
      )}
    </Section>
  )
}
