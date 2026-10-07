import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'

const MENU_KEY = 'qhse.training_org'
const API = '/api/qhse/training-org/'
const TRAINERS_API = '/api/qhse/training-org-trainers/'
const FIELD_LABELS = {
  training_org_name: 'Org Name', training_org_address: 'Address', location: 'Location', contact_person_1: 'Contact Person 1',
  tel_no_1: 'Contact Tel No 1', contact_person_2: 'Contact Person 2', tel_no_2: 'Contact Tel No 2', training_org_email: 'Email',
  trainer_fname: 'First Name', trainer_mname: 'Middle Name', trainer_lname: 'Last Name', trainer_qualification: 'Qualification',
  trainer_mobile_no: 'Mobile', trainer_email_id: 'Email',
}
const LOCATION_FIELD = { type: 'select-remote', remote: '/api/masters/locations/', optionLabel: 'location_name', optionValue: 'location_id', labelField: 'location_name' }
const invalidCls = 'border-destructive ring-2 ring-destructive/40'

const emptyOrg = () => ({
  training_org_name: '', training_org_address: '', location: null, location_name: '', country_name: '',
  contact_person_1: '', tel_no_1: '', contact_person_2: '', tel_no_2: '', training_org_email: '',
})
const orgFromData = (d) => ({
  training_org_name: d.training_org_name, training_org_address: d.training_org_address, location: d.location, location_name: d.location_name,
  country_name: d.country_name, contact_person_1: d.contact_person_1 || '', tel_no_1: d.tel_no_1 || '', contact_person_2: d.contact_person_2 || '',
  tel_no_2: d.tel_no_2 || '', training_org_email: d.training_org_email || '',
})
const emptyTrainer = () => ({ trainer_fname: '', trainer_mname: '', trainer_lname: '', trainer_qualification: '', trainer_mobile_no: '', trainer_email_id: '' })
const TRAINER_COLS = [
  { field: 'trainer_fname', label: 'First Name', required: true, max: 25, width: 'w-28' },
  { field: 'trainer_mname', label: 'Middle Name', max: 25, width: 'w-28' },
  { field: 'trainer_lname', label: 'Last Name', required: true, max: 25, width: 'w-28' },
  { field: 'trainer_qualification', label: 'Qualification', max: 50, width: 'w-36' },
  { field: 'trainer_mobile_no', label: 'Mobile', max: 15, width: 'w-32', digits: true },
  { field: 'trainer_email_id', label: 'Email', max: 50, width: 'w-52' },
]
const trainerKey = (t) => JSON.stringify(TRAINER_COLS.map((c) => t[c.field] || ''))
const trainerPayload = (t) => Object.fromEntries(TRAINER_COLS.map((c) => [c.field, (t[c.field] || '').trim() || null]))

function Field({ label, required, children, error, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame error={error}>{children}</FieldFrame>
    </div>
  )
}

