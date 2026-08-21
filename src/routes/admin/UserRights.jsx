import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useUserList } from '@/hooks/useUserList'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import UserFilterTabs from '@/components/admin/UserFilterTabs'
import { IconSearch, IconCheck } from '@/components/icons'

const ACTIONS = ['view', 'add', 'edit', 'delete', 'export']

const PRESETS = [
  { key: 'view-only', label: 'View only' },
  { key: 'grant-all', label: 'Grant all' },
  { key: 'clear-all', label: 'Clear all' },
]

function initials(name) {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

function onListScroll(e, hasMore, loadMore) {
  const el = e.currentTarget
  if (!hasMore) return
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadMore()
}

export default function UserRights() {
  const {
    query,
    setQuery,
    filter,
    setFilter,
    items: users,
    setItems: setUsers,
    loading: loadingUsers,
    loadingMore,
    hasMore,
    loadMore,
    counts,
  } = useUserList('/api/admin/users/', { extraParam: 'admin_only' })

  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [isAppAdmin, setIsAppAdmin] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [snapshot, setSnapshot] = useState(null)

  function selectUser(u) {
    setSelected(u)
    setLoadingDetail(true)
    apiFetch(`/api/admin/users/${u.user_id}/perms/`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data.menus)
        setIsAppAdmin(data.is_app_admin)
        setSnapshot(JSON.stringify({ isAppAdmin: data.is_app_admin, menus: data.menus }))
      })
      .finally(() => setLoadingDetail(false))
  }

  const isDirty =
    detail !== null && snapshot !== null && JSON.stringify({ isAppAdmin, menus: detail }) !== snapshot

  const grouped = useMemo(() => {
    if (!detail) return []
    const byGroup = new Map()
    for (const m of detail) {
      const g = m.group || 'General'
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g).push(m)
    }
    return [...byGroup.entries()]
  }, [detail])

  function togglePerm(menuKey, action) {
    setDetail((prev) =>
      prev.map((m) =>
        m.key === menuKey ? { ...m, perms: { ...m.perms, [action]: !m.perms[action] } } : m
      )
    )
  }

  // Tri-state for a column: 'all' | 'some' | 'none', over menus where the
  // action is even applicable (not '—').
  function columnState(action) {
    if (!detail) return 'none'
    const applicable = detail.filter((m) => m.actions.includes(action))
    if (applicable.length === 0) return 'none'
    if (applicable.every((m) => m.perms[action])) return 'all'
    if (applicable.every((m) => !m.perms[action])) return 'none'
    return 'some'
  }

  function toggleColumn(action) {
    if (isAppAdmin) return
    const next = columnState(action) !== 'all'
    setDetail((prev) =>
      prev.map((m) =>
        m.actions.includes(action) ? { ...m, perms: { ...m.perms, [action]: next } } : m
      )
    )
  }

  function setGroupAll(menus, value) {
    if (isAppAdmin) return
    const keys = new Set(menus.map((m) => m.key))
    setDetail((prev) =>
      prev.map((m) => {
        if (!keys.has(m.key)) return m
        const perms = { ...m.perms }
        m.actions.forEach((a) => {
          perms[a] = value
        })
        return { ...m, perms }
      })
    )
  }

  function applyPreset(mode) {
    if (isAppAdmin || !detail) return
    setDetail((prev) =>
      prev.map((m) => {
        const perms = { ...m.perms }
        m.actions.forEach((a) => {
          perms[a] = mode === 'grant-all' ? true : mode === 'view-only' ? a === 'view' : false
        })
        return { ...m, perms }
      })
    )
  }

  async function handleSave() {
    if (!selected || !detail) return
    setSaving(true)
    const menus = Object.fromEntries(detail.map((m) => [m.key, m.perms]))
    try {
      const res = await apiFetch(`/api/admin/users/${selected.user_id}/perms/save/`, {
        method: 'POST',
        body: JSON.stringify({
          is_app_admin: isAppAdmin,
          login_id: selected.login_id,
          menus,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || data.error || 'Failed to save permissions')
      }
      setUsers((prev) =>
        prev.map((u) => (u.user_id === selected.user_id ? { ...u, is_app_admin: isAppAdmin } : u))
      )
      setSnapshot(JSON.stringify({ isAppAdmin, menus: detail }))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
      toast.success(`Permissions updated for ${selected.name}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Cmd/Ctrl+S saves the open user's permissions; Escape returns to the list
  // (blocked with a nudge if there are unsaved changes, so it can't eat edits).
  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (selected && isDirty && !saving) handleSave()
        return
      }
      if (e.key === 'Escape' && selected) {
        if (isDirty) {
          toast.error('Save or discard your changes first')
          return
        }
        setSelected(null)
        setDetail(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, isDirty, saving, detail])

  return (
    <div className="flex h-full gap-5">
      {/* Left panel — user list */}
      <div className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between p-3 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Users
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
            {counts.total}
          </span>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or login ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        </div>
        <UserFilterTabs filter={filter} onChange={setFilter} counts={counts} extraLabel="Admins" />
        <div
          className="flex-1 overflow-y-auto border-t border-border"
          onScroll={(e) => onListScroll(e, hasMore, loadMore)}
        >
          {loadingUsers && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
          {!loadingUsers && users.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No users found.</p>
          )}
          {users.map((u) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => selectUser(u)}
              className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                selected?.user_id === u.user_id ? 'bg-accent' : ''
              }`}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #5b9bff, #2563eb)' }}
              >
                {initials(u.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{u.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {u.login_id}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {u.is_app_admin && (
                  <span className="rounded-full bg-[#eef3fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#1a3f7a]">
                    Admin
                  </span>
                )}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                />
              </div>
            </button>
          ))}
          {loadingMore && (
            <p className="p-3 text-center text-xs text-muted-foreground">Loading more…</p>
          )}
        </div>
      </div>

      {/* Right panel — permission grid */}
      <div className="flex-1 rounded-2xl border border-border bg-card">
        {!selected && (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            Select a user to manage their permissions.
          </div>
        )}

        {selected && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{selected.name}</h2>
                <p className="font-mono text-xs text-muted-foreground">{selected.login_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAppAdmin((v) => !v)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    isAppAdmin
                      ? 'bg-[#1a3f7a] text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  App Admin
                </button>
                <Button
                  onClick={handleSave}
                  disabled={saving || loadingDetail || !isDirty}
                  variant={isDirty ? 'default' : 'secondary'}
                  size="sm"
                  title="⌘S / Ctrl+S"
                >
                  {saving ? 'Saving…' : savedFlash ? 'Saved' : isDirty ? 'Save changes' : 'Saved'}
                </Button>
              </div>
            </div>

            {!loadingDetail && !isAppAdmin && (
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Quick actions
                </span>
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-[#1a3f7a] hover:text-[#1a3f7a]"
                  >
                    {p.label}
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Esc to close · ⌘S to save
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail && <p className="text-sm text-muted-foreground">Loading…</p>}

              {isAppAdmin && !loadingDetail && (
                <p className="mb-4 rounded-lg bg-[#eef3fb] px-3 py-2 text-xs text-[#1a3f7a]">
                  App Admins bypass all permission checks — the grid below is ignored while this
                  is on.
                </p>
              )}

              {!loadingDetail &&
                grouped.map(([group, menus]) => (
                  <div key={group} className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {group || 'General'}
                      </p>
                      {!isAppAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGroupAll(menus, true)}
                            className="text-[11px] font-semibold text-[#2563eb] hover:underline"
                          >
                            All
                          </button>
                          <span className="text-[11px] text-muted-foreground">/</span>
                          <button
                            type="button"
                            onClick={() => setGroupAll(menus, false)}
                            className="text-[11px] font-semibold text-muted-foreground hover:underline"
                          >
                            None
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Menu</th>
                            {ACTIONS.map((a) => {
                              const state = columnState(a)
                              return (
                                <th key={a} className="px-3 py-2 text-center font-medium">
                                  <button
                                    type="button"
                                    disabled={isAppAdmin}
                                    onClick={() => toggleColumn(a)}
                                    title={`Toggle ${a} for every visible menu`}
                                    className={`inline-flex items-center gap-1 rounded px-1 capitalize transition-colors ${
                                      isAppAdmin
                                        ? 'cursor-default opacity-60'
                                        : 'hover:text-[#1a3f7a]'
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        state === 'all'
                                          ? 'bg-[#1a3f7a]'
                                          : state === 'some'
                                            ? 'bg-[#1a3f7a]/40'
                                            : 'bg-gray-300'
                                      }`}
                                    />
                                    {a}
                                  </button>
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {menus.map((m) => (
                            <tr key={m.key} className="border-t border-border">
                              <td className="px-3 py-2 font-medium text-foreground">{m.label}</td>
                              {ACTIONS.map((a) => {
                                const available = m.actions.includes(a)
                                return (
                                  <td key={a} className="px-3 py-2 text-center">
                                    {!available ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isAppAdmin}
                                        onClick={() => togglePerm(m.key, a)}
                                        className={`mx-auto flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                          m.perms[a]
                                            ? 'border-[#1a3f7a] bg-[#1a3f7a] text-white'
                                            : 'border-border bg-background'
                                        } ${isAppAdmin ? 'opacity-40' : 'hover:border-[#1a3f7a]'}`}
                                      >
                                        {m.perms[a] && <IconCheck className="h-3 w-3" />}
                                      </button>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
