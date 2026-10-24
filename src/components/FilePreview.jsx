import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import MediaImage from '@/components/MediaImage'
import MediaLink from '@/components/MediaLink'

const IMAGE_NAME = /\.(jpe?g|png|gif)$/i

// A small picture of an uploaded or just-chosen file, for every place a file is attached. `url` is a stored file's link (`name` is its
// name, so PDFs and Word files are skipped), `file` is a File the person has just picked and not saved yet. Shows nothing for a file that
// is not a picture, so callers can put it next to any file input. Clicking a stored picture opens it full size in a new tab.
export default function FilePreview({ url, name, file, className, size = 'h-24' }) {
  const localUrl = useMemo(() => (file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => localUrl && URL.revokeObjectURL(localUrl), [localUrl])

  const cls = cn(size, 'max-w-full rounded-lg border bg-white object-contain p-1.5', className)
  if (file) return localUrl ? <img src={localUrl} alt="Preview" className={cls} /> : null
  if (!url || !IMAGE_NAME.test(name || '')) return null
  // a stored file: loaded with the user's token (lib/authedMedia.js), opened full size the same way
  return (
    <MediaLink url={url} className="block w-fit">
      <MediaImage url={url} alt="Preview" className={cls} />
    </MediaLink>
  )
}