export default function TrainingOrgFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const writable = isEdit ? canEdit || canAdd : canAdd

  const [org, setOrg] = useState(emptyOrg)
  const [orgSnap, setOrgSnap] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [orig, setOrig] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [rowErrors, setRowErrors] = useState({})
  const bannerRef = useRef(null)
  const [newTrainer, setNewTrainer] = useState(emptyTrainer)
  const [adding, setAdding] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deletingRow, setDeletingRow] = useState(false)
  const clearErr = (k) => setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev))

  function loadTrainers() {
    return apiFetch(`${TRAINERS_API}?hdr=${id}&page_size=1000`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data
        setTrainers(list)
        setOrig(Object.fromEntries(list.map((t) => [t.training_org_dtl_id, trainerKey(t)])))
      })
  }

  function loadOrg() {
    return apiFetch(`${API}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        const o = orgFromData(data)
        setOrg(o)
        setOrgSnap(JSON.stringify(o))
      })
  }

  useEffect(() => {
    if (!isEdit) return
    Promise.all([loadOrg(), loadTrainers()])
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const orgDirty = isEdit ? orgSnap !== null && JSON.stringify(org) !== orgSnap : JSON.stringify(org) !== JSON.stringify(emptyOrg())
  const changedTrainers = useMemo(() => trainers.filter((t) => trainerKey(t) !== orig[t.training_org_dtl_id]), [trainers, orig])
  const hasChanges = orgDirty || changedTrainers.length > 0

  function setField(patch) {
    setFieldErrors((prev) => {
      const keys = Object.keys(patch).filter((k) => prev[k])
      return keys.length ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev
    })
    setOrg((o) => ({ ...o, ...patch }))
  }

  function setTrainerField(rowId, patch) {
    setTrainers((prev) => prev.map((t) => (t.training_org_dtl_id === rowId ? { ...t, ...patch } : t)))
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const orgPayload = () => ({
    training_org_name: org.training_org_name.trim(),
    training_org_address: org.training_org_address.trim(),
    location: org.location,
    contact_person_1: org.contact_person_1.trim() || null,
    tel_no_1: org.tel_no_1.trim() || null,
    contact_person_2: org.contact_person_2.trim() || null,
    tel_no_2: org.tel_no_2.trim() || null,
    training_org_email: org.training_org_email.trim() || null,
  })

  async function failOrg(data) {
    showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
    setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
    scrollToFirstFieldError()
  }

  async function handleCreate() {
    setError('')
    setFieldErrors({})
    setSaving(true)
    try {
      const res = await apiFetch(API, { method: 'POST', body: JSON.stringify(orgPayload()) })
      const data = await res.json()
      if (!res.ok) return failOrg(data)
      allowNextNavigation()
      toast.success('Organisation added — now add its trainers')
      navigate(`/qhse/training-org/${data.training_org_hdr_id}/edit`, { replace: true })
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    setError('')
    setFieldErrors({})
    setSaving(true)
    const failed = {}
    try {
      if (orgDirty) {
        const { training_org_name: _n, location: _l, ...editable } = orgPayload() // eslint-disable-line no-unused-vars
        const res = await apiFetch(`${API}${id}/`, { method: 'PATCH', body: JSON.stringify(editable) })
        const data = await res.json()
        if (!res.ok) return failOrg(data)
      }
      for (const t of changedTrainers) {
        const res = await apiFetch(`${TRAINERS_API}${t.training_org_dtl_id}/`, { method: 'PATCH', body: JSON.stringify(trainerPayload(t)) })
        if (!res.ok) failed[t.training_org_dtl_id] = formatApiError(await res.json().catch(() => null), FIELD_LABELS)
      }
      if (Object.keys(failed).length) {
        setRowErrors(failed)
        const first = trainers.find((t) => failed[t.training_org_dtl_id])
        showFormError(`${first.trainer_fname} ${first.trainer_lname}: ${failed[first.training_org_dtl_id]}`, { setError, bannerRef })
        requestAnimationFrame(() => document.getElementById(`trainer-row-${first.training_org_dtl_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      } else {
        allowNextNavigation()
        toast.success('Changes saved')
      }
      await Promise.all([loadOrg(), loadTrainers()])
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddTrainer() {
    setError('')
    setFieldErrors({})
    const missing = {}
    if (!newTrainer.trainer_fname.trim()) missing.trainer_fname = 'This is required.'
    if (!newTrainer.trainer_lname.trim()) missing.trainer_lname = 'This is required.'
    if (Object.keys(missing).length) {
      setFieldErrors(missing)
      showFormError(`Please fill in ${[missing.trainer_fname && 'the trainer’s First Name', missing.trainer_lname && 'Last Name'].filter(Boolean).join(' and ')}.`, { setError, bannerRef })
      scrollToFirstFieldError()
      return
    }
    setAdding(true)
    try {
      const res = await apiFetch(TRAINERS_API, { method: 'POST', body: JSON.stringify({ hdr: Number(id), ...trainerPayload(newTrainer) }) })
      const data = await res.json()
      if (!res.ok) return failOrg(data)
      toast.success(`${data.trainer_fname} ${data.trainer_lname} added`)
      setNewTrainer(emptyTrainer())
      await Promise.all([loadTrainers(), loadOrg()])
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setAdding(false)
    }
  }

  async function confirmDeleteRow() {
    if (!deleteRow) return
    setDeletingRow(true)
    try {
      const res = await apiFetch(`${TRAINERS_API}${deleteRow.training_org_dtl_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        toast.success(`${deleteRow.trainer_fname} ${deleteRow.trainer_lname} removed`)
        setDeleteRow(null)
        await loadTrainers()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't remove this trainer. Please try again.")
      }
    } finally {
      setDeletingRow(false)
    }
  }

  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: writable && !saving && hasChanges ? (isEdit ? handleSave : handleCreate) : undefined,
  })

  if (notFound) return <Navigate to="/qhse/training-org" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const saveButton = isEdit ? (
    <Button onClick={handleSave} disabled={saving || !hasChanges}>
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  ) : (
    <Button onClick={handleCreate} disabled={saving}>
      {saving ? 'Adding…' : 'Add'}
    </Button>
  )
  const heading = isEdit ? `Training Org — ${org.training_org_name || ''}` : 'New Training Org'
  const locked = isEdit

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {writable && !loading && saveButton}
      </div>

      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>
      )}
      {!writable && !loading && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to Training Org.</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <Field label="Org Name" required error={fieldErrors.training_org_name}>
                <Input value={org.training_org_name} maxLength={75} disabled={locked || !writable} className={locked ? 'bg-muted' : ''} onChange={(e) => setField({ training_org_name: e.target.value })} />
              </Field>
              <Field label="Address" required error={fieldErrors.training_org_address}>
                <Textarea rows={3} maxLength={100} value={org.training_org_address} disabled={!writable} onChange={(e) => setField({ training_org_address: e.target.value })} />
              </Field>
              <Field label="Location" required error={fieldErrors.location}>
                {locked ? (
                  <Input value={org.location_name} disabled className="bg-muted" />
                ) : (
                  <RemoteCombobox
                    field={LOCATION_FIELD}
                    value={org.location}
                    labelValue={org.location_name}
                    disabled={!writable}
                    onChange={(v, raw) => setField({ location: v, location_name: raw?.location_name || '', country_name: raw?.country_name || '' })}
                  />
                )}
              </Field>
              <Field label="Country">
                <Input value={org.country_name} disabled className="bg-muted" placeholder="Follows the Location" />
              </Field>
              <Field label="Contact Person 1" error={fieldErrors.contact_person_1}>
                <Input value={org.contact_person_1} maxLength={50} disabled={!writable} onChange={(e) => setField({ contact_person_1: e.target.value })} />
              </Field>
              <Field label="Contact Tel No 1" error={fieldErrors.tel_no_1}>
                <Input value={org.tel_no_1} maxLength={15} disabled={!writable} onChange={(e) => setField({ tel_no_1: e.target.value })} />
              </Field>
              <Field label="Contact Person 2" error={fieldErrors.contact_person_2}>
                <Input value={org.contact_person_2} maxLength={50} disabled={!writable} onChange={(e) => setField({ contact_person_2: e.target.value })} />
              </Field>
              <Field label="Contact Tel No 2" error={fieldErrors.tel_no_2}>
                <Input value={org.tel_no_2} maxLength={15} disabled={!writable} onChange={(e) => setField({ tel_no_2: e.target.value })} />
              </Field>
              <Field label="Email" error={fieldErrors.training_org_email}>
                <Input value={org.training_org_email} maxLength={30} disabled={!writable} onChange={(e) => setField({ training_org_email: e.target.value })} />
              </Field>
            </div>
            {!isEdit && <p className="mt-4 text-xs text-muted-foreground">The name and location can&apos;t be changed after the organisation is saved. You&apos;ll add its trainers next.</p>}
          </div>

          {isEdit && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 px-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">Trainer Details ({trainers.length})</h2>
              {writable && (
                <div className="mb-4 grid grid-cols-2 items-end gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-4 lg:grid-cols-7">
                  {TRAINER_COLS.map((c) => (
                    <Field key={c.field} label={c.label} required={c.required} error={fieldErrors[c.field]}>
                      <Input
                        value={newTrainer[c.field]}
                        maxLength={c.max}
                        inputMode={c.digits ? 'numeric' : undefined}
                        onChange={(e) => {
                          setNewTrainer((t) => ({ ...t, [c.field]: c.digits ? e.target.value.replace(/\D/g, '') : e.target.value }))
                          clearErr(c.field)
                        }}
                      />
                    </Field>
                  ))}
                  <Button onClick={handleAddTrainer} disabled={adding}>
                    {adding ? 'Adding…' : 'Add trainer'}
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {[...TRAINER_COLS.map((c) => c.label), ''].map((h) => (
                        <th key={h || 'x'} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trainers.length === 0 && (
                      <tr>
                        <td colSpan={TRAINER_COLS.length + 1} className="p-6 text-center text-sm text-muted-foreground">No trainers added yet.</td>
                      </tr>
                    )}
                    {trainers.map((t, idx) => {
                      const rid = t.training_org_dtl_id
                      const dirty = trainerKey(t) !== orig[rid]
                      const err = rowErrors[rid]
                      return (
                        <tr key={rid} id={`trainer-row-${rid}`} className={`border-t border-border/60 ${err ? 'bg-destructive/5' : dirty ? 'bg-amber-50 dark:bg-amber-950/20' : idx % 2 ? 'bg-muted/20' : ''}`}>
                          {TRAINER_COLS.map((c, i) => (
                            <td key={c.field} className="px-3 py-1.5 align-top">
                              <Input
                                value={t[c.field] || ''}
                                maxLength={c.max}
                                disabled={!writable}
                                inputMode={c.digits ? 'numeric' : undefined}
                                onChange={(e) => setTrainerField(rid, { [c.field]: c.digits ? e.target.value.replace(/\D/g, '') : e.target.value })}
                                className={`h-8 ${c.width} ${err ? invalidCls : ''}`}
                              />
                              {err && i === 0 && <span className="mt-1 block max-w-[28rem] text-xs whitespace-pre-line text-destructive">{err}</span>}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right align-top">
                            {writable && (canEdit || canDelete) && (
                              <button type="button" title="Remove trainer" onClick={() => setDeleteRow(t)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                                <IconTrash className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {writable && <div className="flex justify-end">{saveButton}</div>}
        </>
      )}

      <Dialog open={Boolean(deleteRow)} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {deleteRow?.trainer_fname} {deleteRow?.trainer_lname}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRow} disabled={deletingRow}>
              {deletingRow ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {leaveDialog}
    </div>
  )
}
