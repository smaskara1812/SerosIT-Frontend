import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { tokenStore, loginRequest, fetchCurrentUser, logoutRequest } from '@/lib/api'

const AuthContext = createContext(null)

// 'loading' until the initial token check resolves, so a page refresh with a
// still-valid token doesn't flash the login screen before landing on the
// dashboard.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!tokenStore.getAccess()) {
        setStatus('unauthenticated')
        return
      }
      const me = await fetchCurrentUser()
      if (cancelled) return
      if (me) {
        setUser(me)
        setStatus('authenticated')
      } else {
        tokenStore.clear()
        setStatus('unauthenticated')
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const tokens = await loginRequest(username, password)
    tokenStore.setTokens(tokens)
    const me = await fetchCurrentUser()
    setUser(me)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    // Fire the audit-log call while the access token is still valid, then
    // clear regardless — a failed request shouldn't strand the user signed in.
    await logoutRequest()
    tokenStore.clear()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
