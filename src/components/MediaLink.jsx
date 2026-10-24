import { openMedia } from '@/lib/authedMedia'

// A link that opens a stored file in a new tab, fetched with the user's token (an <a href> cannot send it).
export default function MediaLink({ url, className, children }) {
  return (
    <button type="button" className={className} onClick={() => openMedia(url)}>
      {children}
    </button>
  )
}
