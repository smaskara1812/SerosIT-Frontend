import { ArrowUpRight } from 'lucide-react'
import { kindOf } from '@/lib/notices'

// A notice on the navy banner: a soft glass panel, the kind as a small coloured label, then the title and message.
// Important and Safety notices sit a little stronger (a tinted edge and a lighter fill) so they are seen without
// shouting. There is no way to dismiss a notice: it is there until its end time.
//
// The panel and the words are separate so the banner can keep ONE panel standing and fade only the words inside it
// when it rotates (fading the whole card made its glass go see-through and snap back). The panel eases between the
// looks of two kinds. The admin page's preview uses the combined NoticeCard.

export function NoticePanel({ kind: code, tone = 'dark', children }) {
  const kind = kindOf(code)
  const light = tone === 'light'
  return (
    <div
      className={`relative h-full rounded-2xl px-5 py-4 shadow-lg shadow-black/10 backdrop-blur-sm ${light ? 'text-[#0f2650]' : 'text-white'}`}
      style={{
        background: light ? (kind.loud ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.6)') : kind.loud ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.085)',
        boxShadow: `inset 0 0 0 1px ${kind.loud ? `${light ? kind.ink : kind.accent}66` : light ? 'rgba(15,38,80,0.16)' : 'rgba(255,255,255,0.16)'}`,
        transition: 'background-color 600ms ease, box-shadow 600ms ease',
      }}
    >
      {children}
    </div>
  )
}

export function NoticeContent({ notice, onOpen, pinnedLabel = true, tone = 'dark' }) {
  const kind = kindOf(notice.kind)
  const light = tone === 'light'
  const accent = light ? kind.ink : kind.accent
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent, boxShadow: light ? 'none' : `0 0 8px ${accent}aa` }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
          {kind.label}
        </span>
        {pinnedLabel && notice.is_pinned && <span className={`text-[11px] font-medium ${light ? 'text-[#0f2650]/55' : 'text-white/45'}`}>· Pinned</span>}
      </div>
      <p className="mt-2 text-[16px] font-semibold leading-snug tracking-tight" style={{ textWrap: 'balance' }}>
        {notice.title}
      </p>
      <p className={`mt-1 line-clamp-4 text-[13.5px] leading-relaxed ${light ? 'text-[#0f2650]/80' : 'text-white/75'}`}>{notice.message}</p>
      {notice.link_url && (
        <a
          href={notice.link_url}
          onClick={onOpen}
          {...(notice.link_url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          className="mt-3 inline-flex items-center gap-1 rounded-lg text-[13px] font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ color: accent }}
        >
          {notice.link_label || 'Open'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

export default function NoticeCard({ notice, onOpen, pinnedLabel = true, tone = 'dark' }) {
  return (
    <NoticePanel kind={notice.kind} tone={tone}>
      <NoticeContent notice={notice} onOpen={onOpen} pinnedLabel={pinnedLabel} tone={tone} />
    </NoticePanel>
  )
}
