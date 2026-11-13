import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { call } from '@/lib/onboardingApi'
import { localDateStr } from '@/lib/naiveDateTime'
import {
  AlertCircle, ArrowLeft, ArrowRight, Award, Briefcase, CalendarDays, Check, ClipboardCheck, Clock, FileText, GraduationCap, Lock, Mail, Pencil, Phone,
  Plus, Save, ShieldCheck, Trash2, Upload, User,
} from 'lucide-react'

// The public candidate form. One short screen at a time (Next / Back), saved on the server as the person types, so a lost connection, a closed tab or
// an expired session never costs them their answers. No sign-in: a link, then a code sent to the invited email address.
//
// This is a data request, not an offer or an onboarding: it collects an applicant's information for the HR team.
//
// Look: the Seros colour family on a light page, whatever the visitor's own theme (colours are written out here on purpose, not taken from the app's
// theme tokens): the rig photograph from the sign-in page under a navy veil, the full Seros logo, a raised white card, teal / ocean / blue accents.

const EMPTY = {
  fname: '', mname: '', lname: '', father: '', dob: '', nationality: '', mobile: '', present_addr: '', permanent_addr: '', same_addr: false,
  qualification: '', tot_y: '', tot_m: '', cur_y: '', cur_m: '', source: '', recommendation: '',
  trainings: [], experiences: [], no_training: false, no_experience: false, step: 0,
}

const STEPS = [
  { key: 'name', title: 'Your name', hint: 'As it is on your documents.', icon: User },
  { key: 'about', title: 'About you', hint: 'A couple of personal details.', icon: CalendarDays },
  { key: 'contact', title: 'How we can reach you', hint: 'So our team can get in touch.', icon: Phone },
  { key: 'work', title: 'Education and experience', hint: 'Where you are in your career.', icon: GraduationCap },
  { key: 'training', title: 'Training and certificates', hint: 'Safety, well control and other courses you hold.', icon: Award },
  { key: 'jobs', title: 'Your earlier jobs', hint: 'Most recent first or last, either is fine.', icon: Briefcase },
  { key: 'resume', title: 'Your resume', hint: 'A copy of your CV helps us a lot.', icon: FileText },
  { key: 'review', title: 'Check and send', hint: 'Look through your answers. You can change any of them.', icon: ClipboardCheck },
]
const FIELD_STEP = {
  fname: 0, lname: 0, father: 0, mname: 0, dob: 1, nationality: 1, mobile: 2, present_addr: 2, permanent_addr: 2, qualification: 3, tot_y: 3, tot_m: 3,
  cur_y: 3, cur_m: 3, source: 6, recommendation: 6,
}

const today = () => localDateStr()
function eighteenYearsAgo() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return localDateStr(d)
}
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

function validateStep(key, d) {
  const e = {}
  const need = (k, msg) => {
    if (!String(d[k] ?? '').trim()) e[k] = msg
  }
  if (key === 'name') {
    need('fname', 'Enter your first name.')
    need('lname', 'Enter your last name.')
    need('father', "Enter your father's name.")
  } else if (key === 'about') {
    need('dob', 'Enter your date of birth.')
    if (d.dob && d.dob > eighteenYearsAgo()) e.dob = 'You must be at least 18 years old.'
    need('nationality', 'Enter your nationality.')
  } else if (key === 'contact') {
    if (!/^\d{10}$/.test(String(d.mobile).trim())) e.mobile = 'Enter your 10-digit mobile number, digits only.'
    need('present_addr', 'Enter your present address.')
    need('permanent_addr', 'Enter your permanent address, or tick "same as present".')
  } else if (key === 'work') {
    need('qualification', 'Enter your qualification.')
    const y = num(d.tot_y)
    if (y === null || !(y >= 0 && y <= 70)) e.tot_y = 'Enter your total experience in years (0 if none).'
    if (num(d.tot_m) !== null && !(num(d.tot_m) >= 0 && num(d.tot_m) <= 11)) e.tot_m = 'Months are 0 to 11.'
    if (num(d.cur_m) !== null && !(num(d.cur_m) >= 0 && num(d.cur_m) <= 11)) e.cur_m = 'Months are 0 to 11.'
    const total = (num(d.tot_y) || 0) * 12 + (num(d.tot_m) || 0)
    const cur = (num(d.cur_y) || 0) * 12 + (num(d.cur_m) || 0)
    if (cur > total) e.cur_y = "Time in your current position can't be more than your total experience."
  } else if (key === 'training') {
    if (!d.trainings.length && !d.no_training) e.trainings = "Add a training, or tick \"I don't have any\"."
  } else if (key === 'jobs') {
    if (!d.experiences.length && !d.no_experience) e.experiences = "Add a job, or tick \"I haven't worked before\"."
  }
  return e
}

function validateTraining(r) {
  const e = {}
  if (!r.type.trim()) e.type = 'Required.'
  if (!r.agency.trim()) e.agency = 'Required.'
  if (!r.cert_no.trim()) e.cert_no = 'Required.'
  if (!r.cert_dt) e.cert_dt = 'Required.'
  else if (r.cert_dt > today()) e.cert_dt = "Can't be in the future."
  if (!r.valid_from) e.valid_from = 'Required.'
  if (!r.valid_to) e.valid_to = 'Required.'
  else if (r.valid_from && r.valid_to < r.valid_from) e.valid_to = "Can't be before the start."
  return e
}

