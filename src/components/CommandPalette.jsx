import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, CornerDownLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { navLeavesByPath } from '@/lib/shortcuts'
import { OPEN_EVENT, paletteEntries, readRecent, rememberPage, searchEntries } from '@/lib/palette'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

// True while the person is typing into a field, so a plain "/" is a character there and not the shortcut.
function typingInField(el) {
  const tag = el?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable
}

function Row({ leaf, onPick, recent = false }) {
  const Icon = recent ? Clock : leaf.icon
  const where = leaf.groupLabel === 'Quick Actions' ? '' : [leaf.groupLabel, leaf.sectionLabel].filter(Boolean).join(' › ')
  return (
    <CommandItem value={`${leaf.path} ${leaf.label}`} onSelect={() => onPick(leaf)}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="min-w-0 truncate">{leaf.label}</span>
      {where && <span className="ml-auto shrink-0 pl-3 text-xs text-muted-foreground">{where}</span>}
    </CommandItem>
  )
}

// The command palette: Ctrl/Cmd+K (or "/") from any page opens a search over the pages and quick actions the person may use, and their last few pages. Enter opens the
// highlighted one. Everything is searched in the browser, nothing is sent to the server.
export default function CommandPalette() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const entries = useMemo(() => paletteEntries(user), [user])
  const found = useMemo(() => searchEntries(entries, query), [entries, query])
  const recent = useMemo(() => {
    if (!open) return [] // the list is read again each time the palette opens, so it holds what was opened since
    const byPath = navLeavesByPath()
    return readRecent(user).map((p) => byPath.get(p)).filter((l) => l && entries.pages.some((x) => x.path === l.path))
  }, [open, user, entries])

  useEffect(() => {
    function onKey(e) {
      const k = e.key?.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && !e.altKey && k === 'k') {
        e.preventDefault() // some browsers use Ctrl+K for their own search bar
        setOpen((o) => !o)
      } else if (k === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typingInField(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  // The page being looked at joins the recent list (the palette's own list, per person, in this browser).
  useEffect(() => {
    if (pathname !== '/' && navLeavesByPath().has(pathname)) rememberPage(user, pathname)
  }, [pathname, user])

  function change(next) {
    setOpen(next)
    if (!next) setQuery('')
  }
  function pick(leaf) {
    change(false)
    navigate(leaf.path)
  }
  const text = query.trim()
  const typed = text.length > 0
  const none = typed && found && found.pages.length === 0 && found.actions.length === 0
  return (
    <CommandDialog open={open} onOpenChange={change} title="Search" description="Search for a page or an action and press Enter to open it." className="sm:max-w-xl">
      <Command shouldFilter={false} loop>
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search pages and actions…" />
        <CommandList className="max-h-96">
          {none && <CommandEmpty>Nothing matches “{text}”. Try part of a page name.</CommandEmpty>}
          {!typed && recent.length > 0 && (
            <CommandGroup heading="Recent">{recent.map((l) => <Row key={`r-${l.path}`} leaf={l} onPick={pick} recent />)}</CommandGroup>
          )}
          {!typed && entries.actions.length > 0 && (
            <CommandGroup heading="Quick actions">{entries.actions.slice(0, 5).map((l) => <Row key={l.key} leaf={l} onPick={pick} />)}</CommandGroup>
          )}
          {!typed && recent.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Start typing the name of a page, such as “incident” or “drilling report”.</p>}
          {found && found.actions.length > 0 && <CommandGroup heading="Quick actions">{found.actions.map((l) => <Row key={l.key} leaf={l} onPick={pick} />)}</CommandGroup>}
          {found && found.pages.length > 0 && <CommandGroup heading="Pages">{found.pages.map((l) => <Row key={l.key || l.path} leaf={l} onPick={pick} />)}</CommandGroup>}
        </CommandList>
        <div className="flex items-center gap-4 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span><kbd className="rounded border border-border bg-muted px-1">↑</kbd> <kbd className="rounded border border-border bg-muted px-1">↓</kbd> to move</span>
          <span className="inline-flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1"><CornerDownLeft className="inline h-3 w-3" /></kbd> to open</span>
          <span><kbd className="rounded border border-border bg-muted px-1">Esc</kbd> to close</span>
        </div>
      </Command>
    </CommandDialog>
  )
}
