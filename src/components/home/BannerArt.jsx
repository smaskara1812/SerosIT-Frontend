import { useId, useMemo } from 'react'
import { LayerShape } from '@/components/home/BannerShapes'
import BannerEdges from '@/components/home/BannerEdges'
import { PatternShapes } from '@/components/home/BannerPattern'
import { BANNER_H as H, BANNER_W as W, contourLines } from '@/lib/bannerPattern'
import { shapesAlign } from '@/lib/bannerDesign'

// The banner's background art for a design: a pattern, the contour lines and the shapes on top. Static, decorative, hidden from assistive
// technology. Colours and numbers come from a validated design, so nothing here is ever markup from a person.
export default function BannerArt({ design }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { pattern, contours } = design
  const lineCount = [0, 9, 13, 19][contours.density] || 13
  const lines = useMemo(() => contourLines((H - 40) / lineCount), [lineCount])
  const pid = `bp${uid}`

  return (
    <>
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <PatternShapes pattern={pattern} w={W} h={H} id={pid} />

      {contours.on && (
        <g fill="none" stroke={contours.color} strokeWidth="1">
          {lines.map((d, i) => <path key={i} d={d} strokeOpacity={Math.max(contours.opacity - i * 0.004, 0.03)} />)}
        </g>
      )}

    </svg>
    {design.layers?.length > 0 && (
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio={shapesAlign(design.layout)} aria-hidden="true">
        {design.layers.map((l) => <LayerShape key={l.id} layer={l} uid={uid} />)}
      </svg>
    )}
    <BannerEdges edges={design.edges} />
    </>
  )
}
