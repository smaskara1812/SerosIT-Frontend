import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import AccessDenied from '@/components/AccessDenied'
import RigLoading from '@/components/RigLoading'
import { AlertTriangle, FileText, History, Mail } from 'lucide-react'

// Print Offer Letter: one approved letter, read-only, with the button that opens it as a PDF. Sending the letter by mail is planned: Send mail answers that it is not
// configured yet, and Mail status waits for it.

const MENU_KEY = 'hr.fs_offer_letter_print'
const BASE = '/api/hr/fs-offer-letter-print/'
const LIST = '/rig-personnel/print-offer-letters'
const dmy = (s) => (s ? String(s).split('-').reverse().join('/') : '')

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}

function Item({ label, children, wide }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-full' : ''}`}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 text-sm break-words whitespace-pre-line">{children || '—'}</p>
    </div>
  )
}

export default function PrintOfferLetterPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [letter, setLetter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [letterhead, setLetterhead] = useState(true)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    let alive = true
    apiFetch(`${BASE}${id}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setLetter(d))
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  // View offer letter: the PDF built from the saved letter, opened in a new tab.
  async function viewLetter() {
    setOpening(true)
    const tab = window.open('', '_blank')
    try {
      const res = await apiFetch(`${BASE}${id}/pdf/?letterhead=${letterhead ? 1 : 0}`)
      if (!res.ok) {
        toast.error((await res.json().catch(() => null))?.error || "Couldn't open the offer letter")
        if (tab) tab.close()
        return
      }
      const url = URL.createObjectURL(await res.blob())
      if (tab) tab.location.href = url
      else if (!window.open(url, '_blank')) {
        const a = document.createElement('a')
        a.href = url
        a.download = `Offer Letter - ${letter?.applicant_name || id}.pdf`
        a.click()
      }
    } catch {
      if (tab) tab.close()
      toast.error("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setOpening(false)
    }
  }

  async function sendMail() {
    const res = await apiFetch(`${BASE}${id}/send-mail/`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    toast.error(data.error || 'Sending the offer letter by mail is not configured yet.')
  }

  if (notFound) return <Navigate to={LIST} replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />
  if (loading || !letter) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        <RigLoading />
      </p>
    )
  }

  const counted = (letter.components || []).filter((c) => c.counts_in_total === 'Y')
  const heading = `Offer Letter: ${letter.applicant_name}`

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">{heading}</h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">{letter.template_label}</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{letter.workflow_label}</span>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link to={LIST} />}>
          Back to list
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Button onClick={viewLetter} disabled={opening || !letter.can_print}>
          <FileText className="h-4 w-4" /> {opening ? 'Opening…' : 'View offer letter'}
        </Button>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={letterhead} onChange={(e) => setLetterhead(e.target.checked)} className="h-4 w-4 accent-[#1a3f7a]" />
          With letterhead (header and footer)
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={sendMail}>
            <Mail className="h-4 w-4" /> Send mail
          </Button>
          <Button variant="outline" disabled title="Planned: shows when the letter was mailed and whether it was delivered">
            <History className="h-4 w-4" /> Mail status
          </Button>
        </div>
      </div>

      {letter.print_problems.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">This letter cannot be printed yet</p>
            <ul className="mt-1 list-disc pl-5 text-foreground">
              {letter.print_problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {letter.print_warnings.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="list-disc pl-5">
            {letter.print_warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Applicant">
        <Item label="Applicant">
          {letter.applicant_name} (application {letter.applicant_no})
        </Item>
        <Item label="E-mail">{letter.applicant_email}</Item>
        <Item label="Category">{letter.category_name}</Item>
        <Item label="Employment type">{letter.emp_type_name}</Item>
        <Item label="Address" wide>
          {letter.applicant_address}
        </Item>
      </Section>

      <Section title="Letter">
        <Item label="Date">{dmy(letter.fs_offer_letter_dt)}</Item>
        <Item label="Designation">{letter.rank_name}</Item>
        <Item label="Date of joining">{dmy(letter.fs_offer_letter_doj)}</Item>
        <Item label="Contract up to">{dmy(letter.contract_end_dt)}</Item>
        <Item label="Key person">{letter.key_personnel === 'Y' ? 'Yes' : 'No'}</Item>
      </Section>

      <Section title="Placement">
        <Item label="Rig">{letter.rig_site_label}</Item>
        <Item label="Company">{letter.company_name}</Item>
        <Item label="Rig location">{letter.rig_location}</Item>
        <Item label="Contact person">{letter.contact_person}</Item>
        <Item label="Contact no.">{letter.contact_tel_no}</Item>
        <Item label="Camp office address" wide>
          {letter.camp_office_addr}
        </Item>
      </Section>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Pay</h2>
        <div className="mb-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Item label="Include PF">{letter.included_pf === 'Y' ? 'Yes' : 'No'}</Item>
          <Item label="Total salary">{Number(letter.salary_amt).toLocaleString()}</Item>
          <Item label="On / off days">{letter.on_days || letter.off_days ? `${letter.on_days ?? 0} on / ${letter.off_days ?? 0} off` : ''}</Item>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Component</th>
                <th className="px-3 py-2 text-right text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Amount</th>
                <th className="px-3 py-2 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Counts in total</th>
                <th className="px-3 py-2 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase">Shown in letter</th>
              </tr>
            </thead>
            <tbody>
              {(letter.components || []).map((c) => (
                <tr key={c.component} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-1.5 font-medium">{c.component_name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{Number(c.amount).toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-center">{c.counts_in_total === 'Y' ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-1.5 text-center">{c.show_in_letter === 'Y' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30">
                <td className="px-3 py-2 text-sm font-semibold">Counted in the total</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{counted.reduce((s, c) => s + c.amount, 0).toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        {letter.on_off_desc && (
          <div className="mt-4">
            <Item label="Description" wide>
              {letter.on_off_desc}
            </Item>
          </div>
        )}
      </div>

      <Section title="Signing and travel">
        <Item label="Authority (undersigned)">{letter.authority_name}</Item>
        <Item label="Designation of authority">{letter.authority_designation}</Item>
        <Item label="Travel eligibility">{letter.travel_eligibility_name}</Item>
        <Item label="Travel eligibility text" wide>
          {letter.travel_class}
        </Item>
      </Section>

      <Section title="Status">
        <Item label="Created by">{letter.created_by_name}</Item>
        <Item label="Approved by">{letter.approved_by_name ? `${letter.approved_by_name} on ${dmy(letter.l1_approval_dt)}` : ''}</Item>
        <Item label="Applicant's response">{letter.response_status_label}</Item>
        <Item label="Mail status">{letter.mail_status}</Item>
        <Item label="Open the letter">
          {can(user, 'hr.fs_offer_letters', 'view') ? (
            <Link to={`/rig-personnel/offer-letters/${letter.fs_new_appl}/edit`} className="text-[#1a3f7a] underline underline-offset-2 dark:text-sky-300">
              On the Offer Letter page
            </Link>
          ) : (
            ''
          )}
        </Item>
      </Section>
    </div>
  )
}
