import { useEffect, useRef, useState } from 'react'
import { IconChevronDown } from '@/components/icons'

// Shared building blocks for every analytics dashboard page (Rig
// Utilisation, Drilling Performance, Fleet Operating Picture, and whatever
// comes next) — extracted so all three read as one consistent product
// instead of three independently-styled pages, and so a future dashboard
// gets this look for free.

// A KPI card with an icon chip in its own accent colour — accent should be
// one of the Seros chart tokens (var(--chart-1..5)) for a normal metric, or
// 'var(--destructive)' for a metric that's actively a problem (e.g. Silent
// Rigs > 0). Never invent a new colour here; pick from what's already on
// the page.
export function KpiCard({ icon: Icon, label, value, sub, accent = 'var(--chart-1)', warning = false }) {
  const tint = warning ? 'var(--destructive)' : accent
  return (
    // shrink-0: this card's own `overflow-hidden` (for the accent bar's
    // rounded corners) gives it an automatic flex-shrink minimum of 0 —
    // without shrink-0, a flex-column ancestor with less room than its
    // total content will silently squash this card toward zero height
    // instead of growing the page, with nothing visibly wrong except the
    // card just isn't there. See ChartCard below for the same rule.
    <div className="relative flex min-w-[168px] flex-1 shrink-0 flex-col gap-2.5 overflow-hidden rounded-2xl border border-border bg-card p-4">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: tint }} />
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${tint} 16%, transparent)`, color: tint }}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${warning ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// Wraps a chart (or table) in a card with a coloured top accent bar and an
// icon + title header, so each visual reads as its own distinct "widget"
// rather than everything blending into one long grey column.
export function ChartCard({ icon: Icon, title, subtitle, accent = 'var(--chart-1)', className = '', bodyClassName = 'p-4', children }) {
  return (
    // shrink-0: same automatic-min-size-0-from-overflow-hidden trap as
    // KpiCard above — without it, a standalone ChartCard (not inside a
    // grid, which sizes its items differently) silently collapses to near
    // nothing instead of the page growing and scrolling.
    <div className={`shrink-0 overflow-hidden rounded-2xl border border-border bg-card ${className}`}>
      <div className="h-[3px] w-full" style={{ background: accent }} />
      <div className={bodyClassName}>
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />}
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <span className="text-xs font-normal text-muted-foreground">{subtitle}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyChartState({ children = 'No data for this period.' }) {
  return <p className="p-8 text-center text-sm text-muted-foreground">{children}</p>
}

// The filter toolbar every dashboard opens with — Year/Rig pickers plus a
// short explainer, styled as a toolbar rather than a plain bordered box.
export function DashboardToolbar({ children, note }) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      {children}
      {note && (
        <p className="ml-auto max-w-md text-[11px] leading-relaxed text-muted-foreground">{note}</p>
      )}
    </div>
  )
}

export function YearSelect({ value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Year</p>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring"
      >
        {(options ?? [value]).filter(Boolean).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

// Compact "N selected" checklist popover, shared by every dashboard's Rig
// filter.
export function MultiSelectPopover({ label, placeholder = 'All rigs', items, selected, onToggle, onSelectAll, getKey, getLabel, allSelected }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const triggerText =
    selected.size === 0 || allSelected
      ? placeholder
      : selected.size === 1
        ? getLabel(items.find((i) => getKey(i) === [...selected][0]) || {})
        : `${selected.size} selected`

  return (
    <div className="relative flex flex-col gap-1.5" ref={ref} style={{ width: 220 }}>
      <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-left text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
      >
        <span className={!allSelected && selected.size ? 'truncate text-foreground' : 'text-muted-foreground'}>{triggerText}</span>
        <IconChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-40 mt-1 w-[260px] rounded-lg border border-border bg-popover p-2 shadow-lg">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted">
            <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="h-3.5 w-3.5 accent-primary" />
            All rigs
          </label>
          <div className="my-1 border-t border-border" />
          <div className="max-h-56 overflow-y-auto">
            {items.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">None available.</div>}
            {items.map((item) => {
              const key = getKey(item)
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => onToggle(key)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="truncate">{getLabel(item)}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
