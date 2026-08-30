import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import SecondarySidebar from './SecondarySidebar'
import Topbar from './Topbar'
import { TopbarProvider } from '@/context/TopbarContext'

export default function AppShell() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <Sidebar />
      <SecondarySidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopbarProvider>
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </TopbarProvider>
      </div>
    </div>
  )
}
