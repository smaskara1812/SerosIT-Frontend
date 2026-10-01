import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { formatApiError } from '@/lib/errors'
import { joinNaiveDt } from '@/lib/naiveDateTime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { IconTrash } from '@/components/icons'
import { Pencil, Upload, X } from 'lucide-react'

// The four legacy tabs that are a plain description grid (Event also
// carries a per-line time) — Photo Upload is handled separately below
// (different shape: file upload, not a textarea). Mirrors
// frmHSE_Drill_Record_Event/Observation/Improvement/Corrective_Action.aspx(.cs).
const TABS = [
  {
    key: 'events',
    label: 'Events',
    endpoint: 'hse-drill-record-events',
    idField: 'drill_rec_event_id',
    descField: 'drill_rec_event_desc',
    hasTime: true,
    emptyText: 'No events recorded yet.',
    descLabel: 'Event Description',
  },
  {
    key: 'observations',
    label: 'Observations',
    endpoint: 'hse-drill-record-observations',
    idField: 'drill_rec_observation_id',
    descField: 'drill_rec_observation_desc',
    emptyText: 'No observations recorded yet.',
    descLabel: 'Observation',
  },
  {
    key: 'improvements',
    label: 'Improvements',
    endpoint: 'hse-drill-record-improvements',
    idField: 'drill_rec_improvement_id',
    descField: 'drill_rec_improvement_desc',
    emptyText: 'No areas of improvement recorded yet.',
    descLabel: 'Area of Improvement / Lesson Learnt',
  },
  {
    key: 'corrective_actions',
    label: 'Corrective Action',
    endpoint: 'hse-drill-record-corrective-actions',
    idField: 'drill_rec_corrective_action_id',
    descField: 'drill_rec_corrective_action_desc',
    emptyText: 'No corrective actions recorded yet.',
    descLabel: 'Corrective Action Taken',
  },
]

