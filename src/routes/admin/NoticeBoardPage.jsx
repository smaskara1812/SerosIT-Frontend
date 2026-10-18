import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, asList } from '@/lib/api'
import { can } from '@/lib/permissions'
import { buildFieldErrors } from '@/lib/errors'
import { joinNaiveDt, localDateStr, splitNaiveDt } from '@/lib/naiveDateTime'
import { NOTICE_KINDS, kindOf, shortNaive } from '@/lib/notices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import NoticeCard from '@/components/home/NoticeCard'

const MENU_KEY = 'admin.notice_board'
const TABS = [
  ['', 'All'],
  ['live', 'Live'],
  ['scheduled', 'Scheduled'],
  ['expired', 'Expired'],
  ['draft', 'Drafts'],
]
const STATUS_STYLE = {
  live: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  scheduled: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  expired: 'bg-muted text-muted-foreground',
  draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
}
const STATUS_LABEL = { live: 'Live', scheduled: 'Scheduled', expired: 'Expired', draft: 'Draft' }
const DURATIONS = [['1 day', 1], ['3 days', 3], ['1 week', 7], ['2 weeks', 14], ['1 month', 30]]
const MAX_TITLE = 80
const MAX_MESSAGE = 300

const pad = (n) => String(n).padStart(2, '0')
const nowTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return localDateStr(new Date(y, m - 1, d + n))
}
const nowNaive = () => `${localDateStr()}T${nowTime()}:00`

function blankForm() {
  const today = localDateStr()
  const time = nowTime()
  return {
    title: '', message: '', kind: 'I', link_label: '', link_url: '', is_pinned: false, is_published: true,
    starts_date: today, starts_time: time, ends_date: addDays(today, 7), ends_time: time,
  }
}

function formFrom(n, { copy = false } = {}) {
  if (copy) return { ...blankForm(), title: n.title, message: n.message, kind: n.kind, link_label: n.link_label || '', link_url: n.link_url || '', is_pinned: n.is_pinned === 'Y' }
  const s = splitNaiveDt(n.starts_at)
  const e = splitNaiveDt(n.ends_at)
  return {
    title: n.title, message: n.message, kind: n.kind, link_label: n.link_label || '', link_url: n.link_url || '',
    is_pinned: n.is_pinned === 'Y', is_published: n.is_published === 'Y',
    starts_date: s.date, starts_time: s.time, ends_date: e.date, ends_time: e.time,
  }
}

function payloadFrom(f) {
  return {
    title: f.title.trim(), message: f.message.trim(), kind: f.kind,
    link_url: f.link_url.trim(), link_label: f.link_label.trim(),
    is_pinned: f.is_pinned ? 'Y' : 'N', is_published: f.is_published ? 'Y' : 'N',
    starts_at: joinNaiveDt(f.starts_date, f.starts_time), ends_at: joinNaiveDt(f.ends_date, f.ends_time),
  }
}

