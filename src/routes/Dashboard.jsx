import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'

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
    .filter((item) => item.key !== 'dashboard')
    .filter((item) => !item.adminOnly || user?.is_app_admin)
    .map((item) => {
      if (!item.sections) return item.path ? item : null
      const items = item.sections.flatMap((s) => visibleItems(s.items, user))
      if (items.length === 0) return null
      return { ...item, path: item.path || items[0].path, count: items.length }
    })
    .filter(Boolean)
}

const TILE_ACCENTS = [
  { chip: '#1a3f7a', ring: 'rgba(26,63,122,0.16)' },
  { chip: '#2563eb', ring: 'rgba(37,99,235,0.16)' },
  { chip: '#0f766e', ring: 'rgba(15,118,110,0.16)' },
  { chip: '#7c3aed', ring: 'rgba(124,58,237,0.16)' },
]

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

export default function Dashboard() {
  const { user } = useAuth()
  const [info, setInfo] = useState(null)

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

  const links = quickLinks(user)

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
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight">{user?.username}</h1>
        <p className="relative mt-2 max-w-md text-sm text-white/70">
          This page is always available — no rights assignment required.
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
            {links.map(({ key, label, path, icon: Icon, count }, i) => {
              const accent = TILE_ACCENTS[i % TILE_ACCENTS.length]
              return (
                <NavLink
                  key={key}
                  to={path}
                  className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ '--tile-ring': accent.ring }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
                    style={{ backgroundColor: accent.chip }}
                  />
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: accent.ring, color: accent.chip }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{label}</p>
                    {count > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {count} {count === 1 ? 'section' : 'sections'} available to you
                      </p>
                    )}
                  </div>
                </NavLink>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
