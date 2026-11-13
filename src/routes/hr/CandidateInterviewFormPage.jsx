import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { mastersSchemas } from '@/config/mastersSchemas'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormField, emptyForm } from '@/routes/masters/MasterCrudPage'
import AccessDenied from '@/components/AccessDenied'
import MediaLink from '@/components/MediaLink'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import HistoryButton from '@/components/audit/HistoryButton'
import RigLoading from '@/components/RigLoading'
import { ClipboardCheck, FileText } from 'lucide-react'
import { TrainingGrid, ExperienceGrid, CompetencyTable } from './CandidateChildGrids'

const schema = mastersSchemas['candidate-interviews']
const LIST = '/rig-personnel/candidate-interviews'
const RESUME_ACCEPT = '.pdf,.doc,.docx'

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

// One instance per record (key), so opening another candidate starts from a clean form without resetting state in an effect.
export default function CandidateInterviewFormPage() {
  const { id } = useParams()
  return <CandidateInterviewForm key={id ?? 'new'} id={id} />
}

function CandidateInterviewForm({ id }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = can(user, schema.menuKey, isEdit ? 'edit' : 'add')

  const [form, setForm] = useState(() => emptyForm(schema))
  const [record, setRecord] = useState(null) // the saved record as the server sent it (resume link, flags, counts)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const bannerRef = useRef(null)
  const fileRef = useRef(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify(emptyForm(schema))))

  function load() {
    return apiFetch(`${schema.apiBase}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        setRecord(data)
        setForm(data)
        setSnapshot(JSON.stringify(data))
      })
  }

  useEffect(() => {
    if (!id) return
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

  const heading = isEdit ? record?.full_name || 'Candidate' : 'New Candidate'

  function handleChange(f, v) {
    setForm((prev) => ({ ...prev, [f.name]: v }))
    setFieldErrors((prev) => (prev[f.name] ? { ...prev, [f.name]: undefined } : prev))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const payload = {}
      for (const f of schema.fields) {
        let v = form[f.name]
        if ((f.type === 'date' || f.type === 'number') && v === '') v = null
        if (f.name === 'suitable_for_role' && v === '') v = null
        if (f.name === 'hiring_status' && !v) v = 'N'
        payload[f.name] = v
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
      if (isEdit) {
        toast.success('Changes saved')
        setRecord(data)
        setForm(data)
        setSnapshot(JSON.stringify(data))
      } else {
        toast.success(`${data.full_name} added. Add training, experience and the resume below.`)
        navigate(`${LIST}/${data.candidate_interview_hdr_id}/edit`, { replace: true })
      }
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function uploadResume(file) {
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await apiFetch(`${schema.apiBase}${id}/resume/`, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Couldn't upload the resume")
        return
      }
      toast.success('Resume uploaded')
      setRecord((r) => ({ ...r, ...data }))
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Generate Resume: the Bio Data of Key Personnel sheet, built from the SAVED record (so unsaved edits must be saved first). Opens in a new tab.
  async function generateResume() {
    setGenerating(true)
    const tab = window.open('', '_blank')
    try {
      const res = await apiFetch(`${schema.apiBase}${id}/resume-pdf/`)
      if (!res.ok) {
        toast.error((await res.json().catch(() => null))?.detail || "Couldn't generate the resume")
        if (tab) tab.close()
        return
      }
      const url = URL.createObjectURL(await res.blob())
      if (tab) tab.location.href = url
      else if (!window.open(url, '_blank')) {
        const a = document.createElement('a')
        a.href = url
        a.download = `Resume - ${record?.full_name || 'candidate'}.pdf`
        a.click()
      }
    } catch {
      if (tab) tab.close()
      toast.error("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setGenerating(false)
    }
  }

  const hasChanges = snapshot !== null && JSON.stringify(form) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: canWrite && !saving && !loading ? handleSave : undefined,
  })

  if (notFound) return <Navigate to={LIST} replace />
  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add candidate'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">{heading}</h1>
          {isEdit && (
            <HistoryButton
              menuKey={schema.menuKey}
              table="hr_candidate_interview_hdr"
              recordId={id}
              title={heading}
              onChanged={() => load()}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEdit && can(user, 'hr.candidate_competencies', 'view') && (
            <Button variant="outline" nativeButton={false} render={<Link to={`/rig-personnel/candidate-evaluations/${id}`} />}>
              <ClipboardCheck className="h-4 w-4" /> Interview ratings
            </Button>
          )}
          {isEdit && (
            <Button
              variant="outline"
              onClick={generateResume}
              disabled={loading || generating || hasChanges}
              title={hasChanges ? 'Save your changes first: the resume is made from the saved details' : 'Make the Bio Data of Key Personnel sheet (PDF)'}
            >
              <FileText className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate Resume'}
            </Button>
          )}
          {canWrite && (
            <Button onClick={handleSave} disabled={saving || loading || (isEdit && !hasChanges)}>
              {saveLabel}
            </Button>
          )}
        </div>
      </div>

      {record?.is_new_from_candidate && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          New: this candidate filled in the form himself in the last 24 hours. Check the details and complete the interview fields.
        </p>
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
                        onChange={(v) => handleChange(f, v)}
                        disabled={!canWrite || f.readOnly}
                        form={form}
                        recordId={isEdit ? id : null}
                      />
                    </FieldFrame>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {isEdit && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Resume</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {record?.resume_url ? (
                  <MediaLink url={record.resume_url} className="font-medium text-[#1a3f7a] underline underline-offset-2 dark:text-sky-300">
                    Open the resume
                  </MediaLink>
                ) : record?.resume_missing ? (
                  <span className="text-muted-foreground">The old resume file is not in the system. Upload it again below.</span>
                ) : (
                  <span className="text-muted-foreground">No resume uploaded yet.</span>
                )}
                {canWrite && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={RESUME_ACCEPT}
                      className="hidden"
                      onChange={(e) => uploadResume(e.target.files?.[0])}
                    />
                    <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      {uploading ? 'Uploading…' : record?.resume_url ? 'Replace resume' : 'Upload resume'}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">PDF, DOC or DOCX, up to 10 MB.</span>
                  </>
                )}
              </div>
            </div>
          )}

          {isEdit ? (
            <>
              <TrainingGrid hdrId={id} canAdd={canWrite} canEdit={canWrite} canDelete={can(user, schema.menuKey, 'delete')} />
              <ExperienceGrid hdrId={id} canAdd={canWrite} canEdit={canWrite} canDelete={can(user, schema.menuKey, 'delete')} />
              <CompetencyTable hdrId={id} />
            </>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Save the candidate first. The resume, training and experience rows can be added right after.
            </p>
          )}
        </>
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
