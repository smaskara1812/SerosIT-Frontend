import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'
import { navLeavesByPath, isLeafAccessible } from '@/lib/shortcuts'
import { IconPlus } from '@/components/icons'
import ShortcutsPicker from '@/routes/ShortcutsPicker'

// One tile per top-level nav group (Masters, IT Asset, Reports, Admin) —
// never the full leaf list, which is what MastersHub.jsx already is for.
// A group with sections only earns a tile once it has at least one leaf the
// user can actually open; its target path is the group's own hub page if it
// has one, else the first accessible leaf — same rule Sidebar.jsx uses.
function visibleItems(items, user) {
  return items.filter((i) => !i.menuKey || can(user, i.menuKey))
}

function quickLinks(user) {
  return navTree
    .filter((item) => item.key !== 'home')
    .filter((item) => !item.adminOnly || user?.is_app_admin)
    .map((item) => {
      if (!item.sections) return item.path ? item : null
      const items = item.sections.flatMap((s) => visibleItems(s.items, user))
      if (items.length === 0) return null
      return { ...item, path: item.path || items[0].path, count: items.length }
    })
    .filter(Boolean)
}

// One-click "start a new record" tiles. Add an entry here to add a shortcut;
// it only shows for users who hold the given permission on `menuKey`.
const SHORTCUTS = [
  {
    key: 'new-drilling-report',
    label: 'New Drilling Daily Report',
    hint: "Start today's report",
    path: '/drilling/drilling-report/new',
    menuKey: 'drilling.drilling_report',
    action: 'add',
    icon: IconPlus,
  },
]

function quickShortcuts(user) {
  return SHORTCUTS.filter((sc) => can(user, sc.menuKey, sc.action))
}

const TILE_ACCENTS = [
  { chip: '#1a3f7a', ring: 'rgba(26,63,122,0.16)' },
  { chip: '#2563eb', ring: 'rgba(37,99,235,0.16)' },
  { chip: '#0f766e', ring: 'rgba(15,118,110,0.16)' },
  { chip: '#7c3aed', ring: 'rgba(124,58,237,0.16)' },
]

function Tile({ to, icon: Icon, label, sub, accent, onRemove }) {
  return (
    <NavLink
      to={to}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
        style={{ backgroundColor: accent.chip }}
      />
      {onRemove && (
        <button
          type="button"
          title="Remove shortcut"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          ×
        </button>
      )}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent.ring, color: accent.chip }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </NavLink>
  )
}

function AddShortcutTile({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-transparent p-5 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <IconPlus className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold">Add Shortcut</p>
    </button>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Home() {
  const { user } = useAuth()
  const [info, setInfo] = useState(null)
  const [customPaths, setCustomPaths] = useState([])
  const [maxShortcuts, setMaxShortcuts] = useState(24)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/dashboard/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setInfo(data)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/user-shortcuts/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setCustomPaths(data.paths)
        if (data.max_shortcuts) setMaxShortcuts(data.max_shortcuts)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const links = quickLinks(user)
  const firstName = (user?.display_name || user?.username || '').split(' ')[0]
  const shortcuts = quickShortcuts(user)

  // Resolve stored paths against the live nav tree — a path whose page was
  // renamed/removed, or that the user no longer has permission for, is
  // silently skipped rather than shown as a broken tile.
  const leafByPath = useMemo(() => navLeavesByPath(), [])
  const customShortcuts = customPaths
    .map((path) => leafByPath.get(path))
    .filter((leaf) => leaf && isLeafAccessible(leaf, user))

  // If a pinned page was renamed/removed, or the user's permissions
  // changed since they pinned it, quietly drop it from what's actually
  // stored too — not just from what's rendered — so it doesn't linger
  // forever and doesn't silently reappear if access is ever restored
  // without the user having re-added it themselves.
  useEffect(() => {
    if (!user || customPaths.length === 0) return
    const validPaths = customPaths.filter((path) => {
      const leaf = leafByPath.get(path)
      return leaf && isLeafAccessible(leaf, user)
    })
    if (validPaths.length === customPaths.length) return
    apiFetch('/api/user-shortcuts/', { method: 'PUT', body: JSON.stringify({ paths: validPaths }) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCustomPaths(data.paths)
      })
      .catch(() => {})
  }, [customPaths, user, leafByPath])

  async function saveShortcuts(paths) {
    setSaving(true)
    try {
      const res = await apiFetch('/api/user-shortcuts/', {
        method: 'PUT',
        body: JSON.stringify({ paths }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setCustomPaths(data.paths)
      setPickerOpen(false)
    } catch {
      toast.error('Failed to save shortcuts')
    } finally {
      setSaving(false)
    }
  }

  function removeShortcut(path) {
    saveShortcuts(customPaths.filter((p) => p !== path))
  }

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl px-7 py-8 text-white shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #1e478c 0%, #16345f 60%, #10254a 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.35), transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)' }}
        />
        <p className="relative text-sm font-medium text-white/60">{greeting()}</p>
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight">{firstName}</h1>
        <p className="relative mt-2 max-w-md text-sm text-white/70">
          Here's where you can pick up your day. Use the shortcuts below to get to your work.
        </p>
        {info && (
          <div className="relative mt-5 flex flex-wrap gap-4 text-xs text-white/50">
            <span>{formatTime(info.server_time)}</span>
            {info.last_login && <span>Signed in {formatTime(info.last_login)}</span>}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Jump back in</h2>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No modules have been assigned to your account yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {links.map(({ key, label, path, icon, count }, i) => (
              <Tile
                key={key}
                to={path}
                icon={icon}
                label={label}
                sub={count > 0 ? `${count} ${count === 1 ? 'section' : 'sections'} available to you` : null}
                accent={TILE_ACCENTS[i % TILE_ACCENTS.length]}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Shortcuts</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map(({ key, label, hint, path, icon }, i) => (
            <Tile key={key} to={path} icon={icon} label={label} sub={hint} accent={TILE_ACCENTS[i % TILE_ACCENTS.length]} />
          ))}
          {customShortcuts.map((leaf, i) => (
            <Tile
              key={leaf.path}
              to={leaf.path}
              icon={leaf.icon}
              label={leaf.label}
              sub={leaf.groupLabel}
              accent={TILE_ACCENTS[(shortcuts.length + i) % TILE_ACCENTS.length]}
              onRemove={() => removeShortcut(leaf.path)}
            />
          ))}
          <AddShortcutTile onClick={() => setPickerOpen(true)} />
        </div>
      </div>

      <ShortcutsPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        user={user}
        selectedPaths={customPaths}
        onSave={saveShortcuts}
        saving={saving}
        maxShortcuts={maxShortcuts}
      />
    </div>
  )
}
