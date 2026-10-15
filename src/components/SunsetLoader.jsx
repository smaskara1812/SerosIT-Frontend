import { Suspense, lazy, useCallback, useEffect, useState } from 'react'

// The sunset scene is the biggest of the playful pieces, so it is not part of the app's normal download:
// its code is fetched the first time the secret phrase is used, mounted for the length of the scene, and
// unmounted again. Until then this component is only a small listener.
const SunsetScene = lazy(() => import('@/components/SunsetScene'))

export default function SunsetLoader() {
  const [run, setRun] = useState(null)
  useEffect(() => {
    const play = (e) => setRun({ id: performance.now(), name: e.detail?.name || '' })
    window.addEventListener('seros:sunset', play)
    return () => window.removeEventListener('seros:sunset', play)
  }, [])
  const done = useCallback(() => setRun(null), [])
  if (!run) return null
  return (
    <Suspense fallback={null}>
      <SunsetScene key={run.id} name={run.name} onDone={done} />
    </Suspense>
  )
}
