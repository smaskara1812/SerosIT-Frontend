import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { buildFieldErrors } from '@/lib/errors'
import { MONTHS, fmtDay, fmtDayYear, inDays } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const API = '/api/admin/birthday-people/'
const blank = { full_name: '', display_name: '', birth_day: '', birth_month: '', birth_year: '', leaving_date: '' }

async function download(url, fallbackName) {
  const res = await apiFetch(url)
  if (!res.ok) {
    toast.error('The file could not be downloaded.')
    return
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30000)
}

function Field({ label, error, hint, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// Mounted fresh each time it opens (see the key where it is used), so its fields start from the person being edited.
function PersonDialog({ person, onClose, onSaved }) {
  const open = true
  const [form, setForm] = useState(() => (person ? { full_name: person.full_name, display_name: person.display_name || '', birth_day: String(person.birth_day), birth_month: String(person.birth_month), birth_year: person.birth_year ? String(person.birth_year) : '', leaving_date: person.leaving_date || '' } : blank))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function save() {
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Enter the person’s full name.'
    if (!form.birth_month) next.birth_month = 'Choose the month.'
    if (!form.birth_day) next.birth_day = 'Choose the day.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      const body = {
        full_name: form.full_name.trim(), display_name: form.display_name.trim(), birth_day: Number(form.birth_day), birth_month: Number(form.birth_month),
        birth_year: form.birth_year ? Number(form.birth_year) : null, leaving_date: form.leaving_date || null,
      }
      const res = await apiFetch(person ? `${API}${person.person_id}/` : API, { method: person ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const fe = buildFieldErrors(data)
        setErrors(fe)
        if (!Object.keys(fe).length) toast.error("The person wasn't saved. Please try again.")
        return
      }
      toast.success(person ? 'Changes saved' : 'Person added')
      onSaved()
      onClose()
    } catch {
      toast.error("The person wasn't saved. Please check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{person ? 'Edit person' : 'Add a person'}</DialogTitle>
          <DialogDescription>Their birthday card goes to the people on the alert, not to them. No e-mail address is kept.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Full name" error={errors.full_name} htmlFor="bp-name">
            <Input id="bp-name" value={form.full_name} maxLength={100} onChange={(e) => set({ full_name: e.target.value })} aria-invalid={!!errors.full_name} />
          </Field>
          <Field label="Display name" error={errors.display_name} htmlFor="bp-display" hint="What is written on the card. Leave blank to use the full name.">
            <Input id="bp-display" value={form.display_name} maxLength={100} onChange={(e) => set({ display_name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Birth day" error={errors.birth_day} htmlFor="bp-day">
              <select id="bp-day" value={form.birth_day} onChange={(e) => set({ birth_day: e.target.value })} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Birth month" error={errors.birth_month} htmlFor="bp-month">
              <select id="bp-month" value={form.birth_month} onChange={(e) => set({ birth_month: e.target.value })} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Birth year" error={errors.birth_year} htmlFor="bp-year" hint="Optional">
              <Input id="bp-year" type="number" min={1900} max={new Date().getFullYear()} value={form.birth_year} onChange={(e) => set({ birth_year: e.target.value })} />
            </Field>
          </div>
          <Field label="Leaving date" error={errors.leaving_date} htmlFor="bp-leave" hint="The last day this person gets a card. Leave blank while they are still here.">
            <Input id="bp-leave" type="date" value={form.leaving_date} onChange={(e) => set({ leaving_date: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Choose an Excel file, check it (nothing is saved), read the report, then add the people.
function UploadDialog({ onClose, onDone }) {
  const open = true
  const [file, setFile] = useState(null)
  const [skip, setSkip] = useState(true)
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  async function send(dry) {
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('dry_run', dry ? '1' : '0')
      body.append('skip_duplicates', skip ? '1' : '0')
      const res = await apiFetch(`${API}upload/`, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.detail || 'That file could not be read.')
        setReport(null)
        return
      }
      if (dry) setReport(data)
      else {
        toast.success(`${data.added} ${data.added === 1 ? 'person' : 'people'} added`)
        onDone()
        onClose()
      }
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload people from Excel</DialogTitle>
          <DialogDescription>Fill in the blank template, then choose it here. You see a report first; nothing is saved until you confirm.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-3">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-sm">
              {file ? <p className="truncate font-medium">{file.name}</p> : <p className="text-muted-foreground">No file chosen (an .xlsx file, up to 2 MB).</p>}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>{file ? 'Choose another' : 'Choose a file'}</Button>
            <input ref={input} type="file" accept=".xlsx" className="sr-only" aria-label="Choose an Excel file" onChange={(e) => { setFile(e.target.files?.[0] || null); setReport(null); setError('') }} />
          </div>
          <button type="button" onClick={() => download(`${API}template/`, 'Birthday_Mailer_people_template.xlsx')} className="inline-flex items-center gap-1.5 self-start text-sm text-primary hover:underline">
            <Download className="h-4 w-4" /> Download the blank template
          </button>
          <label className="inline-flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={skip} onChange={(e) => { setSkip(e.target.checked); setReport(null) }} />
            <span><b>Skip rows already on the list.</b> A row with the same full name and birthday as someone on the list (or earlier in the file) is left out, so uploading the same file twice adds nobody. Untick it to add every row.</span>
          </label>

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {report && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-3"><p className="text-2xl font-semibold">{report.added}</p><p className="text-xs text-muted-foreground">will be added</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-2xl font-semibold">{report.skipped_duplicates}</p><p className="text-xs text-muted-foreground">already on the list</p></div>
                <div className={`rounded-lg p-3 ${report.error_count ? 'bg-red-500/10' : 'bg-muted'}`}><p className="text-2xl font-semibold">{report.error_count}</p><p className="text-xs text-muted-foreground">have a problem</p></div>
              </div>
              {report.errors.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">Rows with a problem (left out)</p>
                  <ul className="max-h-40 overflow-auto rounded-lg border border-border text-xs">
                    {report.errors.map((e) => <li key={e.row} className="flex gap-2 border-b border-border/60 px-3 py-1.5 last:border-b-0"><span className="w-14 shrink-0 text-muted-foreground">Row {e.row}</span><span className="min-w-0 flex-1">{e.name && <b>{e.name}: </b>}{e.message}</span></li>)}
                  </ul>
                </div>
              )}
              {report.duplicates.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">{report.skipped_duplicates} rows left out as duplicates</summary>
                  <ul className="mt-1 max-h-32 overflow-auto rounded-lg border border-border">
                    {report.duplicates.map((e) => <li key={e.row} className="border-b border-border/60 px-3 py-1 last:border-b-0">Row {e.row}: {e.name}. {e.message}</li>)}
                  </ul>
                </details>
              )}
              {report.preview.length > 0 && (
                <details className="text-xs" open>
                  <summary className="cursor-pointer text-muted-foreground">The first {report.preview.length} people that will be added</summary>
                  <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-border">
                    {report.preview.map((p) => <li key={p.row} className="flex gap-3 border-b border-border/60 px-3 py-1 last:border-b-0"><span className="min-w-0 flex-1 truncate">{p.display_name ? `${p.full_name} (${p.display_name})` : p.full_name}</span><span className="text-muted-foreground">{p.birth_day} {MONTHS[p.birth_month - 1].slice(0, 3)}{p.birth_year ? ` ${p.birth_year}` : ''}</span></li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          {!report && <Button type="button" onClick={() => send(true)} disabled={!file || busy}>{busy ? 'Checking…' : 'Check the file'}</Button>}
          {report && <Button type="button" onClick={() => send(false)} disabled={busy || report.added === 0}>{busy ? 'Adding…' : `Add ${report.added} ${report.added === 1 ? 'person' : 'people'}`}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PeopleTab({ mayAdd, mayEdit, mayDelete, mayExport, onChanged }) {
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [active, setActive] = useState('')
  const [sort, setSort] = useState('next') // next = the soonest birthday first; name = A to Z
  const [group, setGroup] = useState(true) // people who are still here first, those who have left after them
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(undefined) // undefined = closed, null = new, object = editing
  const [upload, setUpload] = useState(false)
  const [remove, setRemove] = useState(null)
  const size = 40

  const [reload, setReload] = useState(0)
  useEffect(() => {
    let live = true
    const p = new URLSearchParams({ page: String(page), page_size: String(size), sort, group: group ? '1' : '0' })
    if (q.trim()) p.set('search', q.trim())
    if (active) p.set('active', active)
    const t = setTimeout(() => {
      apiFetch(`${API}?${p}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('load')
          const data = await res.json()
          if (!live) return
          setRows(data.results || [])
          setCount(data.count ?? (data.results || []).length)
          setError('')
        })
        .catch(() => live && setError('The list could not be loaded.'))
        .finally(() => live && setLoading(false))
    }, q ? 300 : 0)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [page, q, active, sort, group, reload])

  const changed = () => {
    setReload((n) => n + 1)
    onChanged?.()
  }
  async function confirmRemove() {
    const p = remove
    setRemove(null)
    const res = await apiFetch(`${API}${p.person_id}/`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      toast.success('Person removed')
      changed()
    } else toast.error("The person couldn't be removed. Please try again.")
  }

  const pages = Math.max(1, Math.ceil(count / size))
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Input placeholder="Search by name…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="h-9 w-60" aria-label="Search by name" />
        <select value={active} onChange={(e) => { setActive(e.target.value); setPage(1) }} aria-label="Status" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="">Everyone</option>
          <option value="Y">Active</option>
          <option value="N">Left</option>
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} aria-label="Sort by" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="next">Sort: next birthday</option>
          <option value="calendar">Sort: calendar (Jan to Dec)</option>
          <option value="name">Sort: name A to Z</option>
        </select>
        <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" title="People who are still here come first, the ones who have left come after them. Untick to sort everyone together.">
          <input type="checkbox" checked={group} onChange={(e) => { setGroup(e.target.checked); setPage(1) }} /> Active first
        </label>
        <span className="text-xs text-muted-foreground">{count} {count === 1 ? 'person' : 'people'}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {mayExport && <Button type="button" variant="outline" size="sm" onClick={() => download(`${API}export/`, 'birthday_people.csv')}><Download /> Export</Button>}
          {mayAdd && <Button type="button" variant="outline" size="sm" onClick={() => setUpload(true)}><Upload /> Upload Excel</Button>}
          {mayAdd && <Button type="button" size="sm" onClick={() => setEdit(null)}><Plus /> Add a person</Button>}
        </div>
      </div>
      {error && <p className="m-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Full name</th>
              <th className="px-4 py-2.5 font-medium">On the card</th>
              <th className="px-4 py-2.5 font-medium">Birthday</th>
              <th className="px-4 py-2.5 font-medium">Next birthday</th>
              <th className="px-4 py-2.5 font-medium" title="The last day the person gets a card">Leaving date</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{q || active ? 'No one matches.' : 'No one is on the list yet. Add a person, or upload an Excel file.'}</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.person_id} className={`border-b border-border/60 last:border-b-0 ${p.is_active ? '' : 'opacity-60'}`}>
                <td className="px-4 py-2.5 font-medium">{p.full_name}</td>
                <td className="px-4 py-2.5">{p.shown_name}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{p.birthday_label}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{p.is_active ? <>{fmtDay(p.next_birthday)} · {inDays(p.next_birthday)}</> : '—'}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{p.leaving_date ? fmtDayYear(p.leaving_date) : '—'}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {p.is_active ? <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Active</span>
                    : <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Left</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {mayEdit && <Button type="button" variant="ghost" size="icon-sm" title="Edit" aria-label={`Edit ${p.full_name}`} onClick={() => setEdit(p)}><Pencil /></Button>}
                  {mayDelete && <Button type="button" variant="ghost" size="icon-sm" title="Remove" aria-label={`Remove ${p.full_name}`} onClick={() => setRemove(p)}><Trash2 className="text-destructive" /></Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <Button type="button" size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button type="button" size="xs" variant="outline" disabled={page >= pages} onClick={() => setPage((x) => x + 1)}>Next</Button>
        </div>
      )}

      {edit !== undefined && <PersonDialog key={edit?.person_id ?? 'new'} person={edit} onClose={() => setEdit(undefined)} onSaved={changed} />}
      {upload && <UploadDialog onClose={() => setUpload(false)} onDone={changed} />}
      <Dialog open={!!remove} onOpenChange={(o) => !o && setRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {remove?.full_name}?</DialogTitle>
            <DialogDescription>They will no longer get a birthday card. To keep them on the list but stop the card, set a leaving date instead.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRemove(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
