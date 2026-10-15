import { NavLink } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

// "Needs your attention": live exceptions as cards, each a link to the page that explains it. The server sends
// only the tiles this user may open. Things outstanding come first (worst first); ones that are clear fold into
// one quiet line so a row of zeros never drowns the few that matter.
const TONE = {
  critical: { label: 'Overdue', num: 'text-destructive', pill: 'bg-destructive/10 text-destructive', ring: 'hover:border-destructive/40' },
  warning: { label: 'Watch', num: 'text-amber-600 dark:text-amber-400', pill: 'bg-amber-500/12 text-amber-700 dark:text-amber-400', ring: 'hover:border-amber-500/40' },
}
const HIDDEN = new Set(['warranty_expiring'])

function AttentionCard({ tile }) {
  const tone = TONE[tile.tone] || TONE.warning
  return (
    <NavLink
      to={tile.path}
      data-shelf
      className={`group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${tone.ring}`}
    >
      <p className={`w-14 shrink-0 text-3xl font-bold leading-none tabular-nums tracking-tight ${tone.num}`}>{tile.count.toLocaleString()}</p>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{tile.label}</p>
        <p className="truncate text-xs text-muted-foreground">{tile.sub}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.pill}`}>{tone.label}</span>
    </NavLink>
  )
}

export default function AttentionDigest({ tiles }) {
  const shown = (tiles || []).filter((t) => !HIDDEN.has(t.key))
  if (shown.length === 0) return null
  const order = { critical: 0, warning: 1 }
  const open = shown.filter((t) => t.count > 0).sort((a, b) => (order[a.tone] ?? 1) - (order[b.tone] ?? 1) || b.count - a.count)
  const clear = shown.filter((t) => t.count === 0)

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-foreground">Needs your attention</h2>
        <p className="text-xs text-muted-foreground">{open.length === 0 ? 'Nothing outstanding' : `${open.length} ${open.length === 1 ? 'item' : 'items'} to look at`}</p>
      </div>
      {open.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">You are all caught up</p>
            <p className="text-xs text-muted-foreground">Nothing is overdue or waiting on you right now.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {open.map((t) => (
            <AttentionCard key={t.key} tile={t} />
          ))}
        </div>
      )}
      {clear.length > 0 && open.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground/80">All clear: </span>
            {clear.map((t) => t.label).join(' · ')}
          </span>
        </p>
      )}
    </section>
  )
}
