import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { ArrowLeft, Check, FileSpreadsheet, Lock } from 'lucide-react'

// Rig Personnel > New Joinee Workflow > Candidate Competencies Details. Interviewers rate a candidate department by department (1 to 3 and a remark);
// a person can rate only the departments they are an interviewer of (Masters > Interviewer Mapping), the other panels are view only. The departments
// and their competencies come from the server (the Competency master), so a new department simply appears as another panel.

const MENU_KEY = 'hr.candidate_competencies'
const BASE = '/api/hr/candidate-evaluations/'
const LIST = '/rig-personnel/candidate-evaluations'

const STATUS_STYLE = {
  New: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Selected: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'On Hold': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
}

const key = (dept, comp) => `${dept}:${comp}`
const years = (y, m) => (y == null && m == null ? '—' : `${y || 0} Yrs ${m || 0} Mnths`)

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 truncate text-sm text-foreground" title={value || ''}>
        {value || '—'}
      </div>
    </div>
  )
}

function Rating({ value, onChange, disabled, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-input">
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={() => onChange(value === n ? null : n)}
          className={`h-8 w-9 text-sm font-semibold transition ${
            value === n ? 'bg-[#1a3f7a] text-white' : 'bg-transparent text-foreground hover:bg-accent'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${n > 1 ? 'border-l border-input' : ''}`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function Panel({ panel, shown, setRow, error }) {
  const rated = panel.rows.map((r) => shown(panel.dept, r).rating).filter((v) => v != null)
  const score = rated.length ? rated.reduce((a, b) => a + b, 0) : null
  return (
    <section className={`overflow-hidden rounded-2xl border bg-card ${error ? 'border-destructive/50' : 'border-border'}`}>
      <header className="flex items-center justify-between gap-3 bg-[#cfe3f6] px-4 py-2.5 dark:bg-[#1a3f7a]/40">
        <h2 className="text-sm font-bold tracking-wide text-[#0e224e] uppercase dark:text-sky-100">{panel.title} Competencies</h2>
        {panel.can_edit ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">You can rate</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground" title="Only the interviewers of this department can rate it">
            <Lock className="h-3 w-3" /> View only
          </span>
        )}
      </header>
      <div className="divide-y divide-border/60">
        {panel.rows.map((r) => {
          const v = shown(panel.dept, r)
          return (
            <div key={r.competency} className="grid grid-cols-1 items-center gap-2 px-4 py-2.5 sm:grid-cols-[1fr_auto_minmax(150px,1fr)]">
              <div className="text-sm">{r.name}</div>
              <Rating value={v.rating} disabled={!panel.can_edit} label={`Rating for ${r.name}`} onChange={(n) => setRow(panel.dept, r, { rating: n })} />
              <Input
                value={v.remarks}
                maxLength={75}
                disabled={!panel.can_edit}
                placeholder={panel.can_edit ? 'Remarks' : ''}
                aria-label={`Remarks for ${r.name}`}
                onChange={(e) => setRow(panel.dept, r, { remarks: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          )
        })}
      </div>
      <footer className="flex items-center justify-between bg-[#0e224e] px-4 py-2 text-sm font-bold text-white">
        <span>Total Score :</span>
        <span className="tabular-nums">{score == null ? '—' : `${score}/${panel.max}`}</span>
      </footer>
      {panel.interviewer && <p className="border-t border-border/60 px-4 py-1.5 text-[11px] text-muted-foreground">Interviewer: {panel.interviewer}</p>}
      {error && (
        <p role="alert" className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}

export default function CandidateEvaluationPage() {
  const { user } = useAuth()
  const { id: hdr } = useParams()
  const canView = can(user, MENU_KEY, 'view')
  const canSave = can(user, MENU_KEY, 'add') || can(user, MENU_KEY, 'edit')
  const canPrint = can(user, MENU_KEY, 'export')

  const [sheet, setSheet] = useState(null)
  const [loading, setLoading] = useState(Boolean(hdr))
  const [edits, setEdits] = useState({}) // "dept:competency" -> { rating?, remarks? }
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!hdr) return undefined
    let alive = true
    apiFetch(`${BASE}${hdr}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => {
        if (!alive) return
        setSheet(d)
        setEdits({})
        setErrors({})
        setNotFound(false)
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [hdr])

  const shown = (dept, row) => {
    const e = edits[key(dept, row.competency)] || {}
    return { rating: 'rating' in e ? e.rating : row.rating, remarks: 'remarks' in e ? e.remarks : row.remarks }
  }

  function setRow(dept, row, patch) {
    setEdits((prev) => {
      const k = key(dept, row.competency)
      const next = { ...(prev[k] || {}), ...patch }
      const same = (!('rating' in next) || next.rating === row.rating) && (!('remarks' in next) || next.remarks === row.remarks)
      const copy = { ...prev }
      if (same) delete copy[k]
      else copy[k] = next
      return copy
    })
    setErrors((e) => (e[dept] ? { ...e, [dept]: undefined } : e))
  }

  const hasChanges = Object.keys(edits).length > 0

  // what the totals would be with the typed values (the server's rule: a department counts once any of its rows is rated)
  const overall = useMemo(() => {
    if (!sheet) return { score: null, max: 0 }
    let score = 0
    let max = 0
    for (const p of sheet.panels) {
      const given = p.rows.map((r) => shown(p.dept, r).rating).filter((v) => v != null)
      if (given.length) {
        score += given.reduce((a, b) => a + b, 0)
        max += p.max
      }
    }
    return { score: max ? score : null, max }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, edits])

  async function save() {
    // only the departments the person can rate, and only those with something rated (the server says the same)
    const panels = sheet.panels
      .filter((p) => p.can_edit)
      .map((p) => ({
        dept: p.dept,
        rows: p.rows.map((r) => {
          const v = shown(p.dept, r)
          return { competency: r.competency, rating: v.rating, remarks: v.remarks }
        }),
      }))
      .filter((p) => p.rows.some((r) => r.rating != null))
    if (!panels.length) return toast.error('Rate at least one competency first.')
    setSaving(true)
    setErrors({})
    try {
      const res = await apiFetch(`${BASE}${hdr}/ratings/`, { method: 'POST', body: JSON.stringify({ panels }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const found = data.errors || {}
        setErrors(found)
        toast.error(found[''] || Object.values(found)[0] || "Couldn't save the ratings.")
        return
      }
      allowNextNavigation()
      setSheet(data)
      setEdits({})
      toast.success('Ratings saved')
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  async function print() {
    setPrinting(true)
    try {
      const res = await apiFetch(`${BASE}${hdr}/evaluation-form/`)
      if (!res.ok) return toast.error("Couldn't make the evaluation form.")
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `Interview Evaluation - ${sheet.candidate.full_name}.xlsx`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } finally {
      setPrinting(false)
    }
  }

  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, { onSave: canSave && !saving ? save : undefined })

  if (!canView) return <AccessDenied />
  const c = sheet?.candidate

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={LIST} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Candidate Competencies Details
          </Link>
          {c && <h1 className="text-lg font-bold text-foreground">{c.full_name}</h1>}
        </div>
        {sheet && (
          <div className="flex items-center gap-2">
            {canPrint && (
              <Button variant="outline" onClick={print} disabled={printing || hasChanges} title={hasChanges ? 'Save your ratings first: the form is made from the saved ratings' : 'Download the evaluation form (Excel)'}>
                <FileSpreadsheet className="h-4 w-4" /> {printing ? 'Preparing…' : 'Print (Excel)'}
              </Button>
            )}
            {canSave && sheet.can_rate && (
              <Button onClick={save} disabled={saving || !hasChanges}>
                {saving ? 'Saving…' : 'Save ratings'}
              </Button>
            )}
          </div>
        )}
      </div>

      {hdr && loading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          <RigLoading />
        </p>
      )}
      {hdr && !loading && notFound && <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">That candidate was not found.</p>}

      {sheet && !loading && (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-3 lg:grid-cols-4">
            <Fact label="Candidate" value={c.full_name} />
            <Fact label="Mobile No." value={c.mobile_no} />
            <Fact label="Position Applied for / Rank" value={c.rank_name} />
            <Fact label="Rig" value={c.rig_name} />
            <Fact label="Interview Date" value={c.interview_dt} />
            <Fact label="Qualification" value={c.edu_qualification} />
            <Fact label="Total Experience" value={years(c.tot_experience_yrs, c.tot_experience_mths)} />
            <Fact label="Experience in Current Position" value={years(c.exp_in_curr_pos_yrs, c.exp_in_curr_pos_mths)} />
            <Fact label="Email" value={c.email_id} />
          </div>

          {!sheet.can_rate && (
            <p className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              You are not set up as an interviewer for any department, so every panel is view only. Interviewers are set in Masters, Interviewer Mapping.
            </p>
          )}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {sheet.panels.map((p) => (
              <Panel key={p.dept} panel={p} shown={shown} setRow={setRow} error={errors[p.dept]} />
            ))}
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="bg-[#cfe3f6] px-4 py-2.5 dark:bg-[#1a3f7a]/40">
                <h2 className="text-sm font-bold tracking-wide text-[#0e224e] uppercase dark:text-sky-100">Overall Evaluation</h2>
              </header>
              <dl className="divide-y divide-border/60 text-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <dt>Overall Performance</dt>
                  <dd className="font-bold tabular-nums">{overall.score == null ? '—' : `${overall.score}/${overall.max}`}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt>Status</dt>
                  <dd>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[sheet.overall.status] || 'bg-muted text-muted-foreground'}`}>{sheet.overall.status || '—'}</span>
                  </dd>
                </div>
              </dl>
              {errors[''] && (
                <p role="alert" className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
                  {errors['']}
                </p>
              )}
              {!hasChanges && sheet.panels.some((p) => p.score != null) && (
                <p className="flex items-center gap-1.5 border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Saved ratings
                </p>
              )}
            </section>
          </div>
        </>
      )}
      {leaveDialog}
    </div>
  )
}
