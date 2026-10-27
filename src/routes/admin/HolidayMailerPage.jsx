import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import EventsTab from '@/components/admin/holiday/EventsTab'
import SetupTab from '@/components/admin/holiday/SetupTab'

const MENU_KEY = 'admin.holiday_mailer'
const TABS = [
  ['events', 'Events'],
  ['setup', 'Mail setup'],
]

// Admin > Holiday Mailer: the festival and holiday pictures and the dates each one goes out, and a read-only view of how the mail is set up. The mail itself
// goes out on a schedule: see Scheduled Mails.
export default function HolidayMailerPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('events')
  const [refreshKey, setRefreshKey] = useState(0)
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />
  const bump = () => setRefreshKey((k) => k + 1)
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-semibold">Holiday Mailer</h1>
        <p className="text-sm text-muted-foreground">On the date set for each festival or holiday, its picture goes to everyone on the “Holiday Events” alert. It can go on one day or on several days in a row.</p>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Holiday Mailer">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>
          ))}
        </div>
      </div>
      {tab === 'events' && <EventsTab mayAdd={can(user, MENU_KEY, 'add')} mayEdit={can(user, MENU_KEY, 'edit')} mayDelete={can(user, MENU_KEY, 'delete')} onChanged={bump} />}
      {tab === 'setup' && <SetupTab mayEdit={can(user, MENU_KEY, 'edit')} refreshKey={refreshKey} />}
    </div>
  )
}
