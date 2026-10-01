import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MENU_KEY = 'qhse.mis_hse_review'

const PERIOD_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'DATE_RANGE', label: 'Date Range' },
]

const QUARTER_OPTIONS = [
  { value: 'APR_JUN', label: 'Apr - Jun' },
  { value: 'JUL_SEP', label: 'Jul - Sep' },
  { value: 'OCT_DEC', label: 'Oct - Dec' },
  { value: 'JAN_MAR', label: 'Jan - Mar' },
]

function emptyFilters() {
  return {
    period_type: 'MONTHLY',
    month: '',
    quarter: '',
    year: '',
    from_month: '',
    to_month: '',
    filter_type: 'SEROS',
    category: '',
    project: '',
    rigs: [],
  }
}

function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((o) => String(o.value) === String(value))
  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <div className="relative">
      <Input
        value={open ? query : selected?.label || ''}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || 'Search…'}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
                setQuery('')
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatMonthYear(dateStr) {
  if (!dateStr) return null
  const [year, month] = dateStr.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(month) - 1]} ${year}`
}

function PlainSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Field({ label, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function num(v, digits = 0) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export default function MisHseReviewPage() {
  const { user } = useAuth()
  const canView = can(user, MENU_KEY, 'view')

  const [filters, setFilters] = useState(emptyFilters)
  const [meta, setMeta] = useState({ categories: [], projects: [], data_range: {} })
  const [projectRigs, setProjectRigs] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    apiFetch('/api/qhse/mis-hse-review/meta/')
      .then((r) => r.json())
      .then(setMeta)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (filters.filter_type !== 'PROJECT' || !filters.project) {
        if (!cancelled) setProjectRigs([])
        return
      }
      const res = await apiFetch(`/api/qhse/mis-hse-review/project-rigs/?project=${filters.project}`)
      const data = await res.json()
      if (!cancelled) setProjectRigs(data.rigs || [])
    }
    run()
    return () => {
      cancelled = true
    }
  }, [filters.filter_type, filters.project])

  function set(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function buildParams() {
    const params = new URLSearchParams()
    params.set('period_type', filters.period_type)
    if (filters.period_type === 'MONTHLY') params.set('month', filters.month)
    if (filters.period_type === 'QUARTERLY') {
      params.set('quarter', filters.quarter)
      params.set('year', filters.year)
    }
    if (filters.period_type === 'ANNUAL') params.set('year', filters.year)
    if (filters.period_type === 'DATE_RANGE') {
      params.set('from_month', filters.from_month)
      params.set('to_month', filters.to_month)
    }
    params.set('filter_type', filters.filter_type)
    if (filters.filter_type === 'SEROS' && filters.category) params.set('category', filters.category)
    if (filters.filter_type === 'PROJECT') {
      params.set('project', filters.project)
      if (filters.rigs.length) params.set('rigs', filters.rigs.join(','))
    }
    return params
  }

  function periodReady() {
    if (filters.period_type === 'MONTHLY') return Boolean(filters.month)
    if (filters.period_type === 'QUARTERLY') return Boolean(filters.quarter && filters.year)
    if (filters.period_type === 'ANNUAL') return Boolean(filters.year)
    if (filters.period_type === 'DATE_RANGE') return Boolean(filters.from_month && filters.to_month)
    return false
  }

  const ready = periodReady() && (filters.filter_type === 'SEROS' || Boolean(filters.project))

  async function handleView() {
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch(`/api/qhse/mis-hse-review/?${buildParams().toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Failed to load report.')
        setReport(null)
        return
      }
      setReport(data)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setFilters(emptyFilters())
    setReport(null)
    setError('')
  }

  async function handlePrint() {
    const tab = window.open('', '_blank')
    setPrinting(true)
    try {
      const res = await apiFetch(`/api/qhse/mis-hse-review/print/?${buildParams().toString()}`)
      if (!res.ok) {
        toast.error('Failed to generate report')
        if (tab) tab.close()
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (tab) {
        tab.location.href = url
      } else if (!window.open(url, '_blank')) {
        const a = document.createElement('a')
        a.href = url
        a.download = 'Monthly HSE Review.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } finally {
      setPrinting(false)
    }
  }

  if (!canView) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Monthly HSE Review</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handlePrint} disabled={!ready || printing}>
            {printing ? 'Preparing…' : 'Print'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Report Type">
            <Input value="Monthly HSE Review" readOnly disabled className="bg-muted" />
          </Field>
          <Field label="Period">
            <PlainSelect value={filters.period_type} onChange={(v) => set({ period_type: v })} options={PERIOD_OPTIONS} />
          </Field>

          {(meta.data_range.earliest || meta.data_range.latest) && (
            <p className="sm:col-span-2 -mt-2 text-xs text-muted-foreground">
              Data on file: {formatMonthYear(meta.data_range.earliest)} – {formatMonthYear(meta.data_range.latest)} —
              pick a period inside this range to see results.
            </p>
          )}

          {filters.period_type === 'MONTHLY' && (
            <Field label="Month/Year">
              <Input type="month" value={filters.month} onChange={(e) => set({ month: e.target.value })} />
            </Field>
          )}
          {filters.period_type === 'QUARTERLY' && (
            <>
              <Field label="Quarter">
                <PlainSelect value={filters.quarter} onChange={(v) => set({ quarter: v })} options={QUARTER_OPTIONS} />
              </Field>
              <Field label="Annual/Quarter Year">
                <Input
                  type="number"
                  placeholder="yyyy"
                  value={filters.year}
                  onChange={(e) => set({ year: e.target.value })}
                />
              </Field>
            </>
          )}
          {filters.period_type === 'ANNUAL' && (
            <Field label="Annual Year">
              <Input type="number" placeholder="yyyy" value={filters.year} onChange={(e) => set({ year: e.target.value })} />
            </Field>
          )}
          {filters.period_type === 'DATE_RANGE' && (
            <>
              <Field label="Month/Year">
                <Input type="month" value={filters.from_month} onChange={(e) => set({ from_month: e.target.value })} />
              </Field>
              <Field label="To Month/Year">
                <Input type="month" value={filters.to_month} onChange={(e) => set({ to_month: e.target.value })} />
              </Field>
            </>
          )}

          <Field label="Filter Type" wide>
            <div className="flex gap-4">
              {['SEROS', 'PROJECT'].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={filters.filter_type === opt}
                    onChange={() => set({ filter_type: opt, category: '', project: '', rigs: [] })}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </Field>

          {filters.filter_type === 'SEROS' && (
            <Field label="Category">
              <PlainSelect
                value={filters.category}
                onChange={(v) => set({ category: v })}
                options={meta.categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="All categories"
              />
            </Field>
          )}

          {filters.filter_type === 'PROJECT' && (
            <>
              <Field label="Project">
                <SearchableSelect
                  value={filters.project}
                  onChange={(v) => set({ project: v, rigs: [] })}
                  options={meta.projects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Search by contract no. or location…"
                />
                {(() => {
                  const project = meta.projects.find((p) => String(p.id) === String(filters.project))
                  if (!project) return null
                  return (
                    <p className="text-xs text-muted-foreground">
                      Active {formatMonthYear(project.start)} – {project.end ? formatMonthYear(project.end) : 'ongoing'}
                      — pick a period inside this range.
                    </p>
                  )
                })()}
              </Field>
              <Field label="Project Rigs" wide>
                <div className="flex flex-wrap gap-3 rounded-lg border border-input p-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={projectRigs.length > 0 && filters.rigs.length === projectRigs.length}
                      onChange={(e) =>
                        set({ rigs: e.target.checked ? projectRigs.map((r) => r.id) : [] })
                      }
                    />
                    Select All
                  </label>
                  {projectRigs.map((r) => (
                    <label key={r.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.rigs.includes(r.id)}
                        onChange={(e) =>
                          set({
                            rigs: e.target.checked ? [...filters.rigs, r.id] : filters.rigs.filter((id) => id !== r.id),
                          })
                        }
                      />
                      {r.name}
                    </label>
                  ))}
                  {filters.project && projectRigs.length === 0 && (
                    <span className="text-sm text-muted-foreground">No rigs on this project.</span>
                  )}
                </div>
              </Field>
            </>
          )}
        </div>

        <div className="mt-4">
          <Button onClick={handleView} disabled={!ready || loading}>
            {loading ? 'Loading…' : 'View'}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {report && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            HSE Return ({report.period_label}) ({report.date_from} - {report.date_to})
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReportTable title="Manhours (Total Man Hours)">
              {report.manhours.rows.map((r) => (
                <tr key={r.label} className="border-t border-border">
                  <td className="px-3 py-1.5">{r.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.total_man_hours)}</td>
                </tr>
              ))}
              {report.manhours.third_party_rows.length > 0 && (
                <>
                  <tr className="border-t border-border">
                    <td colSpan={2} className="px-3 py-1.5 font-semibold">
                      Third Party
                    </td>
                  </tr>
                  {report.manhours.third_party_rows.map((r) => (
                    <tr key={r.label} className="border-t border-border">
                      <td className="px-3 py-1.5">{r.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{num(r.total_man_hours)}</td>
                    </tr>
                  ))}
                </>
              )}
              {report.manhours.rows.length === 0 && report.manhours.third_party_rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-muted-foreground">
                    No data for this period.
                  </td>
                </tr>
              )}
            </ReportTable>

            <ReportTable title="Rig Name — LTI Free Days">
              {report.lti.map((r) => (
                <tr key={r.rig_id} className={`border-t border-border ${!r.active ? 'text-muted-foreground italic' : ''}`}>
                  <td className="px-3 py-1.5">{r.rig_name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.active ? num(r.lti_free_days) : 'Not in operation'}
                  </td>
                </tr>
              ))}
            </ReportTable>

            <ReportTable title="Meetings">
              <tr className="border-t border-border">
                <td className="px-3 py-1.5">TOTAL HSE MEETINGS HELD</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{num(report.meetings_total)}</td>
              </tr>
            </ReportTable>

            <ReportTable title="HSE Inspections/Drills/Audits">
              {report.activities.map((r) => (
                <tr key={r.activity_name} className="border-t border-border">
                  <td className="px-3 py-1.5">{r.activity_name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.total_number)}</td>
                </tr>
              ))}
            </ReportTable>

            <ReportTable title="Incidents" header={['Incident Type', 'Total', 'SEROS', 'Contractor']}>
              {report.incidents.map((r) => (
                <tr key={r.incident_type} className="border-t border-border">
                  <td className="px-3 py-1.5">{r.incident_type}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.total)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.seros)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(r.contractor)}</td>
                </tr>
              ))}
            </ReportTable>

            <ReportTable title="Hazard ID Card" header={['', 'Total', 'SEROS', 'Others']}>
              {[
                ['Hazard ID Card', report.hazard_card.total],
                ['Open', report.hazard_card.open],
                ['Close', report.hazard_card.close],
              ].map(([label, vals]) => (
                <tr key={label} className="border-t border-border">
                  <td className="px-3 py-1.5">{label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(vals.total)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(vals.seros)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{num(vals.others)}</td>
                </tr>
              ))}
            </ReportTable>
          </div>

          <ReportTable title={`HSE Statistics (${report.statistics.statistic_from} - ${report.statistics.statistic_to})`}>
            <tr className="border-t border-border">
              <td className="px-3 py-1.5">LTIF — Lost Time Injury Frequency (per 1,000,000 exposure hours)</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{num(report.statistics.ltif, 3)}</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-3 py-1.5">TRIR — Total Recordable Incident Rate (per 200,000 exposure hours)</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{num(report.statistics.trir, 3)}</td>
            </tr>
          </ReportTable>

          <ReportTable title="Environment Reporting" header={['Consumable', 'Unit', 'Total Qty.']}>
            {report.environment.map((r) => (
              <tr key={r.consumable_name} className="border-t border-border">
                <td className="px-3 py-1.5">{r.consumable_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.unit}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{num(r.total_quantity, 2)}</td>
              </tr>
            ))}
          </ReportTable>
        </div>
      )}
    </div>
  )
}

function ReportTable({ title, header, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-2 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
      <div className="max-h-80 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          {header && (
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="bg-muted/50">
                {header.map((h, i) => (
                  <th key={i} className={`px-3 py-1.5 ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
