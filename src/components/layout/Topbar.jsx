import { useLocation } from 'react-router-dom'
import { navSections } from '@/config/nav'

export default function Topbar() {
  const { pathname } = useLocation()
  const active =
    pathname === '/masters' ? { label: 'Masters' } : navSections.find((item) => item.path === pathname)

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center border-b bg-white px-4"
      style={{ borderColor: '#e5e7eb' }}
    >
      <span className="text-sm font-semibold text-gray-900">
        {active?.label ?? 'Dashboard'}
      </span>
      <div className="ml-auto flex items-center gap-2" />
    </header>
  )
}
