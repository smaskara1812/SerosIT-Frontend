import { useState } from 'react'
import { Monitor } from 'lucide-react'
import { DISPLAY_SIZE_ENABLED, SCALE_OPTIONS, chooseScale, currentScale, defaultScale, hasSavedScale } from '@/lib/uiScale'

// Lets someone make the whole app smaller or larger on this screen. Saved in this browser only.
export default function DisplaySize() {
  const [value, setValue] = useState(() => (hasSavedScale() ? String(currentScale()) : 'auto'))
  const auto = defaultScale()
  if (!DISPLAY_SIZE_ENABLED) return null

  function change(e) {
    const v = e.target.value
    setValue(v)
    chooseScale(v === 'auto' ? null : parseFloat(v))
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Make the page smaller or larger on this screen">
      <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Display size</span>
      <select
        value={value}
        onChange={change}
        aria-label="Display size"
        className="h-7 rounded-md border border-border bg-background px-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <option value="auto">Automatic ({Math.round(auto * 100)}%)</option>
        {SCALE_OPTIONS.map((o) => (
          <option key={o} value={String(o)}>
            {Math.round(o * 100)}%
          </option>
        ))}
      </select>
    </label>
  )
}
