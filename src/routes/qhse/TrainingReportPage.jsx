import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { scrollToFirstFieldError, showFormError } from '@/lib/errors'
import { FieldErrorScope, FieldFrame } from '@/components/FieldFrame'
import { localDateStr } from '@/lib/naiveDateTime'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MENU_KEY = 'qhse.training_report'
const API = '/api/qhse/training-report/'
const RIG_FIELD = { type: 'select-remote', remote: '/api/masters/rigs/', optionLabel: 'rig_name', optionValue: 'rig_id', labelField: 'rig_name' }
const REPORT_TYPES = [
  { value: 'Training_Matrix', label: 'HSE Training Matrix', file: 'HSE Training Matrix.xlsx' },
  { value: 'Employees_Matrix', label: 'Employee’s HSE Training Matrix', file: 'Employee HSE Matrix.xlsx' },
]
const EMPTY = { report_type: '', category: '', rig: null, rig_name: '', from_date: '', to_date: '' }
const selectClass =
  'h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50'

function Field({ label, name, required, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame name={name}>{children}</FieldFrame>
    </div>
  )
}

export default function TrainingReportPage() {
  const { user } = useAuth()
  const [f, setF] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const bannerRef = useRef(null)
  const [printing, setPrinting] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewKey, setPreviewKey] = useState('')
  const today = localDateStr()
  const employees = f.report_type === 'Employees_Matrix'

  useEffect(() => {
    apiFetch(`${API}categories/`)
      .then((r) => r.json())
      .then((list) => setCategories(Array.isArray(list) ? list : []))
  }, [])

  const set = (patch) => {
    setFieldErrors((prev) => {
      const keys = Object.keys(patch).filter((k) => prev[k])
      return keys.length ? { ...prev, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : prev
    })
    setF((prev) => ({ ...prev, ...patch }))
  }

  // Same rules as the server, so mistakes are pointed at before a request is made.
  function validate() {
    const errs = {}
    if (!f.report_type) errs.report_type = 'Choose a report type.'
    if (!f.category) errs.category = 'Choose a category.'
    if (employees) {
      if (!f.rig) errs.rig = 'Choose a rig.'
      if (!f.from_date) errs.from_date = 'Enter the From Date.'
      if (!f.to_date) errs.to_date = 'Enter the To Date.'
      else if (f.to_date > today) errs.to_date = 'To Date can’t be in the future.'
      else if (f.from_date && f.to_date < f.from_date) errs.to_date = 'To Date can’t be before From Date.'
    }
    return errs
  }

  const buildParams = () => new URLSearchParams(paramsFor(f, employees))

  // Checks the form; returns false (and points at the problems) when it isn't ready.
  function ready() {
    setError('')
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length) {
      showFormError(Object.values(errs).join('\n'), { setError, bannerRef })
      scrollToFirstFieldError()
      return false
    }
    return true
  }

  async function handleView() {
    if (!ready()) return
    setViewing(true)
    try {
      const params = buildParams()
      const res = await apiFetch(`${API}preview/?${params}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showFormError(data?.detail || "Couldn't build the report. Please try again.", { setError, bannerRef })
        return
      }
      setPreview(data)
      setPreviewKey(params.toString())
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setViewing(false)
    }
  }

  async function handlePrint() {
    if (!ready()) return
    setPrinting(true)
    try {
      const params = buildParams()
      const res = await apiFetch(`${API}export/?${params}`)
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail
        showFormError(detail || "Couldn't generate the report. Please try again.", { setError, bannerRef })
        return
      }
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = REPORT_TYPES.find((t) => t.value === f.report_type).file
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setPrinting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <FieldErrorScope errors={fieldErrors} className="mx-auto flex max-w-6xl flex-col gap-6 pb-16">
      <h1 className="text-lg font-bold text-foreground">Training Report</h1>

      {error && <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Report Type" name="report_type" required>
            <select value={f.report_type} onChange={(e) => set({ report_type: e.target.value })} className={selectClass}>
              <option value="">Select…</option>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category" name="category" required>
            <select value={f.category} onChange={(e) => set({ category: e.target.value })} className={selectClass}>
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {employees && (
            <>
              <Field label="Rig" name="rig" required>
                <RemoteCombobox field={RIG_FIELD} value={f.rig} labelValue={f.rig_name} onChange={(v, raw) => set({ rig: v, rig_name: raw?.rig_name || '' })} />
              </Field>
              <Field label="From Date" name="from_date" required>
                <Input type="date" max={today} value={f.from_date} onChange={(e) => set({ from_date: e.target.value })} />
              </Field>
              <Field label="To Date" name="to_date" required>
                <Input type="date" max={today} min={f.from_date || undefined} value={f.to_date} onChange={(e) => set({ to_date: e.target.value })} />
              </Field>
            </>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="max-w-2xl text-xs text-muted-foreground">
            {employees
              ? 'One row per employee of that category on the rig. M means the course applies to their rank; a date means they attended it in the range.'
              : 'One row per designation. M means the course applies and training is mandatory for that designation.'}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setF(EMPTY)
                setFieldErrors({})
                setError('')
                setPreview(null)
              }}
            >
              Clear
            </Button>
            <Button variant="outline" onClick={handleView} disabled={viewing}>
              {viewing ? 'Loading…' : 'View'}
            </Button>
            {can(user, MENU_KEY, 'export') && (
              <Button onClick={handlePrint} disabled={printing}>
                {printing ? 'Preparing…' : 'Print'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {preview && <ReportPreview data={preview} stale={previewKey !== (paramsFor(f, employees))} />}
    </FieldErrorScope>
  )
}

// The query for the current form — also tells whether it has changed since View.
function paramsFor(f, employees) {
  const params = { report_type: f.report_type, category: f.category }
  if (employees) Object.assign(params, { rig: f.rig, from_date: f.from_date, to_date: f.to_date })
  return new URLSearchParams(params).toString()
}

function ReportPreview({ data, stale }) {
  const matrix = data.type === 'Training_Matrix'
  const head = 'px-2 py-2 text-xs font-bold text-foreground'
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 px-2">
        <h2 className="text-sm font-bold text-foreground">{data.title}</h2>
        {data.subtitle?.map((line) => (
          <p key={line} className="text-sm font-semibold text-foreground">{line}</p>
        ))}
        <p className="mt-1 text-xs text-muted-foreground">
          {data.rows.length} {matrix ? (data.rows.length === 1 ? 'designation' : 'designations') : data.rows.length === 1 ? 'employee' : 'employees'}
        </p>
        {stale && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">The filters have changed since this was loaded. Press View to refresh it.</p>}
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            {!matrix &&
              data.summary.map((row) => (
                <tr key={row.label}>
                  <th colSpan={4} className="border border-border px-2 py-1 text-left text-xs font-bold">{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={i} className="border border-border px-2 py-1 text-center text-xs">{v}</td>
                  ))}
                </tr>
              ))}
            <tr>
              <th className={`${head} border border-border text-left`}>{matrix ? 'Sr. No.' : 'SrNo.'}</th>
              {!matrix && <th className={`${head} border border-border text-left`}>EMP. NO</th>}
              <th className={`${head} border border-border text-left`}>{matrix ? 'Designation / Certificates' : 'EMPLOYEE NAME'}</th>
              {!matrix && <th className={`${head} border border-border text-left`}>DESIGNATION</th>}
              {data.certs.map((c) => (
                <th
                  key={c.name}
                  className={`${head} border border-border ${c.external ? 'bg-muted' : ''} ${matrix ? 'h-44 w-9 align-bottom' : 'min-w-[9rem] text-center'}`}
                >
                  {matrix ? <span className="inline-block [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">{c.name}</span> : c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={data.certs.length + (matrix ? 2 : 4)} className="border border-border p-4 text-center text-sm text-muted-foreground">
                  {matrix ? 'No designations have an active certificate mapping in this category.' : 'No employees match this rig and date range.'}
                </td>
              </tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.no}>
                <td className="border border-border px-2 py-1 text-center">{r.no}</td>
                {!matrix && <td className="border border-border px-2 py-1">{r.emp_no}</td>}
                <td className="border border-border px-2 py-1 whitespace-nowrap">{r.name}</td>
                {!matrix && <td className="border border-border px-2 py-1 whitespace-nowrap">{r.designation}</td>}
                {r.cells.map((v, i) => (
                  <td key={i} className={`border border-border px-2 py-1 text-center ${v === 'M' ? 'font-bold' : ''}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
