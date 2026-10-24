import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'
import { lastActivity, touchActivity } from '@/lib/idle'

const WARN_SECONDS = 120

// Signs the user out after `minutes` without any activity (in any open tab), with a warning and a countdown for the last two minutes.
// `onIdle` signs out; the server independently refuses a session that has been idle that long.
export default function IdleGuard({ minutes, onIdle }) {
  const [left, setLeft] = useState(null) // seconds until sign-out, only during the warning
  const lastWrite = useRef(0)

  useEffect(() => {
    touchActivity()
    const mark = () => {
      const now = Date.now()
      if (now - lastWrite.current > 10_000) {
        lastWrite.current = now
        touchActivity()
      }
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }))
    const tick = () => {
      const idle = (Date.now() - lastActivity()) / 1000
      const remaining = minutes * 60 - idle
      if (remaining <= 0) onIdle()
      else setLeft(remaining <= WARN_SECONDS ? Math.ceil(remaining) : null)
    }
    const id = setInterval(tick, 1000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark))
      clearInterval(id)
    }
  }, [minutes, onIdle])

  function stay() {
    touchActivity()
    setLeft(null)
    apiFetch('/api/auth/me/').catch(() => {}) // a call now keeps the server-side session fresh too
  }

  const mm = left == null ? '' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return (
    <Dialog open={left != null} onOpenChange={(open) => !open && stay()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Still there?</DialogTitle>
          <DialogDescription>
            You will be signed out in {mm} because there has been no activity. Anything unsaved will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onIdle}>Sign out now</Button>
          <Button onClick={stay}>Stay signed in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
