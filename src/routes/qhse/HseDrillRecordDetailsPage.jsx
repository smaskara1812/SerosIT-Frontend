import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import { usePageSubtitle } from '@/context/TopbarContext'
import AccessDenied from '@/components/AccessDenied'
import HseDrillRecordChildPanel from './HseDrillRecordChildPanel'
import { Button } from '@/components/ui/button'

const MENU_KEY = 'qhse.hse_drill_record'

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function fmtTime(iso) {
  if (!iso) return ''
  return (iso.slice(11, 16)) || ''
}

function SummaryField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  )
}

export default function HseDrillRecordDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [hdr, setHdr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  usePageSubtitle(hdr ? `Drill Details — ${hdr.drill_record_no}` : null)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    apiFetch(`/api/qhse/hse-drill-record/${id}/`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(setHdr)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function printReport() {
    const tab = window.open('', '_blank')
    const res = await apiFetch(`/api/qhse/hse-drill-record/${id}/print/`)
    if (!res.ok) {
      toast.error('Failed to generate report')
      if (tab) tab.close()
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    if (tab) {
      tab.location.href = url
    } else if (!window.open(url, '_blank')) {
      const a = document.createElement('a')
      a.href = url
      a.download = `HSE Drill Record - ${hdr.drill_record_no}.pdf`
      a.click()
    }
  }

  if (notFound) return <Navigate to="/qhse/hse-drill-record" replace />
  if (!can(user, MENU_KEY, 'view')) return <AccessDenied />

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{hdr ? `Drill Record ${hdr.drill_record_no}` : 'Drill Details'}</h1>
        <div className="flex items-center gap-2">
          {!loading && hdr && (
            <Button variant="outline" onClick={printReport}>
              Print
            </Button>
          )}
          {!loading && hdr && can(user, MENU_KEY, 'edit') && (
            <Button variant="outline" onClick={() => navigate(`/qhse/hse-drill-record/${id}/edit`)}>
              Edit Header
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Read-only header context — the fields themselves are owned by
              the Header form (/edit); this page is purely for compiling
              the Events/Observations/Improvements/Corrective Action/Photos
              that come after the drill, often by a different person than
              whoever created the header, same separation as legacy's own
              frmHSE_Drill_Record_Hdr.aspx vs. _Hdr_Details.aspx. */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryField label="Rig" value={hdr.rig_name} />
              <SummaryField label="Report No." value={hdr.drill_record_no} />
              <SummaryField label="Drill Date" value={fmtDate(hdr.drill_dt)} />
              <SummaryField label="Drill Time" value={fmtTime(hdr.drill_dt)} />
              <SummaryField label="Type of Drill" value={[hdr.hse_drill_1_name, hdr.hse_drill_2_name].filter(Boolean).join(' + ')} />
            </div>
          </div>

          <HseDrillRecordChildPanel
            hdrId={id}
            drillDate={hdr.drill_dt ? hdr.drill_dt.slice(0, 10) : ''}
            canAdd={can(user, MENU_KEY, 'add')}
            canEdit={can(user, MENU_KEY, 'edit')}
            canDelete={can(user, MENU_KEY, 'delete')}
          />
        </>
      )}
    </div>
  )
}
