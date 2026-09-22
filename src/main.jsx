import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'

// Browser back/forward can restore the page from bfcache instead of doing a
// real navigation — the DOM snapshot comes back exactly as it was, but this
// app's client-side state (React Query-style caches, auth context, the
// service worker's own update checks) isn't re-synced, so the page renders
// blank until it's manually refreshed. `pageshow`'s `persisted` flag is set
// specifically when the page came from bfcache (not on a normal load), so
// this reloads only that case rather than adding a reload to every
// navigation.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload()
  }
})

// A data router (rather than <BrowserRouter>) so pages can use useBlocker to
// hold navigation while they have unsaved edits. The single catch-all route
// just hands everything to the existing <Routes> tree in App.
function Root() {
  return (
    <AuthProvider>
      <App />
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  )
}

const router = createBrowserRouter([{ path: '*', element: <Root /> }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
