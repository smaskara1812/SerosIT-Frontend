import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Guards a page that has editable state. While `dirty` is true:
//   - route changes (sidebar, top bar, back links, browser back) are held
//     behind a "Leave without saving?" dialog,
//   - closing/reloading the tab triggers the browser's own warning,
//   - Cmd/Ctrl+S runs `onSave` (if given).
// In-page navigation that isn't a route change (clicking another row in a
// split list/detail page) goes through `confirmLeave(fn)`, which runs `fn`
// right away when clean, or after the user confirms when dirty.
// Call `allowNextNavigation()` right before a navigate() that follows a
// successful save so the just-saved page doesn't block its own redirect.
export function useUnsavedChanges(dirty, { onSave } = {}) {
  const bypassRef = useRef(false)
  const [pendingFn, setPendingFn] = useState(null)

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (bypassRef.current) return false
        return dirty && currentLocation.pathname !== nextLocation.pathname
      },
      [dirty]
    )
  )

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  useEffect(() => {
    if (!dirty) return
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && onSaveRef.current) {
        e.preventDefault()
        onSaveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dirty])

  const confirmLeave = useCallback(
    (fn) => {
      if (dirty) setPendingFn(() => fn)
      else fn()
    },
    [dirty]
  )

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true
    setTimeout(() => {
      bypassRef.current = false
    }, 1000)
  }, [])

  const open = blocker.state === 'blocked' || pendingFn !== null

  function stay() {
    setPendingFn(null)
    if (blocker.state === 'blocked') blocker.reset()
  }

  function leave() {
    if (blocker.state === 'blocked') blocker.proceed()
    if (pendingFn) {
      const fn = pendingFn
      setPendingFn(null)
      fn()
    }
  }

  const dialog = (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stay() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>You have unsaved changes on this page. If you leave now, they'll be lost.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={stay}>Keep editing</Button>
          <Button variant="destructive" onClick={leave}>Discard and leave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { dialog, confirmLeave, allowNextNavigation }
}
