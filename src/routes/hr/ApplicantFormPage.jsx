import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { mastersSchemas } from '@/config/mastersSchemas'
import { localDateStr } from '@/lib/naiveDateTime'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormField, emptyForm } from '@/routes/masters/MasterCrudPage'
import AccessDenied from '@/components/AccessDenied'
import MediaLink from '@/components/MediaLink'
import PhotoBadge from '@/components/PhotoBadge'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import HistoryButton from '@/components/audit/HistoryButton'
import RigLoading from '@/components/RigLoading'
import { AlertTriangle, FileText, RotateCcw, Search, ShieldAlert } from 'lucide-react'

// Rig Personnel > New Joinee Workflow > Applicants: one applicant. Name, nationality, date of birth, gender and the application date are fixed once saved;
// the photo and the CV are added after the first save. A new applicant is checked against the not-to-be-rehired register (it must be confirmed) and for a likely
// duplicate (a warning). Re-hire fills the form from a former employee.

const schema = mastersSchemas['fs-applicants']
const LIST = '/rig-personnel/applicants'
const FIXED = new Set(['fs_emp_fname', 'fs_emp_mname', 'fs_emp_lname', 'nationality', 'fs_emp_dob', 'gender', 'fs_new_appl_dt'])
const CV_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.zip'
const STATUS_STYLE = {
  N: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  A: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  J: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  R: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  C: 'bg-muted text-muted-foreground',
}

function groupBySection(fields) {
  const sections = []
  const by = new Map()
  for (const f of fields) {
    if (!by.has(f.section)) {
      const g = { title: f.section, fields: [] }
      by.set(f.section, g)
      sections.push(g)
    }
    by.get(f.section).fields.push(f)
  }
  return sections
}

const sections = groupBySection(schema.fields)
const dmy = (s) => (s ? String(s).split('-').reverse().join('/') : '')

function newForm() {
  return { ...emptyForm(schema), fs_new_appl_dt: localDateStr(), appl_temporary: null }
}

export default function ApplicantFormPage() {
  const { id } = useParams()
  return <ApplicantForm key={id ?? 'new'} id={id} />
}

