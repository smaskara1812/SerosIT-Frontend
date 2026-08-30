import { useLocation } from 'react-router-dom'
import { navSections } from '@/config/nav'
import { useTopbarSubtitle } from '@/context/TopbarContext'

export default function Topbar() {
  const { pathname } = useLocation()
  const subtitle = useTopbarSubtitle()
  const active =
    pathname === '/masters' ? { label: 'Masters' } : navSections.find((item) => item.path === pathname)

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-white px-4"
      style={{ borderColor: '#e5e7eb' }}
    >
      <span className="text-sm font-semibold text-gray-900">
        {active?.label ?? 'Dashboard'}
      </span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      <div className="ml-auto flex items-center gap-2" />
    </header>
  )
}
