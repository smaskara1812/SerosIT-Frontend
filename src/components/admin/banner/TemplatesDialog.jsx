import { TEMPLATES } from '@/lib/bannerTemplates'
import { DEFAULT_DESIGN } from '@/lib/bannerDesign'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import BannerView from '@/components/home/BannerView'
import { FitPreview } from '@/components/admin/banner/controls'

function Thumb({ design }) {
  return (
    <div className="pointer-events-none overflow-hidden rounded-lg border border-border" aria-hidden="true">
      <FitPreview width={1100}>
        <BannerView
          design={design}
          firstName="Soham"
          todayLabel="Sunday 18 October"
          fallbackTitle="Good morning, Soham"
          fallbackSub="Here is where things stand."
          search={<div className="h-13 rounded-2xl bg-[var(--search-tint,#ffffff)] shadow-lg" />}
        />
      </FitPreview>
    </div>
  )
}

// The gallery of occasion templates (and a blank banner) to start an event from.
export default function TemplatesDialog({ open, onOpenChange, onPick }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>Pick an occasion and everything in it can still be changed: the words, colours, shapes and dates. Choosing one replaces the current design, and Undo brings it back.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" onClick={() => onPick(null)} className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 text-left outline-none transition-colors hover:border-foreground/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <Thumb design={DEFAULT_DESIGN} />
            <span className="font-semibold">Blank banner</span>
            <span className="text-xs text-muted-foreground">Start from the normal Seros look and design your own.</span>
          </button>
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => onPick(t)} className="flex flex-col gap-2 rounded-xl border border-border p-3 text-left outline-none transition-colors hover:border-foreground/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <Thumb design={t.design} />
              <span className="font-semibold">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.note}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
