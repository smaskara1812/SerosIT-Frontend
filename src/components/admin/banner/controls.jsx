import { useEffect, useRef, useState } from 'react'
import { PALETTE } from '@/lib/bannerDesign'

// Small, plain-language controls shared by the banner editor.

export function ColorField({ value, onChange, label }) {
  const isCustom = !PALETTE.includes(value?.toLowerCase())
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Use colour ${c}`}
            aria-pressed={value?.toLowerCase() === c}
            className={`h-6 w-6 rounded-full border border-black/15 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring ${value?.toLowerCase() === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            style={{ background: c }}
          />
        ))}
        <label
          className={`relative inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-2 text-xs text-muted-foreground hover:bg-muted ${isCustom ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        >
          <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: isCustom ? value : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
          Any colour
          <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Pick any colour" />
        </label>
      </div>
    </div>
  )
}

// A slider that calls onChange as it moves; `lo` and `hi` say what each end means in words.
export function SliderField({ label, value, min, max, step, onChange, lo, hi }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#1c448a]" aria-label={label} />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  )
}

// A row of big choice buttons (radio behaviour).
export function Choice({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${value === o.key ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Section({ title, hint, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

// Shows its children at a design width, scaled down to fit the space it is given, with the height following. `fluid` lets
// the design grow with the space (never below `width`), so a wide preview fills the room when the sidebar is collapsed.
// `center` puts a narrower design in the middle (the phone preview).
export function FitPreview({ width, fluid = false, center = false, children, className = '' }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const [dims, setDims] = useState({ design: width, scale: 1, height: 0, offset: 0 })
  useEffect(() => {
    const measure = () => {
      const avail = outer.current?.clientWidth || width
      const design = fluid ? Math.max(width, avail) : width
      const scale = Math.min(1, avail / design)
      const height = Math.ceil((inner.current?.offsetHeight || 0) * scale)
      const offset = center ? Math.max(0, (avail - design * scale) / 2) : 0
      setDims((d) => (d.design === design && d.scale === scale && d.height === height && d.offset === offset ? d : { design, scale, height, offset }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (outer.current) ro.observe(outer.current)
    if (inner.current) ro.observe(inner.current)
    return () => ro.disconnect()
  }, [width, fluid, center])
  return (
    <div ref={outer} className={`w-full ${className}`} style={{ height: dims.height || undefined }}>
      <div ref={inner} style={{ width: dims.design, marginLeft: dims.offset, transform: `scale(${dims.scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
