import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// The pages whose records an App Admin can revert (kept on the server, which grows the list phase by
// phase). One request per page load, shared by everything that asks.
let pending = null

function load() {
  if (!pending) {
    pending = apiFetch('/api/admin/audit/facets/')
      .then((r) => (r.ok ? r.json() : { revertible: [] }))
      .then((d) => new Set(d.revertible || []))
      .catch(() => new Set())
  }
  return pending
}

// True when this user is an App Admin and the page identified by `menuKey` supports revert.
export function useCanViewHistory(user, menuKey) {
  const [set, setSet] = useState(null)
  const isAdmin = Boolean(user?.is_app_admin)
  useEffect(() => {
    if (!isAdmin) return undefined
    let live = true
    load().then((s) => live && setSet(s))
    return () => {
      live = false
    }
  }, [isAdmin])
  return isAdmin && Boolean(set && menuKey && set.has(menuKey))
}
