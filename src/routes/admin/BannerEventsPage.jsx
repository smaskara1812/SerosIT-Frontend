import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Copy, Eye, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, asList } from '@/lib/api'
import { can } from '@/lib/permissions'
import { withDefaults } from '@/lib/bannerDesign'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import BannerView from '@/components/home/BannerView'
import { FitPreview } from '@/components/admin/banner/controls'

const MENU_KEY = 'admin.banner_events'
const TABS = [['', 'All'], ['live', 'Live today'], ['upcoming', 'Upcoming'], ['past', 'Past'], ['draft', 'Drafts']]
const STATUS_STYLE = {
  live: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  upcoming: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  past: 'bg-muted text-muted-foreground',
  draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
}
const STATUS_LABEL = { live: 'Live today', upcoming: 'Upcoming', past: 'Past', draft: 'Draft' }
const PRIORITY_LABEL = (p) => (p > 0 ? 'Higher importance' : p < 0 ? 'Lower importance' : null)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (s, withYear) => `${Number(s.slice(8, 10))} ${MONTHS[Number(s.slice(5, 7)) - 1]}${withYear ? ` ${s.slice(0, 4)}` : ''}`
function range(ev) {
  const yearly = ev.repeat_yearly === 'Y'
  if (ev.starts_on === ev.ends_on) return day(ev.starts_on, !yearly)
  return `${day(ev.starts_on, !yearly)} to ${day(ev.ends_on, !yearly)}`
}

// A small picture of the event's banner. It is only drawn once it scrolls near the screen (until then a plain placeholder of the
// same size holds its place), so a long list never has to draw every banner at once.
function Thumb({ design }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined') // very old browsers just draw them all
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return (
    <div ref={ref} className="pointer-events-none w-60 shrink-0 self-start overflow-hidden rounded-xl border border-border bg-muted/50" style={seen ? undefined : { height: 71 }} aria-hidden="true">
      {seen && (
        <FitPreview width={1100}>
          <BannerView
            design={withDefaults(design)}
            firstName="Soham"
            todayLabel="Sunday 18 October"
            fallbackTitle="Good morning, Soham"
            fallbackSub="Here is where things stand."
            search={<div className="h-13 rounded-2xl bg-[var(--search-tint,#ffffff)] shadow-lg" />}
          />
        </FitPreview>
      )}
    </div>
  )
}

const PAGE = 20

export default function BannerEventsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [shown, setShown] = useState(PAGE) // how many events are listed; the rest appear on 'Show more'
  const mayView = can(user, MENU_KEY, 'view')
  const mayAdd = can(user, MENU_KEY, 'add')
  const mayEdit = can(user, MENU_KEY, 'edit')
  const mayDelete = can(user, MENU_KEY, 'delete')

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await apiFetch(`/api/admin/banner-events/?page_size=200${tab ? `&status=${tab}` : ''}`)
      if (!res.ok) throw new Error('load failed')
      setRows(asList(await res.json()))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [tab])
  useEffect(() => {
    if (mayView) load()
  }, [mayView, load])

  if (!mayView) return <AccessDenied />

  async function confirmDelete() {
    const ev = deleting
    setDeleting(null)
    const res = await apiFetch(`/api/admin/banner-events/${ev.event_id}/`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      toast.success('Event deleted')
      load()
    } else toast.error("Couldn't delete the event. Please try again.")
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Banner Events</h1>
          <p className="text-sm text-muted-foreground">Give the home page banner a special look on the days you choose, such as a festival or a safety week.</p>
        </div>
        {mayAdd && (
          <Link to="/admin/banner-events/new" className={buttonVariants()}>
            <Plus /> New banner event
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5" role="tablist" aria-label="Filter events">
        {TABS.map(([value, label]) => (
          <button key={value || 'all'} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setShown(PAGE) }} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <RigLoading />
        ) : failed ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Could not load the events. Please refresh and try again.</p>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-medium">{tab ? 'No events here.' : 'No banner events yet.'}</p>
            {mayAdd && !tab && <p className="mt-1 text-sm text-muted-foreground">Create one and pick its days. Until then the banner looks as it always does.</p>}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.slice(0, shown).map((ev) => (
              <li key={ev.event_id} className="flex flex-wrap gap-4 rounded-xl border border-border p-4">
                <Thumb design={ev.design} />
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[ev.status]}`}>{STATUS_LABEL[ev.status]}</span>
                    {ev.repeat_yearly === 'Y' && <span className="text-xs text-muted-foreground">Repeats every year</span>}
                    {PRIORITY_LABEL(ev.priority) && <span className="text-xs text-muted-foreground">{PRIORITY_LABEL(ev.priority)}</span>}
                  </div>
                  <p className="mt-1.5 font-semibold">{ev.name}</p>
                  <p className="text-sm text-muted-foreground">{range(ev)}{ev.posted_by ? ` · Made by ${ev.posted_by}` : ''}</p>
                  {ev.overlaps?.length > 0 && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                      <span>Falls on the same days as {ev.overlaps.join(', ')}. Only the one with higher importance shows, or the one that starts later.</span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {mayEdit && <Link to={`/admin/banner-events/${ev.event_id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Pencil /> Edit</Link>}
                    <Link to={`/?bannerPreview=${ev.event_id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Eye /> See it on my home page</Link>
                    {mayAdd && <Button variant="outline" size="sm" onClick={() => navigate(`/admin/banner-events/new?copy=${ev.event_id}`)}><Copy /> Duplicate</Button>}
                    {mayDelete && <Button variant="destructive" size="sm" onClick={() => setDeleting(ev)} aria-label="Delete this event"><Trash2 /></Button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && !failed && rows.length > shown && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>Show more ({rows.length - shown} more)</Button>
          </div>
        )}
      </div>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>“{deleting?.name}” will be removed and the banner goes back to normal on its days. This is recorded in the audit trail.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
