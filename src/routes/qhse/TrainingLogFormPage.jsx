import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'

const MENU_KEY = 'qhse.training_log'
const API = '/api/qhse/training-log/'
const TRAINEES_API = '/api/qhse/training-log-trainees/'
const FIELD_LABELS = {
  rig: 'Rig', cert: 'Course Name', training_dt: 'Training Date', training_location: 'Training Location', training_type: 'Training Type',
  course_duration: 'Duration (in Days)', training_org: 'Training Org', training_org_dtl: 'Trainer Name', assessment_conducted: 'Assessment Conducted',
  training_party: 'Training Party', fs_emp: 'Employee', fs_category: 'Category', trainee_fname: 'First Name', trainee_mname: 'Middle Name',
  trainee_lname: 'Last Name', trainee_designation: 'Designation', trainee_department: 'Department', company_name: 'Company',
  certificate_issued: 'Certificate Issued', certificate_no: 'Certificate No.', certificate_dt: 'Certificate Date', cert_valid_upto: 'Valid Upto',
}
const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const COURSE_FIELD = { type: 'select-remote', remote: `${API}certificates/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const ORG_FIELD = { type: 'select-remote', remote: `${API}orgs/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const CATEGORY_FIELD = { type: 'select-remote', remote: `${API}categories/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const selectCls =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'
const cellSelectCls = 'h-8 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60'
const invalidCls = 'border-destructive ring-2 ring-destructive/40'

const emptyHdr = () => ({
  rig: null, rig_name: '', cert: null, cert_name: '', training_dt: '', training_location: '', training_type: '', course_duration: '',
  training_org: null, training_org_name: '', training_org_dtl: null, trainer_name: '', assessment_conducted: '',
})
const emptyTrainee = (cert) => ({
  party: '', fs_emp: null, fs_emp_label: '', staff: null, fs_category: null, fs_category_name: '', fname: '', mname: '', lname: '',
  designation: '', department: '', company: '', issued: '', no: '', dt: cert.dt || '', valid: cert.valid || '', file: null,
})
const CERT_KEYS = ['certificate_issued', 'certificate_no', 'certificate_dt', 'cert_valid_upto']
const certKey = (t) => JSON.stringify(CERT_KEYS.map((k) => t[k] || ''))

function Field({ label, name, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame name={name}>{children}</FieldFrame>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function TrainingLogFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const writable = isEdit ? canEdit || canAdd : canAdd

  const [hdr, setHdr] = useState(emptyHdr)
  const [hdrSnap, setHdrSnap] = useState(null)
  const [trainees, setTrainees] = useState([])
  const [orig, setOrig] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [rowErrors, setRowErrors] = useState({})
  const bannerRef = useRef(null)
  const [rememberedCert, setRememberedCert] = useState({ dt: '', valid: '' })
  const [nt, setNt] = useState(() => emptyTrainee({}))
  const [partyInfo, setPartyInfo] = useState({ company: null, options: [] })
  const [adding, setAdding] = useState(false)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deletingRow, setDeletingRow] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
  // Files chosen for a trainee whose Certificate Issued change isn't saved yet;
  // they're attached right after that save.
  const [pendingFiles, setPendingFiles] = useState({})
  const today = localDateStr()

  function applyHdr(d) {
    const h = {
      rig: d.rig, rig_name: d.rig_name, cert: d.cert, cert_name: d.cert_name, training_dt: d.training_dt, training_location: d.training_location,
      training_type: d.training_type, course_duration: String(d.course_duration), training_org: d.training_org, training_org_name: d.training_org_name,
      training_org_dtl: d.training_org_dtl, trainer_name: d.trainer_name, assessment_conducted: d.assessment_conducted,
    }
    setHdr(h)
    setHdrSnap(JSON.stringify(h))
  }

  function loadTrainees() {
    return apiFetch(`${TRAINEES_API}?hdr=${id}&page_size=1000`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data
        setTrainees(list)
        setOrig(Object.fromEntries(list.map((t) => [t.training_log_dtl_id, certKey(t)])))
      })
  }

  const loadHdr = () =>
    apiFetch(`${API}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(applyHdr)

  useEffect(() => {
    if (!isEdit) return
    Promise.all([loadHdr(), loadTrainees()])
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  // The training party list depends on the rig and the training date.
  useEffect(() => {
    if (!isEdit || !hdr.rig) return
    let cancelled = false
    apiFetch(`${API}party-options/?rig=${hdr.rig}&date=${hdr.training_dt || ''}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setPartyInfo(d))
    return () => {
      cancelled = true
    }
  }, [isEdit, hdr.rig, hdr.training_dt])

  const hdrDirty = isEdit ? hdrSnap !== null && JSON.stringify(hdr) !== hdrSnap : JSON.stringify(hdr) !== JSON.stringify(emptyHdr())
  const changedRows = useMemo(() => trainees.filter((t) => certKey(t) !== orig[t.training_log_dtl_id]), [trainees, orig])
  const hasChanges = hdrDirty || changedRows.length > 0

  const setH = (patch) => {
    setFieldErrors((prev) => {
      const keys = Object.keys(patch).filter((k) => prev[k])
      return keys.length ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev
    })
    setHdr((h) => ({ ...h, ...patch }))
  }
  const setN = (patch) => {
    setFieldErrors((prev) => {
      const keys = Object.keys(patch).filter((k) => prev[k])
      return keys.length ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev
    })
    setNt((t) => ({ ...t, ...patch }))
  }

  function setRow(rowId, patch) {
    setTrainees((prev) => prev.map((t) => (t.training_log_dtl_id === rowId ? { ...t, ...patch } : t)))
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const hdrPayload = () => ({
    rig: hdr.rig, cert: hdr.cert, training_dt: hdr.training_dt || null, training_location: hdr.training_location, training_type: hdr.training_type || null,
    course_duration: hdr.course_duration === '' ? null : Number(hdr.course_duration), training_org: hdr.training_org,
    training_org_dtl: hdr.training_org_dtl, assessment_conducted: hdr.assessment_conducted || null,
  })

  function failHdr(data) {
    showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
    setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
    scrollToFirstFieldError()
  }

  async function handleCreate() {
    setError('')
    setFieldErrors({})
    setSaving(true)
    try {
      const res = await apiFetch(API, { method: 'POST', body: JSON.stringify(hdrPayload()) })
      const data = await res.json()
      if (!res.ok) return failHdr(data)
      allowNextNavigation()
      toast.success('Training log added — now add the trainees')
      navigate(`/qhse/training-log/${data.training_log_hdr_id}/edit`, { replace: true })
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
      if (hdrDirty) {
        const res = await apiFetch(`${API}${id}/`, { method: 'PATCH', body: JSON.stringify(hdrPayload()) })
        const data = await res.json()
        if (!res.ok) return failHdr(data)
      }
      for (const t of changedRows) {
        const res = await apiFetch(`${TRAINEES_API}${t.training_log_dtl_id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            certificate_issued: t.certificate_issued,
            certificate_no: t.certificate_issued === 'Y' ? t.certificate_no || null : null,
            certificate_dt: t.certificate_issued === 'Y' ? t.certificate_dt || null : null,
            cert_valid_upto: t.certificate_issued === 'Y' ? t.cert_valid_upto || null : null,
          }),
        })
        if (!res.ok) {
          failed[t.training_log_dtl_id] = formatApiError(await res.json().catch(() => null), FIELD_LABELS)
          continue
        }
        const file = pendingFiles[t.training_log_dtl_id]
        if (file && (await uploadCertificate(t, file, { quiet: true }))) {
          setPendingFiles((prev) => {
            const next = { ...prev }
            delete next[t.training_log_dtl_id]
            return next
          })
        }
      }
      if (Object.keys(failed).length) {
        setRowErrors(failed)
        const first = trainees.find((t) => failed[t.training_log_dtl_id])
        showFormError(`${first.trainee_fname} ${first.trainee_lname}: ${failed[first.training_log_dtl_id]}`, { setError, bannerRef })
        requestAnimationFrame(() => document.getElementById(`trainee-row-${first.training_log_dtl_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      } else {
        allowNextNavigation()
        toast.success('Changes saved')
      }
      await Promise.all([loadHdr(), loadTrainees()])
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  const isCompany = partyInfo.company && nt.party === partyInfo.company

  async function handleAddTrainee() {
    setError('')
    setFieldErrors({})
    const body = { hdr: Number(id), training_party: nt.party, certificate_issued: nt.issued || null }
    if (isCompany) {
      body.fs_emp = nt.fs_emp
    } else {
      Object.assign(body, {
        fs_category: nt.fs_category, trainee_fname: nt.fname, trainee_mname: nt.mname || null, trainee_lname: nt.lname,
        trainee_designation: nt.designation, trainee_department: nt.department, company_name: nt.company,
      })
    }
    if (nt.issued === 'Y') Object.assign(body, { certificate_no: nt.no, certificate_dt: nt.dt || null, cert_valid_upto: nt.valid || null })
    setAdding(true)
    try {
      const res = await apiFetch(TRAINEES_API, { method: 'POST', body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        setFieldErrors(buildFieldErrors(data, FIELD_LABELS))
        showFormError(formatApiError(data, FIELD_LABELS), { setError, bannerRef })
        scrollToFirstFieldError()
        return
      }
      let uploadNote = ''
      if (nt.issued === 'Y' && nt.file) {
        const fd = new FormData()
        fd.append('file', nt.file)
        const up = await apiFetch(`${TRAINEES_API}${data.training_log_dtl_id}/certificate/`, { method: 'POST', body: fd })
        if (!up.ok) uploadNote = ` The certificate file wasn't attached: ${(await up.json().catch(() => ({}))).error || 'upload failed'}.`
      }
      if (nt.issued === 'Y') setRememberedCert({ dt: nt.dt, valid: nt.valid })
      toast.success(`${data.trainee_fname} ${data.trainee_lname} added.${uploadNote}`)
      setNt(emptyTrainee(nt.issued === 'Y' ? { dt: nt.dt, valid: nt.valid } : rememberedCert))
      await Promise.all([loadTrainees(), loadHdr()])
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setAdding(false)
    }
  }

  async function uploadCertificate(row, file, { quiet = false } = {}) {
    if (!file) return false
    setUploadingId(row.training_log_dtl_id)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiFetch(`${TRAINEES_API}${row.training_log_dtl_id}/certificate/`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`${row.trainee_fname} ${row.trainee_lname}: ${data.error || "couldn't attach the file. Please try again."}`)
        return false
      }
      setTrainees((prev) => prev.map((t) => (t.training_log_dtl_id === row.training_log_dtl_id ? { ...t, certificate_path: data.certificate_path, certificate_url: data.certificate_url } : t)))
      if (!quiet) toast.success('Certificate file attached')
      return true
    } finally {
      setUploadingId(null)
    }
  }

  async function removeCertificate(row) {
    const res = await apiFetch(`${TRAINEES_API}${row.training_log_dtl_id}/certificate/`, { method: 'DELETE' })
    if (!res.ok) return toast.error("Couldn't remove the file. Please try again.")
    setTrainees((prev) => prev.map((t) => (t.training_log_dtl_id === row.training_log_dtl_id ? { ...t, certificate_path: null, certificate_url: null } : t)))
    toast.success('Certificate file removed')
  }

  async function confirmDeleteRow() {
    if (!deleteRow) return
    setDeletingRow(true)
    try {
      const res = await apiFetch(`${TRAINEES_API}${deleteRow.training_log_dtl_id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        toast.success(`${deleteRow.trainee_fname} ${deleteRow.trainee_lname} removed`)
        setDeleteRow(null)
        await Promise.all([loadTrainees(), loadHdr()])
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't remove this trainee. Please try again.")
      }
    } finally {
      setDeletingRow(false)
    }
  }

  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: writable && !saving && hasChanges ? (isEdit ? handleSave : handleCreate) : undefined,
  })

  if (notFound) return <Navigate to="/qhse/training-log" replace />
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
  const heading = isEdit ? `Training Log — ${hdr.cert_name || ''}${hdr.rig_name ? ` · ${hdr.rig_name}` : ''}` : 'New Training Log'

  return (
    <FieldErrorScope errors={fieldErrors} className="mx-auto flex max-w-6xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {writable && !loading && saveButton}
      </div>

      {error && <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>}
      {!writable && !loading && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to Training Log.</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Rig" name="rig" required>
                {isEdit ? (
                  <Input value={hdr.rig_name} disabled className="bg-muted" />
                ) : (
                  <RemoteCombobox field={RIG_FIELD} value={hdr.rig} labelValue={hdr.rig_name} disabled={!writable} onChange={(v, raw) => setH({ rig: v, rig_name: raw?.rig_name || '' })} />
                )}
              </Field>
              <Field label="Course Name" name="cert" required>
                <RemoteCombobox field={COURSE_FIELD} value={hdr.cert} labelValue={hdr.cert_name} disabled={!writable} onChange={(v, raw) => setH({ cert: v, cert_name: raw?.name || '' })} />
              </Field>
              <Field label="Training Date" name="training_dt" required>
                <Input type="date" max={today} value={hdr.training_dt} disabled={!writable} onChange={(e) => setH({ training_dt: e.target.value })} />
              </Field>
              <Field label="Training Location" name="training_location" required>
                <Input value={hdr.training_location} maxLength={50} disabled={!writable} onChange={(e) => setH({ training_location: e.target.value })} />
              </Field>
              <Field label="Training Type" name="training_type" required>
                <select value={hdr.training_type} disabled={!writable} onChange={(e) => setH({ training_type: e.target.value })} className={selectCls}>
                  <option value="">Select…</option>
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                </select>
              </Field>
              <Field label="Duration (in Days)" name="course_duration" required>
                <Input type="number" min={1} max={255} value={hdr.course_duration} disabled={!writable} onChange={(e) => setH({ course_duration: e.target.value })} />
              </Field>
              <Field label="Training Org" name="training_org" required>
                <RemoteCombobox
                  field={ORG_FIELD}
                  value={hdr.training_org}
                  labelValue={hdr.training_org_name}
                  disabled={!writable}
                  onChange={(v, raw) => setH({ training_org: v, training_org_name: raw?.name || '', training_org_dtl: null, trainer_name: '' })}
                />
              </Field>
              <Field label="Trainer Name" name="training_org_dtl" required>
                {hdr.training_org ? (
                  <RemoteCombobox
                    key={hdr.training_org}
                    field={{ type: 'select-remote', remote: `${API}trainers/?org=${hdr.training_org}`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }}
                    value={hdr.training_org_dtl}
                    labelValue={hdr.trainer_name}
                    disabled={!writable}
                    onChange={(v, raw) => setH({ training_org_dtl: v, trainer_name: raw?.name || '' })}
                  />
                ) : (
                  <Input disabled placeholder="Select a Training Org first" />
                )}
              </Field>
              <Field label="Assessment Conducted" name="assessment_conducted" required>
                <select value={hdr.assessment_conducted} disabled={!writable} onChange={(e) => setH({ assessment_conducted: e.target.value })} className={selectCls}>
                  <option value="">Select…</option>
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </select>
              </Field>
            </div>
            {!isEdit && <p className="mt-4 text-xs text-muted-foreground">The rig can&apos;t be changed after the log is saved. You&apos;ll add the trainees next.</p>}
          </div>

          {isEdit && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 px-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">Trainees ({trainees.length})</h2>

              {writable && (
                <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Training Party" name="training_party" required>
                      <select
                        value={nt.party}
                        onChange={(e) => setN({ party: e.target.value, fs_emp: null, fs_emp_label: '', staff: null })}
                        className={selectCls}
                      >
                        <option value="">Select…</option>
                        {partyInfo.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {isCompany ? (
                      <>
                        <Field label="Employee" name="fs_emp" required hint="Active staff currently on this rig.">
                          <RemoteCombobox
                            key={`${hdr.rig}-${hdr.training_dt}`}
                            field={{ type: 'select-remote', remote: `${API}employees/?rig=${hdr.rig}&date=${hdr.training_dt || ''}`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }}
                            value={nt.fs_emp}
                            labelValue={nt.fs_emp_label}
                            onChange={(v, raw) => setN({ fs_emp: v, fs_emp_label: raw?.name || '', staff: raw || null })}
                          />
                        </Field>
                        {nt.staff && (
                          <div className="flex flex-col gap-1 rounded-lg bg-card px-3 py-2 text-sm sm:col-span-2">
                            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Filled in from the employee record</span>
                            <span>
                              {nt.staff.fs_category_name} · {nt.staff.designation} · {nt.staff.department} · {nt.staff.company}
                            </span>
                          </div>
                        )}
                      </>
                    ) : nt.party ? (
                      <>
                        <Field label="Category" name="fs_category" required>
                          <RemoteCombobox
                            field={CATEGORY_FIELD}
                            value={nt.fs_category}
                            labelValue={nt.fs_category_name}
                            onChange={(v, raw) => setN({ fs_category: v, fs_category_name: raw?.name || '', designation: '' })}
                          />
                        </Field>
                        <Field label="First Name" name="trainee_fname" required>
                          <Input value={nt.fname} maxLength={20} onChange={(e) => setN({ fname: e.target.value })} />
                        </Field>
                        <Field label="Middle Name" name="trainee_mname">
                          <Input value={nt.mname} maxLength={20} onChange={(e) => setN({ mname: e.target.value })} />
                        </Field>
                        <Field label="Last Name" name="trainee_lname" required>
                          <Input value={nt.lname} maxLength={25} onChange={(e) => setN({ lname: e.target.value })} />
                        </Field>
                        <Field label="Designation (Rank)" name="trainee_designation" required hint="Choose a Category first.">
                          {nt.fs_category ? (
                            <RemoteCombobox
                              key={nt.fs_category}
                              field={{ type: 'select-remote', remote: `${API}ranks/?category=${nt.fs_category}`, optionLabel: 'name', optionValue: 'name', labelField: 'name' }}
                              value={nt.designation || null}
                              labelValue={nt.designation}
                              onChange={(v) => setN({ designation: v || '' })}
                            />
                          ) : (
                            <Input disabled placeholder="Select a Category first" />
                          )}
                        </Field>
                        <Field label="Department" name="trainee_department" required>
                          <Input value={nt.department} maxLength={50} onChange={(e) => setN({ department: e.target.value })} />
                        </Field>
                        <Field label="Company" name="company_name" required>
                          <Input value={nt.company} maxLength={75} onChange={(e) => setN({ company: e.target.value })} />
                        </Field>
                      </>
                    ) : null}
                  </div>

                  {nt.party && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <Field label="Certificate Issued" name="certificate_issued" required>
                        <select value={nt.issued} onChange={(e) => setN({ issued: e.target.value })} className={selectCls}>
                          <option value="">Select…</option>
                          <option value="Y">Yes</option>
                          <option value="N">No</option>
                        </select>
                      </Field>
                      {nt.issued === 'Y' && (
                        <>
                          <Field label="Certificate No." name="certificate_no" required>
                            <Input value={nt.no} maxLength={25} onChange={(e) => setN({ no: e.target.value })} />
                          </Field>
                          <Field label="Certificate Date" name="certificate_dt" required>
                            <Input type="date" max={today} value={nt.dt} onChange={(e) => setN({ dt: e.target.value })} />
                          </Field>
                          <Field label="Valid Upto" name="cert_valid_upto" required>
                            <Input type="date" min={nt.dt || undefined} value={nt.valid} onChange={(e) => setN({ valid: e.target.value })} />
                          </Field>
                          <Field label="Certificate File" hint="Image, PDF or Word, up to 5 MB.">
                            <Input type="file" accept=".gif,.png,.jpeg,.jpg,.pdf,.doc,.docx" onChange={(e) => setN({ file: e.target.files?.[0] || null })} />
                          </Field>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleAddTrainee} disabled={adding || !nt.party}>
                      {adding ? 'Adding…' : 'Add trainee'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {['Party', 'Trainee', 'Category', 'Designation', 'Department', 'Company', 'Cert. Issued', 'Cert. No.', 'Cert. Date', 'Valid Upto', 'File', ''].map((h) => (
                        <th key={h || 'x'} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trainees.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-sm text-muted-foreground">No trainees added yet.</td>
                      </tr>
                    )}
                    {trainees.map((t, idx) => {
                      const rid = t.training_log_dtl_id
                      const dirty = certKey(t) !== orig[rid]
                      const err = rowErrors[rid]
                      const yes = t.certificate_issued === 'Y'
                      return (
                        <tr key={rid} id={`trainee-row-${rid}`} className={`border-t border-border/60 align-top ${err ? 'bg-destructive/5' : dirty ? 'bg-amber-50 dark:bg-amber-950/20' : idx % 2 ? 'bg-muted/20' : ''}`}>
                          <td className="px-3 py-2 whitespace-nowrap">{t.training_party}</td>
                          <td className="px-3 py-2 font-medium">
                            {[t.trainee_fname, t.trainee_mname, t.trainee_lname].filter(Boolean).join(' ')}
                            {err && <span className="mt-1 block max-w-[18rem] text-xs font-normal whitespace-pre-line text-destructive">{err}</span>}
                          </td>
                          <td className="px-3 py-2">{t.fs_category_name}</td>
                          <td className="px-3 py-2">{t.trainee_designation}</td>
                          <td className="px-3 py-2">{t.trainee_department}</td>
                          <td className="px-3 py-2">{t.company_name}</td>
                          <td className="px-3 py-1.5">
                            <select
                              value={t.certificate_issued}
                              disabled={!writable}
                              onChange={(e) => {
                                const v = e.target.value
                                setRow(rid, v === 'N' ? { certificate_issued: v, certificate_no: null, certificate_dt: null, cert_valid_upto: null } : { certificate_issued: v })
                              }}
                              className={cellSelectCls}
                            >
                              <option value="Y">Yes</option>
                              <option value="N">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <Input value={t.certificate_no || ''} maxLength={25} disabled={!writable || !yes} onChange={(e) => setRow(rid, { certificate_no: e.target.value })} className={`h-8 w-28 ${err ? invalidCls : ''}`} />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input type="date" value={t.certificate_dt || ''} disabled={!writable || !yes} onChange={(e) => setRow(rid, { certificate_dt: e.target.value })} className="h-8 w-36" />
                          </td>
                          <td className="px-3 py-1.5">
                            <Input type="date" value={t.cert_valid_upto || ''} disabled={!writable || !yes} onChange={(e) => setRow(rid, { cert_valid_upto: e.target.value })} className="h-8 w-36" />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {t.certificate_url ? (
                              <>
                                <a href={t.certificate_url} target="_blank" rel="noreferrer" className="text-primary underline">View</a>
                                {writable && (
                                  <button type="button" onClick={() => removeCertificate(t)} className="ml-2 text-xs text-destructive hover:underline">Remove</button>
                                )}
                              </>
                            ) : writable && yes ? (
                              <label className="cursor-pointer text-xs text-primary hover:underline">
                                {uploadingId === rid ? 'Uploading…' : pendingFiles[rid] ? `${pendingFiles[rid].name} (attaches on save)` : 'Attach file'}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".gif,.png,.jpeg,.jpg,.pdf,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    // A row whose Yes isn't saved yet can't take a file; hold it until Save.
                                    if (dirty) setPendingFiles((prev) => ({ ...prev, [rid]: file }))
                                    else uploadCertificate(t, file)
                                  }}
                                />
                              </label>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {writable && (canEdit || canDelete) && (
                              <button type="button" title="Remove trainee" onClick={() => setDeleteRow(t)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
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
            <DialogTitle>
              Remove {deleteRow?.trainee_fname} {deleteRow?.trainee_lname} from this log?
            </DialogTitle>
            <DialogDescription>Their certificate file, if any, is deleted too. This can&apos;t be undone.</DialogDescription>
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
    </FieldErrorScope>
  )
}
