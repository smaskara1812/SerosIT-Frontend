import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { mastersSchemas } from '@/config/mastersSchemas'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormField, emptyForm } from '@/routes/masters/MasterCrudPage'
import { IconChevronLeft } from '@/components/icons'
import AccessDenied from '@/components/AccessDenied'

const schema = mastersSchemas['it-assets']

// Groups fields into their declared sections, preserving first-seen order —
// same field list the list page's expanded row reads from, just laid out as
// a full page instead of a cramped drawer (too many fields for that).
function groupBySection(fields) {
  const sections = []
  const bySection = new Map()
  for (const f of fields) {
    if (!bySection.has(f.section)) {
      const group = { title: f.section, fields: [] }
      bySection.set(f.section, group)
      sections.push(group)
    }
    bySection.get(f.section).fields.push(f)
  }
  return sections
}

const sections = groupBySection(schema.fields)

export default function ItAssetFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, schema.menuKey, isEdit ? 'edit' : 'add')

  const [form, setForm] = useState(() => emptyForm(schema))
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`${schema.apiBase}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => setForm(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const heading = isEdit ? form.it_asset_sr_no || 'Edit IT Asset' : 'New IT Asset'

  function handleChange(f, v, raw) {
    const next = { ...form, [f.name]: v }
    // Changing a field that another field narrows its remote search by
    // (e.g. Manufacturer/Type/Subtype narrowing Model) invalidates whatever
    // was already picked under the old filter.
    for (const other of schema.fields) {
      if (other.filterField === f.name || other.filterFields?.some((ff) => ff.field === f.name)) {
        next[other.name] = null
      }
    }
    if (f.derives && raw) {
      for (const [targetField, sourceKey] of Object.entries(f.derives)) {
        next[targetField] = raw[sourceKey]
      }
    }
    setForm(next)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      for (const f of schema.fields) {
        if ((f.type === 'date' || f.type === 'number') && payload[f.name] === '') {
          payload[f.name] = null
        }
      }
      const url = isEdit ? `${schema.apiBase}${id}/` : schema.apiBase
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      toast.success(isEdit ? 'Changes saved' : `${data.it_asset_sr_no} created`)
      navigate(`/it-asset/it-assets/${data.it_asset_id}/edit`, { replace: true })
    } catch (e) {
      setError(e.message)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <Navigate to="/it-asset/it-assets" replace />
  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-16">
      <Link
        to="/it-asset/it-assets"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        IT Assets
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {canWrite && (
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {!canWrite && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have view-only access to this master.
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((f) => (
                <div
                  key={f.name}
                  className={`flex flex-col gap-1.5 ${f.wide ? 'col-span-full' : ''}`}
                >
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <FormField
                    field={f}
                    value={form[f.name]}
                    onChange={(v, raw) => handleChange(f, v, raw)}
                    disabled={!canWrite || f.readOnly}
                    form={form}
                    recordId={isEdit ? id : null}
                  />
                  {f.hint && f.type !== 'date' && (
                    <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
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
