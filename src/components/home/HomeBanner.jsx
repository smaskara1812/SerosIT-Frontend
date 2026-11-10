import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadActiveBanner, readCachedBanner } from '@/lib/activeBanner'
import EggBoundary from '@/components/EggBoundary'
import { pickGreeting } from '@/lib/greeting'
import { setCustomBanner } from '@/lib/easter'
import { EASTER_EGGS } from '@/config/easterEggs'
import { noticeLook, toneOf, withDefaults } from '@/lib/bannerDesign'
import HomeHero from '@/components/home/HomeHero'
import NoticeBanner from '@/components/home/NoticeBanner'
import PageSearch from '@/components/PageSearch'

// The drawing code for a custom banner (the shape library and all) is fetched only on a day when one is live, so every other day
// nobody downloads it.
const BannerView = lazy(() => import('@/components/home/BannerView'))
const HomeSero = lazy(() => import('@/components/home/HomeSero'))

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// The home page's banner: the normal one, or the custom design Admin > Banner Events has set for today. On a custom day the
// banner's hidden touches (the Konami and helicopter scenes, the idle hints) are switched off, and `onCustomChange` tells
// the home page so.
export default function HomeBanner({ firstName, info, scene, hint, onCustomChange }) {
  const [params] = useSearchParams()
  const previewId = params.get('bannerPreview')
  const [answer, setAnswer] = useState(() => {
    const c = previewId ? null : readCachedBanner()
    if (c) setCustomBanner(!!c.event)
    return c // null = not known yet
  })

  useEffect(() => {
    let cancelled = false
    loadActiveBanner(previewId).then(({ event, sero }) => {
      if (cancelled) return
      setCustomBanner(!!event) // before anything draws, so the search box already knows
      onCustomChange?.(!!event)
      setAnswer({ event, sero })
    })
    return () => {
      cancelled = true
    }
  }, [previewId, onCustomChange])

  const greeting = useMemo(() => pickGreeting(firstName), [firstName])
  const event = answer?.event
  const outfit = answer?.sero ?? null
  const design = useMemo(() => (event ? withDefaults(event.design) : null), [event])

  const placeholder = <div className="rounded-3xl" style={{ minHeight: 300, background: 'linear-gradient(118deg, #1c448a 0%, #17356f 48%, #0f2650 100%)' }} aria-hidden="true" />
  if (answer === null) return placeholder
  if (!event) return <HomeHero firstName={firstName} info={info} scene={scene} hint={hint} />

  const bannerTone = toneOf(design)
  const look = noticeLook(design.notice, bannerTone)
  return (
    <Suspense fallback={placeholder}>
    <BannerView
      design={design}
      firstName={firstName}
      todayLabel={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      fallbackTitle={greeting.title}
      fallbackSub={greeting.sub}
      lastSigned={formatTime(info?.last_login)}
      previewBadge={event.preview ? `Preview: ${event.name}. Only you can see this.` : null}
      search={<PageSearch variant="hero" />}
      sero={design.sero.show && EASTER_EGGS.sero ? <EggBoundary><Suspense fallback={null}><HomeSero outfit={outfit} place={design.sero.x != null && design.sero.y != null ? { x: design.sero.x, y: design.sero.y } : null} /></Suspense></EggBoundary> : null}
      notice={<NoticeBanner tone={look.tone} look={look} widthClass="" />}
    />
    </Suspense>
  )
}