// Matches PHOTO_ALLOWED_EXTENSIONS in backend/core/hse_drill_record.py —
// kept in sync manually, same convention as other duplicated-on-purpose
// constants in this app (e.g. incident_flash_report.py's BELONGS_TO_LABELS).
const PHOTO_ACCEPT = '.jpg,.jpeg,.bmp,.gif,.tiff,.png'

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function HseDrillRecordChildPanel({ hdrId, drillDate, canAdd, canEdit, canDelete }) {
  const [activeKey, setActiveKey] = useState(TABS[0].key)
  const isPhotosTab = activeKey === 'photos'
  const tab = TABS.find((t) => t.key === activeKey)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [desc, setDesc] = useState('')
  const [time, setTime] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [photoDeleteTarget, setPhotoDeleteTarget] = useState(null)
  const [photoDeleting, setPhotoDeleting] = useState(false)

  function resetForm() {
    setEditingId(null)
    setDesc('')
    setTime('')
  }

  function loadRows() {
    setLoading(true)
    apiFetch(`/api/qhse/${tab.endpoint}/?hdr=${hdrId}&page_size=500`)
      .then((r) => r.json())
      .then((data) => setRows(data.results || []))
      .finally(() => setLoading(false))
  }

  function loadPhotos() {
    setPhotosLoading(true)
    apiFetch(`/api/qhse/hse-drill-record/${hdrId}/photos/`)
      .then((r) => r.json())
      .then((data) => setPhotos(Array.isArray(data) ? data : []))
      .finally(() => setPhotosLoading(false))
  }

  useEffect(() => {
    if (isPhotosTab) {
      loadPhotos()
      return
    }
    resetForm()
    loadRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, hdrId])

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiFetch(`/api/qhse/hse-drill-record/${hdrId}/photos/`, { method: 'POST', body: formData })
        if (!res.ok) {
          toast.error((await res.json().catch(() => null))?.error || `Failed to upload ${file.name}`)
          continue
        }
        const photo = await res.json()
        setPhotos((prev) => [...prev, photo])
      }
      toast.success(files.length > 1 ? 'Photos uploaded' : 'Photo uploaded')
    } finally {
      setUploading(false)
    }
  }

  async function confirmDeletePhoto() {
    if (!photoDeleteTarget) return
    setPhotoDeleting(true)
    try {
      const res = await apiFetch(
        `/api/qhse/hse-drill-record/${hdrId}/photos/?photo_id=${photoDeleteTarget.drill_rec_photo_upload_id}`,
        { method: 'DELETE' }
      )
      if (res.status === 204) {
        setPhotos((prev) => prev.filter((p) => p.drill_rec_photo_upload_id !== photoDeleteTarget.drill_rec_photo_upload_id))
        toast.success('Photo deleted')
        setPhotoDeleteTarget(null)
      } else {
        toast.error(formatApiError(await res.json().catch(() => null)))
      }
    } finally {
      setPhotoDeleting(false)
    }
  }

  function selectRow(row) {
    setEditingId(row[tab.idField])
    setDesc(row[tab.descField] || '')
    if (tab.hasTime) setTime(fmtTime(row.drill_rec_event_time).slice(0, 5))
  }

  async function save() {
    if (!desc.trim()) {
      toast.error(`${tab.descLabel} is required`)
      return
    }
    if (tab.hasTime && !time) {
      toast.error('Time is required')
      return
    }
    const payload = { hdr: hdrId, [tab.descField]: desc.trim() }
    if (tab.hasTime) payload.drill_rec_event_time = joinNaiveDt(drillDate, time)

    setSaving(true)
    try {
      const isEdit = Boolean(editingId)
      const url = isEdit ? `/api/qhse/${tab.endpoint}/${editingId}/` : `/api/qhse/${tab.endpoint}/`
      const res = await apiFetch(url, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      if (!res.ok) {
        toast.error(formatApiError(await res.json().catch(() => null)))
        return
      }
      toast.success(isEdit ? `${tab.label.replace(/s$/, '')} updated` : `${tab.label.replace(/s$/, '')} added`)
      resetForm()
      loadRows()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/qhse/${tab.endpoint}/${deleteTarget[tab.idField]}/`, { method: 'DELETE' })
      if (res.status === 204) {
        setRows((prev) => prev.filter((r) => r[tab.idField] !== deleteTarget[tab.idField]))
        if (editingId === deleteTarget[tab.idField]) resetForm()
        toast.success(`${tab.label.replace(/s$/, '')} deleted`)
        setDeleteTarget(null)
      } else {
        toast.error(formatApiError(await res.json().catch(() => null)))
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <h2 className="mb-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">Drill Details</h2>
      <p className="mb-4 text-xs text-muted-foreground">Chronological events, observations, improvements and corrective action for this drill.</p>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveKey(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              t.key === activeKey
                ? 'border-[#1a3f7a] text-[#1a3f7a]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveKey('photos')}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            isPhotosTab ? 'border-[#1a3f7a] text-[#1a3f7a]' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Photos
        </button>
      </div>

      {isPhotosTab ? (
        <>
          {canAdd && (
            <div className="mb-4">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted ${uploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload Photos'}
                <input type="file" accept={PHOTO_ACCEPT} multiple className="hidden" onChange={handleFileSelect} disabled={uploading} />
              </label>
              <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG, BMP, GIF or TIFF — up to 10MB each.</p>
            </div>
          )}

          {photosLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!photosLoading && photos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No photos uploaded yet.</p>
          )}
          {!photosLoading && photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {photos.map((p) => (
                <div key={p.drill_rec_photo_upload_id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer" className="block h-full w-full">
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                      Image file not available
                    </div>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => setPhotoDeleteTarget(p)}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <Dialog open={Boolean(photoDeleteTarget)} onOpenChange={(open) => !open && setPhotoDeleteTarget(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this photo?</DialogTitle>
                <DialogDescription>This can&apos;t be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setPhotoDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeletePhoto} disabled={photoDeleting}>
                  {photoDeleting ? 'Deleting…' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
      {(canAdd || canEdit) && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-start gap-3">
            {tab.hasTime && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 w-32" />
              </div>
            )}
            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">{tab.descLabel} (200 chars)</label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} rows={2} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editingId && canAdd && (
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? 'Adding…' : '+ Insert'}
              </Button>
            )}
            {editingId && canEdit && (
              <>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? 'Updating…' : 'Update'}
                </Button>
                <Button size="sm" variant="secondary" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {tab.hasTime && (
                <th className="w-24 px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Time</th>
              )}
              <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{tab.descLabel}</th>
              <th className="w-20 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={tab.hasTime ? 3 : 2} className="p-5 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={tab.hasTime ? 3 : 2} className="p-5 text-center text-sm text-muted-foreground">{tab.emptyText}</td>
              </tr>
            )}
            {!loading &&
              rows.map((r, idx) => (
                <tr key={r[tab.idField]} className={`border-t border-border/60 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                  {tab.hasTime && <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtTime(r.drill_rec_event_time)}</td>}
                  <td className="px-3 py-2">{r[tab.descField]}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => selectRow(r)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTarget(r)}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this {tab.label.replace(/s$/, '').toLowerCase()}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}
