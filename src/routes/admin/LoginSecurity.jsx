import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'

const text = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Accounts waiting after too many wrong passwords, and addresses that tried many accounts (App Admin only).
export default function LoginSecurity() {
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    const res = await apiFetch('/api/admin/login-security/')
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  async function unlock(username) {
    const res = await apiFetch('/api/admin/login-security/unlock/', { method: 'POST', body: JSON.stringify({ username }) })
    if (res.ok) {
      toast.success(`${username} can try again now`)
      load()
    } else toast.error('Could not unlock')
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Login Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          After 5 wrong passwords an account must wait 30 seconds, then 5 minutes between tries. Nobody is locked out for good; unlock an account here if someone cannot wait.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Accounts waiting now</h2>
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">No account is waiting.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-1">Login</th><th>Wrong passwords</th><th>Last wrong</th><th>Wait left</th><th /></tr>
            </thead>
            <tbody>
              {data.waiting.map((w) => (
                <tr key={w.username} className="border-t border-border/60">
                  <td className="py-1.5 font-mono">{w.username}</td>
                  <td>{w.failures}</td>
                  <td>{new Date(w.last_failure).toLocaleTimeString()}</td>
                  <td>{w.wait_seconds > 0 ? text(w.wait_seconds) : 'can try'}</td>
                  <td className="text-right"><Button size="sm" variant="outline" onClick={() => unlock(w.username)}>Unlock</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">Addresses that tried many accounts</h2>
        <p className="mb-3 text-xs text-muted-foreground">Flagged when one address fails against 20 or more different logins in 10 minutes. {data ? `${data.refused_last_hour} attempts were refused in the last hour.` : ''}</p>
        {!data || data.flagged_addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">None in the last two days.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.flagged_addresses.map((f, i) => (
              <li key={i} className="flex justify-between border-t border-border/60 py-1.5">
                <span className="font-mono">{f.ip}</span>
                <span className="text-muted-foreground">{f.changes?.accounts_tried_in_10_min} accounts, {new Date(f.ts).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
