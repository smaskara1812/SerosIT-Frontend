import { useEffect, useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { IMAGE_ACCEPT, IMAGE_TYPES_TEXT } from '@/lib/mediaTypes'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// A round photo (used in the confirmation below as well as the badge itself).
function Round({ url, initials, size, label }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border ring-offset-2 ring-offset-background" style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary" style={{ fontSize: size / 3 }}>
          {initials || <Camera className="h-1/3 w-1/3" />}
        </div>
      )}
    </div>
  )
}

// A person's photo in a round badge, with change / remove under it. Nothing is saved on choosing a file: a dialog first shows the current
// photo next to the new one (or the current one going away) and the change is made only on Confirm. The old file is never deleted on the
// server; the history log keeps its name. `endpoint` takes POST (file) to set and DELETE to remove, and answers
// with the updated record (see MstFsEmployeeViewSet.upload_photo); `onRecord` receives that record. With no `endpoint` (a record not
// saved yet) it only shows the placeholder and says to save first. Initials stand in when there is no photo.
export default function PhotoBadge({ url, name, endpoint, onRecord, disabled, size = 112 }) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const [pending, setPending] = useState(null) // { file, previewUrl } for a new photo, { remove: true } for removing
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  useEffect(() => () => pending?.previewUrl && URL.revokeObjectURL(pending.previewUrl), [pending])

  function choose(file) {
    if (file) setPending({ file, previewUrl: URL.createObjectURL(file) })
    if (inputRef.current) inputRef.current.value = ''
  }

  async function confirm() {
    const p = pending
    await send(p.remove ? 'DELETE' : 'POST', p.file)
    setPending(null)
  }

  async function send(method, file) {
    setBusy(true)
    try {
      const body = file ? new FormData() : undefined
      if (file) body.append('file', file)
      const res = await apiFetch(endpoint, { method, body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save the photo')
      onRecord?.(data)
      toast.success(file ? 'Photo saved' : 'Photo removed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const canEdit = Boolean(endpoint) && !disabled
  return (
    <div className="flex items-center gap-4">
      <div className={cn(busy && 'opacity-60')}>
        <Round url={url} initials={initials} size={size} label={name ? `Photo of ${name}` : 'Photo'} />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        {endpoint ? (
          <>
            {canEdit && (
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline disabled:opacity-50"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {url ? 'Change photo' : 'Add photo'}
                </button>
                {url && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    disabled={busy}
                    onClick={() => setPending({ remove: true })}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">{IMAGE_TYPES_TEXT}, up to 5 MB. You confirm before it changes.</p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">Save the record first, then add a photo.</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>
      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && !busy && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.remove ? 'Remove this photo?' : 'Change this photo?'}</DialogTitle>
            <DialogDescription>
              {pending?.remove
                ? `${name || 'This record'} will have no photo.`
                : `The photo of ${name || 'this record'} will change from the current one to the new one.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-5 py-2">
            <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
              <Round url={url} initials={initials} size={88} label="Current photo" />
              Current
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
              {pending?.remove ? (
                <Round url={null} initials="" size={88} label="No photo" />
              ) : (
                <Round url={pending?.previewUrl} initials="" size={88} label="New photo" />
              )}
              {pending?.remove ? 'No photo' : 'New'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pending?.remove ? 'destructive' : 'default'} disabled={busy} onClick={confirm}>
              {busy ? 'Saving…' : pending?.remove ? 'Yes, remove' : 'Yes, change photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
