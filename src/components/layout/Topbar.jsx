import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { navSections } from '@/config/nav'
import { useTopbarSubtitle } from '@/context/TopbarContext'
import { IconChevronLeft } from '@/components/icons'
import DisplaySize from '@/components/layout/DisplaySize'
import { openPalette } from '@/lib/palette'
import { IconSearch } from '@/components/icons'

const MAC = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '')

// New/edit form routes (e.g. /it-asset/it-assets/12/edit,
// /drilling/drilling-report/new) live one or two segments below their list
// page's nav path, so an exact match against `navSections` misses them.
// Prefer an exact match; otherwise fall back to the longest nav path that
// the current route is nested under.
function findActiveNavItem(pathname) {
  if (pathname === '/masters') return { label: 'Masters' }
  let best = null
  for (const item of navSections) {
    if (item.path === pathname) return item
    if (item.path !== '/' && pathname.startsWith(`${item.path}/`)) {
      if (!best || item.path.length > best.path.length) best = item
    }
  }
  return best
}

export default function Topbar() {
  const { pathname } = useLocation()
  const subtitle = useTopbarSubtitle()
  const active = findActiveNavItem(pathname)
  const isSubPage = active && active.path && pathname !== active.path
  const pageName = active?.label ?? 'Dashboard'

  // The browser tab, history list and bookmarks show document.title; the page is a single-page app, so it has to be set on every route change.
  useEffect(() => {
    document.title = `${pageName} · SerosIT`
  }, [pageName])

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-white px-4"
      style={{ borderColor: '#e5e7eb' }}
    >
      <span className="text-sm font-semibold text-gray-900">
        {active?.label ?? 'Dashboard'}
      </span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      <div className="ml-auto flex items-center gap-3">
        {isSubPage && (
          <Link
            to={active.path}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
            Back to {active.label}
          </Link>
        )}
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search pages and actions"
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <IconSearch className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-gray-200 bg-white px-1 font-sans text-[10px] sm:inline">{MAC ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <DisplaySize />
      </div>
    </header>
  )
}
