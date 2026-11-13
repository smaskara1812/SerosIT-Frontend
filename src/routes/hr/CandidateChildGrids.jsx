import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { localDateStr } from '@/lib/naiveDateTime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconTrash } from '@/components/icons'
import { Pencil, Check, X, Plus } from 'lucide-react'

// The rows that hang off a candidate: trainings and earlier jobs (add, edit, delete one row at a time, like the legacy grids), and the
// interviewer ratings (read only for now). Each grid loads its own rows, ?hdr=<candidate id>.

function errorText(data, columns) {
  if (!data || typeof data !== 'object') return "Couldn't save. Try again."
  const labels = Object.fromEntries(columns.map((c) => [c.name, c.label]))
  const parts = Object.entries(data).map(([k, v]) => {
    const text = Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : JSON.stringify(v)
    return k === 'non_field_errors' || k === 'detail' || k === 'error' ? text : `${labels[k] || k}: ${text}`
  })
  return parts.join('\n') || "Couldn't save. Try again."
}

function show(col, row) {
  const v = row[col.name]
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function EditableGrid({ title, hint, apiBase, hdrId, columns, extraColumns = [], canAdd, canEdit, canDelete, order }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | row id
  const [draft, setDraft] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const idField = columns.idField

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let alive = true
    apiFetch(`${apiBase}?hdr=${hdrId}&page_size=200`)
      .then((r) => r.json())
      .then((d) => alive && setRows(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [apiBase, hdrId, tick])

  function startNew() {
    setDraft({})
    setError('')
    setEditing('new')
  }

  function startEdit(row) {
    const d = {}
    columns.forEach((c) => (d[c.name] = row[c.name] ?? ''))
    setDraft(d)
    setError('')
    setEditing(row[idField])
  }

  async function save() {
    setSaving(true)
    setError('')
    const missing = columns.filter((c) => c.required && !String(draft[c.name] ?? '').trim())
    if (missing.length) {
      setError(`Fill in: ${missing.map((c) => c.label).join(', ')}.`)
      setSaving(false)
      return
    }
    try {
      const isNew = editing === 'new'
      const res = await apiFetch(isNew ? apiBase : `${apiBase}${editing}/`, {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify({ ...draft, hdr: hdrId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(errorText(data, columns))
        return
      }
      toast.success(isNew ? 'Row added' : 'Row saved')
      setEditing(null)
      load()
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  async function remove(row) {
    const res = await apiFetch(`${apiBase}${row[idField]}/`, { method: 'DELETE' })
    setConfirmId(null)
    if (res.status === 204) {
      toast.success('Row deleted')
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Couldn't delete the row")
    }
  }

  function input(c) {
    const type = c.type === 'date' ? 'date' : 'text'
    const max = c.type === 'date' && c.maxToday ? localDateStr() : undefined
    const min = c.minField ? draft[c.minField] || undefined : undefined
    return (
      <Input
        type={type}
        value={draft[c.name] ?? ''}
        max={max}
        min={min}
        maxLength={c.maxLength}
        onChange={(e) => setDraft((d) => ({ ...d, [c.name]: e.target.value }))}
        className="h-8 min-w-[110px] text-xs"
        aria-label={c.label}
      />
    )
  }

  const colSpan = columns.length + extraColumns.length + 1

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {canAdd && editing === null && (
          <Button size="sm" variant="outline" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((c) => (
                <th key={c.name} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                  {c.label}
                  {c.required && <span className="text-destructive"> *</span>}
                </th>
              ))}
              {extraColumns.map((c) => (
                <th key={c.label} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                  {c.label}
                </th>
              ))}
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && editing !== 'new' && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No rows yet.
                </td>
              </tr>
            )}
            {rows.map((row, i) =>
              editing === row[idField] ? (
                <tr key={row[idField]} className="border-b border-border/60 bg-accent/40">
                  {columns.map((c) => (
                    <td key={c.name} className="px-2 py-1.5">
                      {input(c)}
                    </td>
                  ))}
                  {extraColumns.map((c) => (
                    <td key={c.label} className="px-3 py-1.5 text-xs text-muted-foreground">
                      {c.render(row)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={save} disabled={saving} title="Save" aria-label="Save row">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} title="Cancel" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row[idField]} className={`border-b border-border/60 ${i % 2 ? 'bg-muted/30' : ''}`}>
                  {columns.map((c) => (
                    <td key={c.name} className="px-3 py-2 align-top">
                      {show(c, row)}
                    </td>
                  ))}
                  {extraColumns.map((c) => (
                    <td key={c.label} className="px-3 py-2 align-top text-muted-foreground">
                      {c.render(row)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      {confirmId === row[idField] ? (
                        <>
                          <span className="text-[11px] text-destructive">Delete?</span>
                          <Button size="xs" variant="destructive" onClick={() => remove(row)}>
                            Yes
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setConfirmId(null)}>
                            No
                          </Button>
                        </>
                      ) : (
                        <>
                          {canEdit && editing === null && (
                            <button type="button" title="Edit" aria-label="Edit row" onClick={() => startEdit(row)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && editing === null && (
                            <button type="button" title="Delete" aria-label="Delete row" onClick={() => setConfirmId(row[idField])} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
            {editing === 'new' && (
              <tr className="border-b border-border/60 bg-accent/40">
                {columns.map((c) => (
                  <td key={c.name} className="px-2 py-1.5">
                    {input(c)}
                  </td>
                ))}
                {extraColumns.map((c) => (
                  <td key={c.label} className="px-3 py-1.5 text-xs text-muted-foreground">
                    {order ? 'Worked out on save' : ''}
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <div className="flex justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={save} disabled={saving} title="Save" aria-label="Save row">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} title="Cancel" aria-label="Cancel">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs whitespace-pre-line text-destructive">{error}</p>}
    </div>
  )
}

const TRAINING_COLUMNS = Object.assign(
  [
    { name: 'training_type', label: 'Training Type', required: true, maxLength: 50 },
    { name: 'training_agency', label: 'Training Agency', required: true, maxLength: 75 },
    { name: 'training_cert_no', label: 'Cert. No.', required: true, maxLength: 25 },
    { name: 'training_cert_dt', label: 'Cert. Date', type: 'date', required: true, maxToday: true },
    { name: 'cert_valid_from_dt', label: 'Valid From', type: 'date', required: true },
    { name: 'cert_valid_to_dt', label: 'Valid Upto', type: 'date', required: true, minField: 'cert_valid_from_dt' },
  ],
  { idField: 'candidate_train_dtl_id' }
)

const EXPERIENCE_COLUMNS = Object.assign(
  [
    { name: 'exp_from_dt', label: 'From', type: 'date', required: true, maxToday: true },
    { name: 'exp_to_dt', label: 'To', type: 'date', required: true, maxToday: true, minField: 'exp_from_dt' },
    { name: 'company_name', label: 'Company', required: true, maxLength: 100 },
    { name: 'designation', label: 'Designation', required: true, maxLength: 25 },
  ],
  { idField: 'candidate_exp_dtl_id' }
)

export function TrainingGrid({ hdrId, canAdd, canEdit, canDelete }) {
  return (
    <EditableGrid
      title="Training and Certificates"
      apiBase="/api/hr/candidate-trainings/"
      hdrId={hdrId}
      columns={TRAINING_COLUMNS}
      canAdd={canAdd}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}

export function ExperienceGrid({ hdrId, canAdd, canEdit, canDelete }) {
  return (
    <EditableGrid
      title="Earlier Experience"
      hint="Years and months are worked out from the two dates."
      apiBase="/api/hr/candidate-experiences/"
      hdrId={hdrId}
      columns={EXPERIENCE_COLUMNS}
      extraColumns={[{ label: 'Duration', render: (r) => `${r.exp_years} y ${r.exp_months} m` }]}
      order
      canAdd={canAdd}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}

// Interviewer ratings: read only here.
export function CompetencyTable({ hdrId }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    apiFetch(`/api/hr/candidate-competencies/?hdr=${hdrId}&page_size=200`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : d.results || []))
      .catch(() => setRows([]))
  }, [hdrId])
  if (!rows || rows.length === 0) return null
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Interview Ratings (read only)</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Department', 'Interviewer', 'Competency', 'Rating', 'Remarks'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.candidate_interview_comp_id} className={`border-b border-border/60 ${i % 2 ? 'bg-muted/30' : ''}`}>
                <td className="px-3 py-2">{r.department_name || '—'}</td>
                <td className="px-3 py-2">{r.interviewer_name || '—'}</td>
                <td className="px-3 py-2">{r.competency_name}</td>
                <td className="px-3 py-2 tabular-nums">{r.rating}</td>
                <td className="px-3 py-2">{r.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