function validateJob(r) {
  const e = {}
  if (!r.from) e.from = 'Required.'
  if (!r.to) e.to = 'Required.'
  else if (r.to > today()) e.to = "Can't be in the future."
  else if (r.from && r.to < r.from) e.to = "Can't be before the start."
  if (!r.company.trim()) e.company = 'Required.'
  if (!r.designation.trim()) e.designation = 'Required.'
  return e
}

// ── building blocks ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const FIELD =
  'w-full rounded-xl border border-[#c7d5ea] bg-white px-4 text-base text-[#0e224e] placeholder:text-[#98b0d7] shadow-[inset_0_1px_2px_rgba(14,34,78,0.05)] outline-none transition focus:border-[#2a93ad] focus:ring-4 focus:ring-[#2a93ad]/20 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400/20 disabled:bg-[#f3f6fc] disabled:text-[#626978] read-only:bg-[#f3f6fc] read-only:text-[#626978]'

const PRIMARY =
  'inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2a5ca3] to-[#1a3f7a] px-6 text-base font-semibold text-white shadow-[0_10px_24px_-8px_rgba(26,63,122,0.75),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-[#2a93ad]/40 focus-visible:outline-none active:translate-y-px disabled:opacity-60'
const SECONDARY =
  'inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-[#c7d5ea] bg-white px-5 text-base font-semibold text-[#1a3f7a] transition hover:bg-[#f3f6fc] focus-visible:ring-4 focus-visible:ring-[#2a93ad]/30 focus-visible:outline-none disabled:opacity-60'

function Q({ label, hint, error, children, optional }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#143167]">
        {label}
        {optional && <span className="ml-1.5 text-xs font-normal text-[#858c9a]">optional</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs text-[#626978]">{hint}</span>}
      {error && (
        <span role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </span>
      )}
    </label>
  )
}

function TextQ({ label, value, onChange, error, hint, optional, type = 'text', maxLen, ...rest }) {
  return (
    <Q label={label} error={error} hint={hint} optional={optional}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLen} className={`${FIELD} h-[52px]`} aria-invalid={Boolean(error)} {...rest} />
    </Q>
  )
}

function AreaQ({ label, value, onChange, error, hint, rows = 3, maxLen, readOnly }) {
  return (
    <Q label={label} error={error} hint={hint}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLen} rows={rows} readOnly={readOnly} className={`${FIELD} py-3`} aria-invalid={Boolean(error)} />
    </Q>
  )
}

function Tick({ checked, onChange, children, disabled }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-[#e4ebf6] bg-[#f3f6fc] px-4 py-3 text-sm text-[#143167] transition hover:border-[#c7d5ea] ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 cursor-pointer accent-[#00988a]" />
      {children}
    </label>
  )
}

// ── the code check (first visit, and again if the session ran out) ──────────────────────────────────────────────────────────────────────────

const CODE_MINUTES = 10

