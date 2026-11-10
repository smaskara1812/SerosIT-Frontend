import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// The outfits Sero can wear, for choosing one on a banner. Empty until loaded; stays empty if the person may not read them.
export function useOutfitList() {
  const [list, setList] = useState([])
  useEffect(() => {
    let live = true
    apiFetch('/api/sero/outfits/').then(async (r) => {
      if (live && r.ok) setList((await r.json()).outfits || [])
    })
    return () => { live = false }
  }, [])
  return list
}
