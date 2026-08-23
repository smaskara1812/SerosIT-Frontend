import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { navTree } from '@/config/nav'
import { can } from '@/lib/permissions'
import { IconChevronLeft, IconChevronRight, IconLogout } from '@/components/icons'

// An item with no menuKey (Dashboard, Admin's own sub-pages) is never
// permission-gated by the menu system — only the top-level adminOnly flag
// (handled separately) applies to those.
function visibleItems(items, user) {
  return items.filter((i) => !i.menuKey || can(user, i.menuKey))
}

const COLLAPSE_KEY = 'serosit.sidebar_collapsed'

function initials(name) {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1'
  )
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  const items = navTree
    .filter((item) => !item.adminOnly || user?.is_app_admin)
    .filter((item) => {
      if (!item.sections) return true
      return item.sections.some((s) => visibleItems(s.items, user).length > 0)
    })

  return (
    <aside
      className="relative flex h-screen shrink-0 flex-col text-white transition-[width] duration-200 ease-in-out"
      style={{
        width: collapsed ? '68px' : '236px',
        background: 'linear-gradient(180deg, #1e478c 0%, #16345f 60%, #10254a 100%)',
      }}
    >
      {/* Brand — full wordmark when expanded; cropped to just the mark when
          the rail is too narrow for the wordmark to fit uncropped. */}
      <div className="flex h-16 items-center justify-center px-3">
        {collapsed ? (
          <img
            src="/android-chrome-192x192.png"
            alt="Seros"
            className="h-9 w-9 shrink-0 rounded-lg object-contain shadow-sm"
          />
        ) : (
          <div className="flex h-9 items-center justify-center rounded-lg bg-white px-3 shadow-sm">
            <img
              src="/branding/seros-logo.png"
              alt="Seros"
              className="h-[22px] w-auto object-contain"
            />
          </div>
        )}
      </div>

      {/* Collapse toggle — floating pill on the edge */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-14 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#1e478c] text-white/70 shadow-md transition-colors hover:text-white"
      >
        {collapsed ? (
          <IconChevronRight className="h-3.5 w-3.5" />
        ) : (
          <IconChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map(({ key, label, path, icon: Icon, sections }) => {
          const allItems = sections
            ? sections.flatMap((s) => visibleItems(s.items, user))
            : null
          const targetPath = path || allItems[0].path
          const isActive = allItems
            ? allItems.some((c) => pathname.startsWith(c.path))
            : pathname === targetPath

          return (
            <NavLink
              key={key}
              to={targetPath}
              data-label={label}
              className={[
                'group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] font-medium transition-all duration-150',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-blue-400" />
              )}
              <Icon
                className={`h-[19px] w-[19px] shrink-0 transition-colors ${isActive ? 'text-blue-300' : ''}`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-[#0f1f3d] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                  {label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/8 p-3">
        <div
          className={`flex items-center gap-2.5 rounded-xl px-1.5 py-2 ${collapsed ? 'justify-center' : ''}`}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-inner"
            style={{ background: 'linear-gradient(135deg, #5b9bff, #2563eb)' }}
          >
            {initials(user?.username)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white/90">
                {user?.username}
              </p>
              <p className="text-[11px] text-white/35">Signed in</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className={`mt-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/90 ${collapsed ? 'justify-center' : ''}`}
        >
          <IconLogout className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
