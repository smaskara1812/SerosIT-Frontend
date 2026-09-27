import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconSearch, IconChevronDown } from '@/components/icons'
import { accessibleNavLeaves } from '@/lib/shortcuts'

// Same search + collapsible-group pattern already used on the User Rights
// permission grid — familiar interaction for picking a handful of items
// out of a list that spans every accessible page in the app (Masters alone
// is 80+ pages).
export default function ShortcutsPicker({ open, onOpenChange, user, selectedPaths, onSave, saving, maxShortcuts = 24 }) {
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(() => new Set(selectedPaths))
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set())

  const leaves = useMemo(() => accessibleNavLeaves(user), [user])

  const grouped = useMemo(() => {
    const byGroup = new Map()
    for (const leaf of leaves) {
      if (!byGroup.has(leaf.groupLabel)) byGroup.set(leaf.groupLabel, [])
      byGroup.get(leaf.groupLabel).push(leaf)
    }
    return [...byGroup.entries()]
  }, [leaves])

  const searchActive = search.trim().length > 0
  const filteredGrouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return grouped
    return grouped
      .map(([group, items]) => [group, items.filter((i) => i.label.toLowerCase().includes(q) || group.toLowerCase().includes(q))])
      .filter(([, items]) => items.length > 0)
  }, [grouped, search])

  const atLimit = draft.size >= maxShortcuts

  function toggle(path) {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        if (next.size >= maxShortcuts) return prev
        next.add(path)
      }
      return next
    })
  }

  function toggleGroup(group) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  function handleOpenChange(next) {
    if (next) {
      setDraft(new Set(selectedPaths))
      setSearch('')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Shortcuts</DialogTitle>
          <DialogDescription>Pick any pages you have access to — they'll show up on your Home screen.</DialogDescription>
        </DialogHeader>

        <div className="relative shrink-0">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search pages…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGrouped.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No pages match "{search}".</p>
          )}
          {filteredGrouped.map(([group, items]) => {
            const isCollapsed = !searchActive && collapsedGroups.has(group)
            return (
              <div key={group} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="flex w-full items-center gap-1.5 px-1 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <IconChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  {group}
                  <span className="font-normal normal-case text-muted-foreground/70">({items.length})</span>
                </button>
                {!isCollapsed && (
                  <div className="pb-2">
                    {items.map((item) => {
                      const checked = draft.has(item.path)
                      const disabled = !checked && atLimit
                      return (
                        <label
                          key={item.path}
                          className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                            disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(item.path)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                          <span className="truncate">{item.label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <DialogFooter className="shrink-0">
          <span className={`mr-auto self-center text-xs ${atLimit ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
            {draft.size} / {maxShortcuts} selected{atLimit ? ' — remove one to add another' : ''}
          </span>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave([...draft])} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
