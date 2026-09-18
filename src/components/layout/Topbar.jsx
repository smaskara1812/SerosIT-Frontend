import { Link, useLocation } from 'react-router-dom'
import { navSections } from '@/config/nav'
import { useTopbarSubtitle } from '@/context/TopbarContext'
import { IconChevronLeft } from '@/components/icons'

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

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-white px-4"
      style={{ borderColor: '#e5e7eb' }}
    >
      <span className="text-sm font-semibold text-gray-900">
        {active?.label ?? 'Dashboard'}
      </span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      <div className="ml-auto flex items-center gap-2">
        {isSubPage && (
          <Link
            to={active.path}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
            Back to {active.label}
          </Link>
        )}
      </div>
    </header>
  )
}
