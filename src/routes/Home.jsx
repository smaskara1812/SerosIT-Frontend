import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { navTree } from '@/config/nav'
import { can, navGroupVisible, navItemVisible } from '@/lib/permissions'
import { navLeavesByPath, isLeafAccessible } from '@/lib/shortcuts'
import { ArrowUpRight } from 'lucide-react'
import { IconPlus } from '@/components/icons'
import ShortcutsPicker from '@/routes/ShortcutsPicker'
import { useKonami } from '@/lib/easter'
import { useIdle } from '@/lib/useIdle'
import { EASTER_EGGS } from '@/config/easterEggs'
import HomeBanner from '@/components/home/HomeBanner'
import AttentionDigest from '@/components/home/AttentionDigest'

// One tile per top-level nav group (Masters, IT Asset, Reports, Admin) —
// never the full leaf list, which is what MastersHub.jsx already is for.
// A group with sections only earns a tile once it has at least one leaf the
// user can actually open; its target path is the group's own hub page if it
// has one, else the first accessible leaf — same rule Sidebar.jsx uses.
function visibleItems(items, user, group) {
  return items.filter((i) => navItemVisible(i, group, user))
}

function quickLinks(user) {
  return navTree
    .filter((item) => item.key !== 'home')
    .filter((item) => navGroupVisible(item, user))
    .map((item) => {
      if (!item.sections) return item.path ? item : null
      const items = item.sections.flatMap((s) => visibleItems(s.items, user, item))
      if (items.length === 0) return null
      return { ...item, path: item.path || items[0].path, count: items.length }
    })
    .filter(Boolean)
}

// One-click "start a new record" tiles that show for every user by
// default, no picking required — reserved for the one workflow explicitly
// meant to be a default landing shortcut, not a curated catalogue of every
// big form (those live in the customizable picker instead — see
// ACTION_SHORTCUTS in lib/shortcuts.js). Add an entry here to add a
// shortcut; it only shows for users who hold the given permission on
// `menuKey`.
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

// Sections rise into place one after another on load. Respects reduced-motion (animation switched off).
function Reveal({ delay = 0, children, className = '' }) {
  return (
    <div
      className={`animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both min-w-0 duration-500 motion-reduce:animate-none ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, hint }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-foreground">{children}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ShortcutCard({ to, icon: Icon, label, sub, onRemove }) {
  return (
    <NavLink
      to={to}
      data-shelf
      className="group relative flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      {onRemove && (
        <button
          type="button"
          title="Remove shortcut"
          aria-label={`Remove ${label} from your shortcuts`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </NavLink>
  )
}

function ModuleCard({ to, icon: Icon, label, sub }) {
  return (
    <NavLink
      to={to}
      data-shelf
      className="group relative flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{label}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </NavLink>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [info, setInfo] = useState(null)
  const [digest, setDigest] = useState(null)
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
    apiFetch('/api/dashboard/digest/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setDigest(data.tiles || [])
      })
      .catch(() => {})
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
      toast.error("Couldn't save your shortcuts. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function removeShortcut(path) {
    saveShortcuts(customPaths.filter((p) => p !== path))
  }

  // On a day with a custom banner (Admin > Banner Events) the banner's hidden scenes and hints are off.
  const customRef = useRef(false)
  const [custom, setCustom] = useState(false)
  const onCustomChange = useCallback((on) => {
    customRef.current = on
    setCustom(on)
  }, [])

  // The hidden code puts the welcome banner into "drill-down" for a few seconds.
  // After a few idle minutes the banner whispers a hint (and the sidebar logo glows now and then, see Sidebar).
  const idle = useIdle(EASTER_EGGS.idleHints ? EASTER_EGGS.idleHintAfterMs : 0)
  const [hintAt, setHintAt] = useState(0)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('seros:idle-hint', { detail: { on: idle } }))
    if (!idle) return undefined
    const id = setInterval(() => setHintAt((i) => i + 1), 20000)
    return () => clearInterval(id)
  }, [idle])
  useEffect(() => () => window.dispatchEvent(new CustomEvent('seros:idle-hint', { detail: { on: false } })), [])
  const hintLines = EASTER_EGGS.idleHintLines
  const hint = idle && hintLines.length && !custom ? hintLines[hintAt % hintLines.length] : null

  const [scene, setScene] = useState(null) // 'ship' or 'crew' while a banner scene plays
  const drillTimer = useRef(0)
  const playScene = useCallback((next) => {
    if (customRef.current) return
    setScene(next)
    clearTimeout(drillTimer.current)
    drillTimer.current = setTimeout(() => setScene(null), next === 'crew' ? 18600 : 12500)
  }, [])
  useKonami(() => playScene(EASTER_EGGS.konamiScene === 'crew' ? 'crew' : 'ship'))
  // The helicopter scene is started by a secret phrase typed into the search box (see PageSearch).
  useEffect(() => {
    const onChopper = () => playScene('crew')
    window.addEventListener('seros:chopper', onChopper)
    return () => window.removeEventListener('seros:chopper', onChopper)
  }, [playScene])
  useEffect(() => () => clearTimeout(drillTimer.current), [])

  const hasDigest = digest && digest.length > 0

  return (
    <div className="space-y-8 pb-6">
      <Reveal className="relative z-20">
        <HomeBanner firstName={firstName} info={info} scene={scene} hint={hint} onCustomChange={onCustomChange} />
      </Reveal>

      <Reveal delay={80}>
        <SectionTitle hint={`${customShortcuts.length}/${maxShortcuts} added by you`}>Your shortcuts</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shortcuts.map(({ key, label, hint, path, icon }) => (
            <ShortcutCard key={key} to={path} icon={icon} label={label} sub={hint} />
          ))}
          {customShortcuts.map((leaf) => (
            <ShortcutCard
              key={leaf.path}
              to={leaf.path}
              icon={leaf.icon}
              label={leaf.label}
              sub={leaf.groupLabel}
              onRemove={() => removeShortcut(leaf.path)}
            />
          ))}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex min-h-[4.25rem] items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
          >
            <IconPlus className="h-4 w-4" />
            Add a shortcut
          </button>
        </div>
      </Reveal>

      {hasDigest && (
        <Reveal delay={150}>
          <AttentionDigest tiles={digest} />
        </Reveal>
      )}

      <Reveal delay={210}>
        <SectionTitle hint={links.length > 0 ? `${links.length} ${links.length === 1 ? 'area' : 'areas'}` : null}>Your workspace</SectionTitle>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No modules have been assigned to your account yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {links.map(({ key, label, path, icon, count }) => (
              <ModuleCard
                key={key}
                to={path}
                icon={icon}
                label={label}
                sub={count > 0 ? `${count} ${count === 1 ? 'section' : 'sections'} for you` : null}
              />
            ))}
          </div>
        )}
      </Reveal>

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