function VerifyPanel({ token, masked, onSession, compact }) {
  const [sent, setSent] = useState(false)
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [wait, setWait] = useState(0)
  const [left, setLeft] = useState(0) // seconds the code still works
  const boxes = useRef([])
  const digitsRef = useRef(Array(6).fill('')) // the latest digits, so fast typing never works from an older copy
  const putDigits = (list) => {
    digitsRef.current = list
    setDigits(list)
  }

  useEffect(() => {
    if (!sent) return undefined
    const t = setInterval(() => {
      setLeft((s) => Math.max(0, s - 1))
      setWait((w) => Math.max(0, w - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [sent])

  async function send() {
    setBusy(true)
    setMsg('')
    const r = await call('send-code', { token })
    setBusy(false)
    if (r.ok) {
      setSent(true)
      putDigits(Array(6).fill(''))
      setLeft(CODE_MINUTES * 60)
      setWait(30)
      setTimeout(() => boxes.current[0]?.focus(), 50)
    } else setMsg(r.data.message || r.data.error || "Couldn't send the code.")
  }

  async function verify(list) {
    const code = list.join('')
    if (code.length < 6) return setMsg('Enter all 6 digits.')
    setBusy(true)
    setMsg('')
    const r = await call('verify', { token, code })
    setBusy(false)
    if (r.ok) return onSession(r.data.session)
    setMsg(r.data.message || "That didn't work. Try again.")
    // A wrong code stays valid (until it runs out or the tries are used), so the digits stay: the person fixes the one they got wrong.
    if (r.data.error === 'wrong') setTimeout(() => boxes.current[5]?.focus(), 50)
  }

  function type(i, raw) {
    const ch = raw.replace(/\D/g, '').slice(-1)
    const next = digitsRef.current.slice()
    next[i] = ch
    putDigits(next)
    setMsg('')
    if (ch && i < 5) boxes.current[i + 1]?.focus()
    if (ch && next.every(Boolean)) verify(next)
  }

  function key(i, e) {
    if (e.key === 'Backspace' && !digitsRef.current[i] && i > 0) {
      const next = digitsRef.current.slice()
      next[i - 1] = ''
      putDigits(next)
      boxes.current[i - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < 5) boxes.current[i + 1]?.focus()
  }

  function paste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = Array(6).fill('')
    text.split('').forEach((c, i) => (next[i] = c))
    putDigits(next)
    boxes.current[Math.min(text.length, 5)]?.focus()
    if (text.length === 6) verify(next)
  }

  const mm = String(Math.floor(left / 60))
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {!compact && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00988a] to-[#1a3f7a] text-white shadow-[0_12px_28px_-10px_rgba(0,152,138,0.7)]">
          <ShieldCheck className="h-8 w-8" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#091535]">{compact ? "Confirm it's you again" : "Let's make sure it's you"}</h1>
        <p className="mt-2 text-sm text-[#626978]">{sent ? 'We emailed a 6-digit code to' : 'For your security we will email you a 6-digit code at'}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#c7d5ea] bg-[#f3f6fc] px-4 py-1.5 text-sm font-semibold text-[#143167]">
          <Mail className="h-4 w-4 text-[#2a93ad]" /> {masked}
        </p>
      </div>

      {!sent ? (
        <button type="button" className={`${PRIMARY} w-full`} onClick={send} disabled={busy}>
          {busy ? 'Sending…' : 'Send me the code'}
        </button>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={paste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (boxes.current[i] = el)}
                value={d}
                onChange={(e) => type(i, e.target.value)}
                onKeyDown={(e) => key(i, e)}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`}
                disabled={busy}
                aria-invalid={Boolean(msg)}
                className={`h-[60px] w-11 rounded-xl border-2 text-center text-2xl font-bold text-[#091535] outline-none transition sm:h-16 sm:w-[52px] ${
                  msg ? 'border-red-300 bg-red-50' : d ? 'border-[#1a3f7a] bg-[#f3f6fc]' : 'border-[#c7d5ea] bg-white'
                } focus:border-[#2a93ad] focus:ring-4 focus:ring-[#2a93ad]/20`}
              />
            ))}
          </div>
          <p className="text-xs text-[#626978]">{left > 0 ? `The same code works for ${mm}:${ss} more. A wrong digit can be corrected.` : 'This code has expired. Ask for a new one.'}</p>
          <button type="button" className={`${PRIMARY} w-full`} disabled={busy || digits.some((d) => !d)} onClick={() => verify(digits)}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
          <button type="button" onClick={send} disabled={busy || wait > 0} className="text-sm font-medium text-[#1a3f7a] underline underline-offset-4 disabled:no-underline disabled:opacity-50">
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
          <p className="text-xs text-[#858c9a]">Not in your inbox? Look in your spam folder.</p>
        </div>
      )}
      {msg && (
        <p role="alert" className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {msg}
        </p>
      )}
    </div>
  )
}

// ── lists: trainings and jobs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

function RowEditor({ fields, initial, validate, onSave, onCancel }) {
  const [row, setRow] = useState(initial)
  const [errors, setErrors] = useState({})
  function save() {
    const e = validate(row)
    setErrors(e)
    if (!Object.keys(e).length) onSave(row)
  }
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#c7d5ea] bg-[#f3f6fc] p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2">
      {fields.map((f) => (
        <TextQ
          key={f.key}
          label={f.label}
          type={f.type || 'text'}
          value={row[f.key]}
          maxLen={f.max}
          max={f.type === 'date' && f.noFuture ? today() : undefined}
          error={errors[f.key]}
          onChange={(v) => setRow((r) => ({ ...r, [f.key]: v }))}
        />
      ))}
      </div>
      <div className="flex gap-3">
        <button type="button" className={`${PRIMARY} flex-1`} onClick={save}>
          Save
        </button>
        <button type="button" className={SECONDARY} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

const TRAINING_FIELDS = [
  { key: 'type', label: 'What is the training or certificate?', max: 50 },
  { key: 'agency', label: 'Who gave it (institute)?', max: 75 },
  { key: 'cert_no', label: 'Certificate number', max: 25 },
  { key: 'cert_dt', label: 'Certificate date', type: 'date', noFuture: true },
  { key: 'valid_from', label: 'Valid from', type: 'date' },
  { key: 'valid_to', label: 'Valid until', type: 'date' },
]
const JOB_FIELDS = [
  { key: 'company', label: 'Company', max: 100 },
  { key: 'designation', label: 'Your post', max: 25 },
  { key: 'from', label: 'From', type: 'date', noFuture: true },
  { key: 'to', label: 'To', type: 'date', noFuture: true },
]
const EMPTY_TRAINING = { type: '', agency: '', cert_no: '', cert_dt: '', valid_from: '', valid_to: '' }
const EMPTY_JOB = { company: '', designation: '', from: '', to: '' }

function RowList({ rows, setRows, fields, empty, validate, summary, error, addLabel, noneLabel, none, setNone }) {
  const [editing, setEditing] = useState(null) // null | 'new' | index
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) =>
        editing === i ? (
          <RowEditor
            key={i}
            fields={fields}
            initial={r}
            validate={validate}
            onCancel={() => setEditing(null)}
            onSave={(v) => {
              setRows(rows.map((x, j) => (j === i ? v : x)))
              setEditing(null)
            }}
          />
        ) : (
          <div key={i} className="flex items-start justify-between gap-3 rounded-2xl border border-[#e4ebf6] bg-white p-4 shadow-[0_1px_2px_rgba(14,34,78,0.06)]">
            <div className="min-w-0 text-sm text-[#0e224e]">{summary(r)}</div>
            <div className="flex shrink-0 gap-1">
              <button type="button" aria-label="Edit" onClick={() => setEditing(i)} className="rounded-lg p-2 text-[#626978] hover:bg-[#f3f6fc]">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      )}
      {editing === 'new' ? (
        <RowEditor
          fields={fields}
          initial={empty}
          validate={validate}
          onCancel={() => setEditing(null)}
          onSave={(v) => {
            setRows([...rows, v])
            setEditing(null)
          }}
        />
      ) : (
        editing === null &&
        !none && (
          <button type="button" className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#98b0d7] text-base font-semibold text-[#1a3f7a] transition hover:border-[#2a93ad] hover:bg-[#f3f6fc]" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        )
      )}
      {!rows.length && editing === null && <Tick checked={none} onChange={setNone}>{noneLabel}</Tick>}
      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  )
}

// ── the form ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function dmy(s) {
  return s ? s.split('-').reverse().join('/') : ''
}

function Overlay({ children, label }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091535]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={label}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_30px_80px_-20px_rgba(9,21,53,0.8)] sm:p-8">{children}</div>
    </div>
  )
}

