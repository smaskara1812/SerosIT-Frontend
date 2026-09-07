import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
