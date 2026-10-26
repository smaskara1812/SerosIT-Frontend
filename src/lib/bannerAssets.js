import { apiFetch } from '@/lib/api'
import { useMediaUrl } from '@/lib/authedMedia'

// Pictures uploaded for the home banner. The library, uploads and removal belong to the Banner Events page (its own rights); the picture itself
// can be fetched by any signed-in person, because everybody sees the banner. It is loaded with the person's token and shown from a local address,
// like every other stored file, and kept for the visit so a picture used twice is fetched once.
export const assetFileUrl = (id) => `/api/banner/assets/${id}/file/`

// The address to draw a picture layer from, or null while it loads (or if it cannot be loaded: the banner then simply shows without it).
export function useBannerPicture(id) {
  return useMediaUrl(id ? assetFileUrl(id) : null)
}

export async function listBannerAssets() {
  const res = await apiFetch('/api/admin/banner-assets/')
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Could not load the pictures.')
  return res.json()
}

// Sends a picture. Resolves to the stored picture ({..., existing: true} when it was already in the library); rejects with a message for the person.
export async function uploadBannerAsset(file) {
  const body = new FormData()
  body.append('file', file)
  const res = await apiFetch('/api/admin/banner-assets/', { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'That picture could not be added.')
  return data
}

export async function deleteBannerAsset(id) {
  const res = await apiFetch(`/api/admin/banner-assets/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'That picture could not be removed.')
}
