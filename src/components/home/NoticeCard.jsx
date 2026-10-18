import { ArrowUpRight } from 'lucide-react'
import { kindOf } from '@/lib/notices'

// A notice on the navy banner: a soft glass panel, the kind as a small coloured label, then the title and message.
// Important and Safety notices sit a little stronger (a tinted edge and a lighter fill) so they are seen without
// shouting. There is no way to dismiss a notice: it is there until its end time.
//
// The panel and the words are separate so the banner can keep ONE panel standing and fade only the words inside it
// when it rotates (fading the whole card made its glass go see-through and snap back). The panel eases between the
// looks of two kinds. The admin page's preview uses the combined NoticeCard.

export function NoticePanel({ kind: code, children }) {
  const kind = kindOf(code)
  return (
    <div
      className="relative h-full rounded-2xl px-5 py-4 text-white shadow-lg shadow-black/10 backdrop-blur-sm"
      style={{
        background: kind.loud ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.085)',
        boxShadow: `inset 0 0 0 1px ${kind.loud ? `${kind.accent}66` : 'rgba(255,255,255,0.16)'}`,
        transition: 'background-color 600ms ease, box-shadow 600ms ease',
      }}
    >
      {children}
    </div>
  )
}

export function NoticeContent({ notice, onOpen, pinnedLabel = true }) {
  const kind = kindOf(notice.kind)
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: kind.accent, boxShadow: `0 0 8px ${kind.accent}aa` }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: kind.accent }}>
          {kind.label}
        </span>
        {pinnedLabel && notice.is_pinned && <span className="text-[11px] font-medium text-white/45">· Pinned</span>}
      </div>
      <p className="mt-2 text-[16px] font-semibold leading-snug tracking-tight" style={{ textWrap: 'balance' }}>
        {notice.title}
      </p>
      <p className="mt-1 line-clamp-4 text-[13.5px] leading-relaxed text-white/75">{notice.message}</p>
      {notice.link_url && (
        <a
          href={notice.link_url}
          onClick={onOpen}
          {...(notice.link_url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          className="mt-3 inline-flex items-center gap-1 rounded-lg text-[13px] font-semibold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ color: kind.accent }}
        >
          {notice.link_label || 'Open'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

export default function NoticeCard({ notice, onOpen, pinnedLabel = true }) {
  return (
    <NoticePanel kind={notice.kind}>
      <NoticeContent notice={notice} onOpen={onOpen} pinnedLabel={pinnedLabel} />
    </NoticePanel>
  )
}
