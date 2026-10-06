import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldErrorScope, FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { localDateStr } from '@/lib/naiveDateTime'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MENU_KEY = 'qhse.corrective_actions'
const API = '/api/qhse/corrective-actions/'

const FIELD_LABELS = {
  qhse_category: 'Category', icr_no: 'ICR No.', other_qhse_action_dt: 'Date', rig: 'Rig',
  action_recommended: 'Details of Findings', action_taken: 'Action Planned/Taken', action_party: 'Action Party',
  target_date: 'Target Date', completion_dt: 'Actual Closure Date', action_status: 'Action Status',
}

const CATEGORY_FIELD = { type: 'select-remote', remote: '/api/masters/qhse-categories/', optionLabel: 'qhse_category_name', optionValue: 'qhse_category_id', labelField: 'qhse_category_name' }
const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const STATUS_OPTIONS = [
  { value: 'OP', label: 'Open' },
  { value: 'IN', label: 'In Process' },
  { value: 'CL', label: 'Closed' },
]

function emptyForm() {
  return {
    qhse_category: null, qhse_category_label: '', icr_no: '', other_qhse_action_dt: '', rig: null, rig_label: '',
    action_recommended: '', action_taken: '', action_party: '', target_date: '', completion_dt: '', action_status: 'OP',
  }
}

function formToRecord(data) {
  return {
    qhse_category: data.qhse_category, qhse_category_label: data.qhse_category_name, icr_no: data.icr_no,
    other_qhse_action_dt: data.other_qhse_action_dt || '', rig: data.rig, rig_label: data.rig_name,
    action_recommended: data.action_recommended || '', action_taken: data.action_taken || '', action_party: data.action_party || '',
    target_date: data.target_date || '', completion_dt: data.completion_dt || '', action_status: data.action_status || 'OP',
  }
}

function Field({ label, name, required, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame name={name}>{children}</FieldFrame>
    </div>
  )
}

