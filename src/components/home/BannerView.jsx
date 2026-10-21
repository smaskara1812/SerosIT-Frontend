import { useEffect, useRef, useState } from 'react'
import BannerArt from '@/components/home/BannerArt'
import { backgroundCss, bannerFrame, fillTokens, textColorOf, withDefaults, yearTokens } from '@/lib/bannerDesign'

// The home banner for a custom design (Admin > Banner Events). The same component draws the live banner and the editor's
// preview, so what a person sees while designing is exactly what everyone sees on the day. The search box and the notice
// card are handed in, because the live page has the real ones and the editor shows stand-ins.
//
// The layout answers to the banner's own width (a container query), not the window's, so the editor's Wide / Medium /
// Phone preview behaves like a real screen of that size.
export default function BannerView({ design: raw, firstName, todayLabel, fallbackTitle, fallbackSub, lastSigned, search, notice, previewBadge, overlay, zones }) {
  const design = withDefaults(raw)
  const color = textColorOf(design)
  const layout = design.layout
  const noticeRef = useRef(null)
  const [noticeH, setNoticeH] = useState(0)
  useEffect(() => {
    const el = noticeRef.current
    if (!el) return undefined
    const report = () => setNoticeH(Math.ceil(el.getBoundingClientRect().height))
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [notice])

  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
  const tokens = { name: firstName, date, ...yearTokens() }
  const title = fillTokens(design.text.greeting, tokens) || fallbackTitle
  const sub = design.text.greeting || design.text.message ? fillTokens(design.text.message, tokens) : fallbackSub
  const caption = fillTokens(design.text.caption, tokens)

  const centred = layout === 'centred'
  const mirrored = layout === 'mirrored'
  const blockCls = centred ? 'mx-auto text-center' : mirrored ? '@4xl:ml-auto @4xl:text-right' : ''
  // Across and down, as percentages of the room the card has (see .banner-notice in index.css); in the Centred layout it simply sits underneath.
  const nx = design.notice.x ?? (mirrored ? 0 : 100)
  const noticeStyle = centred ? undefined : { '--nx': nx, '--ny': design.notice.y, '--nh': `${noticeH}px` }
  const noticePos = centred ? 'mx-auto mt-6 w-full max-w-sm' : 'banner-notice'
  const noticeNode = (
    <div ref={noticeRef} style={noticeStyle} className={`empty:hidden ${noticePos} ${zones ? 'rounded-2xl outline-dashed outline-2 outline-offset-2 outline-sky-400/80' : ''}`}>
      {notice}
      {zones && notice && <ZoneLabel>Notice</ZoneLabel>}
    </div>
  )
  const chipBg = `${color}22`
  const chipBorder = `${color}55`

  return (
    <section data-shelf className="@container relative rounded-3xl" style={{ background: backgroundCss(design), boxShadow: bannerFrame(design) }}>
      {previewBadge && (
        <span className="absolute -top-3 left-6 z-20 rounded-full bg-amber-400 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow">
          {previewBadge}
        </span>
      )}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <BannerArt design={design} />
      </div>
      <div
        className="relative z-10 px-8 pb-10 pt-11 sm:px-10 @4xl:min-h-[var(--notice-min)]"
        style={{ color, '--notice-min': !centred && noticeH ? `${noticeH + 84}px` : '0px' }}
      >
        <div className={centred ? 'flex flex-col items-center' : 'flex flex-wrap items-start justify-between gap-x-8 gap-y-4'}>
          <div className={`relative max-w-xl ${blockCls} ${zones ? 'outline-dashed outline-2 outline-offset-4 outline-sky-400/80' : ''}`}>
            {zones && <ZoneLabel>Greeting and message</ZoneLabel>}
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ opacity: 0.85 }}>{todayLabel}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ textWrap: 'balance' }}>{title}</h1>
            {sub && <p className="mt-2 text-[15px] leading-relaxed" style={{ opacity: 0.8, textWrap: 'balance' }}>{sub}</p>}
            {caption && (
              <span className="mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold tracking-wide" style={{ background: chipBg, borderColor: chipBorder }}>
                {caption}
              </span>
            )}
          </div>
          {!centred && noticeNode}
        </div>

        <div className={`relative mt-7 max-w-2xl ${centred ? 'mx-auto' : mirrored ? '@4xl:ml-auto' : ''} ${zones ? 'rounded-2xl outline-dashed outline-2 outline-offset-2 outline-sky-400/80' : ''}`}>
          <div style={{ '--search-tint': design.search.tint }}>{search}</div>
          {zones && <ZoneLabel>Search</ZoneLabel>}
        </div>
        {centred && noticeNode}

        {design.showLastSignIn && lastSigned && (
          <p className={`mt-4 text-xs ${centred ? 'text-center' : mirrored ? '@4xl:text-right' : ''}`} style={{ opacity: 0.55 }}>
            Last signed in {lastSigned}
          </p>
        )}
      </div>
      {overlay && <div className="absolute inset-0 z-30 overflow-hidden rounded-3xl">{overlay}</div>}
    </section>
  )
}

// A small tag on a dashed outline in the editor, saying what lives there.
function ZoneLabel({ children }) {
  return <span className="pointer-events-none absolute -top-3 left-2 z-20 rounded bg-sky-500 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">{children}</span>
}