function Form({ token, info, session0, onDone, preview }) {
  const [draft, setDraft] = useState(EMPTY)
  const [loaded, setLoaded] = useState(Boolean(preview))
  const [email, setEmail] = useState(preview ? 'the address this request was sent to' : '')
  const [resumeName, setResumeName] = useState('')
  const [errors, setErrors] = useState({})
  const [saveState, setSaveState] = useState('saved')
  const [needVerify, setNeedVerify] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [rev, setRev] = useState(0) // goes up with every change; the saved copy remembers which one it has
  const sessionRef = useRef(session0)
  const versionRef = useRef(0)
  const draftRef = useRef(EMPTY)
  const revRef = useRef(0)
  const savedRevRef = useRef(0)
  const savingRef = useRef(false)
  const saveRef = useRef(null)
  const fileRef = useRef(null)
  const step = draft.step

  useEffect(() => {
    draftRef.current = draft
    revRef.current = rev
  }, [draft, rev])

  useEffect(() => {
    if (preview) return undefined // a preview has nothing to load
    let alive = true
    call('load', { token, session: sessionRef.current }).then((r) => {
      if (!alive || !r.ok) return
      sessionRef.current = r.data.session
      versionRef.current = r.data.version
      setDraft({ ...EMPTY, ...r.data.draft })
      setEmail(r.data.email)
      setResumeName(r.data.has_resume ? r.data.resume_name : '')
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [token, preview])

  // Saves what the person has typed. `patch` (a step change, for example) is added first. Safe to call often: one save at a time, and a change
  // made while one is going out is sent straight after it.
  const saveNow = useCallback(
    async (patch) => {
      if (preview) return
      if (patch) draftRef.current = { ...draftRef.current, ...patch }
      if (savingRef.current) return
      const startRev = revRef.current
      if (!patch && startRev === savedRevRef.current) return
      savingRef.current = true
      setSaveState('saving')
      const r = await call('save', { token, session: sessionRef.current, version: versionRef.current, draft: draftRef.current })
      savingRef.current = false
      if (r.ok) {
        sessionRef.current = r.data.session
        versionRef.current = r.data.version
        savedRevRef.current = startRev
        if (revRef.current !== startRev) setTimeout(() => saveRef.current?.(), 500)
        else setSaveState('saved')
      } else if (r.status === 401) {
        setNeedVerify(true) // the answers stay on screen; they are saved right after the code is checked again
      } else if (r.status === 409) {
        setConflict(true)
      } else {
        setSaveState('error')
        setTimeout(() => saveRef.current?.(), 8000)
      }
    },
    [token, preview]
  )

  useEffect(() => {
    saveRef.current = saveNow
  }, [saveNow])

  // Saved a moment after the person stops typing.
  useEffect(() => {
    if (!loaded || rev === 0) return undefined
    const t = setTimeout(() => saveRef.current?.(), 2500)
    return () => clearTimeout(t)
  }, [rev, loaded])

  const update = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...patch }))
    setRev((r) => r + 1)
    setSaveState('saving')
  }, [])

  const set = (k) => (v) => {
    update({ [k]: v })
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  function goTo(i) {
    update({ step: i })
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
    saveNow({ step: i })
  }

  function next() {
    const key = STEPS[step].key
    const e = preview ? {} : validateStep(key, draftRef.current) // a preview checks nothing
    setErrors(e)
    if (Object.keys(e).length) return
    goTo(step + 1)
  }

  async function onFile(file) {
    if (!file) return
    if (preview) return setResumeName(file.name) // nothing is uploaded in a preview
    setUploading(true)
    setErrors((e) => ({ ...e, resume: undefined }))
    const r = await call('resume', { token, session: sessionRef.current }, file)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (r.ok) {
      sessionRef.current = r.data.session
      setResumeName(r.data.resume_name)
    } else if (r.status === 401) setNeedVerify(true)
    else setErrors((e) => ({ ...e, resume: r.data.message || "Couldn't upload that file." }))
  }

  async function submit() {
    if (preview) return onDone('preview')
    // every step must pass before the server is asked
    for (let i = 0; i < STEPS.length - 1; i++) {
      const e = validateStep(STEPS[i].key, draftRef.current)
      if (Object.keys(e).length) {
        setErrors(e)
        return goTo(i)
      }
    }
    setSubmitting(true)
    setSubmitError('')
    await saveNow({})
    const r = await call('submit', { token, session: sessionRef.current, draft: draftRef.current })
    setSubmitting(false)
    if (r.ok) return onDone('', r.data)
    if (r.status === 401) return setNeedVerify(true)
    if (r.status === 404) return onDone('invalid')
    const fields = r.data.fields || {}
    const keys = Object.keys(fields)
    if (keys.length) {
      setErrors(fields)
      return goTo(Math.min(...keys.map((k) => FIELD_STEP[k] ?? 0)))
    }
    if (r.data.trainings) {
      setErrors({ trainings: 'Check the dates and details of your trainings.' })
      return goTo(4)
    }
    if (r.data.experiences) {
      setErrors({ experiences: 'Check the dates and details of your jobs.' })
      return goTo(5)
    }
    setSubmitError(r.data.message || "Couldn't send your answers. Please try again.")
  }

  if (!loaded) return <p className="py-14 text-center text-sm text-[#626978]">Loading your form…</p>

  const d = draft
  const last = step === STEPS.length - 1
  const cur = STEPS[step]
  const StepIcon = cur.icon

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold tracking-[0.14em] text-[#17566a] uppercase">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span aria-live="polite" className="flex items-center gap-1.5 font-semibold tracking-normal normal-case">
            <span className={`h-2 w-2 rounded-full ${preview ? 'bg-amber-400' : saveState === 'saved' ? 'bg-[#00988a]' : saveState === 'saving' ? 'bg-[#2a93ad]' : 'bg-red-500'}`} />
            <span className="text-[#626978]">{preview ? 'Preview: nothing is saved' : saveState === 'saved' ? 'All changes saved' : saveState === 'saving' ? 'Saving…' : "Couldn't save, trying again…"}</span>
          </span>
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="Form progress">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-gradient-to-r from-[#00988a] to-[#2b7cb8]' : i === step ? 'bg-[#1a3f7a]' : 'bg-[#e4ebf6]'}`} />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ebfaf9] text-[#008077] ring-1 ring-[#a2e2dc]">
          <StepIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-[#091535]">{step === 0 && !preview ? `Hello ${info.name.split(' ')[0]}` : cur.title}</h1>
          <p className="mt-1 text-sm text-[#626978]">{step === 0 && !preview ? 'Let us start with your name, as it is on your documents.' : cur.hint}</p>
        </div>
      </div>

      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (last) submit()
          else next()
        }}
      >
        {cur.key === 'name' && (
          <div className="grid gap-5 md:grid-cols-2">
            <TextQ label="First name" value={d.fname} onChange={set('fname')} error={errors.fname} maxLen={20} autoComplete="given-name" />
            <TextQ label="Middle name" value={d.mname} onChange={set('mname')} maxLen={20} optional autoComplete="additional-name" />
            <TextQ label="Last name" value={d.lname} onChange={set('lname')} error={errors.lname} maxLen={20} autoComplete="family-name" />
            <TextQ label="Father's name" value={d.father} onChange={set('father')} error={errors.father} maxLen={40} />
          </div>
        )}
        {cur.key === 'about' && (
          <div className="grid gap-5 md:grid-cols-2">
            <TextQ label="Date of birth" type="date" value={d.dob} onChange={set('dob')} error={errors.dob} max={eighteenYearsAgo()} />
            <TextQ label="Nationality" value={d.nationality} onChange={set('nationality')} error={errors.nationality} maxLen={25} placeholder="Indian" />
          </div>
        )}
        {cur.key === 'contact' && (
          <div className="grid gap-5 md:grid-cols-2">
            <TextQ label="Mobile number" value={d.mobile} onChange={(v) => set('mobile')(v.replace(/\D/g, '').slice(0, 10))} error={errors.mobile} inputMode="numeric" autoComplete="tel-national" hint="10 digits." />
            <Q label="Email" hint="This is the address this request was sent to.">
              <input value={email} readOnly disabled className={`${FIELD} h-[52px]`} />
            </Q>
            <AreaQ
              label="Present address"
              value={d.present_addr}
              error={errors.present_addr}
              maxLen={100}
              onChange={(v) => {
                update(d.same_addr ? { present_addr: v, permanent_addr: v } : { present_addr: v })
                setErrors((er) => ({ ...er, present_addr: undefined, ...(d.same_addr ? { permanent_addr: undefined } : {}) }))
              }}
            />
            <AreaQ
              label="Permanent address"
              value={d.permanent_addr}
              readOnly={d.same_addr}
              error={errors.permanent_addr}
              maxLen={100}
              hint={d.same_addr ? 'Copied from the present address. Untick the box below to change it.' : undefined}
              onChange={set('permanent_addr')}
            />
            <div className="md:col-span-2">
              <Tick checked={d.same_addr} onChange={(on) => update(on ? { same_addr: true, permanent_addr: d.present_addr } : { same_addr: false })}>
                Permanent address is the same as present address
              </Tick>
            </div>
          </div>
        )}
        {cur.key === 'work' && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <AreaQ label="Qualification" value={d.qualification} onChange={set('qualification')} error={errors.qualification} maxLen={200} rows={2} hint="For example: Diploma in Mechanical Engineering." />
            </div>
            <fieldset className="flex flex-col gap-3 rounded-2xl border border-[#e4ebf6] p-4">
              <legend className="px-2 text-[13px] font-bold text-[#143167]">Total experience</legend>
              <div className="grid grid-cols-2 gap-3">
                <TextQ label="Years" type="number" inputMode="numeric" min={0} value={d.tot_y} onChange={set('tot_y')} error={errors.tot_y} />
                <TextQ label="Months" type="number" inputMode="numeric" min={0} max={11} value={d.tot_m} onChange={set('tot_m')} error={errors.tot_m} optional />
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-3 rounded-2xl border border-[#e4ebf6] p-4">
              <legend className="px-2 text-[13px] font-bold text-[#143167]">Time in your current position</legend>
              <div className="grid grid-cols-2 gap-3">
                <TextQ label="Years" type="number" inputMode="numeric" min={0} value={d.cur_y} onChange={set('cur_y')} error={errors.cur_y} optional />
                <TextQ label="Months" type="number" inputMode="numeric" min={0} max={11} value={d.cur_m} onChange={set('cur_m')} error={errors.cur_m} optional />
              </div>
            </fieldset>
          </div>
        )}
        {cur.key === 'training' && (
          <RowList
            rows={d.trainings}
            setRows={(rows) => {
              update({ trainings: rows })
              setErrors({})
            }}
            fields={TRAINING_FIELDS}
            empty={EMPTY_TRAINING}
            validate={preview ? () => ({}) : validateTraining}
            error={errors.trainings}
            addLabel="Add a training or certificate"
            noneLabel="I don't have any"
            none={d.no_training}
            setNone={(v) => {
              update({ no_training: v })
              setErrors({})
            }}
            summary={(r) => (
              <>
                <div className="font-semibold text-[#091535]">{r.type}</div>
                <div className="text-[#626978]">
                  {r.agency} · No. {r.cert_no}
                </div>
                <div className="mt-0.5 text-xs text-[#858c9a]">
                  Valid {dmy(r.valid_from)} to {dmy(r.valid_to)}
                </div>
              </>
            )}
          />
        )}
        {cur.key === 'jobs' && (
          <RowList
            rows={d.experiences}
            setRows={(rows) => {
              update({ experiences: rows })
              setErrors({})
            }}
            fields={JOB_FIELDS}
            empty={EMPTY_JOB}
            validate={preview ? () => ({}) : validateJob}
            error={errors.experiences}
            addLabel="Add a job"
            noneLabel="I haven't worked before"
            none={d.no_experience}
            setNone={(v) => {
              update({ no_experience: v })
              setErrors({})
            }}
            summary={(r) => (
              <>
                <div className="font-semibold text-[#091535]">{r.company}</div>
                <div className="text-[#626978]">{r.designation}</div>
                <div className="mt-0.5 text-xs text-[#858c9a]">
                  {dmy(r.from)} to {dmy(r.to)}
                </div>
              </>
            )}
          />
        )}
        {cur.key === 'resume' && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
            <div className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center ${resumeName ? 'border-[#64cec5] bg-[#ebfaf9]' : 'border-[#98b0d7] bg-[#f3f6fc]'}`}>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${resumeName ? 'bg-[#00988a] text-white' : 'bg-white text-[#1a3f7a] shadow-sm'}`}>
                {resumeName ? <Check className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
              </div>
              <p className="text-sm font-semibold text-[#143167]">{resumeName ? 'Your resume is uploaded' : 'Upload your resume'}</p>
              <p className="text-xs text-[#626978]">PDF, DOC or DOCX, up to 10 MB. You can skip this.</p>
              <button type="button" className={`${SECONDARY} h-11`} disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? 'Uploading…' : resumeName ? 'Choose another file' : 'Choose a file'}
              </button>
              {errors.resume && (
                <p role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.resume}
                </p>
              )}
            </div>
            </div>
            <TextQ label="How did you hear about this job?" value={d.source} onChange={set('source')} maxLen={50} optional />
            <TextQ label="Did anyone recommend you?" value={d.recommendation} onChange={set('recommendation')} maxLen={75} optional hint="Name and where they work." />
          </div>
        )}
        {cur.key === 'review' && (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              [0, 'Name', `${d.fname} ${d.mname} ${d.lname}`.replace(/\s+/g, ' ').trim() + ` · Father: ${d.father}`],
              [1, 'About you', `Born ${dmy(d.dob)} · ${d.nationality}`],
              [2, 'Contact', `${d.mobile} · ${email}`],
              [3, 'Education', `${d.qualification} · ${d.tot_y || 0} y ${d.tot_m || 0} m experience`],
              [4, 'Training', d.trainings.length ? `${d.trainings.length} added` : 'None'],
              [5, 'Earlier jobs', d.experiences.length ? `${d.experiences.length} added` : 'None'],
              [6, 'Resume', resumeName ? 'Uploaded' : 'Not added'],
            ].map(([i, label, text]) => (
              <div key={label} className="flex items-start justify-between gap-3 rounded-2xl border border-[#e4ebf6] bg-[#f3f6fc] px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold tracking-[0.12em] text-[#17566a] uppercase">{label}</div>
                  <div className="mt-0.5 break-words text-[#0e224e]">{text}</div>
                </div>
                <button type="button" onClick={() => goTo(i)} className="shrink-0 text-sm font-semibold text-[#1a3f7a] underline underline-offset-4">
                  Change
                </button>
              </div>
            ))}
            {submitError && (
              <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 md:col-span-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
              </p>
            )}
          </div>
        )}

        <div className="mt-2 flex gap-3">
          {step > 0 && (
            <button type="button" className={SECONDARY} onClick={() => goTo(step - 1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          {last ? (
            <button type="submit" className={`${PRIMARY} flex-1`} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send my details'}
            </button>
          ) : (
            <button type="submit" className={`${PRIMARY} flex-1`}>
              Next <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {step > 0 && !last && <p className="-mt-2 text-center text-xs text-[#858c9a] lg:hidden">Your answers are saved as you go. You can close this page and come back with the same link.</p>}

      {needVerify && (
        <Overlay label="Confirm it's you again">
          <p className="mb-4 text-center text-xs text-[#626978]">It has been a while. Your answers are still here and will be saved after this.</p>
          <VerifyPanel
            token={token}
            masked={info.email_masked}
            compact
            onSession={(s) => {
              sessionRef.current = s
              setNeedVerify(false)
              saveRef.current?.({})
            }}
          />
        </Overlay>
      )}
      {conflict && (
        <Overlay label="Changed in another window">
          <h2 className="mb-2 text-lg font-extrabold text-[#091535]">Changed in another window</h2>
          <p className="mb-5 text-sm text-[#626978]">This form was changed in another tab or phone. Reload to see the latest answers.</p>
          <button type="button" className={`${PRIMARY} w-full`} onClick={() => window.location.reload()}>
            Reload
          </button>
        </Overlay>
      )}
    </div>
  )
}

// ── the page ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// On a phone: a short banner above the card.
function MobileHero({ small }) {
  return (
    <header className={`relative isolate overflow-hidden bg-[#091535] lg:hidden ${small ? 'pt-8 pb-28' : 'pt-10 pb-32 sm:pt-14 sm:pb-36'}`}>
      <img src="/branding/login-bg.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[58%_40%]" />
      <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg, rgba(9,21,53,0.62) 0%, rgba(9,21,53,0.80) 55%, rgba(9,21,53,0.96) 100%)' }} />
      <div className="mx-auto flex max-w-xl flex-col items-center px-5 text-center">
        <div className="rounded-2xl bg-white px-6 py-3 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.6)]">
          <img src="/branding/seros-logo.png" alt="Seros" className="h-10 w-auto sm:h-12" style={{ clipPath: 'inset(0 1.2% 0 0)' }} />
        </div>
        <p className="mt-7 text-[11px] font-bold tracking-[0.3em] text-[#8fd3e4] uppercase">Seros HR</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Rig Personnel Data Request</h2>
        <p className="mt-2 max-w-sm text-sm text-white/75 sm:text-base">Please share a few details so our HR team can record them for your application.</p>
      </div>
    </header>
  )
}

// On a laptop or desktop: the brand takes the left third, full height and fixed, so the form has the rest of the screen to itself.
function BrandPanel() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-[#091535] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
      <img src="/branding/login-bg.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_50%]" />
      <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg, rgba(9,21,53,0.55) 0%, rgba(9,21,53,0.72) 45%, rgba(9,21,53,0.95) 100%)' }} />
      <div className="self-start rounded-2xl bg-white px-6 py-3 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.6)]">
        <img src="/branding/seros-logo.png" alt="Seros" className="h-11 w-auto xl:h-12" style={{ clipPath: 'inset(0 1.2% 0 0)' }} />
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-[0.3em] text-[#8fd3e4] uppercase">Seros HR</p>
        <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-white xl:text-4xl">Rig Personnel Data Request</h2>
        <p className="mt-3 max-w-sm text-base text-white/75">Please share a few details so our HR team can record them for your application.</p>
        <ul className="mt-9 flex max-w-sm flex-col gap-4">
          {[
            [Clock, 'About 10 minutes', 'A few short steps, one at a time.'],
            [Save, 'Saved as you go', 'Stop whenever you like and come back with the same link.'],
            [Lock, 'Private', 'Only our HR team can see what you enter.'],
          ].map(([Icon, t, sub]) => (
            <li key={t} className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#8fd3e4] ring-1 ring-white/15 backdrop-blur">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{t}</span>
                <span className="block text-xs text-white/65">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] tracking-wide text-white/45">© Seros · All rights reserved</p>
    </aside>
  )
}

function Card({ children }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_30px_70px_-20px_rgba(9,21,53,0.55)] ring-1 ring-[#c7d5ea]/60 sm:p-9 lg:p-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00988a] via-[#2a93ad] to-[#1a3f7a]" />
      {children}
    </div>
  )
}

export default function JoinPage({ preview = false }) {
  const { token } = useParams()
  const [phase, setPhase] = useState(preview ? 'form' : 'loading') // loading | invalid | locked | verify | form | done
  const [restart, setRestart] = useState(0)
  const [info, setInfo] = useState(preview ? { name: 'Candidate', email_masked: '' } : null)
  const [session, setSession] = useState('')
  const [confirmed, setConfirmed] = useState(false) // the confirmation mail went out

  useEffect(() => {
    document.title = 'Rig personnel data request · Seros'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    if (preview) return () => meta.remove()
    let alive = true
    call('start', { token }).then((r) => {
      if (!alive) return
      if (!r.ok) return setPhase(r.status === 404 ? 'invalid' : 'error')
      setInfo(r.data)
      setPhase(r.data.locked ? 'locked' : 'verify')
    })
    return () => {
      alive = false
      meta.remove()
    }
  }, [token, preview])

  const first = info?.name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen bg-[#e9eef7] font-sans text-[#0e224e] lg:grid lg:grid-cols-[minmax(380px,34%)_1fr]" style={{ colorScheme: 'light' }}>
      <BrandPanel />
      <div className="flex min-h-screen flex-col">
      {preview && <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">Preview for HR. Nothing is checked, saved or sent.</div>}
      <MobileHero small={phase === 'form'} />
      <main className={`relative z-10 mx-auto -mt-20 w-full max-w-xl px-4 pb-10 sm:-mt-24 lg:my-auto lg:mt-0 lg:px-10 lg:py-8 ${phase === 'form' ? 'lg:max-w-4xl' : 'lg:max-w-lg'}`}>
        <Card>
          {phase === 'loading' && <p className="py-14 text-center text-sm text-[#626978]">Opening your form…</p>}
          {phase === 'error' && <p className="py-8 text-center text-sm text-red-600">Couldn't reach the server. Check your connection and reload this page.</p>}
          {phase === 'invalid' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f6fc] text-[#1a3f7a]">
                <Lock className="h-7 w-7" />
              </div>
              <h1 className="mb-2 text-xl font-extrabold text-[#091535]">This link isn't valid any more</h1>
              <p className="text-sm text-[#626978]">It may have been used already, or it has expired. Please ask HR to send you a new one.</p>
            </div>
          )}
          {phase === 'locked' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Lock className="h-7 w-7" />
              </div>
              <h1 className="mb-2 text-xl font-extrabold text-[#091535]">Too many wrong codes</h1>
              <p className="text-sm text-[#626978]">For your safety this link is paused. Please ask HR to send you a new link.</p>
            </div>
          )}
          {phase === 'verify' && (
            <VerifyPanel
              token={token}
              masked={info.email_masked}
              onSession={(s) => {
                setSession(s)
                setPhase('form')
              }}
            />
          )}
          {phase === 'form' && <Form key={restart} token={token} info={info} session0={session} preview={preview} onDone={(kind, data) => {
            setConfirmed(Boolean(data?.confirmation_sent))
            setPhase(kind === 'invalid' ? 'invalid' : 'done')
          }} />}
          {phase === 'done' && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#00988a] to-[#2b7cb8] text-white shadow-[0_16px_36px_-12px_rgba(0,152,138,0.8)]">
                <Check className="h-10 w-10" />
              </div>
              <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-[#091535]">{preview ? 'End of the preview' : `Thank you${first ? `, ${first}` : ''}`}</h1>
              <p className="mx-auto max-w-sm text-sm text-[#626978]">{preview ? 'In the real form the details would now go to HR. Nothing was saved or sent.' : 'Your details are with our HR team. You can close this page now.'}</p>
              {!preview && confirmed && (
                <p className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-xl bg-[#ebfaf9] px-4 py-2.5 text-xs font-medium text-[#006661] ring-1 ring-[#a2e2dc]">
                  <Mail className="h-4 w-4 shrink-0" /> A confirmation was emailed to {info?.email_masked}
                </p>
              )}
              {!preview && (
                <ol className="mx-auto mt-7 flex max-w-sm flex-col gap-4 text-left">
                  {[
                    ['Our HR team records your details', 'We go through your answers and your resume.'],
                    ['We contact you if needed', 'We use the mobile number or email you gave if we need anything more.'],
                    ['Next steps', 'If your application goes ahead, we will be in touch.'],
                  ].map(([t, s], i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ebfaf9] text-sm font-bold text-[#008077] ring-1 ring-[#a2e2dc]">{i + 1}</span>
                      <span>
                        <span className="block text-sm font-semibold text-[#091535]">{t}</span>
                        <span className="block text-xs text-[#626978]">{s}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {preview && (
                <button
                  type="button"
                  className={`${PRIMARY} mt-6`}
                  onClick={() => {
                    setRestart((n) => n + 1)
                    setPhase('form')
                  }}
                >
                  Start the preview again
                </button>
              )}
            </div>
          )}
        </Card>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-[#626978] lg:hidden">
          <Lock className="h-3.5 w-3.5 text-[#00988a]" /> Secure and confidential. Only our HR team can see what you enter.
        </p>
        <p className="mt-2 text-center text-[11px] tracking-wide text-[#858c9a] lg:hidden">© Seros · All rights reserved</p>
      </main>
      </div>
    </div>
  )
}