export default function CorrectiveActionFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, MENU_KEY, isEdit ? 'edit' : 'add')

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const bannerRef = useRef(null)
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(emptyForm())))
  // The SAVED status, not the live draft — picking "Closed" in the dropdown
  // must not lock the form before that change has been saved.
  const [savedStatus, setSavedStatus] = useState(null)
  const [icrNo, setIcrNo] = useState('')
  const closedLocked = isEdit && savedStatus === 'CL'
  const writable = canWrite && !closedLocked
  const today = localDateStr()

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`${API}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        const record = formToRecord(data)
        setForm(record)
        setSnapshot(JSON.stringify(record))
        setSavedStatus(data.action_status)
        setIcrNo(data.icr_no)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function set(patch) {
    setFieldErrors((prev) => {
      const keys = Object.keys(patch).filter((k) => prev[k])
      return keys.length ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev
    })
    setForm((f) => ({ ...f, ...patch }))
  }

  // Entering a closure date closes the record (and locks the status
  // dropdown); clearing it lets the status be chosen again.
  function setClosureDate(value) {
    const reopened = savedStatus && savedStatus !== 'CL' ? savedStatus : 'OP'
    set({ completion_dt: value, action_status: value ? 'CL' : form.action_status === 'CL' ? reopened : form.action_status })
  }

  function buildPayload() {
    const payload = {
      qhse_category: form.qhse_category,
      icr_no: form.icr_no.trim(),
      other_qhse_action_dt: form.other_qhse_action_dt || null,
      rig: form.rig,
      action_recommended: form.action_recommended.trim(),
      action_taken: form.action_taken.trim() || null,
      action_party: form.action_party.trim(),
      target_date: form.target_date || null,
    }
    if (isEdit) {
      payload.completion_dt = form.completion_dt || null
      payload.action_status = form.action_status
    }
    return payload
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const res = await apiFetch(isEdit ? `${API}${id}/` : API, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(buildPayload()) })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        scrollToFirstFieldError()
        return
      }
      allowNextNavigation()
      if (isEdit) {
        toast.success(data.action_status === 'CL' ? 'Changes saved — record closed' : 'Changes saved')
        const record = formToRecord(data)
        setForm(record)
        setSnapshot(JSON.stringify(record))
        setSavedStatus(data.action_status)
        setIcrNo(data.icr_no)
      } else {
        toast.success(`Corrective action ${data.icr_no} added`)
        navigate(`/qhse/corrective-actions/${data.other_qhse_action_id}/edit`, { replace: true })
      }
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = snapshot !== null && JSON.stringify(form) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: writable && !saving && !loading ? handleSave : undefined,
  })

  if (notFound) return <Navigate to="/qhse/corrective-actions" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const heading = isEdit ? `Corrective Action ${icrNo}` : 'New Corrective Action'
  const saveButton = (
    <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges)}>
      {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add'}
    </Button>
  )

  return (
    <FieldErrorScope errors={fieldErrors} className="mx-auto flex max-w-3xl flex-col gap-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {writable && !loading && saveButton}
      </div>

      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>
      )}
      {closedLocked && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">This record is Closed and can no longer be edited.</p>}
      {!canWrite && !loading && !closedLocked && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to Corrective Actions Reporting.</p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
            <Field name="qhse_category" label="Category" required>
              <RemoteCombobox
                field={CATEGORY_FIELD}
                value={form.qhse_category}
                labelValue={form.qhse_category_label}
                onChange={(v, raw) => set({ qhse_category: v, qhse_category_label: raw?.qhse_category_name || '' })}
                disabled={!writable}
              />
            </Field>
            <Field name="icr_no" label="ICR No." required>
              <Input value={form.icr_no} maxLength={15} onChange={(e) => set({ icr_no: e.target.value })} disabled={!writable} />
            </Field>
            <Field name="other_qhse_action_dt" label="Date" required>
              <Input type="date" max={today} value={form.other_qhse_action_dt} onChange={(e) => set({ other_qhse_action_dt: e.target.value })} disabled={!writable} />
            </Field>
            <Field name="rig" label="Rig" required>
              <RemoteCombobox
                field={RIG_FIELD}
                value={form.rig}
                labelValue={form.rig_label}
                onChange={(v, raw) => set({ rig: v, rig_label: raw?.rig_name || '' })}
                disabled={!writable}
              />
            </Field>
            <Field name="action_recommended" label="Details of Findings / Non Conformance / Observations / Recommendations (500 chars)" required wide>
              <Textarea rows={3} maxLength={500} value={form.action_recommended} onChange={(e) => set({ action_recommended: e.target.value })} disabled={!writable} />
            </Field>
            <Field name="action_taken" label="Action Planned/Taken (250 chars)" wide>
              <Textarea rows={3} maxLength={250} value={form.action_taken} onChange={(e) => set({ action_taken: e.target.value })} disabled={!writable} />
            </Field>
            <Field name="action_party" label="Action Party (100 chars)" required>
              <Textarea rows={2} maxLength={100} value={form.action_party} onChange={(e) => set({ action_party: e.target.value })} disabled={!writable} />
            </Field>
            <Field name="target_date" label="Target Date" required>
              <Input type="date" min={form.other_qhse_action_dt || undefined} value={form.target_date} onChange={(e) => set({ target_date: e.target.value })} disabled={!writable} />
            </Field>
            {isEdit && (
              <>
                <Field name="completion_dt" label="Actual Closure Date">
                  <Input type="date" min={form.other_qhse_action_dt || undefined} value={form.completion_dt} onChange={(e) => setClosureDate(e.target.value)} disabled={!writable} />
                </Field>
                <Field name="action_status" label="Action Status">
                  <select
                    value={form.action_status}
                    onChange={(e) => set({ action_status: e.target.value })}
                    disabled={!writable || Boolean(form.completion_dt)}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>

          {writable && <div className="flex justify-end">{saveButton}</div>}
        </>
      )}
      {leaveDialog}
    </FieldErrorScope>
  )
}
