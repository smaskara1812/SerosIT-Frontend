import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { usePageSubtitle } from '@/context/TopbarContext'
import { useAuth } from '@/context/AuthContext'
import { can } from '@/lib/permissions'
import AccessDenied from '@/components/AccessDenied'
import { Button } from '@/components/ui/button'
import { MonthYearSelect } from '@/components/PeriodSelects'
import { toast } from 'sonner'
import { Download } from 'lucide-react'

const MENU_KEY = 'reports.rig_performance'
const GREEN = '#00988A'
const NAVY = '#1E2656'

function defaultMonth() {
  const d = new Date()
  d.setDate(d.getDate() - 1) // the report is up to yesterday
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}-${MON[Number(m) - 1]}-${y.slice(2)}`
}
const n2 = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(2))
const n4 = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(4))
const pc = (v, d = 1) => (v === null || v === undefined ? '' : `${(Number(v) * 100).toFixed(d)}%`)
const int = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('en-IN'))

// Excel-like cells: a grid of thin lines, numbers on the right, tabular figures.
const cell = 'border border-border px-2 py-1 text-right text-xs tabular-nums whitespace-nowrap'
const headCell = 'border border-border px-2 py-1.5 text-center text-xs font-semibold whitespace-nowrap text-white'

function Grid({ children }) {
  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <table className="border-collapse text-xs">{children}</table>
    </div>
  )
}

function RigSheet({ rig }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">RIG PERFORMANCE FOR {rig.name}</div>
      <Grid>
        <thead className="sticky top-0">
          <tr>
            {['Date', ...rig.cols, 'Total', 'Productivity', 'Revenue (INR Cr)'].map((h) => (
              <th key={h} className={headCell} style={{ background: GREEN }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rig.rows.map((r) => (
            <tr key={r.date}>
              <td className={`${cell} !text-left`}>{fmtDate(r.date)}</td>
              {r.reported ? (
                <>
                  {r.hours.map((h, i) => (
                    <td key={i} className={cell}>{n2(h)}</td>
                  ))}
                  <td className={cell}>{n2(r.total)}</td>
                  <td className={cell}>{pc(r.productivity)}</td>
                  <td className={`${cell} ${r.ilm_missing ? 'bg-amber-100 dark:bg-amber-900/40' : ''}`} title={r.ilm_missing ? 'ILM/IPM hours were reported but the ILM amount is not known (ILM Rate Terms)' : undefined}>{n4(r.revenue)}</td>
                </>
              ) : (
                <td className={`${cell} text-muted-foreground`} colSpan={rig.cols.length + 3}>
                  no report
                </td>
              )}
            </tr>
          ))}
          <tr className="bg-muted font-semibold">
            <td className={`${cell} !text-left`}>TOTAL/AVG</td>
            {rig.totals.map((h, i) => (
              <td key={i} className={cell}>{n2(h)}</td>
            ))}
            <td className={cell}>{n2(rig.total)}</td>
            <td className={cell}>{pc(rig.avg_productivity)}</td>
            <td className={cell}>{n4(rig.revenue)}</td>
          </tr>
        </tbody>
      </Grid>
    </div>
  )
}

function FinalSheet({ f, label }) {
  const n = f.rigs.length
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold">FINAL — {label}</div>
      <Grid>
        <thead>
          <tr>
            <th className={`${headCell} text-left`} style={{ background: NAVY }}>Months Target</th>
            {f.targets.map((t, i) => (
              <th key={i} className={headCell} style={{ background: NAVY }}>{pc(t, 0)}</th>
            ))}
            <th className={headCell} style={{ background: NAVY }}>{pc(f.avg_target, 0)}</th>
            <th className={`${headCell} text-left`} style={{ background: NAVY }} colSpan={1}>Projection (Cr)</th>
            {f.projections.map((p, i) => (
              <th key={i} className={headCell} style={{ background: NAVY }}>{p === null ? '' : Number(p).toFixed(2)}</th>
            ))}
            <th className={headCell} style={{ background: NAVY }}>{f.projection_total === null ? '' : Number(f.projection_total).toFixed(2)}</th>
            <th className={headCell} style={{ background: NAVY }} colSpan={3 * n}></th>
          </tr>
          <tr>
            <th className={headCell} style={{ background: GREEN }}>{label}</th>
            <th className={headCell} style={{ background: GREEN }} colSpan={n + 1}>Productivity</th>
            <th className={headCell} style={{ background: GREEN }} colSpan={n + 2}>Revenue (INR Cr)</th>
            <th className={headCell} style={{ background: GREEN }} colSpan={3 * n}>HSD Consumption, Cost Analysis and Closing Stock</th>
          </tr>
          <tr>
            <th className={headCell} style={{ background: NAVY }}>Date</th>
            {f.rigs.map((r) => (
              <th key={`p${r}`} className={headCell} style={{ background: NAVY }}>{r}</th>
            ))}
            <th className={headCell} style={{ background: NAVY }}>Avg</th>
            <th className={headCell} style={{ background: NAVY }}></th>
            {f.rigs.map((r) => (
              <th key={`r${r}`} className={headCell} style={{ background: NAVY }}>{r}</th>
            ))}
            <th className={headCell} style={{ background: NAVY }}>Total</th>
            {f.rigs.map((r) => (
              ['Consumption', 'Cost', 'Closing B'].map((h) => (
                <th key={`${r}${h}`} className={headCell} style={{ background: NAVY }}>{r} {h}</th>
              ))
            ))}
          </tr>
        </thead>
        <tbody>
          {f.days.map((d) => (
            <tr key={d.date}>
              <td className={`${cell} !text-left`}>{fmtDate(d.date)}</td>
              {d.productivity.map((p, i) => (
                <td key={i} className={cell}>{pc(p)}</td>
              ))}
              <td className={cell}>{pc(d.avg)}</td>
              <td className={cell}></td>
              {d.revenue.map((v, i) => (
                <td key={i} className={cell}>{n4(v)}</td>
              ))}
              <td className={cell}>{n4(d.total)}</td>
              {d.hsd.map((h, i) => (
                <FragmentCells key={i} h={h} />
              ))}
            </tr>
          ))}
          <tr className="bg-muted font-semibold">
            <td className={`${cell} !text-left`}>TOTAL/AVG</td>
            {f.totals.productivity.map((p, i) => (
              <td key={i} className={cell}>{pc(p)}</td>
            ))}
            <td className={cell}>{pc(f.totals.avg)}</td>
            <td className={cell}></td>
            {f.totals.revenue.map((v, i) => (
              <td key={i} className={cell}>{n4(v)}</td>
            ))}
            <td className={cell}>{n4(f.totals.total)}</td>
            {f.totals.hsd.map((h, i) => (
              <FragmentCells key={i} h={{ litres: h.litres, cost: h.cost, closing: null }} />
            ))}
          </tr>
          <tr>
            <td className={`${cell} !text-left font-semibold`}>Actual as a % of Target</td>
            {f.actual_vs_target.map((v, i) => (
              <td key={i} className={cell}>{pc(v)}</td>
            ))}
            <td className={cell}>{pc(f.actual_vs_target_avg)}</td>
            <td className={cell} colSpan={n + 2 + 3 * n}></td>
          </tr>
          <tr>
            <td className={`${cell} !text-left font-semibold`}>Revenue as a % of Projection</td>
            <td className={cell} colSpan={n + 2}></td>
            {f.revenue_vs_projection.map((v, i) => (
              <td key={i} className={cell}>{pc(v)}</td>
            ))}
            <td className={cell}>{pc(f.revenue_vs_projection_total)}</td>
            <td className={cell} colSpan={3 * n}></td>
          </tr>
          <tr>
            <td className={`${cell} !text-left font-semibold`}>Total Revenue (in CR)</td>
            <td className={`${cell} font-semibold`}>{n4(f.totals.total)}</td>
            <td className={cell} colSpan={2 * n + 3 + 3 * n - 1}></td>
          </tr>
        </tbody>
      </Grid>
    </div>
  )
}

function FragmentCells({ h }) {
  if (!h) return (<><td className={cell}></td><td className={cell}></td><td className={cell}></td></>)
  return (
    <>
      <td className={cell}>{int(h.litres)}</td>
      <td className={cell}>{n4(h.cost)}</td>
      <td className={cell}>{int(h.closing)}</td>
    </>
  )
}

function Notes({ notes }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-sm">
      {notes.map((n, i) => (
        <div key={i} className={n.heading ? 'mt-3 font-semibold first:mt-0' : 'text-muted-foreground'}>{n.text}</div>
      ))}
    </div>
  )
}

export default function RigPerformanceReportPage() {
  const { user } = useAuth()
  const canView = can(user, MENU_KEY, 'view')
  const canExport = can(user, MENU_KEY, 'export')
  const [month, setMonth] = useState(defaultMonth)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('FINAL')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!canView || !month) return undefined
    let live = true
    apiFetch(`/api/reports/rig-performance/?month=${month}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!live) return
        setError(ok ? '' : body.detail || 'The report could not be loaded.')
        setData(ok ? body : null)
        setLoading(false)
        setTab('FINAL')
      })
      .catch(() => {
        if (live) {
          setError('The report could not be loaded.')
          setLoading(false)
        }
      })
    return () => {
      live = false
    }
  }, [month, canView])

  usePageSubtitle(data?.label ? `${data.label}${data.end ? `, up to ${fmtDate(data.end)}` : ''}` : '')

  const tabs = useMemo(() => (data?.final ? ['FINAL', ...data.rigs.map((r) => r.name), 'Notes'] : []), [data])

  async function download() {
    setDownloading(true)
    try {
      const res = await apiFetch(`/api/reports/rig-performance/download/?month=${month}`)
      if (!res.ok) {
        toast.error((await res.json().catch(() => null))?.detail || 'The file could not be downloaded.')
        return
      }
      const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'Rig_Performance.xlsx'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(await res.blob())
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 30000)
    } finally {
      setDownloading(false)
    }
  }

  if (!canView) return <AccessDenied />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Month</span>
          <MonthYearSelect value={month} onChange={(v) => v && setMonth(v)} minYear={2020} />
        </div>
        <div className="text-sm text-muted-foreground">The month's file as it is mailed every day, up to yesterday.</div>
        {canExport && data?.final && (
          <Button size="lg" className="ml-auto" onClick={download} disabled={downloading}>
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Preparing…' : 'Download Excel'}
          </Button>
        )}
      </div>

      {loading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>}
      {!loading && error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>}
      {!loading && !error && data && !data.final && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{data.message}</div>}

      {!loading && !error && data?.final && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'FINAL' && <FinalSheet f={data.final} label={data.label} />}
          {tab === 'Notes' && <Notes notes={data.notes} />}
          {data.rigs.filter((r) => r.name === tab).map((r) => (
            <RigSheet key={r.name} rig={r} />
          ))}
        </>
      )}
    </div>
  )
}