function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function NoticeForm({ open, onOpenChange, editing, initial, onSaved }) {
  // Remounted for every open (see `key` where it is used), so the form simply starts from `initial`.
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const startsNaive = joinNaiveDt(form.starts_date, form.starts_time)
  const endsNaive = joinNaiveDt(form.ends_date, form.ends_time)
  const preview = useMemo(
    () => ({
      notice_id: 0, title: form.title || 'Your title appears here', message: form.message || 'And the message goes here, in a few short lines.',
      kind: form.kind, is_pinned: form.is_pinned, link_url: form.link_url.trim() || null, link_label: form.link_label.trim() || 'Open',
    }),
    [form],
  )

  async function save() {
    const next = {}
    if (!form.title.trim()) next.title = 'Enter a title.'
    if (!form.message.trim()) next.message = 'Enter the message.'
    if (!form.starts_date) next.starts_at = 'Choose when it starts.'
    if (!form.ends_date) next.ends_at = 'Choose when it ends.'
    else if (startsNaive && endsNaive && endsNaive <= startsNaive) next.ends_at = 'The end must be after the start.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      const res = await apiFetch(editing ? `/api/admin/notices/${editing.notice_id}/` : '/api/admin/notices/', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payloadFrom(form)),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const fieldErrors = buildFieldErrors(data)
        setErrors(fieldErrors)
        if (!Object.keys(fieldErrors).length) toast.error("The notice wasn't saved. Please try again.")
        return
      }
      toast.success(editing ? 'Notice updated' : form.is_published ? 'Notice saved' : 'Draft saved')
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error("The notice wasn't saved. Please check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const start = splitNaiveDt(startsNaive)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit notice' : 'New notice'}</DialogTitle>
          <DialogDescription>It shows on the home page banner for everyone who signs in, between the start and the end you choose.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <Field label="Title" error={errors.title} htmlFor="nb-title" hint={`${form.title.length}/${MAX_TITLE}`}>
              <Input id="nb-title" value={form.title} maxLength={MAX_TITLE} onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} />
            </Field>
            <Field label="Message" error={errors.message} htmlFor="nb-message" hint={`${form.message.length}/${MAX_MESSAGE}. Plain text, a few short lines.`}>
              <Textarea id="nb-message" rows={3} value={form.message} maxLength={MAX_MESSAGE} onChange={(e) => set({ message: e.target.value })} aria-invalid={!!errors.message} />
            </Field>

            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Notice type">
                {Object.entries(NOTICE_KINDS).map(([code, k]) => (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={form.kind === code}
                    onClick={() => set({ kind: code })}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${form.kind === code ? 'border-primary bg-primary/8 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: k.accent }} />
                    {k.label}
                  </button>
                ))}
              </div>
              {kindOf(form.kind).loud && <p className="text-xs text-muted-foreground">Stands out a little more on the banner.</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link text (optional)" htmlFor="nb-link-label" error={errors.link_label}>
                <Input id="nb-link-label" value={form.link_label} maxLength={30} placeholder="Open" onChange={(e) => set({ link_label: e.target.value })} />
              </Field>
              <Field label="Link to (optional)" htmlFor="nb-link-url" error={errors.link_url} hint="A page like /qhse/incident-details, or an https:// address.">
                <Input id="nb-link-url" value={form.link_url} maxLength={300} onChange={(e) => set({ link_url: e.target.value })} aria-invalid={!!errors.link_url} />
              </Field>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-semibold">Schedule</p>
              <div className="grid gap-3">
                <Field label="Starts" error={errors.starts_at}>
                  <div className="flex gap-2">
                    <Input type="date" className="min-w-0 flex-1" value={form.starts_date} onChange={(e) => set({ starts_date: e.target.value })} aria-label="Start date" />
                    <Input type="time" value={form.starts_time} onChange={(e) => set({ starts_time: e.target.value })} aria-label="Start time" className="w-32" />
                  </div>
                </Field>
                <Field label="Ends (required)" error={errors.ends_at}>
                  <div className="flex gap-2">
                    <Input type="date" className="min-w-0 flex-1" min={start.date || undefined} value={form.ends_date} onChange={(e) => set({ ends_date: e.target.value })} aria-label="End date" aria-invalid={!!errors.ends_at} />
                    <Input type="time" value={form.ends_time} onChange={(e) => set({ ends_time: e.target.value })} aria-label="End time" className="w-32" />
                  </div>
                </Field>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Run for</span>
                {DURATIONS.map(([label, n]) => (
                  <Button key={n} type="button" variant="outline" size="xs" onClick={() => set({ ends_date: addDays(form.starts_date || localDateStr(), n), ends_time: form.starts_time })}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.is_pinned} onChange={(e) => set({ is_pinned: e.target.checked })} />
                Pin to the front when several are live
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!form.is_published} onChange={(e) => set({ is_published: !e.target.checked })} />
                Save as a draft (not shown yet)
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Preview</p>
            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(118deg, #1c448a 0%, #17356f 48%, #0f2650 100%)' }}>
              <NoticeCard notice={preview} />
            </div>
            <p className="text-xs text-muted-foreground">This is how it looks on the home page banner.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : form.is_published ? 'Post notice' : 'Save draft'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function NoticeBoardPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [initial, setInitial] = useState(blankForm)
  const [deleting, setDeleting] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const mayView = can(user, MENU_KEY, 'view')
  const mayAdd = can(user, MENU_KEY, 'add')
  const mayEdit = can(user, MENU_KEY, 'edit')
  const mayDelete = can(user, MENU_KEY, 'delete')

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await apiFetch(`/api/admin/notices/?page_size=200${tab ? `&status=${tab}` : ''}`)
      if (!res.ok) throw new Error('load failed')
      setRows(asList(await res.json()))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [tab])
  useEffect(() => {
    if (mayView) load()
  }, [mayView, load])

  if (!mayView) return <AccessDenied />

  const openNew = (from) => {
    setEditing(null)
    setInitial(from ? formFrom(from, { copy: true }) : blankForm())
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }
  const openEdit = (n) => {
    setEditing(n)
    setInitial(formFrom(n))
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  async function endNow(n) {
    const res = await apiFetch(`/api/admin/notices/${n.notice_id}/`, { method: 'PATCH', body: JSON.stringify({ ends_at: nowNaive() }) })
    if (res.ok) {
      toast.success('Notice ended')
      load()
    } else toast.error("Couldn't end the notice. Please try again.")
  }

  async function confirmDelete() {
    const n = deleting
    setDeleting(null)
    const res = await apiFetch(`/api/admin/notices/${n.notice_id}/`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      toast.success('Notice deleted')
      load()
    } else toast.error("Couldn't delete the notice. Please try again.")
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Notice Board</h1>
          <p className="text-sm text-muted-foreground">Notices appear in the home page banner for everyone who signs in, while they are live.</p>
        </div>
        {mayAdd && (
          <Button onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> New notice
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5" role="tablist" aria-label="Filter notices">
        {TABS.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <RigLoading />
        ) : failed ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Could not load the notices. Please refresh and try again.</p>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-medium">{tab ? 'No notices here.' : 'No notices yet.'}</p>
            {mayAdd && !tab && <p className="mt-1 text-sm text-muted-foreground">Post one and it shows on the home page banner.</p>}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((n) => {
              const kind = kindOf(n.kind)
              return (
                <li key={n.notice_id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-72">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[n.status]}`}>{STATUS_LABEL[n.status]}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ background: kind.accent }} />
                          {kind.label}
                        </span>
                        {n.is_pinned === 'Y' && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Pin className="h-3 w-3" /> Pinned</span>
                        )}
                      </div>
                      <p className="mt-1.5 font-semibold">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {shortNaive(n.starts_at)} → {shortNaive(n.ends_at)}
                        {n.posted_by ? ` · Posted by ${n.posted_by}` : ''}
                        {n.link_url ? ` · Links to ${n.link_url}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {mayEdit && n.status === 'live' && (
                        <Button variant="outline" size="sm" onClick={() => endNow(n)}>End now</Button>
                      )}
                      {mayAdd && (
                        <Button variant="outline" size="sm" onClick={() => openNew(n)} aria-label="Duplicate this notice"><Copy /> Duplicate</Button>
                      )}
                      {mayEdit && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(n)}><Pencil /> Edit</Button>
                      )}
                      {mayDelete && (
                        <Button variant="destructive" size="sm" onClick={() => setDeleting(n)} aria-label="Delete this notice"><Trash2 /></Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <NoticeForm key={formKey} open={formOpen} onOpenChange={setFormOpen} editing={editing} initial={initial} onSaved={load} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this notice?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” will be removed from the board and from the banner. This is recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
