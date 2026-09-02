import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconChevronLeft } from '@/components/icons'
import AccessDenied from '@/components/AccessDenied'

const API = '/api/masters/it-accessories/'
const MENU_KEY = 'masters.it_accessories'

export default function ItAccessoryFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, MENU_KEY, isEdit ? 'edit' : 'add')

  const [name, setName] = useState('')
  const [active, setActive] = useState('Y')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`${API}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        setName(data.it_accessory_name)
        setActive(data.it_accessory_active)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const payload = { it_accessory_name: name.trim(), it_accessory_active: active }
      const url = isEdit ? `${API}${id}/` : API
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      toast.success(isEdit ? 'Changes saved' : 'Accessory created')
      if (isEdit) {
        navigate(`/it-asset/it-accessories/${data.it_accessory_id}/edit`, { replace: true })
      } else {
        navigate('/it-asset/it-accessories')
      }
    } catch (e) {
      setError(e.message)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <Navigate to="/it-asset/it-accessories" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-16">
      <Link
        to="/it-asset/it-accessories"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        IT Accessory
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{isEdit ? `Edit — ${name}` : 'New IT Accessory'}</h1>
        {canWrite && (
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        )}
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!canWrite && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have view-only access to this master.
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            IT Accessory Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                Name<span className="text-destructive"> *</span>
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Active</Label>
              <select
                value={active}
                onChange={(e) => setActive(e.target.value)}
                disabled={!canWrite}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                <option value="Y">Active</option>
                <option value="N">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {canWrite && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        </div>
      )}
    </div>
  )
}
