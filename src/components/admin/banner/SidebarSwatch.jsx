import SidebarPattern from '@/components/home/BannerPattern'
import { sidebarTheme } from '@/lib/bannerDesign'

// A small stand-in for the app's sidebar, to see what "include the sidebar" does: the usual navy next to the sidebar in this banner's background, pattern and text colour.
function Mini({ label, background, fg, dim, pattern }) {
  const row = (text, active) => (
    <div className="rounded-md px-1.5 py-1 text-[9px] font-medium" style={{ background: active ? `rgb(${fg} / 0.14)` : 'transparent', color: `rgb(${fg} / ${active ? 1 : dim})` }}>{text}</div>
  )
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div className="relative isolate flex h-40 w-28 flex-col gap-1 overflow-hidden rounded-lg border border-black/10 p-2 shadow-sm" style={{ background }}>
        {pattern && <div className="pointer-events-none absolute inset-0 -z-10"><SidebarPattern fg={fg} /></div>}
        <div className="mb-1 h-4 rounded bg-white/95" />
        {row('Home', true)}
        {row('Dashboards')}
        {row('Reports')}
        {row('Admin')}
        <div className="mt-auto flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-full" style={{ background: 'linear-gradient(135deg,#5b9bff,#2563eb)' }} />
          <span className="text-[8px]" style={{ color: `rgb(${fg} / 0.7)` }}>Signed in</span>
        </div>
      </div>
      <figcaption className="text-[11px] text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

export default function SidebarSwatch({ design }) {
  const theme = sidebarTheme(design)
  return (
    <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border bg-muted/30 p-3" aria-label="How the sidebar will look">
      <Mini label="Usual" background="linear-gradient(180deg, #1e478c 0%, #16345f 60%, #10254a 100%)" fg="255 255 255" dim={0.55} />
      <Mini label="With this banner" background={theme.background} fg={theme.fg} dim={theme.dim} pattern />
    </div>
  )
}
