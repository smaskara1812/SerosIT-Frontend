import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ListFilter } from 'lucide-react'
import { IconChevronDown } from '@/components/icons'

// Shared building blocks for every analytics dashboard page (Rig
// Utilisation, Drilling Performance, Fleet Operating Picture, and whatever
// comes next) — extracted so all three read as one consistent product
// instead of three independently-styled pages, and so a future dashboard
// gets this look for free.
//
// The URL-backed filter hooks (useUrlYear/useUrlIdSet/useUrlString) live in
// ./dashboardUrlState.js, not here — Vite's Fast Refresh only works on a
// file that exports components, and mixing hooks in here broke it.

// A KPI card with an icon chip in its own accent colour — accent should be
// one of the Seros chart tokens (var(--chart-1..5)) for a normal metric, or
// 'var(--destructive)' for a metric that's actively a problem (e.g. Silent
// Rigs > 0). Never invent a new colour here; pick from what's already on
// the page.
export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'var(--chart-1)',
  warning = false,
  onViewList,
  onFilter,
  filterActive = false,
}) {
  const tint = warning ? 'var(--destructive)' : accent
  return (
    // shrink-0: this card's own `overflow-hidden` (for the accent bar's
    // rounded corners) gives it an automatic flex-shrink minimum of 0 —
    // without shrink-0, a flex-column ancestor with less room than its
    // total content will silently squash this card toward zero height
    // instead of growing the page, with nothing visibly wrong except the
    // card just isn't there. See ChartCard below for the same rule.
    //
    // The card itself is never a click target — only the small button
    // (view-list OR filter, rendered when that prop is passed) is. Other
    // dashboards train users to click chart elements for an in-page
    // drill-down, so a whole KPI card silently acting on click would be a
    // surprising, inconsistent habit-trap.
    <div
      className={`relative flex min-w-[168px] flex-1 shrink-0 flex-col gap-2.5 overflow-hidden rounded-2xl border p-4 transition-colors ${
        filterActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
      }`}
    >
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
        {onViewList && (
          <button
            type="button"
            onClick={onViewList}
            title="View in asset list"
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
        {onFilter && (
          // Narrows the table already on this page to just this
          // exception — the click stays on the page, unlike onViewList
          // above which leaves it. filterActive keeps this button (and
          // the card's own border/tint) lit so it's obvious the table
          // below is currently narrowed, and why.
          <button
            type="button"
            onClick={onFilter}
            title={filterActive ? 'Clear this filter' : 'Filter the list below to this'}
            className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
              filterActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className={`text-2xl font-bold ${warning ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {filterActive && <p className="text-[11px] font-semibold text-primary">Filtering list below</p>}
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

// A row of one-click deep-links from a dashboard straight into the
// underlying list page with a specific filter pre-applied (e.g. "Warranty
// Expired" -> /it-asset/it-assets?warranty_status=expired). Kept visually
// distinct from KPI cards and chart segments (which are also clickable
// where it makes sense) since these are fixed, always-available shortcuts
// rather than derived from the current data.
export function QuickActions({ label = 'Quick actions', children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      <p className="mr-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

// `dotColor` is an alternative to `icon` for a per-segment action (e.g. one
// button per pie slice or bar) where the colour itself — matching that
// segment's own chart colour — is the identifying mark rather than an icon.
export function QuickActionButton({ icon: Icon, children, onClick, accent = 'var(--chart-1)', dotColor, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: accent }} />}
      {dotColor && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} />}
      {children}
    </button>
  )
}

// A labelled row of per-segment "view list" buttons placed below a chart —
// never on the chart itself. Other dashboards train users to click chart
// elements for an in-page drill-down, so a bar/slice that instead silently
// navigates away to a different page would be a jarring, inconsistent
// surprise; a visible button is an explicit, unambiguous trigger instead.
export function ChartActionRow({ label = 'View in asset list', children }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
      <p className="mr-1 text-[11px] font-semibold text-muted-foreground">{label}</p>
      {children}
    </div>
  )
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
