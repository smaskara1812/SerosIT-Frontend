import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import PeopleTab from '@/components/admin/birthday/PeopleTab'
import TemplatesTab from '@/components/admin/birthday/TemplatesTab'
import SetupTab from '@/components/admin/birthday/SetupTab'

const MENU_KEY = 'admin.birthday_mailer'
const TABS = [
  ['people', 'People'],
  ['templates', 'Templates'],
  ['setup', 'Mail setup'],
]

// Admin > Birthday Mailer: the list of people (kept here, not taken from the users), the pictures the name is written on, and a read-only view of how the mail
// is set up. The mail itself goes out on a schedule: see Scheduled Mails.
export default function BirthdayMailerPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('people')
  const [refreshKey, setRefreshKey] = useState(0)
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />
  const bump = () => setRefreshKey((k) => k + 1)
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-semibold">Birthday Mailer</h1>
        <p className="text-sm text-muted-foreground">On each person’s birthday a card with their name goes to the people on the alert. Two birthdays on one day are two mails.</p>
        <div className="mt-3 flex gap-1" role="tablist" aria-label="Birthday Mailer">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>
          ))}
        </div>
      </div>
      {tab === 'people' && <PeopleTab mayAdd={can(user, MENU_KEY, 'add')} mayEdit={can(user, MENU_KEY, 'edit')} mayDelete={can(user, MENU_KEY, 'delete')} mayExport={can(user, MENU_KEY, 'export')} onChanged={bump} />}
      {tab === 'templates' && <TemplatesTab mayAdd={can(user, MENU_KEY, 'add')} mayEdit={can(user, MENU_KEY, 'edit')} mayDelete={can(user, MENU_KEY, 'delete') || can(user, MENU_KEY, 'edit')} onChanged={bump} />}
      {tab === 'setup' && <SetupTab mayEdit={can(user, MENU_KEY, 'edit')} refreshKey={refreshKey} />}
    </div>
  )
}
