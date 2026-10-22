import { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'

const IMAGE_NAME = /\.(jpe?g|png|gif)$/i

// A small picture of an uploaded or just-chosen file, for every place a file is attached. `url` is a stored file's link (`name` is its
// name, so PDFs and Word files are skipped), `file` is a File the person has just picked and not saved yet. Shows nothing for a file that
// is not a picture, so callers can put it next to any file input. Clicking a stored picture opens it full size in a new tab.
export default function FilePreview({ url, name, file, className, size = 'h-24' }) {
  const localUrl = useMemo(() => (file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => localUrl && URL.revokeObjectURL(localUrl), [localUrl])

  const src = file ? localUrl : url && IMAGE_NAME.test(name || '') ? url : null
  if (!src) return null
  const img = <img src={src} alt="Preview" className={cn(size, 'max-w-full rounded-lg border bg-white object-contain p-1.5', className)} />
  return file ? img : <a href={src} target="_blank" rel="noreferrer" className="block w-fit">{img}</a>
}
