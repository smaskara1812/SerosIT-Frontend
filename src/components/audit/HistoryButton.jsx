import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCanViewHistory } from '@/lib/revertible'
import { IconHistory } from '@/components/icons'
import RecordHistory from './RecordHistory'

// A small History icon for one record, for screens that have their own layout instead of the shared
// master page (grids of rows). Shows only to App Admins, and only on pages that support revert.
// onChanged runs after a version was restored, so the screen can reload its rows.
export default function HistoryButton({ menuKey, recordId, title, onChanged }) {
  const { user } = useAuth()
  const allowed = useCanViewHistory(user, menuKey)
  const [open, setOpen] = useState(false)
  if (!allowed || recordId == null) return null
  return (
    <>
      <button
        type="button"
        title="History"
        aria-label="Show history"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <IconHistory className="h-3.5 w-3.5" />
      </button>
      {open && (
        <RecordHistory
          open
          entity={menuKey}
          recordId={recordId}
          title={title}
          onClose={() => setOpen(false)}
          onChanged={onChanged}
        />
      )}
    </>
  )
}
