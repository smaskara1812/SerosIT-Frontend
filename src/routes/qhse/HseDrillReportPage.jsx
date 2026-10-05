import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { MonthYearSelect, YearSelect } from '@/components/PeriodSelects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MENU_KEY = 'qhse.hse_drill_report'

const PERIODS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'BIANNUAL', label: 'Bi-Annual' },
  { value: 'DATE_RANGE', label: 'Date Range' },
]
const QUARTERS = ['JAN-MAR', 'APR-JUN', 'JUL-SEP', 'OCT-DEC']
const HALVES = ['JAN-JUN', 'JUL-DEC']

const EMPTY = { period: '', month: '', to_month: '', year: '', sub: '' }

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50'

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}

export default function HseDrillReportPage() {
  const { user } = useAuth()
  const [f, setF] = useState(EMPTY)
  const [rigs, setRigs] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    apiFetch('/api/masters/rigs/?page_size=200&fields=rig_id,rig_name')
      .then((r) => r.json())
      .then((data) => setRigs((Array.isArray(data) ? data : data.results || []).sort((a, b) => a.rig_name.localeCompare(b.rig_name))))
  }, [])

  const set = (patch) => setF((prev) => ({ ...prev, ...patch }))
  const allSelected = useMemo(() => rigs.length > 0 && rigs.every((r) => selected.has(r.rig_id)), [rigs, selected])

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rigs.map((r) => r.rig_id)))
  }
  function toggleRig(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Same completeness rule as the server's resolve_period — checked here
  // only so Print can stay disabled until the form can actually succeed.
  const periodReady =
    (f.period === 'MONTHLY' && f.month) ||
    ((f.period === 'QUARTERLY' || f.period === 'BIANNUAL') && f.year && f.sub) ||
    (f.period === 'ANNUAL' && f.year) ||
    (f.period === 'DATE_RANGE' && f.month && f.to_month)
  const canPrint = Boolean(periodReady) && selected.size > 0

  async function handlePrint() {
    setPrinting(true)
    try {
      const params = new URLSearchParams({ period: f.period, rigs: [...selected].join(',') })
      for (const k of ['month', 'to_month', 'year', 'sub']) if (f[k]) params.set(k, f[k])
      const res = await apiFetch(`/api/qhse/hse-drill-report/export/?${params}`)
      if (!res.ok) {
        toast.error((await res.json().catch(() => null))?.detail || 'Failed to generate the report')
        return
      }
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = 'HSE Emergency Drill Matrix.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPrinting(false)
    }
  }

  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">HSE Drill Report</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setF(EMPTY)
              setSelected(new Set())
            }}
          >
            Clear
          </Button>
          {can(user, MENU_KEY, 'export') && (
            <Button onClick={handlePrint} disabled={!canPrint || printing}>
              {printing ? 'Preparing…' : 'Print'}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-7">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <Field label="Report Type">
            <Input value="Emergency Drill Matrix and HSE Report" disabled className="bg-muted" />
          </Field>
          <Field label="Period" required>
            <select value={f.period} onChange={(e) => setF({ ...EMPTY, period: e.target.value })} className={selectClass}>
              <option value="">Select…</option>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          {f.period === 'MONTHLY' && (
            <Field label="Month/Year" required>
              <MonthYearSelect value={f.month} onChange={(v) => set({ month: v })} />
            </Field>
          )}
          {(f.period === 'QUARTERLY' || f.period === 'BIANNUAL' || f.period === 'ANNUAL') && (
            <Field label="Year" required>
              <YearSelect value={f.year} onChange={(v) => set({ year: v })} />
            </Field>
          )}
          {f.period === 'QUARTERLY' && (
            <Field label="Quarter" required>
              <select value={f.sub} onChange={(e) => set({ sub: e.target.value })} className={selectClass}>
                <option value="">Select…</option>
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {f.period === 'BIANNUAL' && (
            <Field label="Months" required>
              <select value={f.sub} onChange={(e) => set({ sub: e.target.value })} className={selectClass}>
                <option value="">Select…</option>
                {HALVES.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {f.period === 'DATE_RANGE' && (
            <>
              <Field label="Month/Year" required>
                <MonthYearSelect value={f.month} onChange={(v) => set({ month: v })} />
              </Field>
              <Field label="To Month/Year" required>
                <MonthYearSelect value={f.to_month} onChange={(v) => set({ to_month: v })} />
              </Field>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Label className="text-sm font-medium">
            Rigs<span className="text-destructive"> *</span>
          </Label>
          <div className="max-h-64 overflow-auto rounded-lg border border-input p-3">
            <label className="flex cursor-pointer items-center gap-2 border-b border-border pb-2 text-sm font-semibold">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Select All
            </label>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {rigs.map((r) => (
                <label key={r.rig_id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.has(r.rig_id)} onChange={() => toggleRig(r.rig_id)} />
                  {r.rig_name}
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{selected.size} of {rigs.length} selected</p>
        </div>
      </div>
    </div>
  )
}
