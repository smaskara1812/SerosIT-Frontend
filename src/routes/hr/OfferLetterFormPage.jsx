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
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormField, emptyForm } from '@/routes/masters/MasterCrudPage'
import AccessDenied from '@/components/AccessDenied'
import { buildFieldErrors, formatApiError, scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import HistoryButton from '@/components/audit/HistoryButton'
import RigLoading from '@/components/RigLoading'
import { Plus, Search, Trash2 } from 'lucide-react'

// Rig Personnel > New Joinee Workflow > Offer Letter: one letter. The header is a normal form; the pay is a grid of components (one row each, so HR can add a
// component without a developer). The creator saves and finalises, the approver approves, rejects, sends back or reopens it (Admin > Approver Mapping decides
// who is which, per rig). The applicant's response is recorded once the letter is approved.

const schema = mastersSchemas['fs-offer-letters']
const LIST = '/rig-personnel/offer-letters'
const WORKFLOW_STYLE = {
  draft: 'bg-muted text-muted-foreground',
  sent_back: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  pending: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
}
const RESPONSES = [
  { value: 'N', label: 'New' },
  { value: 'A', label: 'Accepted' },
  { value: 'D', label: 'Declined' },
  { value: 'C', label: 'Closed' },
]
const CONFIRMS = {
  approve: {
    path: 'approve', okMessage: 'Offer letter approved', title: 'Approve this offer letter?', label: 'Approve',
    text: 'The letter is locked for everyone. You can still reopen it later with Revise. After approval the applicant\'s response can be recorded.',
  },
  reject: {
    path: 'reject', okMessage: 'Offer letter rejected', title: 'Reject this offer letter?', label: 'Reject', destructive: true,
    text: "Rejecting is final. The letter can't be approved, revised or sent back afterwards.",
  },
  revise: {
    path: 'revise-self', okMessage: 'Reopened for revision', title: 'Revise this offer letter?', label: 'Revise',
    text: 'The letter is reopened so you can edit it yourself. Its approval is cleared, the letter and response status go back to New, and the applicant goes back to New.',
  },
}
const dmy = (s) => (s ? String(s).split('-').reverse().join('/') : '')

function groupBySection(fields) {
  const out = []
  const by = new Map()
  for (const f of fields) {
    if (!by.has(f.section)) {
      const g = { title: f.section, fields: [] }
      by.set(f.section, g)
      out.push(g)
    }
    by.get(f.section).fields.push(f)
  }
  return out
}
const sections = groupBySection(schema.fields)

function newForm() {
  return { ...emptyForm(schema), fs_offer_letter_dt: localDateStr(), included_pf: 'N', key_personnel: null }
}

export default function OfferLetterFormPage() {
  const { id } = useParams()
  return <OfferLetterForm key={id ?? 'new'} id={id} />
}

function OfferLetterForm({ id }) {
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user, schema.menuKey, 'add')
  const canEditRight = can(user, schema.menuKey, 'edit')

  const [form, setForm] = useState(newForm)
  const [components, setComponents] = useState([])
  const [record, setRecord] = useState(null)
  const [role, setRole] = useState(null)
  const [applicant, setApplicant] = useState(null)
  const [master, setMaster] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [notFound, setNotFound] = useState(false)
  const [snapshot, setSnapshot] = useState(() => (isEdit ? null : JSON.stringify({ form: newForm(), components: [] })))
  const [pickOpen, setPickOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // { path, okMessage, title, text, label, destructive } for Approve / Reject / Revise
  const [note, setNote] = useState('')
  const bannerRef = useRef(null)

  useEffect(() => {
    apiFetch(`${schema.apiBase}components/`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMaster)
      .catch(() => {})
  }, [])

  function load(data) {
    setRecord(data)
    setForm(data)
    setComponents((data.components || []).map((c) => ({ ...c })))
    setSnapshot(JSON.stringify({ form: data, components: data.components || [] }))
  }

  useEffect(() => {
    if (!id) return undefined
    let alive = true
    Promise.all([apiFetch(`${schema.apiBase}${id}/`).then((r) => (r.ok ? r.json() : Promise.reject())), apiFetch(`${schema.apiBase}${id}/role/`).then((r) => (r.ok ? r.json() : null))])
      .then(([data, r]) => {
        if (!alive) return
        load(data)
        setRole(r)
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const editable = isEdit ? Boolean(role?.can_edit) && canEditRight : canAdd
  const heading = isEdit ? `Offer Letter: ${record?.applicant_name || ''}` : 'New Offer Letter'

  function handleChange(f, v, raw) {
    const next = { ...form, [f.name]: v }
    if (f.derives && raw) for (const [target, source] of Object.entries(f.derives)) next[target] = raw[source]
    if (f.labelField && raw) next[f.labelField] = raw[f.optionLabel] // the picked text is kept on the form, so the field shows it right after choosing (as the Masters pages do)
    if (f.name === 'included_pf' && v === 'N') setComponents((rows) => rows.map((r) => (r.component === 8 ? { ...r, amount: 0 } : r)))
    setForm(next)
    setFieldErrors((prev) => (prev[f.name] ? { ...prev, [f.name]: undefined } : prev))
  }

  function setRow(i, patch) {
    setComponents((rows) => rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
    setFieldErrors((prev) => (prev.components ? { ...prev, components: undefined } : prev))
  }

  function addComponent(c) {
    setComponents((rows) => [...rows, { component: c.component, component_name: c.name, amount: 0, counts_in_total: c.counts_in_total, show_in_letter: 'Y', sort_order: c.sort_order }])
  }

  const total = components.reduce((s, r) => s + (r.counts_in_total === 'Y' ? Number(r.amount) || 0 : 0), 0)
  const salary = Number(form.salary_amt) || 0
  const balanced = salary > 0 && total === salary

  function payload() {
    const out = {}
    for (const f of schema.fields) {
      let v = form[f.name]
      if (v === '' || v === undefined) v = ['date', 'select-remote', 'search-remote', 'number'].includes(f.type) ? null : v
      out[f.name] = v
    }
    out.key_personnel = form.key_personnel || null
    for (const n of ['authority_designation', 'travel_class', 'on_off_desc']) if (out[n] === '') out[n] = null
    out.components = components
      .filter((r) => r.component)
      .map((r, i) => ({ component: r.component, amount: Number(r.amount) || 0, counts_in_total: r.counts_in_total, show_in_letter: r.show_in_letter, sort_order: r.sort_order ?? i }))
    if (!isEdit) out.fs_new_appl = applicant?.id
    return out
  }

  async function handleSave() {
    if (!isEdit && !applicant) {
      showFormError('Select the applicant first.', { setError, bannerRef })
      return
    }
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const res = await apiFetch(isEdit ? `${schema.apiBase}${id}/` : schema.apiBase, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload()) })
      const data = await res.json()
      if (!res.ok) {
        showFormError(data.error || formatApiError(data, schema), { setError, bannerRef })
        setFieldErrors(buildFieldErrors(data, schema))
        scrollToFirstFieldError()
        return
      }
      allowNextNavigation()
      if (isEdit) {
        toast.success('Changes saved')
        load(data)
      } else {
        toast.success('Offer letter saved as a draft')
        navigate(`${LIST}/${data.fs_new_appl}/edit`, { replace: true })
      }
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function act(path, body, okMessage) {
    setBusy(true)
    try {
      const res = await apiFetch(`${schema.apiBase}${id}/${path}/`, { method: 'POST', body: JSON.stringify(body || {}) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || "That didn't work")
      toast.success(okMessage)
      load(data)
      const r = await apiFetch(`${schema.apiBase}${id}/role/`)
      if (r.ok) setRole(await r.json())
    } finally {
      setBusy(false)
    }
  }

  const hasChanges = snapshot !== null && JSON.stringify({ form, components }) !== snapshot
  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, { onSave: editable && !saving && !loading ? handleSave : undefined })

  if (notFound) return <Navigate to={LIST} replace />
  if (!can(user, schema.menuKey, 'view')) return <AccessDenied />

  const chosen = new Set(components.map((r) => r.component))
  const addable = master.filter((c) => !chosen.has(c.component))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">{heading}</h1>
          {record && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${WORKFLOW_STYLE[record.workflow] || 'bg-muted'}`}>{record.workflow_label}</span>}
          {isEdit && <HistoryButton menuKey={schema.menuKey} table="hr_fs_offer_letter" recordId={id} title={heading} onChanged={() => window.location.reload()} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link to={LIST} />}>
            Back to list
          </Button>
          {editable && (
            <Button onClick={handleSave} disabled={saving || loading || (isEdit && !hasChanges)}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
            </Button>
          )}
          {role?.can_finalize && (
            <Button variant="secondary" disabled={busy || hasChanges} title={hasChanges ? 'Save your changes first' : undefined} onClick={() => act('finalize', null, 'Offer letter finalised')}>
              Finalize
            </Button>
          )}
          {role?.can_approve && (
            <Button disabled={busy || hasChanges} onClick={() => setConfirm(CONFIRMS.approve)}>
              Approve
            </Button>
          )}
          {role?.can_reject && (
            <Button variant="destructive" disabled={busy} onClick={() => setConfirm(CONFIRMS.reject)}>
              Reject
            </Button>
          )}
          {role?.can_revise_self && (
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(CONFIRMS.revise)}>
              Revise
            </Button>
          )}
          {role?.can_revise_previous && (
            <Button variant="outline" disabled={busy} onClick={() => setNoteOpen(true)}>
              Send back
            </Button>
          )}
        </div>
      </div>

      {record?.auto_closed_dt && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          Closed automatically on {dmy(String(record.auto_closed_dt).slice(0, 10))} due to inactivity. There was no response and no change for 30 days. Recording another response below replaces this.
        </p>
      )}
      {record?.revision_note && record.workflow === 'sent_back' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Sent back: {record.revision_note}</p>
      )}
      {record && (
        <p className="text-xs text-muted-foreground">
          Created by {record.created_by_name}
          {record.approved_by_name && record.l1_approval_status ? `, ${record.l1_approval_status === 'A' ? 'approved' : 'rejected'} by ${record.approved_by_name} on ${dmy(record.l1_approval_dt)}` : ''}. Letter: {record.letter_status_label}.
        </p>
      )}
      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">
          {error}
        </p>
      )}
      {isEdit && !editable && !loading && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">This letter is read-only for you now.</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          <RigLoading />
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Applicant</h2>
            {isEdit ? (
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Applicant</p>
                  <Link to={`/rig-personnel/applicants/${record.fs_new_appl}/edit`} className="font-medium text-[#1a3f7a] underline underline-offset-2 dark:text-sky-300">
                    {record.applicant_name}
                  </Link>{' '}
                  <span className="text-muted-foreground">(application {record.applicant_no})</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">E-mail</p>
                  <p>{record.applicant_email || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Category</p>
                  <p>{record.category_name || '—'}</p>
                </div>
                <div className="sm:col-span-3">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Address</p>
                  <p className="whitespace-pre-line">{record.applicant_address || '—'}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={() => setPickOpen(true)}>
                    <Search className="h-4 w-4" /> {applicant ? 'Change applicant' : 'Select applicant'}
                  </Button>
                  {applicant && (
                    <span className="text-sm font-medium">
                      {applicant.name} <span className="font-normal text-muted-foreground">(application {applicant.application_no}, {applicant.category})</span>
                    </span>
                  )}
                </div>
                {applicant && (
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">E-mail</p>
                      <p>{applicant.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Address</p>
                      <p className="whitespace-pre-line">{applicant.address || '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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
                      <FormField field={f} value={form[f.name]} onChange={(v, raw) => handleChange(f, v, raw)} disabled={!editable} filterValue={f.filterField ? form[f.filterField] : undefined} form={form} recordId={isEdit ? id : null} />
                    </FieldFrame>
                    {f.name === 'rig_site_mapping' && form.camp_office_addr && <p className="text-[11px] text-muted-foreground">Camp office: {form.camp_office_addr}</p>}
                  </div>
                ))}
              </div>
              {section.title === 'Pay' && (
                <div className="mt-5 flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Pay components</h3>
                  <FieldFrame error={fieldErrors.components}>
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Component</th>
                            <th className="w-40 px-3 py-2 text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Amount</th>
                            <th className="px-3 py-2 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Counts in total</th>
                            <th className="px-3 py-2 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Show in letter</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {components.map((r, i) => (
                            <tr key={r.component} className="border-b border-border/60 last:border-0">
                              <td className="px-3 py-1.5 font-medium">{r.component_name}</td>
                              <td className="px-3 py-1.5">
                                <Input type="number" min={0} inputMode="numeric" value={r.amount} disabled={!editable} onChange={(e) => setRow(i, { amount: e.target.value === '' ? 0 : Number(e.target.value) })} className="h-8 text-right tabular-nums" />
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <input type="checkbox" aria-label={`${r.component_name} counts toward the total`} checked={r.counts_in_total === 'Y'} disabled={!editable} onChange={(e) => setRow(i, { counts_in_total: e.target.checked ? 'Y' : 'N' })} className="h-4 w-4 accent-[#1a3f7a]" />
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <input type="checkbox" aria-label={`${r.component_name} is shown in the letter`} checked={r.show_in_letter === 'Y'} disabled={!editable} onChange={(e) => setRow(i, { show_in_letter: e.target.checked ? 'Y' : 'N' })} className="h-4 w-4 accent-[#1a3f7a]" />
                              </td>
                              <td className="px-1 py-1.5">
                                {editable && (
                                  <button type="button" aria-label={`Remove ${r.component_name}`} onClick={() => setComponents((rows) => rows.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {components.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No components yet. Add Basic first.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-muted/30">
                            <td className="px-3 py-2 text-sm font-semibold">Counted in the total</td>
                            <td className={`px-3 py-2 text-right font-semibold tabular-nums ${balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{total.toLocaleString()}</td>
                            <td colSpan={3} className={`px-3 py-2 text-xs ${balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                              {balanced ? 'Matches the total salary.' : salary ? `Total salary is ${salary.toLocaleString()}. The difference is ${(salary - total).toLocaleString()}.` : 'Enter the total salary above.'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </FieldFrame>
                  {editable && addable.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <select
                        aria-label="Add a component"
                        value=""
                        onChange={(e) => {
                          const c = addable.find((x) => String(x.component) === e.target.value)
                          if (c) addComponent(c)
                        }}
                        className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                      >
                        <option value="">Add a component…</option>
                        {addable.map((c) => (
                          <option key={c.component} value={c.component}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isEdit && record?.cr_status === 'F' && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Applicant's response</h2>
              <select
                aria-label="Applicant's response"
                value={record.response_status || 'N'}
                disabled={!role?.can_set_response || !canEditRight || busy}
                onChange={(e) => act('response', { response_status: e.target.value }, 'Response saved')}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-60"
              >
                {RESPONSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                {role?.can_set_response ? "Saved on the letter and passed on to the applicant's status." : 'Can be recorded once the letter is approved.'}
              </span>
            </div>
          )}
        </>
      )}

      <ApplicantPicker open={pickOpen} onClose={() => setPickOpen(false)} onPick={(a) => { setApplicant(a); setPickOpen(false); setForm((f) => ({ ...f, rank: a.rank, rank_name: a.rank_name })) }} />

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.text}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.destructive ? 'destructive' : 'default'}
              disabled={busy}
              onClick={async () => {
                const c = confirm
                setConfirm(null)
                await act(c.path, null, c.okMessage)
              }}
            >
              {confirm?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={(o) => !o && setNoteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send back to the creator</DialogTitle>
            <DialogDescription>Say what needs fixing. The creator sees this on the letter.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={4} placeholder="For example: check the HRA and the contract end date" />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setNoteOpen(false)
                await act('revise-previous', { note }, 'Sent back to the creator')
                setNote('')
              }}
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {leaveDialog}
    </div>
  )
}

function ApplicantPicker({ open, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const reqRef = useRef(0)

  // The list loads 30 at a time: the first page when the dialog opens or the search changes, the next one as the list is scrolled to its end.
  function load(offset) {
    const req = ++reqRef.current
    setLoading(true)
    apiFetch(`${schema.apiBase}applicant-search/?search=${encodeURIComponent(q.trim())}&offset=${offset}`)
      .then((r) => (r.ok ? r.json() : { results: [], has_more: false }))
      .then((d) => {
        if (req !== reqRef.current) return
        setRows((prev) => (offset ? [...prev, ...(d.results || [])] : d.results || []))
        setHasMore(Boolean(d.has_more))
      })
      .catch(() => {})
      .finally(() => req === reqRef.current && setLoading(false))
  }

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => load(0), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open])

  function onScroll(e) {
    const el = e.currentTarget
    if (hasMore && !loading && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) load(rows.length)
  }

  async function pick(row) {
    setBusy(true)
    const res = await apiFetch(`${schema.apiBase}applicant-info/?applicant=${row.id}`)
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(data.error || "Couldn't load the applicant")
    onPick(data)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Select the applicant</DialogTitle>
          <DialogDescription>New applicants who do not have an offer letter yet.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or application number…" className="pl-8" />
        </div>
        <div onScroll={onScroll} className="max-h-72 overflow-auto rounded-lg border border-border">
          {!loading && rows.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No applicant found.</p>}
          {rows.map((r) => (
            <button key={r.id} type="button" disabled={busy} onClick={() => pick(r)} className="flex w-full flex-col items-start border-b border-border/60 px-3 py-2 text-left last:border-0 hover:bg-accent">
              <span className="text-sm font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                Application {r.application_no} · {r.category} · {r.rank}
              </span>
            </button>
          ))}
          {loading && <p className="px-3 py-3 text-center text-xs text-muted-foreground">Loading…</p>}
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
