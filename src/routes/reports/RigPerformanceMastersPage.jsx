import { Fragment, useEffect, useState } from 'react'
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
import { useUrlString } from '@/routes/dashboards/dashboardUrlState'
import { IconPlus, IconTrash } from '@/components/icons'

const MENU_KEY = 'reports.rig_performance_masters'
const GREEN = '#00988A'
const NAVY = '#1E2656'

// The rate sheet opens on the current month (not yesterday's), so the new month can be planned from its first day.
function defaultMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LABEL = (ym) => {
  const [y, m] = ym.split('-')
  return `${MON[Number(m) - 1]} ${y}`
}
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

const MOVE_TYPES = [
  { value: 6, label: 'ILM' },
  { value: 7, label: 'IPM - Lateral' },
  { value: 8, label: 'IPM - Adjacent' },
]

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
    non_ilm_days: asNum(rig.plan.non_ilm_days),
    r1_pct: asNum(rig.plan.r1_pct), // blank = not set for this month: carried over or the default
    r2_pct: asNum(rig.plan.r2_pct),
    r3_pct: asNum(rig.plan.r3_pct),
    note: rig.plan.note || '',
  })
  const [terms, setTerms] = useState({
    upto_km: asNum(term?.upto_km),
    flat_amount: asNum(term?.flat_amount),
    extra_per_km: asNum(term?.extra_per_km),
  })
  // The planned moves of the month, in hours; any number.
  const [moves, setMoves] = useState(() => (rig.plan.moves || []).map((m) => ({ rate_id: m.rate_id, hours: asNum(m.hours), km: asNum(m.km) })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const open = true
  const [reason, setReason] = useState('')
  const closed = rig.closed

  const setP = (k) => (e) => setPlan((p) => ({ ...p, [k]: e.target.value }))
  const setT = (k) => (e) => setTerms((p) => ({ ...p, [k]: e.target.value }))
  const setMove = (i, k, v) => setMoves((ms) => ms.map((m, j) => (j === i ? { ...m, [k]: v } : m)))
  const plannedHours = moves.reduce((a, m) => a + (Number(m.hours) || 0), 0)
  const sum = Number(plan.r1_pct || 0) + Number(plan.r2_pct || 0) + Number(plan.r3_pct || 0)
  const weightsGiven = [plan.r1_pct, plan.r2_pct, plan.r3_pct].filter((v) => v !== '').length
  const weightsOk = weightsGiven === 0 || (weightsGiven === 3 && sum === 100)
  const inUse = rig.plan.weights || [85, 15, 0]
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
      let err = await put('/api/reports/rig-performance/plan/', { rig: rig.rig_id, month, ...plan, moves: moves.filter((m) => m.hours !== '').map((m) => ({ rate_id: Number(m.rate_id), hours: m.hours, km: Number(m.rate_id) === 6 ? m.km : '' })) })
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Plan for {MONTH_LABEL(month)}
        {closed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-emerald-800 normal-case dark:bg-emerald-900/40 dark:text-emerald-200">Closed {fmtDate(closed.on)}</span>}
      </div>
      {open && closed && (
        <div className="flex flex-col gap-3 text-sm">
          <div>
            The plan of {rig.name} for this month is locked. Closed on {fmtDate(closed.on)} by {closed.by || 'the system'}
            {closed.note ? ` (${closed.note})` : ''}. To change them, reopen the month and give the reason; it is kept in the history.
          </div>
          <Field label="Reason for reopening">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="For example: a move was entered wrongly" />
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
        <Field label="Normal days" hint={`Blank = automatic (${Math.round((rig.days_on_project - plannedHours / 24) * 100) / 100} now: the days on the project less the moves' hours)`}>
          <Input inputMode="decimal" value={plan.non_ilm_days} onChange={setP('non_ilm_days')} placeholder="auto" />
        </Field>
        <Field label="R1 weight %" hint={`Blank: ${rig.plan.weights_source}`}>
          <Input inputMode="decimal" value={plan.r1_pct} onChange={setP('r1_pct')} placeholder={String(inUse[0])} />
        </Field>
        <Field label="R2 weight %">
          <Input inputMode="decimal" value={plan.r2_pct} onChange={setP('r2_pct')} placeholder={String(inUse[1])} />
        </Field>
        <Field label="R3 weight %" hint={weightsGiven === 0 ? 'Leave all three blank to carry them over' : weightsOk ? 'Weights add up to 100' : weightsGiven < 3 ? 'Fill all three, or none' : `Weights add up to ${sum}: they must be 100`}>
          <Input inputMode="decimal" value={plan.r3_pct} onChange={setP('r3_pct')} placeholder={String(inUse[2])} />
        </Field>
      </div>
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">ILM terms of the project (every month)</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Planned moves this month</div>
          {moves.length > 0 && <div className="text-xs text-muted-foreground tabular-nums">{plannedHours} h = {Math.round((plannedHours / 24) * 100) / 100} days</div>}
        </div>
        {moves.length === 0 && <div className="text-xs text-muted-foreground">No move planned. Add one for each ILM or IPM the rig is expected to do this month; its hours come out of the normal days.</div>}
        {moves.length > 0 && (
          <div className="grid grid-cols-[11rem_7rem_8rem_2.25rem] items-center gap-x-2 gap-y-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Type</span>
            <span>Hours</span>
            <span>km</span>
            <span />
            {moves.map((mv, i) => (
              <Fragment key={i}>
                <select
                  value={mv.rate_id}
                  onChange={(e) => setMove(i, 'rate_id', Number(e.target.value))}
                  aria-label={`Type of planned move ${i + 1}`}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal normal-case"
                >
                  {MOVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <Input inputMode="decimal" value={mv.hours} onChange={(e) => setMove(i, 'hours', e.target.value)} aria-label={`Hours of planned move ${i + 1}`} placeholder="Hours" />
                {Number(mv.rate_id) === 6 ? (
                  <Input inputMode="decimal" value={mv.km} onChange={(e) => setMove(i, 'km', e.target.value)} aria-label={`km of planned move ${i + 1}`} placeholder="from records" />
                ) : <span />}
                <Button type="button" variant="destructive" size="icon" onClick={() => setMoves((ms) => ms.filter((_, j) => j !== i))} aria-label={`Remove planned move ${i + 1}`} title="Remove this move">
                  <IconTrash className="h-4 w-4" />
                </Button>
              </Fragment>
            ))}
          </div>
        )}
        {moves.length > 0 && <div className="text-[11px] text-muted-foreground">km left blank = the km recorded for the move in the drilling records. IPM moves have no km.</div>}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setMoves((ms) => [...ms, { rate_id: 6, hours: '', km: '' }])}>
            <IconPlus className="h-4 w-4" /> Add a move
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Planned moves and weights are for this month only. The three ILM fields (km, flat amount, price per km) belong to the project: a change there applies to every month of project {rig.contract}.
      </p>
      <Field label="Note">
        <Input value={plan.note} onChange={setP('note')} maxLength={200} />
      </Field>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || !weightsOk}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {rig.can_close && (
          <Button type="button" variant="outline" onClick={closeIt} disabled={saving} title="Locks the plan of this ended month">
            Close this month
          </Button>
        )}
        <span className="text-xs text-muted-foreground">The projection is recalculated as soon as it is saved. Changes are kept in the audit history.{rig.can_close ? ' A month that has ended can be closed: its plan is then locked (revenue still follows the daily reports).' : ''}</span>
      </div>
      </>)}
    </div>
  )
}

