import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useUserList } from '@/hooks/useUserList'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import UserFilterTabs from '@/components/admin/UserFilterTabs'
import { IconSearch } from '@/components/icons'

function onListScroll(e, hasMore, loadMore) {
  const el = e.currentTarget
  if (!hasMore) return
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadMore()
}

const emptyForm = {
  login_id: '',
  name: '',
  email: '',
  user_type: 'E',
  user_from: '',
  user_to: '',
  password: '',
}

function initials(name) {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

export default function UserManagement() {
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
    refresh: reloadUsers,
  } = useUserList('/api/admin/user-management/', { extraParam: 'local_only' })

  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState(null)

  function editableFields(f) {
    return JSON.stringify({
      name: f.name,
      email: f.email,
      user_type: f.user_type,
      user_from: f.user_from,
      user_to: f.user_to,
    })
  }

  const isDirty = creating
    ? Boolean(form.login_id.trim() && form.name.trim())
    : snapshot !== null && editableFields(form) !== snapshot

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setError('')
    apiFetch(`/api/admin/user-management/${selectedId}/`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.detail || data.error || 'Failed to load user')
        setDetail(data)
        const loaded = {
          login_id: data.login_id,
          name: data.name,
          email: data.email,
          user_type: data.user_type || 'E',
          user_from: data.user_from || '',
          user_to: data.user_to || '',
          password: '',
        }
        setForm(loaded)
        setSnapshot(editableFields(loaded))
      })
      .catch((e) => setError(e.message))
  }, [selectedId])

  function startCreate() {
    setCreating(true)
    setSelectedId(null)
    setDetail(null)
    setForm(emptyForm)
    setError('')
  }

  function selectUser(id) {
    setCreating(false)
    setSelectedId(id)
    setError('')
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      if (creating) {
        const res = await apiFetch('/api/admin/user-management/create/', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create user')
        await reloadUsers()
        setCreating(false)
        setSelectedId(data.user_id)
        toast.success(`${form.name} created`)
      } else if (selectedId) {
        const res = await apiFetch(`/api/admin/user-management/${selectedId}/update/`, {
          method: 'POST',
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        setSnapshot(editableFields(form))
        await reloadUsers()
        toast.success('Changes saved')
      }
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function refetchDetail() {
    const r = await apiFetch(`/api/admin/user-management/${selectedId}/`)
    const data = await r.json()
    if (!r.ok) {
      const message = data.detail || data.error || 'Request failed'
      setError(message)
      toast.error(message)
      return
    }
    setError('')
    setDetail(data)
  }

  async function handleSetPassword() {
    if (!selectedId || !newPassword) return
    const res = await apiFetch(`/api/admin/user-management/${selectedId}/set-password/`, {
      method: 'POST',
      body: JSON.stringify({ password: newPassword }),
    })
    setNewPassword('')
    await refetchDetail()
    if (res.ok) toast.success('Local password set')
    else toast.error('Failed to set password')
  }

  async function handleRemovePassword() {
    if (!selectedId) return
    const res = await apiFetch(`/api/admin/user-management/${selectedId}/remove-password/`, {
      method: 'POST',
    })
    await refetchDetail()
    if (res.ok) toast.success('Local password removed — now using AD login')
    else toast.error('Failed to remove password')
  }

  async function handleToggleActive() {
    if (!selectedId) return
    const res = await apiFetch(`/api/admin/user-management/${selectedId}/toggle-active/`, {
      method: 'POST',
    })
    await reloadUsers()
    await refetchDetail()
    if (res.ok) toast.success('Status updated')
    else toast.error('Failed to update status')
  }

  return (
    <div className="flex h-full gap-5">
      <div className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between p-3 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Users
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
              {counts.total}
            </span>
            <Button size="sm" onClick={startCreate}>
              + New
            </Button>
          </div>
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
        <UserFilterTabs filter={filter} onChange={setFilter} counts={counts} extraLabel="Local" />
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
              onClick={() => selectUser(u.user_id)}
              className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent ${
                selectedId === u.user_id ? 'bg-accent' : ''
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
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {u.auth_type}
                </span>
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

      <div className="flex-1 rounded-2xl border border-border bg-card">
        {!creating && !selectedId && (
          <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
            Select a user, or create a new one.
          </div>
        )}

        {(creating || detail) && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-base font-semibold text-foreground">
                {creating ? 'New user' : detail?.name}
              </h2>
              {!creating && detail && (
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                    detail.active
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {detail.active ? 'Active' : 'Inactive'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="grid max-w-lg grid-cols-2 gap-4">
                {creating && (
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Login ID</Label>
                    <Input
                      value={form.login_id}
                      onChange={(e) => setForm({ ...form, login_id: e.target.value })}
                    />
                  </div>
                )}
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={form.user_from || ''}
                    onChange={(e) => setForm({ ...form, user_from: e.target.value })}
                  />
                  {creating && (
                    <p className="text-[11px] text-muted-foreground">
                      Leave blank to default to today
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={form.user_to || ''}
                    onChange={(e) => setForm({ ...form, user_to: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank while the user is active
                  </p>
                </div>
                {creating && (
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Local password (optional — leave blank for AD login)</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !isDirty}
                variant={isDirty ? 'default' : 'secondary'}
                className="mt-5"
              >
                {saving
                  ? 'Saving…'
                  : creating
                    ? 'Create user'
                    : isDirty
                      ? 'Save changes'
                      : 'Saved'}
              </Button>

              {!creating && detail && (
                <div className="mt-8 max-w-lg border-t border-border pt-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Authentication — currently {detail.auth_type === 'local' ? 'local password' : 'AD'}
                  </p>
                  <div className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label>New local password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <Button variant="secondary" onClick={handleSetPassword} disabled={!newPassword}>
                      Set password
                    </Button>
                    {detail.auth_type === 'local' && (
                      <Button variant="outline" onClick={handleRemovePassword}>
                        Remove — fall back to AD
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