function ApplicantForm({ id }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, schema.menuKey, isEdit ? 'edit' : 'add')
  const canAdd = can(user, schema.menuKey, 'add')

  const [form, setForm] = useState(newForm)
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(newForm())))
  const [ntbr, setNtbr] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [ntbrConfirmed, setNtbrConfirmed] = useState(false)
  const [rehireOpen, setRehireOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bannerRef = useRef(null)
  const cvRef = useRef(null)

  useEffect(() => {
    if (!id) return undefined
    let alive = true
    apiFetch(`${schema.apiBase}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        if (!alive) return
        setRecord(data)
        setForm(data)
        setSnapshot(JSON.stringify(data))
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  // On a new applicant: the register and duplicate check, a moment after the name and date of birth are filled in.
  useEffect(() => {
    if (isEdit || !form.fs_emp_dob || !(form.fs_emp_fname || form.fs_emp_lname)) return undefined
    let alive = true
    const t = setTimeout(() => {
      const q = new URLSearchParams({ fname: form.fs_emp_fname || '', lname: form.fs_emp_lname || '', dob: form.fs_emp_dob })
      if (form.prv_fs_emp) q.set('rehire', '1')
      apiFetch(`${schema.apiBase}ntbr-check/?${q}`)
        .then((r) => (r.ok ? r.json() : { ntbr: [], duplicates: [] }))
        .then((d) => {
          if (!alive) return
          setNtbr(d.ntbr || [])
          setDuplicates(d.duplicates || [])
          if (!(d.ntbr || []).length) setNtbrConfirmed(false)
        })
        .catch(() => {})
    }, 600)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [isEdit, form.fs_emp_fname, form.fs_emp_lname, form.fs_emp_dob, form.prv_fs_emp])

  const heading = isEdit ? record?.full_name || 'Applicant' : 'New Applicant'

  function handleChange(f, v, raw) {
    const next = { ...form, [f.name]: v }
    for (const other of schema.fields) {
      if (other.filterField === f.name) next[other.name] = null // the rank is chosen again when the category changes
    }
    if (f.derives && raw) for (const [target, source] of Object.entries(f.derives)) next[target] = raw[source]
    if (f.labelField && raw) next[f.labelField] = raw[f.optionLabel] // keep the picked text so the field never goes blank after choosing
    if (f.name === 'marital_status' && v !== 'Married') next.marriage_dt = ''
    setForm(next)
    setFieldErrors((prev) => (prev[f.name] ? { ...prev, [f.name]: undefined } : prev))
  }

  function payload() {
    const out = {}
    for (const f of schema.fields) {
      let v = form[f.name]
      if (v === '' || v === undefined) v = f.type === 'date' || f.type === 'select-remote' || f.type === 'search-remote' || f.type === 'select' ? null : v
      out[f.name] = v
    }
    out.appl_temporary = form.appl_temporary || null
    for (const name of ['fs_emp_fname', 'fs_emp_mname', 'fathers_name', 'fs_emp_pob', 'religion', 'area_of_interest', 'emergency_addr', 'fs_emp_tel_no', 'fs_emp_mobile_no', 'pin_code', 'pan_no', 'aadhaar_no', 'pp_no']) {
      if (out[name] === '') out[name] = null
    }
    if (!isEdit) {
      if (form.prv_fs_emp) out.prv_fs_emp = form.prv_fs_emp
      if (ntbrConfirmed) out.ntbr_confirmed = true
    }
    return out
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const res = await apiFetch(isEdit ? `${schema.apiBase}${id}/` : schema.apiBase, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload()) })
      const data = await res.json()
      if (!res.ok) {
        if (data.ntbr) {
          setNtbr(data.ntbr)
          showFormError(data.error, { setError, bannerRef })
          return
        }
        showFormError(formatApiError(data, schema), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, schema))
        scrollToFirstFieldError()
        return
      }
      allowNextNavigation()
      if (isEdit) {
        toast.success('Changes saved')
        setRecord(data)
        setForm(data)
        setSnapshot(JSON.stringify(data))
      } else {
        toast.success(`Application ${data.fs_new_appl_no} saved. Add the photo and the CV below.`)
        navigate(`${LIST}/${data.fs_new_appl_id}/edit`, { replace: true })
      }
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function uploadCv(file) {
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await apiFetch(`${schema.apiBase}${id}/cv/`, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "Couldn't upload the CV")
      toast.success('CV uploaded')
      setRecord((r) => ({ ...r, cv_url: data.cv_url, cv_path: data.cv_path }))
    } finally {
      setUploading(false)
      if (cvRef.current) cvRef.current.value = ''
    }
  }

  function applyRehire(data) {
    setForm({ ...newForm(), ...data, fs_new_appl_dt: localDateStr() })
    setFieldErrors({})
    setRehireOpen(false)
    toast.success('Filled in from the former employee. Check the details, then save.')
  }

  const hasChanges = snapshot !== null && JSON.stringify(form) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, { onSave: canWrite && !saving && !loading ? handleSave : undefined })

  if (notFound) return <Navigate to={LIST} replace />
  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add applicant'
  const blockedByNtbr = !isEdit && ntbr.length > 0 && !ntbrConfirmed

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">{heading}</h1>
          {record && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[record.fs_new_appl_status] || 'bg-muted'}`}>{record.status_label}</span>
          )}
          {isEdit && <HistoryButton menuKey={schema.menuKey} table="hr_fs_new_appl_dtl" recordId={id} title={heading} onChanged={() => window.location.reload()} />}
        </div>
        <div className="flex items-center gap-2">
          {!isEdit && canAdd && (
            <Button variant="outline" onClick={() => setRehireOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Re-hire
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link to={LIST} />}>
            Back to list
          </Button>
          {canWrite && (
            <Button onClick={handleSave} disabled={saving || loading || (isEdit && !hasChanges) || blockedByNtbr}>
              {saveLabel}
            </Button>
          )}
        </div>
      </div>

      {record?.offer_sent && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          Offer letter sent on {dmy(record.offer_letter_dt)}
          {record.offer_letter_doj ? `, date of joining ${dmy(record.offer_letter_doj)}` : ''}.
        </p>
      )}
      {!isEdit && form.prv_fs_emp && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
          Re-hire: filled in from a former employee. His photo is copied when you save.
        </p>
      )}
      {ntbr.length > 0 && !isEdit && (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" /> This person is in the not-to-be-rehired register
          </p>
          <ul className="list-disc pl-5 text-foreground">
            {ntbr.map((m) => (
              <li key={m.ntbr_fs_id}>
                {m.name}, born {dmy(m.dob)}. {m.remark} {m.rejoin_allowed ? '(rejoining was allowed)' : ''}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-foreground">
            <input type="checkbox" checked={ntbrConfirmed} onChange={(e) => setNtbrConfirmed(e.target.checked)} className="h-4 w-4 accent-[#1a3f7a]" />I have checked this and want to save the application anyway
          </label>
        </div>
      )}
      {duplicates.length > 0 && !isEdit && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Someone with this last name and date of birth is already an open application or a working employee
          </p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((d) => (
              <li key={`${d.kind}-${d.id}`}>
                {d.kind === 'application' ? (
                  <>
                    <Link to={`${LIST}/${d.id}/edit`} className="underline">
                      {d.name}
                    </Link>{' '}
                    (application {d.application_no}, {dmy(d.application_dt)}, {d.status})
                  </>
                ) : (
                  <>
                    {d.name} ({d.status})
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">
          {error}
        </p>
      )}
      {!canWrite && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to this page.</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          <RigLoading />
        </p>
      ) : (
        <>
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{section.title}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((f) => (
                  <div key={f.name} className={`flex flex-col gap-1.5 ${f.wide ? 'col-span-full' : ''}`}>
                    <Label>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <FieldFrame error={fieldErrors[f.name]}>
                      <FormField
                        field={f}
                        value={form[f.name]}
                        onChange={(v, raw) => handleChange(f, v, raw)}
                        disabled={!canWrite || (isEdit && FIXED.has(f.name)) || (f.name === 'marriage_dt' && form.marital_status !== 'Married')}
                        filterValue={f.filterField ? form[f.filterField] : undefined}
                        form={form}
                        recordId={isEdit ? id : null}
                      />
                    </FieldFrame>
                    {isEdit && FIXED.has(f.name) && f.name === 'fs_emp_lname' && <p className="text-[11px] text-muted-foreground">Name, date of birth, gender and nationality cannot be changed after saving.</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <PhotoBadge
                url={record?.photo_url}
                name={[form.fs_emp_fname, form.fs_emp_lname].filter(Boolean).join(' ')}
                endpoint={isEdit && canWrite ? `${schema.apiBase}${id}/photo/` : null}
                onRecord={(data) => setRecord((r) => ({ ...r, ...data }))}
                disabled={!canWrite}
              />
              <div>
                <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Photograph</h2>
                <p className="mt-1 text-xs text-muted-foreground">{isEdit ? 'Choose a picture to add or change it.' : 'Save the applicant first, then add the photograph.'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">CV</h2>
              {isEdit ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {record?.cv_url ? (
                    <MediaLink url={record.cv_url} className="inline-flex items-center gap-1 font-medium text-[#1a3f7a] underline underline-offset-2 dark:text-sky-300">
                      <FileText className="h-4 w-4" /> Open the CV
                    </MediaLink>
                  ) : (
                    <span className="text-muted-foreground">No CV uploaded.</span>
                  )}
                  {canWrite && (
                    <>
                      <input ref={cvRef} type="file" accept={CV_ACCEPT} className="hidden" onChange={(e) => uploadCv(e.target.files?.[0])} />
                      <Button size="sm" variant="outline" disabled={uploading} onClick={() => cvRef.current?.click()}>
                        {uploading ? 'Uploading…' : record?.cv_url ? 'Replace CV' : 'Upload CV'}
                      </Button>
                      <span className="text-[11px] text-muted-foreground">PDF, DOC, DOCX, ZIP or a picture, up to 10 MB.</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Save the applicant first, then add the CV.</p>
              )}
            </div>
          </div>
        </>
      )}

      {canWrite && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || (isEdit && !hasChanges) || blockedByNtbr}>
            {saveLabel}
          </Button>
        </div>
      )}

      <RehireDialog open={rehireOpen} onClose={() => setRehireOpen(false)} onPick={applyRehire} dirty={hasChanges} />
      {leaveDialog}
    </div>
  )
}

function RehireDialog({ open, onClose, onPick, dirty }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || q.trim().length < 2) return undefined
    let alive = true
    const t = setTimeout(() => {
      apiFetch(`${schema.apiBase}rehire-search/?search=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => alive && setRows(Array.isArray(d) ? d : []))
        .catch(() => {})
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, open])

  async function pick(row) {
    setBusy(true)
    const res = await apiFetch(`${schema.apiBase}rehire/?emp=${row.fs_emp_id}`)
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(data.error || "Couldn't load the employee")
    onPick(data)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Re-hire a former employee</DialogTitle>
          <DialogDescription>
            Search by name. The application form is filled in from his record, and his photo is copied.
            {dirty ? ' What you have typed so far will be replaced.' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 2 letters of the name…" className="pl-8" />
        </div>
        <div className="max-h-72 overflow-auto rounded-lg border border-border">
          {q.trim().length >= 2 && rows.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No former employee found.</p>}
          {rows.map((r) => (
            <button key={r.fs_emp_id} type="button" disabled={busy} onClick={() => pick(r)} className="flex w-full flex-col items-start border-b border-border/60 px-3 py-2 text-left last:border-0 hover:bg-accent">
              <span className="text-sm font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {r.rank} · {r.category} · born {dmy(r.dob)}
                {r.left_dt ? ` · left ${dmy(r.left_dt)}` : ''}
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
