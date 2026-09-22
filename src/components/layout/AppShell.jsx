import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import SecondarySidebar from './SecondarySidebar'
import Topbar from './Topbar'
import { TopbarProvider } from '@/context/TopbarContext'

export default function AppShell() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[#1a3f7a] focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Sidebar />
      <SecondarySidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopbarProvider>
          <Topbar />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6 outline-none">
            <Outlet />
          </main>
        </TopbarProvider>
      </div>
    </div>
  )
}
