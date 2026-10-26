import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { deleteBannerAsset, listBannerAssets, uploadBannerAsset } from '@/lib/bannerAssets'
import { MAX_PICTURES } from '@/lib/bannerShapes'

const MENU_KEY = 'admin.banner_events'
const ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png'
const MAX_MB = 5

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

// A chequerboard behind a thumbnail, so a picture with see-through parts shows where it is see-through.
const CHECKER = {
  backgroundColor: '#fff',
  backgroundImage: 'linear-gradient(45deg,#d4d8de 25%,transparent 25%,transparent 75%,#d4d8de 75%),linear-gradient(45deg,#d4d8de 25%,transparent 25%,transparent 75%,#d4d8de 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0,6px 6px',
}

// The pictures an administrator can put on the banner: JPG, JPEG or PNG (PNG may have a see-through background). Pictures are shared by
// every event. Each is shown as an extremely small preview that comes with the list; the real picture is fetched only when it is drawn.
export default function PicturesLibrary({ used, onAdd }) {
  const { user } = useAuth()
  const canUpload = can(user, MENU_KEY, 'add') || can(user, MENU_KEY, 'edit')
  const canRemove = can(user, MENU_KEY, 'edit') || can(user, MENU_KEY, 'delete')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState(null) // { file, url } waiting to be added
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const input = useRef(null)
  const full = used >= MAX_PICTURES

  // After an upload or a removal the list is read again; the first read happens when the library opens.
  const load = useCallback(async () => {
    try {
      setItems((await listBannerAssets()).results)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])
  useEffect(() => {
    let live = true
    listBannerAssets()
      .then((r) => live && setItems(r.results))
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [])
  useEffect(() => () => picked && URL.revokeObjectURL(picked.url), [picked])

  function choose(file) {
    if (!file) return
    if (!/\.(jpe?g|png)$/i.test(file.name) || !/^image\/(jpeg|png)$/.test(file.type)) {
      toast.error('Only JPG, JPEG and PNG pictures can be used here.')
      return
    }
    if (file.size > MAX_MB * 1048576) {
      toast.error(`That file is ${(file.size / 1048576).toFixed(1)} MB. A picture can be at most ${MAX_MB} MB.`)
      return
    }
    setPicked({ file, url: URL.createObjectURL(file) })
  }

  async function add() {
    if (!picked) return
    setBusy(true)
    try {
      const a = await uploadBannerAsset(picked.file)
      toast.success(a.existing ? 'That picture was already in the library.' : 'Picture added to the library.')
      setPicked(null)
      if (input.current) input.current.value = ''
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(a) {
    try {
      await deleteBannerAsset(a.id)
      toast.success('Picture removed.')
      setConfirmId(null)
      await load()
    } catch (e) {
      toast.error(e.message)
      setConfirmId(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]) }}
          className={`flex flex-col gap-2 rounded-lg border border-dashed p-3 text-sm transition-colors ${over ? 'border-primary bg-primary/5' : 'border-border'}`}
        >
          {picked ? (
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border" style={CHECKER}>
                  <img src={picked.url} alt="The picture you chose" className="h-full w-full object-contain" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{picked.file.name}</p>
                  <p className="text-xs text-muted-foreground">{kb(picked.file.size)} · it will be resized and tidied when added</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={add} disabled={busy}>{busy ? 'Adding…' : 'Add to library'}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setPicked(null); if (input.current) input.current.value = '' }} disabled={busy}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => input.current?.click()} className="flex items-center gap-2 text-left text-muted-foreground hover:text-foreground">
              <Upload className="h-4 w-4 shrink-0" />
              <span><b className="text-foreground">Add a picture</b> – click, or drop a JPG, JPEG or PNG here. A PNG may have a see-through background.</span>
            </button>
          )}
          <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label="Choose a picture" onChange={(e) => choose(e.target.files?.[0])} />
          <p className="text-xs text-muted-foreground">Up to {MAX_MB} MB. Pictures are shrunk to at most 1600 pixels and 400 KB and stripped of hidden data. They are shared by every event.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {used} of {MAX_PICTURES} pictures used on this banner.
        {full && <span className="text-amber-700 dark:text-amber-300"> That is the most one banner can hold. Remove one to add another.</span>}
      </p>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!items && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-muted-foreground">No pictures yet.</p>}

      <div className="grid grid-cols-2 gap-2">
        {(items || []).map((a) => (
          <div key={a.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2">
            <button
              type="button"
              disabled={full}
              onClick={() => onAdd(a)}
              title={full ? 'The banner already holds the most pictures' : `Put “${a.name}” on the banner`}
              className="group relative flex h-20 items-center justify-center overflow-hidden rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              style={CHECKER}
            >
              <img src={a.thumb} alt={a.name} className="max-h-full max-w-full object-contain" />
              {!full && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ImagePlus className="mr-1 h-4 w-4" /> Add</span>}
            </button>
            <p className="truncate text-xs font-medium" title={a.name}>{a.name}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {a.width}×{a.height} · {kb(a.bytes)}
              {a.has_alpha && ' · see-through'}
              {a.builtin && ' · Seros'}
            </p>
            {a.used_in.length > 0 && <p className="truncate text-[11px] text-muted-foreground" title={a.used_in.join(', ')}>Used by {a.used_in.length === 1 ? a.used_in[0] : `${a.used_in.length} events`}</p>}
            {canRemove && !a.builtin && (
              confirmId === a.id ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="mr-auto">Remove it?</span>
                  <Button type="button" size="xs" variant="destructive" onClick={() => remove(a)}>Yes</Button>
                  <Button type="button" size="xs" variant="ghost" onClick={() => setConfirmId(null)}>No</Button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmId(a.id)} disabled={a.used_in.length > 0} title={a.used_in.length ? 'It is used by an event, so it cannot be removed' : 'Remove from the library'} className="inline-flex items-center gap-1 self-start text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-40">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
