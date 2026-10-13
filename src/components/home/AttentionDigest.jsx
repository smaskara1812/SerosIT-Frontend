import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// "Needs attention" strip on Home: a few live exceptions, each a link to the
// page that explains it, already filtered. The server sends only the tiles
// this user may open (and counts only the rigs they may see), so there is
// nothing to hide here — an empty list simply means no strip.
const TONE = {
  critical: { text: 'text-destructive', bar: 'var(--destructive)' },
  warning: { text: 'text-amber-600 dark:text-amber-400', bar: 'var(--chart-4)' },
}

function DigestTile({ tile }) {
  const clear = tile.count === 0
  const tone = clear ? null : TONE[tile.tone] || TONE.warning
  return (
    <NavLink
      to={tile.path}
      className="group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: clear ? 'var(--border)' : tone.bar }} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tile.label}</p>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="flex items-center gap-2">
        {clear ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-label="None" />
        ) : (
          <p className={`text-3xl font-bold leading-none ${tone.text}`}>{tile.count.toLocaleString()}</p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{clear ? `None — ${tile.sub}` : tile.sub}</p>
    </NavLink>
  )
}

export default function AttentionDigest() {
  const [tiles, setTiles] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/dashboard/digest/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setTiles(data.tiles)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!tiles || tiles.length === 0) return null
  const open = tiles.filter((t) => t.count > 0).length

  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
        <span className="text-xs text-muted-foreground">
          {open === 0 ? 'Nothing outstanding right now' : `${open} ${open === 1 ? 'item' : 'items'} to look at`}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {tiles.map((t) => (
          <DigestTile key={t.key} tile={t} />
        ))}
      </div>
    </div>
  )
}
