import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// Stored files (photos, signatures, certificates) are not public links: they are fetched with the signed-in user's token, and the server checks
// the user's right to the page the file belongs to. A picture is therefore loaded here and shown from a local blob address; a "view" link fetches
// the file the same way and opens the blob. Nothing in the address opens the file for anyone else, and everything is forgotten at sign-out.

const cache = new Map() // media path -> Promise<blob address | null>

export function mediaPath(url) {
  try {
    const u = new URL(url, window.location.origin)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function load(url) {
  const path = mediaPath(url)
  if (!cache.has(path)) {
    cache.set(
      path,
      apiFetch(path)
        .then(async (res) => (res.ok ? URL.createObjectURL(await res.blob()) : null))
        .catch(() => null),
    )
  }
  return cache.get(path)
}

// The address to put in <img src>, or null while loading / when the file cannot be opened.
export function useMediaUrl(url) {
  const [state, setState] = useState({ url: null, src: null })
  useEffect(() => {
    let live = true
    if (url) load(url).then((src) => live && setState({ url, src }))
    return () => {
      live = false
    }
  }, [url])
  return url && state.url === url ? state.src : null
}

// Opens a stored file (a picture or a PDF) in a new tab, fetched with the token.
export async function openMedia(url) {
  const src = await load(url)
  if (src) window.open(src, '_blank', 'noopener')
}

if (typeof window !== 'undefined') {
  window.addEventListener('seros:signed-out', () => {
    for (const p of cache.values()) p.then((src) => src && URL.revokeObjectURL(src))
    cache.clear()
  })
}
