import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MonthYearSelect } from '@/components/PeriodSelects'
import { IconChevronDown } from '@/components/icons'

const MENU_KEY = 'reports.rig_performance_masters'
const GREEN = '#00988A'
const NAVY = '#1E2656'

function defaultMonth() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d} ${MON[Number(m) - 1]} ${y}`
}
const money = (v, d = 0) => (v === null || v === undefined ? '' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }))
const cr = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(4))

const cell = 'border border-border px-2 py-1 text-right text-xs tabular-nums whitespace-nowrap'
const left = `${cell} !text-left`
const head = 'border border-border px-2 py-1.5 text-center text-xs font-semibold whitespace-nowrap text-white'

function Block({ title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</div>}
      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">{children}</table>
      </div>
    </div>
  )
}


const asNum = (v) => (v === '' || v === null || v === undefined ? '' : String(v))

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

// The month's inputs for one rig, changed here and saved to Rig Month Plans / ILM Rate Terms (same checks as those Masters pages).
function EditPanel({ rig, month, onSaved }) {
  const term = rig.ilm.term
  const [plan, setPlan] = useState({
    ilm_days: asNum(rig.plan.ilm_days),
    non_ilm_days: asNum(rig.plan.non_ilm_days),
    r1_pct: asNum(rig.plan.r1_pct),
    r2_pct: asNum(rig.plan.r2_pct),
    r3_pct: asNum(rig.plan.r3_pct),
    note: rig.plan.note || '',
  })
  const [terms, setTerms] = useState({
    upto_km: asNum(term?.upto_km),
    flat_amount: asNum(term?.flat_amount),
    extra_per_km: asNum(term?.extra_per_km),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const closed = rig.closed

  const setP = (k) => (e) => setPlan((p) => ({ ...p, [k]: e.target.value }))
  const setT = (k) => (e) => setTerms((p) => ({ ...p, [k]: e.target.value }))
  const sum = Number(plan.r1_pct || 0) + Number(plan.r2_pct || 0) + Number(plan.r3_pct || 0)
  const termsFilled = terms.upto_km !== '' || terms.flat_amount !== '' || terms.extra_per_km !== ''

  async function put(url, body) {
    const res = await apiFetch(url, { method: 'PUT', body: JSON.stringify(body) })
    if (res.ok) return null
    const data = await res.json().catch(() => ({}))
    const first = data.errors ? Object.values(data.errors).flat()[0] : null
    return first || data.detail || 'It could not be saved.'
  }

  async function post(url, body, okText) {
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) {
        setError((await res.json().catch(() => ({})))?.detail || 'It could not be done.')
        return
      }
      toast.success(`${rig.name}: ${okText}`)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const reopen = () => post('/api/reports/rig-performance/plan/reopen/', { rig: rig.rig_id, month, reason }, 'month reopened')
  const closeIt = () => post('/api/reports/rig-performance/plan/close/', { rig: rig.rig_id, month }, 'month closed')

  async function save() {
    setSaving(true)
    setError('')
    try {
      let err = await put('/api/reports/rig-performance/plan/', { rig: rig.rig_id, month, ...plan })
      if (!err && termsFilled && rig.contract_id) {
        err = await put('/api/reports/rig-performance/ilm-terms/', { rig: rig.rig_id, contract: rig.contract_id, ...terms, note: term?.note || '' })
      }
      if (err) {
        setError(err)
        return
      }
      toast.success(`${rig.name}: saved`)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Change this rig's month
          {closed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-emerald-800 normal-case dark:bg-emerald-900/40 dark:text-emerald-200">Closed {fmtDate(closed.on)}</span>}
        </span>
        <span className="flex items-center gap-2 text-xs font-semibold text-primary">
          {open ? 'Hide' : 'Edit'}
          <IconChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && closed && (
        <div className="flex flex-col gap-3 text-sm">
          <div>
            The ILM days of {rig.name} for this month are final ({rig.plan.ilm_days} ILM days). Closed on {fmtDate(closed.on)} by {closed.by || 'the system'}
            {closed.note ? ` (${closed.note})` : ''}. To change them, reopen the month and give the reason; it is kept in the history.
          </div>
          <Field label="Reason for reopening">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="For example: ILM days were entered wrongly" />
          </Field>
          {error && <div className="text-xs text-destructive">{error}</div>}
          <div>
            <Button type="button" variant="outline" onClick={reopen} disabled={saving || !reason.trim()}>
              {saving ? 'Working…' : 'Reopen this month'}
            </Button>
          </div>
        </div>
      )}
      {open && !closed && (<>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="ILM days" hint="Days spent on a rig move">
          <Input inputMode="decimal" value={plan.ilm_days} onChange={setP('ilm_days')} />
        </Field>
        <Field label="Non-ILM days" hint={`Blank = automatic (${rig.days_on_project - Number(plan.ilm_days || 0)} now)`}>
          <Input inputMode="decimal" value={plan.non_ilm_days} onChange={setP('non_ilm_days')} placeholder="auto" />
        </Field>
        <Field label="R1 weight %">
          <Input inputMode="decimal" value={plan.r1_pct} onChange={setP('r1_pct')} />
        </Field>
        <Field label="R2 weight %">
          <Input inputMode="decimal" value={plan.r2_pct} onChange={setP('r2_pct')} />
        </Field>
        <Field label="R3 weight %" hint={sum === 100 ? 'Weights add up to 100' : `Weights add up to ${sum}: they must be 100`}>
          <Input inputMode="decimal" value={plan.r3_pct} onChange={setP('r3_pct')} />
        </Field>
        <Field label="Flat amount covers up to (km)">
          <Input inputMode="decimal" value={terms.upto_km} onChange={setT('upto_km')} disabled={!rig.contract_id} />
        </Field>
        <Field label="Flat amount" hint="Blank = the project's ILM rate">
          <Input inputMode="decimal" value={terms.flat_amount} onChange={setT('flat_amount')} disabled={!rig.contract_id} />
        </Field>
        <Field label="Price per km beyond">
          <Input inputMode="decimal" value={terms.extra_per_km} onChange={setT('extra_per_km')} disabled={!rig.contract_id} />
        </Field>
      </div>
      <Field label="Note">
        <Input value={plan.note} onChange={setP('note')} maxLength={200} />
      </Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || sum !== 100}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {rig.can_close && (
          <Button type="button" variant="outline" onClick={closeIt} disabled={saving} title="Makes the ILM days of this ended month final">
            Close this month
          </Button>
        )}
        <span className="text-xs text-muted-foreground">The projection is recalculated as soon as it is saved. Changes are kept in the audit history.{rig.can_close ? ' A month that has ended can be closed: its ILM days are then final.' : ''}</span>
      </div>
      </>)}
    </div>
  )
}

function RigCard({ rig, canEdit, canChange, month, onSaved }) {
  const ilm = rig.ilm
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-base font-semibold">{rig.name}</div>
          <div className="text-xs text-muted-foreground">
            {rig.contract ? `Project ${rig.contract}` : 'No active project with rates'}
            {rig.from ? ` · on the project ${fmtDate(rig.from)} to ${fmtDate(rig.to)} (${rig.days_on_project} days)` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Projection</div>
          <div className="text-lg font-semibold tabular-nums">{rig.projection_cr === null ? '—' : `${cr(rig.projection_cr)} Cr`}</div>
        </div>
      </div>
      {rig.problem && <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{rig.problem}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Block title="Rates">
            <thead>
              <tr>
                <th className={head} style={{ background: GREEN }}>RATES</th>
                <th className={head} style={{ background: GREEN }}>PER DAY</th>
                <th className={head} style={{ background: GREEN }}>TOTAL %</th>
                <th className={head} style={{ background: GREEN }}>FOR REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {rig.rates.map((r) => (
                <tr key={r.code}>
                  <td className={left}>{r.code}</td>
                  <td className={cell}>{money(r.per_day)}</td>
                  <td className={cell}>{r.weight}%</td>
                  <td className={cell}>{money(r.for_revenue)}</td>
                </tr>
              ))}
              <tr className="bg-muted font-semibold">
                <td className={left} colSpan={3}>Normal day</td>
                <td className={cell}>{money(rig.normal_day)}</td>
              </tr>
            </tbody>
          </Block>
          <Block>
            <thead>
              <tr>
                {['Num of days', 'Normal day', 'Total', 'In Cr'].map((h) => (
                  <th key={h} className={head} style={{ background: NAVY }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cell}>{rig.non_ilm_days}</td>
                <td className={cell}>{money(rig.normal_day)}</td>
                <td className={cell}>{money(rig.normal_total)}</td>
                <td className={cell}>{cr(rig.normal_total_cr)}</td>
              </tr>
            </tbody>
          </Block>
          {rig.other_rates.length > 0 && (
            <div className="text-xs text-muted-foreground">Other rates in the contract (per day): {rig.other_rates.map((o) => `${o.code} ${money(o.per_day)}`).join(' · ')}</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Block title="ILM">
            <thead>
              <tr>
                <th className={head} style={{ background: GREEN }}>ILM</th>
                <th className={head} style={{ background: GREEN }}>RATES</th>
                <th className={head} style={{ background: GREEN }}>TOTAL KM</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={left}>{ilm.term ? `Flat up to ${ilm.term.upto_km} km` : 'Flat amount'}</td>
                <td className={cell}>{ilm.term ? money(ilm.term.flat_amount, 2) : ''}</td>
                <td className={cell}>{ilm.km}</td>
              </tr>
              <tr>
                <td className={left}>Extra per km</td>
                <td className={cell}>{ilm.term ? money(ilm.term.extra_per_km, 2) : ''}</td>
                <td className={cell}>{ilm.term && ilm.km > ilm.term.upto_km ? Math.round((ilm.km - ilm.term.upto_km) * 100) / 100 : 0}</td>
              </tr>
              <tr className="bg-muted font-semibold">
                <td className={left} colSpan={2}>Total ILM / IPM amount</td>
                <td className={cell}>{money(ilm.amount, 2)}</td>
              </tr>
              <tr>
                <td className={left} colSpan={2}>Additional to the revenue (Cr)</td>
                <td className={cell}>{cr(ilm.amount_cr)}</td>
              </tr>
              <tr>
                <td className={left} colSpan={2}>For MIS / day (Cr)</td>
                <td className={cell}>{cr(ilm.mis_cr)}</td>
              </tr>
            </tbody>
          </Block>
          <div className="text-xs text-muted-foreground">
            {ilm.note || 'No ILM terms or ILM rate for this project.'}
            {rig.ilm_days === 0 && ilm.amount !== null ? ' No ILM days are planned this month, so this amount is not in the projection.' : ''}
          </div>
          {rig.moves.length > 0 && (
            <Block title="Moves this month">
              <thead>
                <tr>
                  {['Date', 'Well', 'Type', 'km', 'Amount'].map((h) => (
                    <th key={h} className={head} style={{ background: NAVY }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rig.moves.map((mv, i) => (
                  <tr key={i}>
                    <td className={left}>{fmtDate(mv.date)}</td>
                    <td className={left}>{mv.well}</td>
                    <td className={left}>{mv.type}</td>
                    <td className={cell}>{mv.km}</td>
                    <td className={cell}>{mv.amount === null || mv.amount === undefined ? 'by ILM terms' : money(mv.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Block>
          )}
          {rig.warnings.map((w) => (
            <div key={w} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{w}</div>
          ))}
          <Block>
            <thead>
              <tr>
                {['ILM days', 'Normal days', 'Projection (Cr)'].map((h) => (
                  <th key={h} className={head} style={{ background: NAVY }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cell}>{rig.ilm_days}</td>
                <td className={cell}>{rig.non_ilm_days}</td>
                <td className={`${cell} font-semibold`}>{cr(rig.projection_cr)}</td>
              </tr>
            </tbody>
          </Block>
          {rig.plan?.note && <div className="text-xs text-muted-foreground">Plan note: {rig.plan.note}</div>}
          {rig.history.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-muted-foreground">History of this month's plan ({rig.history.length})</summary>
              <ul className="mt-1.5 flex flex-col gap-1 text-muted-foreground">
                {rig.history.map((h, i) => (
                  <li key={i}>
                    {h.when.replace('T', ' ')} · {h.who || 'system'} · {h.action}
                    {Object.entries(h.changes).map(([k, v]) => ` · ${k}: ${v.old ?? '—'} → ${v.new ?? '—'}`)}
                    {h.note ? ` · ${h.note}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
      {canChange && rig.contract_id && <EditPanel key={`${rig.rig_id}-${month}-${rig.projection_cr}`} rig={rig} month={month} onSaved={onSaved} />}
      {canEdit && (
        <div className="flex flex-wrap gap-3 text-xs">
          <Link className="font-semibold text-primary hover:underline" to="/masters/rig-month-plans">Change ILM days or weights (Rig Month Plans)</Link>
          <Link className="font-semibold text-primary hover:underline" to="/masters/ilm-rate-terms">Change ILM terms</Link>
          <Link className="font-semibold text-primary hover:underline" to="/masters/project-drilling-rates">Project rates</Link>
        </div>
      )}
    </section>
  )
}

