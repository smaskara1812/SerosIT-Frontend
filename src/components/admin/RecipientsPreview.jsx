import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fmtDayYear } from '@/lib/scheduledMail'
import { Button } from '@/components/ui/button'
import SentAs from '@/components/admin/SentAs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const KINDS = [['to', 'To'], ['cc', 'Cc'], ['bcc', 'Bcc']]

// Who an automatic mail goes to: every To, Cc and Bcc recipient with where it comes from. This is the list the mailer itself uses, resolved for the
// day shown, so what is listed here is what is sent. `data` is the payload of the recipients preview (see core/scheduled_mails_views.recipients_preview).
export function RecipientsPreview({ data, compact = false }) {
  if (!data) return null
  const sender = data.sender
  return (
    <div className="flex flex-col gap-4 text-sm">
      {!compact && <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Alert</dt>
        <dd>{data.alert ? <>{data.alert.name} <span className="text-muted-foreground">(alert {data.alert.id})</span></> : <span className="text-muted-foreground">Not connected to an alert</span>}</dd>
        <dt className="text-muted-foreground">Subject</dt>
        <dd className="break-words">{data.subject || '—'}</dd>
        <dt className="text-muted-foreground">Sent as</dt>
        <dd><SentAs name={data.from_name} address={data.from_address} /></dd>
        <dt className="text-muted-foreground">Account</dt>
        <dd>{sender ? <>The alert’s own account (<code className="text-xs">{sender.from_address}</code>)</> : 'The default system account'}</dd>
        <dt className="text-muted-foreground">Day</dt>
        <dd>{fmtDayYear(data.as_of)}</dd>
      </dl>}
      {!compact && data.warnings?.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {data.warnings.map((w) => <li key={w} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}</li>)}
        </ul>
      )}
      {KINDS.map(([k, label]) => {
        const rows = data.recipients.filter((e) => e.type === k)
        return (
          <section key={k}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label} <span className="font-normal">({rows.length})</span></h3>
            {rows.length === 0 ? <p className="text-xs text-muted-foreground">Nobody</p> : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <tbody>
                    {rows.map((e) => (
                      <tr key={`${e.email}${e.source}`} className="border-b border-border/60 last:border-b-0">
                        <td className="px-3 py-1.5 font-medium">{e.email}{e.name ? <span className="ml-1.5 font-normal text-muted-foreground">{e.name}</span> : null}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{e.source}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">from {fmtDayYear(e.from)}{e.to_date ? ` to ${fmtDayYear(e.to_date)}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })}
      {data.snapshot && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">As it was sent</h3>
          <p className="break-words text-xs">{data.snapshot}</p>
        </section>
      )}
      {data.links?.recipients && (
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to={data.links.recipients} className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Edit these recipients (Alert To Users, for this alert)</Link>
          {data.links.alert && <Link to={data.links.alert} className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Open the alert</Link>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {data.error_mail_to?.length ? <>If this mail fails for good, <b>{data.error_mail_to.join(', ')}</b> is told by e-mail.</> : 'Nobody is e-mailed when this mail fails: SCHEDULER_ERROR_MAIL_TO is not set on the server.'}
      </p>
    </div>
  )
}

// The same, in a dialog, for one item of Scheduled Mails.
export function RecipientsDialog({ item, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!item) return undefined
    let live = true
    apiFetch(`/api/admin/scheduled-mails/${item.id}/recipients/`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!live) return
        if (r.ok) setData(d)
        else setError(d.detail || 'The recipients could not be loaded.')
      })
      .catch(() => live && setError('The recipients could not be loaded.'))
    return () => {
      live = false
    }
  }, [item])
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Who {item?.status === 'sent' ? 'it went to' : 'it goes to'}: {item?.label}</DialogTitle>
          <DialogDescription>Every recipient, with where it comes from. The mailer uses this same list, worked out for the day of the mail.</DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        <RecipientsPreview data={data} />
        <DialogFooter><Button type="button" variant="secondary" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
