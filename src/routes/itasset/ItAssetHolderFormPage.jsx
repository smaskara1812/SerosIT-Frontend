import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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

const schema = mastersSchemas['it-asset-holders']

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

export default function ItAssetHolderFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, schema.menuKey, isEdit ? 'edit' : 'add')

  // Arrived from an ongoing holder row's "Reassign Device" button — the IT
  // Asset is locked to this one, and saving goes through the /reassign/
  // action (closes the old ongoing row + creates this one atomically)
  // instead of a plain create.
  const [searchParams] = useSearchParams()
  const reassignAssetId = !isEdit ? searchParams.get('reassign') : null
  const reassignSrNo = searchParams.get('sr_no')

  const [form, setForm] = useState(() => emptyForm(schema))
  const [loading, setLoading] = useState(isEdit || Boolean(reassignAssetId))
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
      .then((data) =>
        setForm({
          ...data,
          // it_asset_holder_to is a datetime (see the model note — a
          // system-closed row is an exact moment, not just a day) but the
          // date-only picker here only ever shows/edits the day part.
          it_asset_holder_to: data.it_asset_holder_to ? data.it_asset_holder_to.slice(0, 10) : null,
        })
      )
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  useEffect(() => {
    if (isEdit || !reassignAssetId) return
    apiFetch(`/api/it-asset/it-assets/${reassignAssetId}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((asset) => {
        setForm((prev) => ({
          ...prev,
          it_asset: asset.it_asset_id,
          it_asset_sr_no: asset.it_asset_sr_no,
          it_asset_tag: asset.it_asset_tag,
          it_asset_sap_code: asset.it_asset_sap_code,
          it_asset_model_name: asset.it_asset_model_name,
          it_asset_subtype_name: asset.it_asset_subtype_name,
          it_asset_mfg_name: asset.it_asset_mfg_name,
          it_asset_active: asset.it_asset_active,
          own_company_name: asset.own_company_name,
          it_asset_holder_from: new Date().toISOString().slice(0, 10),
        }))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [isEdit, reassignAssetId])

  const heading = isEdit
    ? `Holder record — ${form.it_asset_sr_no || ''}`
    : reassignAssetId
      ? `Reassign ${reassignSrNo || ''}`
      : 'New Holder Record'

  function handleChange(f, v, raw) {
    const next = { ...form, [f.name]: v }
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
      // it_asset_holder_to is a datetime column — a manually-picked date
      // means "ends this day", so normalize to that day's last moment
      // rather than midnight (which would read as already-ended the
      // instant that day starts).
      if (payload.it_asset_holder_to) {
        payload.it_asset_holder_to = `${payload.it_asset_holder_to}T23:59:59`
      }
      const url = isEdit
        ? `${schema.apiBase}${id}/`
        : reassignAssetId
          ? '/api/it-asset/it-asset-holders/reassign/'
          : schema.apiBase
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      toast.success(isEdit ? 'Changes saved' : reassignAssetId ? 'Device reassigned' : 'Holder record created')
      navigate(`/it-asset/it-asset-holders/${data.it_asset_holder_id}/edit`, { replace: true })
    } catch (e) {
      setError(e.message)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <Navigate to="/it-asset/it-asset-holders" replace />
  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-16">
      <Link
        to="/it-asset/it-asset-holders"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconChevronLeft className="h-4 w-4" />
        IT Assets Holder
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {canWrite && (
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        )}
      </div>

      {reassignAssetId && !isEdit && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          Reassigning <span className="font-semibold">{reassignSrNo}</span> — its current
          assignment will be closed as of today automatically when you create this record.
        </p>
      )}
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
                    disabled={!canWrite || f.readOnly || (f.name === 'it_asset' && Boolean(reassignAssetId))}
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
