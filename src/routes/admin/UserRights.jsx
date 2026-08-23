import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useUserList } from '@/hooks/useUserList'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import UserFilterTabs from '@/components/admin/UserFilterTabs'
import { IconSearch, IconCheck } from '@/components/icons'

const ACTIONS = ['view', 'add', 'edit', 'delete', 'export']

// One color per action, used consistently for the column header dot, the
// checked-cell fill, and nothing else — so "which column is this" reads at
// a glance without needing the header text.
const ACTION_META = {
  view: { label: 'View', dot: 'bg-blue-500', fill: 'border-blue-500 bg-blue-500' },
  add: { label: 'Add', dot: 'bg-emerald-500', fill: 'border-emerald-500 bg-emerald-500' },
  edit: { label: 'Edit', dot: 'bg-amber-500', fill: 'border-amber-500 bg-amber-500' },
  delete: { label: 'Delete', dot: 'bg-red-500', fill: 'border-red-500 bg-red-500' },
  export: { label: 'Export', dot: 'bg-purple-500', fill: 'border-purple-500 bg-purple-500' },
}

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

// A real switch, not a status pill — the badge-shaped "APP ADMIN" button
// read as a label instead of a control. The label sits outside the track so
// it never looks like it's describing the user's current admin status.
function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
    >
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#1a3f7a]' : 'bg-muted-foreground/25'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}

// Tri-state header toggle for one action within one group's table only —
// scoped to `menus`, never the whole permission set, so clicking it can't
// reach into unrelated sections.
function ColumnHeaderToggle({ menus, action, isAppAdmin, onToggle }) {
  const meta = ACTION_META[action]
  const applicable = menus.filter((m) => m.actions.includes(action))
  const state =
    applicable.length === 0
      ? 'none'
      : applicable.every((m) => m.perms[action])
        ? 'all'
        : applicable.every((m) => !m.perms[action])
          ? 'none'
          : 'some'

  return (
    <button
      type="button"
      disabled={isAppAdmin || applicable.length === 0}
      onClick={() => onToggle(menus, action)}
      title={`Toggle ${meta.label} for this section`}
      className="inline-flex items-center gap-1 whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-50 enabled:hover:text-foreground"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
          state === 'all' ? meta.dot : state === 'some' ? `${meta.dot} opacity-40` : 'bg-gray-300'
        }`}
      />
      <span className="text-[11px] font-semibold text-muted-foreground">{meta.label}</span>
    </button>
  )
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

  // Scoped to whichever group's `menus` the header toggle was clicked in —
  // never the whole permission set, so a column toggle in "Masters ·
  // General" can't reach rows under "Dashboard" or any other section.
  function toggleColumnFor(menus, action) {
    if (isAppAdmin) return
    const applicable = menus.filter((m) => m.actions.includes(action))
    const allOn = applicable.length > 0 && applicable.every((m) => m.perms[action])
    const next = !allOn
    const keys = new Set(menus.map((m) => m.key))
    setDetail((prev) =>
      prev.map((m) =>
        keys.has(m.key) && m.actions.includes(action) ? { ...m, perms: { ...m.perms, [action]: next } } : m
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
              <div className="flex items-center gap-4">
                <ToggleSwitch checked={isAppAdmin} onChange={setIsAppAdmin} label="App Admin" />
                <Button
                  onClick={handleSave}
                  disabled={saving || loadingDetail || !isDirty}
                  variant={isDirty ? 'default' : 'secondary'}
                  size="sm"
                  title="Ctrl+S / Cmd+S"
                >
                  {saving ? 'Saving…' : savedFlash ? 'Saved' : isDirty ? 'Save changes' : 'Saved'}
                </Button>
              </div>
            </div>

            {!loadingDetail && !isAppAdmin && (
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Quick actions
                </span>
                <div className="flex items-center gap-1.5">
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
                </div>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Esc to close &nbsp;·&nbsp; Ctrl/Cmd+S to save
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
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setGroupAll(menus, true)}
                            className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground transition-colors hover:border-[#1a3f7a] hover:text-[#1a3f7a]"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setGroupAll(menus, false)}
                            className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-[#1a3f7a] hover:text-[#1a3f7a]"
                          >
                            None
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col className="w-[38%]" />
                          {ACTIONS.map((a) => (
                            <col key={a} className="w-[12.4%]" />
                          ))}
                        </colgroup>
                        <thead>
                          <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Menu</th>
                            {ACTIONS.map((a) => (
                              <th key={a} className="px-2 py-2 text-center font-medium">
                                <ColumnHeaderToggle
                                  menus={menus}
                                  action={a}
                                  isAppAdmin={isAppAdmin}
                                  onToggle={toggleColumnFor}
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {menus.map((m) => (
                            <tr key={m.key} className="border-t border-border">
                              <td className="truncate px-3 py-2 font-medium text-foreground">{m.label}</td>
                              {ACTIONS.map((a) => {
                                const available = m.actions.includes(a)
                                const meta = ACTION_META[a]
                                return (
                                  <td key={a} className="px-2 py-2 text-center">
                                    {!available ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isAppAdmin}
                                        onClick={() => togglePerm(m.key, a)}
                                        className={`mx-auto flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                          m.perms[a] ? `${meta.fill} text-white` : 'border-border bg-background'
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
