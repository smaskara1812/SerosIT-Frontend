import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { formatApiError, showFormError } from '@/lib/errors'
import { FieldFrame } from '@/components/FieldFrame'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import AccessDenied from '@/components/AccessDenied'
import { RemoteCombobox } from '@/routes/masters/MasterCrudPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'

const MENU_KEY = 'qhse.cert_to_rank_mapping'
const API = '/api/qhse/cert-to-rank-mapping/'
const CERT_FIELD = { type: 'select-remote', remote: `${API}certificates/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const GROUP_FIELD = { type: 'select-remote', remote: `${API}groups/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const CATEGORY_FIELD = { type: 'select-remote', remote: `${API}categories/`, optionLabel: 'name', optionValue: 'id', labelField: 'name' }
const selectCls =
  'h-8 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:opacity-60'

function Field({ label, required, children, error, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <FieldFrame error={error}>{children}</FieldFrame>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function CertToRankMappingFormPage() {
  const { certId } = useParams()
  const isEdit = Boolean(certId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user, MENU_KEY, 'add')
  const canEdit = can(user, MENU_KEY, 'edit')
  const canDelete = can(user, MENU_KEY, 'delete')
  const writable = canAdd || canEdit

  const [cert, setCert] = useState(null)
  const [rows, setRows] = useState([])
  const [orig, setOrig] = useState({})
  const [staged, setStaged] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const bannerRef = useRef(null)
  const [rowQuery, setRowQuery] = useState('')
  const [group, setGroup] = useState({ id: null, name: '' })
  const [category, setCategory] = useState({ id: null, name: '' })
  const [candidates, setCandidates] = useState(null)
  const [picked, setPicked] = useState(() => new Set())
  const [candQuery, setCandQuery] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [deleteRow, setDeleteRow] = useState(null)
  const [deletingRow, setDeletingRow] = useState(false)

  function applyDetail(d) {
    setCert({ id: d.cert_id, name: d.cert_name })
    setRows(d.rows)
    setOrig(Object.fromEntries(d.rows.map((r) => [r.id, r.active])))
  }

  function reload() {
    return apiFetch(`${API}${certId}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(applyDetail)
  }

  useEffect(() => {
    if (!isEdit) return
    reload()
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certId, isEdit])

  function loadCandidates(groupId, categoryId) {
    setCandidates(null)
    setPicked(new Set())
    if (!groupId || !categoryId) return
    apiFetch(`${API}candidates/?cert=${certId}&group=${groupId}&category=${categoryId}`)
      .then((r) => r.json())
      .then((list) => setCandidates(Array.isArray(list) ? list : []))
  }

  function pickGroup(id, name) {
    setGroup({ id, name })
    setFieldErrors((e) => ({ ...e, group: undefined }))
    loadCandidates(id, category.id)
  }
  function pickCategory(id, name) {
    setCategory({ id, name })
    setFieldErrors((e) => ({ ...e, category: undefined }))
    loadCandidates(group.id, id)
  }

  const stagedKeys = useMemo(() => new Set(staged.map((s) => `${s.category}:${s.rank}`)), [staged])
  const available = useMemo(() => {
    const q = candQuery.trim().toLowerCase()
    return (candidates || []).filter((c) => !stagedKeys.has(`${category.id}:${c.id}`) && (!q || c.name.toLowerCase().includes(q)))
  }, [candidates, stagedKeys, category.id, candQuery])

  function stageSelected() {
    const missing = {}
    if (!group.id) missing.group = 'This is required.'
    if (!category.id) missing.category = 'This is required.'
    if (Object.keys(missing).length) {
      setFieldErrors(missing)
      showFormError(`Please choose ${[missing.group && 'a Training Group', missing.category && 'a Category'].filter(Boolean).join(' and ')} first.`, { setError, bannerRef })
      return
    }
    if (picked.size === 0) return showFormError('Tick at least one rank to add.', { setError, bannerRef })
    setError('')
    const adds = available.filter((c) => picked.has(c.id)).map((c) => ({ key: `${category.id}:${c.id}`, category: category.id, category_name: category.name, rank: c.id, rank_name: c.name, active: 'Y' }))
    setStaged((prev) => [...adds, ...prev])
    setPicked(new Set())
  }

  const changedRows = useMemo(() => rows.filter((r) => r.active !== orig[r.id]), [rows, orig])
  const hasChanges = staged.length > 0 || changedRows.length > 0

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const res = await apiFetch(`${API}save/`, {
        method: 'POST',
        body: JSON.stringify({
          cert: Number(certId),
          adds: staged.map((s) => ({ category: s.category, rank: s.rank, active: s.active })),
          updates: changedRows.map((r) => ({ id: r.id, active: r.active })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showFormError(formatApiError(data), { setError, bannerRef })
        return
      }
      allowNextNavigation()
      toast.success('Changes saved')
      setStaged([])
      applyDetail(data)
      loadCandidates(group.id, category.id)
    } catch {
      showFormError("Couldn't reach the server. Check your connection and try again.", { setError, bannerRef })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return
    setDeletingRow(true)
    try {
      const res = await apiFetch(`${API}row/${deleteRow.id}/`, { method: 'DELETE' })
      if (res.status === 204) {
        toast.success(`${deleteRow.rank_name} removed from this certificate`)
        setDeleteRow(null)
        await reload()
        loadCandidates(group.id, category.id)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.detail || data.error || "Couldn't remove this rank. Please try again.")
      }
    } finally {
      setDeletingRow(false)
    }
  }

  const { dialog: leaveDialog, allowNextNavigation } = useUnsavedChanges(hasChanges, {
    onSave: writable && !saving && hasChanges ? handleSave : undefined,
  })

  const shownRows = useMemo(() => {
    const q = rowQuery.trim().toLowerCase()
    return q ? rows.filter((r) => `${r.rank_name} ${r.fs_category_name}`.toLowerCase().includes(q)) : rows
  }, [rows, rowQuery])

  if (notFound) return <Navigate to="/qhse/cert-to-rank-mapping" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  const saveButton = (
    <Button onClick={handleSave} disabled={saving || !hasChanges}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
  )

  if (!isEdit) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
        <h1 className="text-lg font-bold text-foreground">Training Certificate to Rank Mapping</h1>
        <div className="rounded-2xl border border-border bg-card p-7">
          <Field label="Certificate" required hint="Choose a certificate to map ranks to. If it already has ranks, they open for editing.">
            {canAdd ? (
              <RemoteCombobox
                field={CERT_FIELD}
                value={null}
                labelValue=""
                onChange={(v, raw) => {
                  if (!v) return
                  if (raw?.has_mappings) toast.info('This certificate already has ranks mapped — opened for editing.')
                  navigate(`/qhse/cert-to-rank-mapping/${v}/edit`, { replace: true })
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">You don&apos;t have permission to add mappings.</p>
            )}
          </Field>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Training Certificate to Rank Mapping{cert ? ` — ${cert.name}` : ''}</h1>
        {writable && !loading && saveButton}
      </div>

      {error && <p ref={bannerRef} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm whitespace-pre-line text-destructive">{error}</p>}
      {!writable && !loading && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You have view-only access to this page.</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {writable && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">Add ranks</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Training Group" required error={fieldErrors.group} hint="Only used to narrow down the ranks below.">
                  <RemoteCombobox field={GROUP_FIELD} value={group.id} labelValue={group.name} onChange={(v, raw) => pickGroup(v, raw?.name || '')} />
                </Field>
                <Field label="Category" required error={fieldErrors.category}>
                  <RemoteCombobox field={CATEGORY_FIELD} value={category.id} labelValue={category.name} onChange={(v, raw) => pickCategory(v, raw?.name || '')} />
                </Field>
              </div>
              {group.id && category.id && (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                  {candidates === null ? (
                    <p className="text-sm text-muted-foreground">Loading ranks…</p>
                  ) : candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No more ranks to add — this group has none in this category, or they&apos;re all on this certificate already.</p>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <Label className="text-sm font-medium">
                          Ranks <span className="font-normal text-muted-foreground">({available.length} available)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input value={candQuery} onChange={(e) => setCandQuery(e.target.value)} placeholder="Find a rank…" className="h-8 w-48" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPicked(picked.size === available.length ? new Set() : new Set(available.map((c) => c.id)))}
                          >
                            {picked.size === available.length && available.length > 0 ? 'Clear' : 'Select all'}
                          </Button>
                        </div>
                      </div>
                      <div className="grid max-h-56 grid-cols-1 gap-x-6 gap-y-1 overflow-auto sm:grid-cols-2">
                        {available.map((c) => (
                          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={picked.has(c.id)}
                              onChange={() =>
                                setPicked((prev) => {
                                  const next = new Set(prev)
                                  next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                                  return next
                                })
                              }
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button onClick={stageSelected} disabled={picked.size === 0}>
                          Add {picked.size || ''} selected
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Ranks ({rows.length}
                {staged.length ? ` + ${staged.length} not saved yet` : ''})
              </h2>
              <Input value={rowQuery} onChange={(e) => setRowQuery(e.target.value)} placeholder="Find a rank…" className="h-8 w-56" />
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-muted shadow-[0_1px_0_var(--border)]">
                  <tr>
                    {['Rank', 'Category', 'Active', ''].map((h) => (
                      <th key={h || 'x'} className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && staged.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No ranks mapped to this certificate yet.</td>
                    </tr>
                  )}
                  {staged.map((s) => (
                    <tr key={s.key} className="border-t border-border/60 bg-emerald-50 dark:bg-emerald-950/20">
                      <td className="px-3 py-1.5 font-medium">
                        {s.rank_name}
                        <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">new — not saved</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{s.category_name}</td>
                      <td className="px-3 py-1.5">
                        <select value={s.active} onChange={(e) => setStaged((prev) => prev.map((x) => (x.key === s.key ? { ...x, active: e.target.value } : x)))} className={selectCls}>
                          <option value="Y">Yes</option>
                          <option value="N">No</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button type="button" title="Don't add" onClick={() => setStaged((prev) => prev.filter((x) => x.key !== s.key))} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length > 0 && shownRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No rank matches &ldquo;{rowQuery}&rdquo;.</td>
                    </tr>
                  )}
                  {shownRows.map((r, idx) => (
                    <tr key={r.id} className={`border-t border-border/60 ${r.active !== orig[r.id] ? 'bg-amber-50 dark:bg-amber-950/20' : idx % 2 ? 'bg-muted/20' : ''}`}>
                      <td className="px-3 py-1.5 font-medium">
                        {r.rank_name}
                        {r.is_repeat && (
                          <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground" title="This rank appears more than once under this category (from the old system)">
                            listed more than once
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.fs_category_name}</td>
                      <td className="px-3 py-1.5">
                        <select
                          value={r.active}
                          disabled={!writable}
                          onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: e.target.value } : x)))}
                          className={selectCls}
                        >
                          <option value="Y">Yes</option>
                          <option value="N">No</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {(canEdit || canDelete) && (
                          <button type="button" title="Remove from certificate" onClick={() => setDeleteRow(r)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10">
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {writable && <div className="flex justify-end">{saveButton}</div>}
        </>
      )}

      <Dialog open={Boolean(deleteRow)} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {deleteRow?.rank_name} from this certificate?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletingRow}>
              {deletingRow ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {leaveDialog}
    </div>
  )
}
