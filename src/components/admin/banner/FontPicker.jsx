import { BANNER_FONTS, fontFamily, loadFont, titleWeight, useBannerFonts } from '@/lib/bannerFonts'

// A grid of fonts, each name shown in its own letters, to pick one by look.
export default function FontPicker({ value, onChange, label }) {
  useBannerFonts(BANNER_FONTS.map((f) => f.key)) // the picker shows every font, so fetch them all while it is open
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1.5">
      {BANNER_FONTS.map((f) => (
        <button
          key={f.key}
          type="button"
          role="radio"
          aria-checked={value === f.key}
          onClick={() => onChange(f.key)}
          onMouseEnter={() => loadFont(f.key)}
          className={`flex flex-col rounded-lg border px-2.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${value === f.key ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border hover:border-foreground/30'}`}
        >
          <span className="truncate text-[17px] leading-tight" style={{ fontFamily: fontFamily(f.key), fontWeight: titleWeight(f.key) }}>{f.label}</span>
          <span className="truncate text-[10px] text-muted-foreground">{f.hint}</span>
        </button>
      ))}
    </div>
  )
}
