import { createContext, useContext, useEffect, useState } from 'react'

const TopbarContext = createContext(null)

export function TopbarProvider({ children }) {
  const [subtitle, setSubtitle] = useState(null)
  return <TopbarContext.Provider value={{ subtitle, setSubtitle }}>{children}</TopbarContext.Provider>
}

// A list page calls this with e.g. "10,787 assets" so the topbar can show
// it next to the page title instead of the page repeating its own name and
// count in a second header row right below. Clears on unmount so leaving
// the page doesn't leave a stale count showing on the next one.
export function usePageSubtitle(text) {
  const ctx = useContext(TopbarContext)
  useEffect(() => {
    if (!ctx) return
    ctx.setSubtitle(text)
    return () => ctx.setSubtitle(null)
  }, [ctx, text])
}

export function useTopbarSubtitle() {
  const ctx = useContext(TopbarContext)
  return ctx?.subtitle ?? null
}