function Kpi({ label, value, sub, strong }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 ${strong ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="text-lg leading-tight font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Notice({ children, tone = 'amber' }) {
  const cls = tone === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'border-border bg-muted/40 text-muted-foreground'
  return <div className={`rounded-lg border px-3 py-2 text-xs ${cls}`}>{children}</div>
}

function RigCard({ rig, canEdit, canChange, month, onSaved }) {
  const ilm = rig.ilm
  const editable = canChange && rig.contract_id
  const [tab, setTab] = useState('overview')
  const w = rig.plan?.weights || [85, 15, 0]
  const tabs = [
    { id: 'overview', label: 'Projection' },
    { id: 'moves', label: 'Moves', count: rig.planned_moves.length || rig.moves.length || null },
    ...(editable ? [{ id: 'plan', label: 'Edit plan' }] : []),
    { id: 'history', label: 'History', count: rig.history.length || null },
  ]
  return (
    <section id={`rig-${rig.rig_id}`} className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold">{rig.name}</div>
            {rig.closed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Closed {fmtDate(rig.closed.on)}</span>}
            {!rig.reported && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">No report yet</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {rig.contract ? `Project ${rig.contract}` : 'No active project with rates'}
            
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Projection</div>
          <div className="text-2xl leading-tight font-semibold tabular-nums">{rig.projection_cr === null ? '—' : cr(rig.projection_cr)}<span className="ml-1 text-sm font-medium text-muted-foreground">Cr</span></div>
        </div>
      </div>

      {rig.problem && <Notice>{rig.problem}</Notice>}
      {rig.warnings.map((x) => <Notice key={x}>{x}</Notice>)}

      <div role="tablist" aria-label={`${rig.name} sections`} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
            {t.count ? <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Normal days" value={rig.non_ilm_days} sub={`× ${money(rig.normal_day)} a day = ${cr(rig.normal_total_cr)} Cr`} />
            <Kpi label="Planned moves" value={rig.ilm_hours ? `${rig.ilm_hours} h` : 'None'} sub={ilm.amount ? `${cr(ilm.amount_cr)} Cr from ${rig.planned_moves.length} move${rig.planned_moves.length === 1 ? '' : 's'}` : 'no ILM / IPM amount in the projection'} />
            <Kpi label="Weights R1 / R2 / R3" value={`${w[0]} / ${w[1]} / ${w[2]}`} sub={rig.weights_source} />
            <Kpi label="Days on the project" value={rig.days_on_project} sub={rig.from ? `${fmtDate(rig.from)} to ${fmtDate(rig.to)}` : ''} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Block title="Rates">
              <thead>
                <tr>
                  <th className={head} style={{ background: GREEN }}>RATE</th>
                  <th className={head} style={{ background: GREEN }}>PER DAY</th>
                  <th className={head} style={{ background: GREEN }}>WEIGHT</th>
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
            <div className="flex flex-col gap-3">
              <Block title="How the projection adds up">
                <thead>
                  <tr>
                    {['Part', 'Days / hours', 'Cr'].map((h) => (
                      <th key={h} className={head} style={{ background: NAVY }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={left}>Normal days</td>
                    <td className={cell}>{rig.non_ilm_days} days</td>
                    <td className={cell}>{cr(rig.normal_total_cr)}</td>
                  </tr>
                  <tr>
                    <td className={left}>Planned moves</td>
                    <td className={cell}>{rig.ilm_hours} h</td>
                    <td className={cell}>{cr(ilm.amount_cr) || '0.0000'}</td>
                  </tr>
                  <tr className="bg-muted font-semibold">
                    <td className={left}>Projection</td>
                    <td className={cell} />
                    <td className={cell}>{cr(rig.projection_cr)}</td>
                  </tr>
                </tbody>
              </Block>
              {rig.other_rates.length > 0 && (
                <div className="text-xs text-muted-foreground">Other rates in the contract (per day): {rig.other_rates.map((o) => `${o.code} ${money(o.per_day)}`).join(' · ')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'moves' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Block title="ILM terms (the project's)">
                <thead>
                  <tr>
                    <th className={head} style={{ background: GREEN }}>ILM</th>
                    <th className={head} style={{ background: GREEN }}>RATES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={left}>{ilm.term ? `Flat up to ${ilm.term.upto_km} km` : 'Flat amount'}</td>
                    <td className={cell}>{ilm.term ? money(ilm.term.flat_amount, 2) : ''}</td>
                  </tr>
                  <tr>
                    <td className={left}>Extra per km</td>
                    <td className={cell}>{ilm.term ? money(ilm.term.extra_per_km, 2) : ''}</td>
                  </tr>
                </tbody>
              </Block>
              {!ilm.term && <div className="text-xs text-muted-foreground">No ILM terms for this project: an ILM is priced at the project's own ILM rate.</div>}
            </div>
            <div className="flex flex-col gap-3">
              {rig.planned_moves.length > 0 ? (
                <Block title="Planned moves (the projection)">
                  <thead>
                    <tr>
                      {['Type', 'Hours', 'km', 'Amount', 'Per hour'].map((h) => (
                        <th key={h} className={head} style={{ background: NAVY }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rig.planned_moves.map((pm, i) => (
                      <tr key={i}>
                        <td className={left}>{pm.type}</td>
                        <td className={cell}>{pm.hours}</td>
                        <td className={cell} title={pm.km_source}>{pm.km === null ? '' : pm.km}</td>
                        <td className={cell}>{pm.amount === null ? '—' : money(pm.amount)}</td>
                        <td className={cell}>{pm.mis_hour === null ? '—' : money(pm.mis_hour)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted font-semibold">
                      <td className={left}>Total</td>
                      <td className={cell}>{rig.ilm_hours}</td>
                      <td className={cell}>{ilm.km}</td>
                      <td className={cell}>{money(ilm.amount)}</td>
                      <td className={cell} />
                    </tr>
                  </tbody>
                </Block>
              ) : (
                <Notice tone="muted">No move is planned this month, so the projection has no ILM / IPM amount.{editable ? ' Add one under Edit plan.' : ''}</Notice>
              )}
              {ilm.note && <div className="text-xs text-muted-foreground">{ilm.note}</div>}
            </div>
          </div>
          {rig.moves.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Block title="Moves in the daily reports (what is earned)">
                <thead>
                  <tr>
                    {['From', 'Well', 'Type', 'km', 'Amount', 'Hours logged', 'This month', 'Per hour'].map((h) => (
                      <th key={h} className={head} style={{ background: NAVY }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rig.moves.map((mv, i) => (
                    <tr key={i} title={mv.note}>
                      <td className={left}>{fmtDate(mv.date)}</td>
                      <td className={left}>{mv.well}</td>
                      <td className={left}>{mv.type}</td>
                      <td className={cell}>{mv.type === 'ILM' ? mv.km : ''}</td>
                      <td className={cell}>{mv.amount === null ? '—' : money(mv.amount)}</td>
                      <td className={cell}>{mv.hours}</td>
                      <td className={cell}>{mv.hours_month}</td>
                      <td className={cell}>{mv.mis_hour === null ? '—' : money(mv.mis_hour)}</td>
                    </tr>
                  ))}
                </tbody>
              </Block>
              <div className="text-xs text-muted-foreground">
                A move earns its amount over the hours logged on it in the daily reports: each hour earns the amount divided by all the hours logged so far. A move that is still running is earned over the hours to date, and a move that crosses a month end is split by the date of each hour; earlier days and months follow when more hours are logged.
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No ILM / IPM hours are logged in the daily reports this month.</div>
          )}
        </div>
      )}

      {tab === 'plan' && editable && <EditPanel key={`${rig.rig_id}-${month}-${rig.projection_cr}`} rig={rig} month={month} onSaved={onSaved} />}

      {tab === 'history' && (
        <div className="flex flex-col gap-3">
          {rig.plan?.note && <div className="text-sm text-muted-foreground">Plan note: {rig.plan.note}</div>}
          {rig.history.length === 0 ? (
            <div className="text-sm text-muted-foreground">No changes have been made to this month's plan yet.</div>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {rig.history.map((h, i) => (
                <li key={i} className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{h.when.replace('T', ' ')} · {h.who || 'system'} · {h.action}{h.note ? ` · ${h.note}` : ''}</div>
                  {Object.entries(h.changes).map(([k, v]) => (
                    <div key={k} className="text-xs"><span className="font-medium">{k.replaceAll('_', ' ')}</span>: {String(v.old ?? '—')} → {String(v.new ?? '—')}</div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-3 border-t border-border pt-3 text-xs">
          <Link className="font-semibold text-primary hover:underline" to="/masters/rig-month-plans">Rig Month Plans</Link>
          <Link className="font-semibold text-primary hover:underline" to="/masters/ilm-rate-terms">ILM Rate Terms</Link>
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
  // The month is kept in the address, so Back, refresh and a shared link return to it.
  const [monthUrl, setMonth] = useUrlString('month')
  const month = monthUrl || defaultMonth()
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
      <div className="sticky top-0 z-20 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Month</span>
            <MonthYearSelect value={month} onChange={(v) => v && setMonth(v)} minYear={2020} />
          </div>
          {data && data.rigs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Jump to a rig">
              {data.rigs.map((r) => (
                <a key={r.rig_id} href={`#rig-${r.rig_id}`} className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted">{r.name}</a>
              ))}
            </div>
          )}
        </div>
        {data && data.rigs.length > 0 && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">All rigs · projection</div>
              <div className="text-xl leading-tight font-semibold tabular-nums">{cr(data.rigs.reduce((a, r) => a + (r.projection_cr || 0), 0))} <span className="text-sm font-medium text-muted-foreground">Cr</span></div>
            </div>
          </div>
        )}
      </div>
      <p className="max-w-4xl text-sm text-muted-foreground">
        The rate sheet behind each rig's revenue projection: the project's rates, the month's planned moves (in hours) and the ILM terms. Every rig that is working or starting on a project is listed from the first day of the month, before its first report. Use <span className="font-medium text-foreground">Edit plan</span> on a rig to change its planned moves, weights and ILM terms; the projection updates as soon as you save. Diesel prices are changed in Masters.
      </p>
      {loading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>}
      {!loading && error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>}
      {!loading && !error && data && data.rigs.length === 0 && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{data.message}</div>}
      {!loading && !error && data?.rigs.map((r) => <RigCard key={r.rig_id} rig={r} canEdit={canEdit} canChange={canChange} month={month} onSaved={() => setReload((n) => n + 1)} />)}
    </div>
  )
}
