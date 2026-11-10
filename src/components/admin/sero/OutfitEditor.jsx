import { lazy, Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ColorField, Choice, Section } from '@/components/admin/banner/controls'
import { DEFAULT_LOOK, EXTRAS, FACES, HEADS, LENGTHS, NECKS, PRINTS, TOPS, TRIMS, normalizeLook } from '@/lib/seroOutfit'

const Sero = lazy(() => import('@/components/sero/Sero'))

const opts = (list) => list.map(([key, label]) => ({ key, label }))

// Sero in an outfit, standing still: used for the live preview and on the outfit cards.
export function SeroPreview({ look, size = 120, label }) {
  return (
    <Suspense fallback={<div style={{ width: size, height: size * 1.13 }} />}>
      <Sero outfit={{ look }} size={size} label={label || 'Sero in this outfit'} />
    </Suspense>
  )
}

// Make or change an outfit: pick parts and colours from the kit, with Sero shown in it as you go. Saved with `onSave({ name, look, in_pool })`.
export default function OutfitEditor({ outfit, onClose, onSave, saving, error }) {
  const [name, setName] = useState(outfit?.name || '')
  const [look, setLook] = useState(() => normalizeLook(outfit?.look || DEFAULT_LOOK))
  const [pool, setPool] = useState(!!outfit?.in_pool)
  const set = (part, patch) => setLook((l) => ({ ...l, [part]: { ...l[part], ...patch } }))
  const top = look.top
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="flex h-[min(90vh,800px)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-[var(--edge)] px-6 py-4">
          <DialogTitle>{outfit?.id ? 'Change this outfit' : 'New outfit'}</DialogTitle>
          <DialogDescription>Pick the parts and colours. Sero is shown in it as you go.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 overflow-y-auto border-b border-[var(--edge)] bg-gradient-to-b from-[var(--seros-navy-50)] to-card p-5 md:border-b-0 md:border-r">
            <SeroPreview look={look} size={190} />
            <label className="flex w-full flex-col gap-1 text-sm font-medium">
              Name
              <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali kurta" />
            </label>
            <label className="flex w-full items-start gap-2 text-sm">
              <input type="checkbox" checked={pool} onChange={(e) => setPool(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1c448a]" />
              <span>Include in the daily pool<span className="block text-xs text-muted-foreground">Outfits in the pool take turns on days set to “a different one each day”.</span></span>
            </label>
          </div>
          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-5">
            <Section title="Head">
              <Choice label="Head" options={opts(HEADS)} value={look.head.style} onChange={(v) => set('head', { style: v })} />
              {look.head.style !== 'none' && <ColorField label="Colour" value={look.head.color} onChange={(c) => set('head', { color: c })} />}
            </Section>
            <Section title="Top">
              <Choice label="Top" options={opts(TOPS)} value={top.style} onChange={(v) => set('top', { style: v })} />
              {top.style !== 'none' && (
                <>
                  <ColorField label="Main colour" value={top.color} onChange={(c) => set('top', { color: c })} />
                  {top.style === 'kurta' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">Length</span>
                      <Choice label="Kurta length" options={opts(LENGTHS)} value={top.length} onChange={(v) => set('top', { length: v })} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Print</span>
                    <Choice label="Print" options={opts(PRINTS)} value={top.print} onChange={(v) => set('top', { print: v })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Border</span>
                    <Choice label="Border" options={opts(TRIMS)} value={top.trim} onChange={(v) => set('top', { trim: v })} />
                  </div>
                  {(top.print !== 'none' || top.trim !== 'none') && (
                    <ColorField label="Accent colour (the print and the border)" value={top.printColor} onChange={(c) => set('top', { printColor: c, trimColor: c })} />
                  )}
                </>
              )}
            </Section>
            <Section title="Neck">
              <Choice label="Neck" options={opts(NECKS)} value={look.neck.style} onChange={(v) => set('neck', { style: v })} />
              {look.neck.style !== 'none' && <ColorField label="Colour" value={look.neck.color} onChange={(c) => set('neck', { color: c })} />}
              {(look.neck.style === 'scarf' || look.neck.style === 'dupatta') && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!look.neck.stripe} onChange={(e) => set('neck', { stripe: e.target.checked ? '#ffffff' : null })} className="h-4 w-4 accent-[#1c448a]" />
                    {look.neck.style === 'dupatta' ? 'A border on the dupatta' : 'Stripes on the scarf'}
                  </label>
                  {look.neck.stripe && <ColorField label={look.neck.style === 'dupatta' ? 'Border colour' : 'Stripe colour'} value={look.neck.stripe} onChange={(c) => set('neck', { stripe: c })} />}
                </div>
              )}
            </Section>
            <Section title="Face">
              <Choice label="Face" options={opts(FACES)} value={look.face.style} onChange={(v) => set('face', { style: v })} />
              {look.face.style !== 'none' && <ColorField label="Colour" value={look.face.color} onChange={(c) => set('face', { color: c })} />}
            </Section>
            <Section title="Shoes">
              <ColorField label="Colour" value={look.shoes.color} onChange={(c) => set('shoes', { color: c })} />
              {look.shoes.color !== DEFAULT_LOOK.shoes.color && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => set('shoes', { color: DEFAULT_LOOK.shoes.color })}>Back to his own blue</Button>}
            </Section>
            <Section title="Extra">
              <Choice label="Extra" options={opts(EXTRAS)} value={look.extra.style} onChange={(v) => set('extra', { style: v })} />
              {look.extra.style !== 'none' && <ColorField label="Colour" value={look.extra.color} onChange={(c) => set('extra', { color: c })} />}
            </Section>
          </div>
        </div>
        <DialogFooter className="shrink-0 items-center border-t border-[var(--edge)] px-6 py-3">
          {error && <p className="mr-auto text-sm text-destructive" role="alert">{error}</p>}
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={saving || !name.trim()} onClick={() => onSave({ name: name.trim(), look, in_pool: pool })}>{saving ? 'Saving…' : 'Save outfit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
