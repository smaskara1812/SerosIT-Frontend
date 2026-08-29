import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'

// Rendered in place of a page's real content when the signed-in user lacks
// view rights on it — used instead of silently redirecting to "/", which
// just looks like the click did nothing. Deliberately does not touch the
// URL: whoever typed/bookmarked the link can see plainly why nothing loaded
// rather than landing back on the Dashboard wondering what happened.
export default function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: '#fdeeee', color: '#c0392b' }}
      >
        <Lock className="h-7 w-7" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-bold text-foreground">Access Denied</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this page. If you think this is a mistake, ask an admin to
          grant you access under User Rights.
        </p>
      </div>
      <Link
        to="/"
        className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
