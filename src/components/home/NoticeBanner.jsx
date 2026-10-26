import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch, asList } from '@/lib/api'
import { noticeFingerprint } from '@/lib/notices'
import { NoticeContent, NoticePanel } from '@/components/home/NoticeCard'

const ROTATE_MS = 9000
const REFRESH_MS = 5 * 60 * 1000

// The right-hand side of the home banner: the notices that are live right now, one at a time, rotating slowly (it
// stops while the pointer or keyboard focus is on it), with arrows and dots to move by hand. With no live notice it
// renders nothing, so the banner looks exactly as it always did. Failing to load notices is silent for the same reason.
//
// Every notice sits in the same grid cell inside one panel and only the current one is visible, so the card is always
// as tall as the tallest notice and never changes size when it rotates. Its height is reported through `onHeight`, so the banner can
// keep room for it (and only grows when it genuinely has none).
export default function NoticeBanner({ onHeight, tone = 'dark', look = null, widthClass = 'xl:w-[23rem] xl:shrink-0' }) {
  const navigate = useNavigate()
  const [notices, setNotices] = useState([])
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      apiFetch('/api/notices/live/')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => !cancelled && setNotices(asList(data)))
        .catch(() => {})
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const count = notices.length
  const index = count ? at % count : 0

  // A manual move restarts the countdown, so the notice someone just chose is not whisked away a second later.
  useEffect(() => {
    if (paused || count < 2) return undefined
    const id = setInterval(() => setAt((i) => i + 1), ROTATE_MS)
    return () => clearInterval(id)
  }, [paused, count, at])

  // Tell the banner how tall this block is (0 when there is nothing to show).
  useEffect(() => {
    if (!onHeight) return undefined
    const el = boxRef.current
    if (!el) {
      onHeight(0)
      return undefined
    }
    const report = () => onHeight(Math.ceil(el.getBoundingClientRect().height))
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => {
      ro.disconnect()
      onHeight(0)
    }
  }, [onHeight, count])

  if (count === 0) return null

  const light = tone === 'light'
  const arrowCls = light ? 'text-[#0f2650]/60 hover:bg-[#0f2650]/10 hover:text-[#0f2650] focus-visible:ring-[#0f2650]/40' : 'text-white/55 hover:bg-white/10 hover:text-white focus-visible:ring-white/40'
  const go = (step) => setAt((index + step + count) % count)
  const current = notices[index]
  // An in-app link goes through the router so the page does not reload.
  const open = (e) => {
    if (current.link_url?.startsWith('/')) {
      e.preventDefault()
      navigate(current.link_url)
    }
  }

  return (
    <section
      ref={boxRef}
      aria-label="Notices"
      className={`w-full ${widthClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* One panel stays put; only the words inside it fade. The old words leave quickly, then the new ones come in, so
          the two are never on screen at once and the glass never goes see-through. */}
      <NoticePanel kind={current.kind} tone={tone} look={look}>
        <div className="grid">
          {notices.map((n, i) => (
            <div
              key={noticeFingerprint(n)}
              className={`col-start-1 row-start-1 transition-opacity ease-in-out ${i === index ? 'opacity-100 delay-200 duration-300' : 'pointer-events-none opacity-0 duration-200'}`}
              aria-hidden={i !== index}
              inert={i !== index}
            >
              <NoticeContent notice={n} onOpen={open} tone={tone} />
            </div>
          ))}
        </div>
      </NoticePanel>
      {count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous notice"
            className={`rounded-full p-1 outline-none transition-colors focus-visible:ring-2 ${arrowCls}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a notice">
            {notices.map((n, i) => (
              <button
                key={n.notice_id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Notice ${i + 1} of ${count}`}
                onClick={() => setAt(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? (light ? 'w-5 bg-[#0f2650]/80' : 'w-5 bg-white/80') : light ? 'w-1.5 bg-[#0f2650]/25 hover:bg-[#0f2650]/50' : 'w-1.5 bg-white/30 hover:bg-white/55'}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next notice"
            className={`rounded-full p-1 outline-none transition-colors focus-visible:ring-2 ${arrowCls}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