export default function RigPerformanceMastersPage() {
  const { user } = useAuth()
  const canView = can(user, MENU_KEY, 'view')
  const canEdit = can(user, 'masters.rig_month_plans', 'view')
  const canChange = can(user, MENU_KEY, 'edit')
  const [reload, setReload] = useState(0)
  const [month, setMonth] = useState(defaultMonth)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canView || !month) return undefined
    let live = true
    apiFetch(`/api/reports/rig-performance/rate-sheet/?month=${month}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!live) return
        setError(ok ? '' : body.detail || 'The rate sheet could not be loaded.')
        setData(ok ? body : null)
        setLoading(false)
      })
      .catch(() => {
        if (live) {
          setError('The rate sheet could not be loaded.')
          setLoading(false)
        }
      })
    return () => {
      live = false
    }
  }, [month, canView, reload])

  usePageSubtitle(data?.label || '')

  if (!canView) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Month</span>
          <MonthYearSelect value={month} onChange={(v) => v && setMonth(v)} minYear={2020} />
        </div>
        <div className="max-w-xl text-sm text-muted-foreground">
          The rate sheet behind each rig's revenue projection, worked out from the project's rates, the month's ILM days and the ILM terms. Change a rig's ILM days, weights and ILM terms in the box on its card (if you have the right to); the projection updates as soon as you save. Diesel prices are changed in Masters.
        </div>
      </div>
      {loading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>}
      {!loading && error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>}
      {!loading && !error && data && data.rigs.length === 0 && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{data.message}</div>}
      {!loading && !error && data?.rigs.map((r) => <RigCard key={r.name} rig={r} canEdit={canEdit} canChange={canChange} month={month} onSaved={() => setReload((n) => n + 1)} />)}
    </div>
  )
}
