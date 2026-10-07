import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { formatApiError, showFormError } from '@/lib/errors'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import AccessDenied from '@/components/AccessDenied'
import { MonthYearSelect } from '@/components/PeriodSelects'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const COMPANY_FIELD = { type: 'search-remote', remote: '/api/masters/companies/', optionLabel: 'company_name', optionValue: 'company_id', labelField: 'company_name' }

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const cellSelect =
  'h-8 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60'
const invalidCls = 'border-destructive ring-2 ring-destructive/40'

const GRID_NOTE =
  'A 0 means nothing recorded. Active is carried over from the legacy form — every row starts as Yes.'
const HEADER_HINTS = { Active: 'Carried over from the legacy form; every row starts as Yes' }

// The master data names these rows by bare abbreviation; spell them out
// beside the name so nobody has to know them.
const GLOSSARY = {
  FAC: 'First Aid Case',
  MTC: 'Medical Treatment Case',
  RWC: 'Restricted Work Case',
  LTI: 'Lost Time Injury',
  'LTI FR': 'Lost Time Injury Frequency Rate',
  FTL: 'Fatality',
  INJ: 'Injury',
  NINJ: 'No Injury',
}
const glossFor = (r) => [GLOSSARY[r.indicator_type?.trim()], GLOSSARY[r.indicator_subtype?.trim()]].filter(Boolean).join(' ')

function IndicatorName({ name }) {
  const full = GLOSSARY[name?.trim()]
  return (
    <>
      {name?.trim()}
      {full && <span className="text-muted-foreground"> — {full}</span>}
    </>
  )
}

function rowLabel(r) {
  return r.indicator_subtype ? `${r.indicator_type} / ${r.indicator_subtype}` : r.indicator_type
}

// Mirrors the server's checks in core/hse_lagging_indicators.py save_details so a
// mistake is caught (and pointed at) before any request is made.
function validateRow(r, columns) {
  const errs = {}
  for (const c of columns) {
    if (c.type === 'count') {
      const n = Number(r[c.field] === '' ? 0 : r[c.field])
      if (!Number.isInteger(n) || n < 0 || n > c.max_value) errs[c.field] = `${c.label} must be a whole number from 0 to ${c.max_value}`
    }
  }
  for (const c of columns) {
    if (c.type === 'duration_type' && !errs[c.required_when_above_zero] && Number(r[c.required_when_above_zero] || 0) > 0 && !r.duration_type) {
      errs.duration_type = 'Duration Type must be selected'
    }
    if (c.type === 'active' && r.active !== 'Y' && r.active !== 'N') errs.active = 'Active must be Y or N'
  }
  return errs
}

const kind = {
  title: 'HSE - Lagging Indicators',
  detailTitle: 'Lagging Indicators Detail',
  menuKey: 'qhse.lagging_indicators',
  apiBase: '/api/qhse/lagging-indicators/',
  basePath: '/qhse/lagging-indicators',
}

const columns = [
  { field: 'total_count', label: 'Total Count', type: 'count', max_value: 2147483647, max_digits: 10 },
  { field: 'active', label: 'Active', type: 'active' },
]  // keep in step with core/hse_lagging_indicators.py

export default function HseLaggingIndicatorsFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = can(user, kind.menuKey, 'edit')
  const canExport = can(user, kind.menuKey, 'export')

  const [form, setForm] = useState({ rig: null, rig_name: '', company: null, company_name: '', report_no: '', period: '' })
  const [hdr, setHdr] = useState(null)
  const [rows, setRows] = useState([])
  const [orig, setOrig] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rowErrors, setRowErrors] = useState({})
  const bannerRef = useRef(null)
  const [rowQuery, setRowQuery] = useState('')

  function loadDetails() {
    return apiFetch(`${kind.apiBase}${id}/details/`)
      .then((r) => r.json())
      .then((list) => {
        setRows(list)
        setOrig(Object.fromEntries(list.map((r) => [r.id, JSON.stringify(columns.map((c) => r[c.field]))])))
      })
  }

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`${kind.apiBase}${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(setHdr)
      .then(loadDetails)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  // Company follows Rig + Period (same lookup the reports use) but stays
  // editable; when nothing is mapped it clears so the user picks one.
  useEffect(() => {
    if (isEdit || !form.rig || !form.period) return
    let cancelled = false
    apiFetch(`${kind.apiBase}company-for/?rig=${form.rig}&period=${form.period}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setForm((f) => ({ ...f, company: d.company_id || null, company_name: d.company_name || '' }))
      })
    return () => {
      cancelled = true
    }
  }, [form.rig, form.period, isEdit])

  const changedRows = useMemo(
    () => rows.filter((r) => JSON.stringify(columns.map((c) => r[c.field])) !== orig[r.id]),
    [rows, orig]
  )
  const hasChanges = isEdit && changedRows.length > 0
  // Rows with an error stay listed whatever is typed in the finder, so a
  // mistake can never be hidden by it.
  const shownRows = useMemo(() => {
    const q = rowQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => rowErrors[r.id] || `${r.workgroup} ${rowLabel(r)} ${glossFor(r)}`.toLowerCase().includes(q))
  }, [rows, rowQuery, rowErrors])

  function setRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
    setRowErrors((prev) => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const showError = (message) => showFormError(message, { setError, bannerRef })

  async function handleAdd() {
    setError('')
    if (!form.rig) return showError('Please choose a Rig.')
    if (!form.period) return showError('Please choose the Period (month and year).')
    if (!form.company) return showError('Please choose a Company.')
    if (!form.report_no.trim()) return showError('Please enter the Report No.')
    setSaving(true)
    try {
      const res = await apiFetch(kind.apiBase, {
        method: 'POST',
        body: JSON.stringify({ company: form.company, rig: form.rig, report_no: form.report_no.trim(), period_month: form.period }),
      })
      const data = await res.json()
      if (!res.ok) {
        showError(formatApiError(data))
        return
      }
      toast.success('Report added — now enter the figures')
      navigate(`${kind.basePath}/${data.id}/edit`, { replace: true })
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    const res = await apiFetch(`${kind.apiBase}${id}/export-report/`)
    if (!res.ok) return toast.error('Failed to export')
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = `${kind.title} - ${hdr?.report_no || id}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSave() {
    setError('')
    const found = {}
    for (const r of changedRows) {
      const errs = validateRow(r, columns)
      if (Object.keys(errs).length) found[r.id] = errs
    }
    setRowErrors(found)
    const firstId = Object.keys(found)[0]
    if (firstId) {
      const row = rows.find((r) => r.id === Number(firstId))
      const messages = Object.values(found[firstId])
      toast.error(`${rowLabel(row)}: ${messages[0]}`)
      setError(`${Object.keys(found).length} row(s) need fixing — they're outlined in red below.`)
      requestAnimationFrame(() => document.getElementById(`ind-row-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch(`${kind.apiBase}${id}/save-details/`, {
        method: 'POST',
        body: JSON.stringify({ rows: changedRows.map((r) => ({ id: r.id, ...Object.fromEntries(columns.map((c) => [c.field, r[c.field]])) })) }),
      })
      const data = await res.json()
      if (!res.ok) {
        showError(formatApiError(data))
        return
      }
      allowNextNavigation()
      toast.success('Changes saved')
      await loadDetails()
    } catch {
      showError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: canEdit && !saving && hasChanges ? handleSave : undefined,
  })

  if (notFound) return <Navigate to={kind.basePath} replace />
  if (!can(user, kind.menuKey, 'view')) return <AccessDenied />
  if (!isEdit && !can(user, kind.menuKey, 'add')) return <AccessDenied />

  const saveButton = (
    <Button onClick={handleSave} disabled={saving || !hasChanges}>
      {saving ? 'Saving…' : 'Save changes'}
    </Button>
  )
  const heading = isEdit ? (hdr ? `${kind.title} — ${hdr.report_no}` : kind.title) : `New ${kind.title}`

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{heading}</h1>
        {!isEdit && (
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </Button>
        )}
        {isEdit && !loading && (
          <div className="flex items-center gap-2">
            {canExport && (
              <Button variant="outline" onClick={handleExport}>
                Export
              </Button>
            )}
            {canEdit && saveButton}
          </div>
        )}
      </div>

      {error && (
        <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Rig" required>
                {isEdit ? (
                  <Input value={hdr?.rig_name || ''} disabled className="bg-muted" />
                ) : (
                  <RemoteCombobox
                    field={RIG_FIELD}
                    value={form.rig}
                    labelValue={form.rig_name}
                    onChange={(v, raw) => setForm((f) => ({ ...f, rig: v, rig_name: raw?.rig_name || '' }))}
                  />
                )}
              </Field>
              <Field label="Period" required>
                {isEdit ? (
                  <MonthYearSelect value={hdr?.period_month || ''} disabled onChange={() => {}} />
                ) : (
                  <MonthYearSelect value={form.period} maxYear={new Date().getFullYear()} onChange={(v) => setForm((f) => ({ ...f, period: v }))} />
                )}
              </Field>
              <Field label="Company" required hint={isEdit ? undefined : 'Fills in from the Rig and Period — you can change it.'}>
                {isEdit ? (
                  <Input value={hdr?.company_name || ''} disabled className="bg-muted" />
                ) : (
                  <RemoteCombobox
                    field={COMPANY_FIELD}
                    value={form.company}
                    labelValue={form.company_name}
                    onChange={(v, raw) => setForm((f) => ({ ...f, company: v, company_name: raw?.company_name || '' }))}
                  />
                )}
              </Field>
              <Field label="Report No." required>
                {isEdit ? (
                  <Input value={hdr?.report_no || ''} disabled className="bg-muted" />
                ) : (
                  <Input value={form.report_no} maxLength={12} onChange={(e) => setForm((f) => ({ ...f, report_no: e.target.value }))} />
                )}
              </Field>
            </div>
          </div>

          {isEdit && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
                <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{kind.detailTitle}</h2>
                <div className="flex items-center gap-2">
                  {rowQuery && (
                    <span className="text-xs text-muted-foreground">
                      Showing {shownRows.length} of {rows.length}
                    </span>
                  )}
                  <Input value={rowQuery} onChange={(e) => setRowQuery(e.target.value)} placeholder="Find a row…" className="h-8 w-56" />
                </div>
              </div>
              <p className="mb-3 px-2 text-xs text-muted-foreground">{GRID_NOTE}</p>
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-muted shadow-[0_1px_0_var(--border)]">
                    <tr>
                      {['Work Group', 'Indicator Type', 'Indicator Subtype', ...columns.map((c) => c.label)].map((h) => (
                        <th key={h} title={HEADER_HINTS[h]} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((r, idx) => {
                      const dirty = JSON.stringify(columns.map((c) => r[c.field])) !== orig[r.id]
                      const errs = rowErrors[r.id] || {}
                      const cell = (c) => {
                        if (c.type === 'count') {
                          return (
                            <Input
                              value={r[c.field]}
                              inputMode="numeric"
                              maxLength={c.max_digits}
                              disabled={!canEdit}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setRow(r.id, { [c.field]: e.target.value.replace(/\D/g, '') })}
                              onBlur={() => r[c.field] === '' && setRow(r.id, { [c.field]: 0 })}
                              className={`h-8 text-right ${c.max_digits > 6 ? 'w-32' : 'w-20'} ${Number(r[c.field]) === 0 ? 'text-muted-foreground' : ''} ${errs[c.field] ? invalidCls : ''}`}
                            />
                          )
                        }
                        if (c.type === 'duration_type') {
                          return (
                            <select value={r.duration_type} disabled={!canEdit} onChange={(e) => setRow(r.id, { duration_type: e.target.value })} className={`${cellSelect} ${errs.duration_type ? invalidCls : ''}`}>
                              <option value=""></option>
                              <option value="H">Hrs</option>
                              <option value="W">Wks</option>
                            </select>
                          )
                        }
                        return (
                          <select value={r.active} disabled={!canEdit} onChange={(e) => setRow(r.id, { active: e.target.value })} className={`${cellSelect} ${errs.active ? invalidCls : ''}`}>
                            <option value="Y">Yes</option>
                            <option value="N">No</option>
                          </select>
                        )
                      }
                      return (
                        <Fragment key={r.id}>
                        <tr id={`ind-row-${r.id}`} className={`border-t border-border/60 ${Object.keys(errs).length ? 'bg-destructive/5' : dirty ? 'bg-amber-50 dark:bg-amber-950/20' : idx % 2 ? 'bg-muted/20' : ''}`}>
                          <td className="px-3 py-1.5 whitespace-nowrap">{r.workgroup}</td>
                          <td className="px-3 py-1.5"><IndicatorName name={r.indicator_type} /></td>
                          <td className="px-3 py-1.5 text-muted-foreground"><IndicatorName name={r.indicator_subtype} /></td>
                          {columns.map((c) => (
                            <td key={c.field} className="px-3 py-1.5">{cell(c)}</td>
                          ))}
                        </tr>
                        {Object.keys(errs).length > 0 && (
                          <tr className="bg-destructive/5">
                            <td colSpan={3 + columns.length} className="px-3 pb-2 text-xs text-destructive">
                              {Object.values(errs).join(' · ')}
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      )
                    })}
                    {shownRows.length === 0 && (
                      <tr>
                        <td colSpan={3 + columns.length} className="p-6 text-center text-sm text-muted-foreground">No row matches &ldquo;{rowQuery}&rdquo;.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isEdit && canEdit && <div className="flex justify-end">{saveButton}</div>}
        </>
      )}
      {leaveDialog}
    </div>
  )
}
