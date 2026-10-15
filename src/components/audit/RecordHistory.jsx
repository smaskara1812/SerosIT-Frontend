import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { ACTION_COLORS, ACTION_LABELS, formatDiffValue } from '@/lib/auditFormat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// Each row of the history is a version of the record: how it looked right after that change. One
// action per row: restore that version. A row that records a deletion has no version of its own, so
// its action brings back the version the record had before it was deleted.
const GONE = new Set(['delete', 'revert_delete'])

function restoreAction(entry, exists) {
  if (GONE.has(entry.action)) return { mode: 'before', label: 'Bring the record back' }
  if (entry.is_latest) return null // this is the current version
  // While the record is deleted the only way back is the deletion itself: an older version would have to be
  // mixed with whatever lines the record had when it was deleted.
  if (!exists) return null
  return { mode: 'after', label: 'Restore this version' }
}

function ChangeTable({ rows }) {
  if (!rows.length) return null
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="w-1/3 py-1 pr-3 font-medium">Field</th>
          <th className="w-1/3 py-1 pr-3 font-medium">Before</th>
          <th className="py-1 font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.field} className="border-t border-border/50 align-top">
            <td className="py-1 pr-3 text-muted-foreground">{c.label}</td>
            <td className="py-1 pr-3 break-words text-red-700/90">{formatDiffValue(c.old)}</td>
            <td className="py-1 break-words text-emerald-700">{formatDiffValue(c.new)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// The history of one record: every logged change, newest first, with who, when, and before/after.
// App Admins can restore the record to how it was before or after any entry. Nothing changes until
// they confirm a preview, and a revert is itself added to the history.
export default function RecordHistory({ open, onClose, entity, table, recordId, title, onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0) // bump to fetch the history again
  const [plan, setPlan] = useState(null) // { entryId, mode, label, preview }
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  // The parent mounts this fresh for each record it opens, so the state above starts clean.
  useEffect(() => {
    let live = true
    apiFetch(`/api/admin/audit/history/?entity=${encodeURIComponent(entity)}&record_id=${encodeURIComponent(recordId)}${table ? `&table=${encodeURIComponent(table)}` : ''}`)
      .then(async (res) => {
        const body = await res.json()
        if (!live) return
        if (!res.ok) throw new Error(body.error || 'Could not load the history.')
        setData(body)
        setError('')
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [entity, table, recordId, tick])

  async function startRestore(entry, btn, version) {
    setBusy(true)
    try {
      const res = await apiFetch(`/api/admin/audit/${entry.id}/revert/preview/`, {
        method: 'POST',
        body: JSON.stringify({ mode: btn.mode }),
      })
      const preview = await res.json()
      setPlan({ entryId: entry.id, mode: btn.mode, label: version ? `Restore version ${version}` : btn.label, preview })
      setReason('')
    } catch {
      toast.error('Could not check that restore.')
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    setBusy(true)
    try {
      const res = await apiFetch(`/api/admin/audit/${plan.entryId}/revert/`, {
        method: 'POST',
        body: JSON.stringify({ mode: plan.mode, reason }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) {
        setPlan({ ...plan, preview: { allowed: false, reason: body.error || 'The restore was refused.', fields: [] } })
        return
      }
      toast.success('Restored')
      setPlan(null)
      setTick((t) => t + 1)
      onChanged?.()
    } catch {
      toast.error('The restore failed.')
    } finally {
      setBusy(false)
    }
  }

  // Version numbers count the changes that left the record in place (v1 = created), oldest first.
  // A record that existed before logging began (imported from the old system) has no "created" row:
  // its first logged entry is an edit. The values it had before that edit are still a version, so it
  // gets a row of its own at the bottom (restored through "before" the first entry).
  const oldest = data?.entries?.[0]
  const baseline = oldest && (oldest.action === 'update' || oldest.action === 'revert') ? oldest : null
  const versionOf = {}
  let n = baseline ? 1 : 0
  for (const e of data?.entries || []) if (!GONE.has(e.action)) versionOf[e.id] = ++n
  const entries = data ? [...data.entries].reverse() : []
  const byId = Object.fromEntries((data?.entries || []).map((e) => [e.id, e]))
  const p = plan?.preview

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>History{title ? `: ${title}` : ''}</DialogTitle>
          <DialogDescription>
            Each row is a version of this record: how it looked right after that change. Restoring a version puts the record back exactly as it was then.
            {data && !data.exists && <span className="font-medium text-destructive"> This record has been deleted.</span>}
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <div className={`rounded-lg border p-3 ${p.allowed ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
            <p className="text-sm font-semibold text-foreground">{plan.label}</p>
            {!p.allowed && <p className="mt-1 text-sm text-red-700">{p.reason}</p>}
            {p.allowed && (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.action === 'update' && 'These fields will change:'}
                  {p.action === 'insert' && 'The deleted record will be put back with these values:'}
                  {p.action === 'delete' && 'This record will be deleted:'}
                </p>
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="w-1/3 py-1 pr-3 font-medium">Field</th>
                      <th className="w-1/3 py-1 pr-3 font-medium">Now</th>
                      <th className="py-1 font-medium">Will become</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.fields.map((f) => (
                      <tr key={f.field} className="border-t border-border/50 align-top">
                        <td className="py-1 pr-3 text-muted-foreground">{f.label}</td>
                        <td className="py-1 pr-3 break-words">{formatDiffValue(f.current)}</td>
                        <td className="py-1 break-words font-medium">{formatDiffValue(f.restore_to)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {p.also?.length > 0 && (
                  <div className="mt-3 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    <p className="font-semibold">This will also</p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.also.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.child_summary?.length > 0 && (
                  <div className="mt-3 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    <p className="font-semibold">
                      {p.action === 'insert' ? 'These rows will be put back with it' : 'These rows will be deleted with it'}
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.child_summary.map((c) => (
                        <li key={c.label}>
                          {c.count} {c.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.warnings?.length > 0 && (
                  <div className="mt-3 rounded-md border border-amber-400 bg-amber-100/70 px-3 py-2 text-xs text-amber-900">
                    <p className="font-semibold">Other records already use this one</p>
                    <p className="mt-0.5">
                      These were created after the change you are undoing{p.since ? ` (${p.since})` : ''}. They will now see the older values:
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.warnings.map((w) => (
                        <li key={w.label}>
                          {w.count} {w.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Textarea
                  className="mt-3 min-h-12"
                  placeholder="Reason (optional)"
                  maxLength={255}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPlan(null)} disabled={busy}>
                {p.allowed ? 'Cancel' : 'Close'}
              </Button>
              {p.allowed && (
                <Button size="sm" onClick={confirm} disabled={busy}>
                  {busy ? 'Restoring…' : 'Confirm restore'}
                </Button>
              )}
            </div>
          </div>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!loading && !error && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No changes have been logged for this record yet.</p>
        )}

        <ol className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                {versionOf[e.id] && <span className="text-xs font-semibold text-foreground">Version {versionOf[e.id]}</span>}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACTION_COLORS[e.action] || 'bg-gray-100 text-gray-600'}`}>
                  {ACTION_LABELS[e.action] || e.action}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{e.ts}</span>
                <span className="font-mono text-xs">{e.username}</span>
                {e.is_latest && !GONE.has(e.action) && (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Current version</span>
                )}
              </div>
              {e.reverted_of && byId[e.reverted_of] && (
                <p className="mt-1 text-xs text-muted-foreground">Based on the entry from {byId[e.reverted_of].ts}</p>
              )}
              {e.note && <p className="mt-1 text-xs italic text-muted-foreground">Reason: {e.note}</p>}
              <ChangeTable rows={e.changes} />
              <div className="mt-2 flex flex-wrap gap-2">
                {restoreAction(e, data?.exists) && (
                  <Button variant="outline" size="sm" disabled={busy || Boolean(plan)} onClick={() => startRestore(e, restoreAction(e, data?.exists), versionOf[e.id])}>
                    {restoreAction(e, data?.exists).label}
                  </Button>
                )}
              </div>
            </li>
          ))}
          {baseline && data?.exists && (
            <li className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Version 1</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Original</span>
                <span className="text-xs text-muted-foreground">as it was before the first logged change</span>
              </div>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {baseline.changes.map((c) => (
                    <tr key={c.field} className="border-t border-border/50 align-top first:border-t-0">
                      <td className="w-1/3 py-1 pr-3 text-muted-foreground">{c.label}</td>
                      <td className="py-1 break-words">{formatDiffValue(c.old)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || Boolean(plan)}
                  onClick={() => startRestore(baseline, { mode: 'before', label: 'Restore this version' }, 1)}
                >
                  Restore this version
                </Button>
              </div>
            </li>
          )}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
