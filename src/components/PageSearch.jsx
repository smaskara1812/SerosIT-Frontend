import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { accessibleNavLeaves } from '@/lib/shortcuts'
import { IconSearch } from '@/components/icons'

const MAX_RESULTS = 8

// Rank: label starts with the query, then label contains every word, then
// only the group/section name matches. Every typed word must match somewhere.
function rank(leaf, words) {
  const label = leaf.label.toLowerCase()
  const group = (leaf.groupLabel || '').toLowerCase()
  const haystack = `${label} ${group}`
  if (!words.every((w) => haystack.includes(w))) return null
  if (label.startsWith(words.join(' '))) return 0
  if (words.every((w) => label.includes(w))) return 1
  return 2
}

// Jump-to-page search. Only offers pages the signed-in user can actually
// open — the same access check the sidebar and the shortcuts picker use.
export default function PageSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef(null)

  const leaves = useMemo(() => accessibleNavLeaves(user), [user])
  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return leaves
      .map((leaf) => ({ leaf, score: rank(leaf, words) }))
      .filter((r) => r.score !== null)
      .sort((a, b) => a.score - b.score || a.leaf.label.localeCompare(b.leaf.label))
      .slice(0, MAX_RESULTS)
      .map((r) => r.leaf)
  }, [leaves, query])

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function go(leaf) {
    setOpen(false)
    setQuery('')
    navigate(leaf.path)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') return setOpen(false)
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[active] || results[0])
    }
  }

  const showList = open && query.trim().length > 0

  return (
    <div ref={boxRef} className="relative">
      <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search for a page…"
        aria-label="Search for a page"
        className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/40"
      />
      {showList && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No pages match &ldquo;{query.trim()}&rdquo; that you have access to.</p>
          ) : (
            <ul role="listbox">
              {results.map((leaf, i) => {
                const Icon = leaf.icon
                return (
                  <li key={leaf.path} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(leaf)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? 'bg-accent' : ''}`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{leaf.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{leaf.groupLabel}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
