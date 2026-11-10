import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Section, SliderField } from '@/components/admin/banner/controls'

// Where he stands: nine quick spots on a little banner, and two sliders for anything in between (the same way the notice card is placed).
// Across: 0 is the left edge, 100 the right. Up and down: 0 is the top, 100 is standing on the bottom edge.
function SeroPlacer({ sero, edit }) {
  const placed = sero.x != null && sero.y != null
  const x = sero.x ?? 100
  const y = sero.y ?? 100
  const word = (v, lo, mid, hi) => (v === 0 ? lo : v === 50 ? mid : hi)
  const put = (nx, ny) => edit((d) => { d.sero = { ...(d.sero || {}), x: nx, y: ny } })
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="grid w-32 grid-cols-3 gap-1 rounded-lg bg-[#1c448a] p-1.5" role="group" aria-label="Quick spots for Sero">
          {[0, 50, 100].flatMap((yy) =>
            [0, 50, 100].map((xx) => (
              <button
                key={`${xx},${yy}`}
                type="button"
                aria-label={`Sero ${word(yy, 'top', 'middle', 'bottom')} ${word(xx, 'left', 'centre', 'right')}`}
                aria-pressed={placed && x === xx && y === yy}
                onClick={() => put(xx, yy)}
                className={`h-6 rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${placed && x === xx && y === yy ? 'bg-[#7fe3d6]' : 'bg-white/25 hover:bg-white/45'}`}
              />
            )),
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!placed} onClick={() => put(null, null)}>Back to the usual spot</Button>
      </div>
      <SliderField label="Across" value={x} min={0} max={100} step={1} onChange={(v) => put(v, y)} lo="Left" hi="Right" />
      <SliderField label="Up and down" value={y} min={0} max={100} step={1} onChange={(v) => put(x, v)} lo="Top" hi="Standing on the bottom" />
      <p className="text-xs text-muted-foreground">{placed ? 'He stays where you put him, even over the words. Check the preview.' : 'The usual spot is the bottom-right corner, where he steps aside for the greeting, search box and notice.'}</p>
    </div>
  )
}

// The banner editor's Sero section: show him on this banner or not (not, unless chosen), and what he wears while the banner is live.
export default function SeroPanel({ design, edit, outfits }) {
  const sero = design.sero || { show: false, outfit: null, x: null, y: null }
  const chosen = sero.outfit == null ? '' : String(sero.outfit)
  const missing = sero.outfit != null && !outfits.some((o) => o.id === sero.outfit) && outfits.length > 0
  return (
    <Section title="Sero" hint="Sero, the mascot, can stand in the corner of this banner. He is left out unless you choose him. Whatever you decide, the 404 and access-denied pages show him in this banner's outfit while it is live.">
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!sero.show} onChange={(e) => edit((d) => { d.sero = { ...(d.sero || {}), show: e.target.checked, outfit: d.sero?.outfit ?? null } })} /> Show Sero on this banner
      </label>
      <label className="flex max-w-xs flex-col gap-1 text-sm font-medium">
        What he wears
        <select
          value={chosen}
          onChange={(e) => edit((d) => { d.sero = { ...(d.sero || {}), show: !!d.sero?.show, outfit: e.target.value ? Number(e.target.value) : null } })}
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm font-normal"
        >
          <option value="">The day’s outfit</option>
          {outfits.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      {sero.show && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Where he stands</span>
          <SeroPlacer sero={sero} edit={edit} />
        </div>
      )}
      {missing && <p className="text-xs text-amber-700">The outfit chosen here no longer exists. Pick another, or he wears the day’s outfit.</p>}
      <p className="text-xs text-muted-foreground">Outfits are made on <Link to="/admin/customise-sero" className="underline underline-offset-2">Customise Sero</Link>.</p>
    </Section>
  )
}
