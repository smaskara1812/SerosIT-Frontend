import { useEffect, useRef, useState } from 'react'
import { IconChevronDown } from '@/components/icons'

// Compact "N selected" checklist popover. Originally built for the
// dashboards' Rig filter (still re-exported from routes/dashboards/DashboardUI.jsx
// for those pages) but generic enough for any multi-select filter — e.g.
// Incident Register's Rig and Incident Type pickers.
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
            {placeholder}
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
