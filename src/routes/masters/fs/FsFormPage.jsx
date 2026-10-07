import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { mastersSchemas } from '@/config/mastersSchemas'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormField, emptyForm } from '@/routes/masters/MasterCrudPage'
import AccessDenied from '@/components/AccessDenied'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { UserCheck, UserRound } from 'lucide-react'
import { FS_KINDS } from './fsKinds'
import { openEmployeeStatus } from './openStatus'

// Fields in the order the schema declares them, grouped by their `section`.
function groupBySection(fields) {
  const sections = []
  const by = new Map()
  for (const f of fields) {
    if (!by.has(f.section)) {
      const group = { title: f.section, fields: [] }
      by.set(f.section, group)
      sections.push(group)
    }
    by.get(f.section).fields.push(f)
  }
  return sections
}

const NULLABLE_TYPES = new Set(['date', 'number', 'select', 'select-remote', 'search-remote'])

// The form page for FS Employee and FS Employee Status — same sectioned
// layout as the IT Asset form, with a header shortcut across to the other
// FS page when the user may open it.
export default function FsFormPage({ kind: kindKey }) {
  const kind = FS_KINDS[kindKey]
  const other = FS_KINDS[kind.other]
  const schema = mastersSchemas[kind.schemaKey]
  const sections = groupBySection(schema.fields)
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, schema.menuKey, isEdit ? 'edit' : 'add')
  const canOpenOther = can(user, mastersSchemas[other.schemaKey].menuKey, 'view')
  const canAddStatus = can(user, mastersSchemas['fs-emp-cur-status'].menuKey, 'add')

  // A new status can be started from an employee (?employee=<id>&name=…).
  const prefill = () => {
    const form = emptyForm(schema)
    const employee = searchParams.get('employee')
    if (kindKey === 'status' && employee) {
      form.fs_emp = Number(employee)
      form.fs_emp_name = searchParams.get('name') || ''
    }
    return form
  }

  const [form, setForm] = useState(prefill)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const bannerRef = useRef(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(prefill())))

  useEffect(() => {
    if (!isEdit) return
    // This route doesn't remount on an :id-only change, so reset explicitly.
    setLoading(true)
    setNotFound(false)
    setSnapshot(null)
    apiFetch(`${schema.apiBase}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        setForm(data)
        setSnapshot(JSON.stringify(data))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const heading = isEdit ? kind.nameOf(form) || `Edit ${kind.title}` : `New ${kind.title}`

  function handleChange(f, v, raw) {
    const next = { ...form, [f.name]: v }
    if (f.derives && raw) {
      for (const [target, source] of Object.entries(f.derives)) next[target] = raw[source]
    }
    setForm(next)
    setFieldErrors((prev) => (prev[f.name] ? { ...prev, [f.name]: undefined } : prev))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const payload = { ...form }
      for (const f of schema.fields) {
        if (payload[f.name] === '' && NULLABLE_TYPES.has(f.type || 'text')) payload[f.name] = null
      }
      const res = await apiFetch(isEdit ? `${schema.apiBase}${id}/` : schema.apiBase, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, schema), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, schema))
        scrollToFirstFieldError()
        return
      }
      allowNextNavigation()
      toast.success(isEdit ? 'Changes saved' : `${kind.nameOf(data)} created`)
      if (isEdit) {
        setForm(data)
        setSnapshot(JSON.stringify(data))
      } else {
        navigate(kind.editPath(kind.idOf(data)), { replace: true })
      }
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = snapshot !== null && JSON.stringify(form) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: canWrite && !saving && !loading ? handleSave : undefined,
  })

  function goOther() {
    if (kindKey === 'employee') openEmployeeStatus(navigate, id, kind.nameOf(form), canAddStatus)
    else navigate(other.editPath(id))
  }

  if (notFound) return <Navigate to={kind.listPath} replace />
  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  const OtherIcon = kindKey === 'employee' ? UserCheck : UserRound
  const saveLabel = saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        <div className="flex items-center gap-2">
          {isEdit && canOpenOther && (
            <Button variant="outline" onClick={goOther}>
              <OtherIcon className="h-4 w-4" />
              {kindKey === 'employee' ? 'FS Employee Status' : 'FS Employee'}
            </Button>
          )}
          {canWrite && (
            <Button onClick={handleSave} disabled={saving || loading || (isEdit && !hasChanges)}>
              {saveLabel}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>
      )}
      {!canWrite && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to this page.</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{section.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((f) => (
                <div key={f.name} className={`flex flex-col gap-1.5 ${f.wide || f.type === 'textarea' ? 'col-span-full' : ''}`}>
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <FieldFrame error={fieldErrors[f.name]}>
                    <FormField
                      field={f}
                      value={form[f.name]}
                      onChange={(v, raw) => handleChange(f, v, raw)}
                      disabled={!canWrite || f.readOnly || (f.lockOnEdit && isEdit)}
                      form={form}
                      recordId={isEdit ? id : null}
                    />
                  </FieldFrame>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {canWrite && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
            {saveLabel}
          </Button>
        </div>
      )}

      {leaveDialog}
    </div>
  )
}
