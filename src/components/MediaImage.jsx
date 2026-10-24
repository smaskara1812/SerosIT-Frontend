import { useMediaUrl } from '@/lib/authedMedia'

// <img> for a stored file: loaded with the user's token (see lib/authedMedia.js). Shows nothing until it has loaded.
export default function MediaImage({ url, alt = '', className }) {
  const src = useMediaUrl(url)
  if (!src) return <div className={className} aria-hidden="true" />
  return <img src={src} alt={alt} className={className} />
}
