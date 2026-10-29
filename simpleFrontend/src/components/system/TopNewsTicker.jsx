import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Radio, Sparkles, Trophy, Zap, MapPin, Shield, Megaphone, X } from 'lucide-react'
import { usePublicSettings } from '../../api/queries'
import { useMascotSettings } from '../../utils/mascotSettings'

const DEFAULT_NEWS_HEADLINES = [
  {
    id: 'h1',
    icon: Trophy,
    text: 'انطلاق التسجيل في دوري أبطال الأحياء 2026 — سجّل فريقك الآن وشارك في المنافسة!',
    link: '/tournaments',
  },
  {
    id: 'h2',
    icon: MapPin,
    text: 'حجز ملاعب القرب متاح وفوري في الدار البيضاء، الرباط، طنجة، مراكش وكافة المدن المغربية',
    link: '/fields',
  },
  {
    id: 'h3',
    icon: Zap,
    text: 'مباريات وتحديات ودية جديدة أسبوعياً — ابحث عن منافس لفريقك وخُض تجربة كروية فريدة',
    link: '/matches',
  },
  {
    id: 'h4',
    icon: Shield,
    text: 'منصة أجي نقصرو: بيئة متكاملة لمسيري الفرق، اللاعبين وأصحاب ملاعب القرب بالمغرب 🇲🇦',
    link: '/',
  },
]

const TONES = {
  info: {
    bg: 'bg-[#0A161E]',
    border: 'border-emerald-500/25',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    dot: 'bg-emerald-400',
    text: 'text-slate-100',
    accent: 'text-emerald-400',
    sep: 'text-emerald-500/60',
  },
  warning: {
    bg: 'bg-[#180F08]',
    border: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    dot: 'bg-amber-400',
    text: 'text-amber-100',
    accent: 'text-amber-400',
    sep: 'text-amber-500/60',
  },
  alert: {
    bg: 'bg-[#1A0A0E]',
    border: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
    dot: 'bg-rose-400',
    text: 'text-rose-100',
    accent: 'text-rose-400',
    sep: 'text-rose-500/60',
  },
  success: {
    bg: 'bg-[#064E3B]',
    border: 'border-emerald-400/30',
    badgeBg: 'bg-emerald-400/20 border-emerald-400/40 text-emerald-200',
    dot: 'bg-emerald-300',
    text: 'text-emerald-50',
    accent: 'text-emerald-300',
    sep: 'text-emerald-300/60',
  },
}

export default function TopNewsTicker() {
  const barRef = useRef(null)
  const location = useLocation()
  const { data } = usePublicSettings()
  const mascotSettings = useMascotSettings()
  const [dismissed, setDismissed] = useState(false)

  // Strictly visible ONLY on landing/home page ('/'). Hidden on all other pages, completely hidden in committee dashboard.
  const isLandingPage = location.pathname === '/'

  const settings = data?.settings || {}
  const dbEnabled = settings?.announcement_enabled === true || settings?.announcement_enabled === '1'
  const customText = settings?.announcement_text || mascotSettings?.ticker_text || ''
  const toneType = settings?.announcement_type || mascotSettings?.ticker_type || 'info'
  const tone = TONES[toneType] || TONES.info

  // Parse custom headlines from admin text or fallback to rich platform news
  const headlines = useMemo(() => {
    if (customText && typeof customText === 'string' && customText.trim().length > 0) {
      // Split by pipe '|', newline, or bullet
      const parts = customText
        .split(/[\n|]+/)
        .map((s) => s.trim())
        .filter(Boolean)

      if (parts.length > 0) {
        return parts.map((text, idx) => ({
          id: `admin-${idx}`,
          icon: Megaphone,
          text,
          link: null,
        }))
      }
    }
    return DEFAULT_NEWS_HEADLINES
  }, [customText])

  // Bar is active only on landing page and not dismissed
  const isEnabled = isLandingPage && (dbEnabled || mascotSettings?.ticker_enabled !== false)

  // Publish ticker height to CSS variable --announce-height for dynamic fixed Navbar offset
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = barRef.current

    const updateHeight = () => {
      if (el && isEnabled && !dismissed) {
        const h = el.getBoundingClientRect().height || 32
        root.style.setProperty('--announce-height', `${Math.round(h)}px`)
      } else {
        root.style.setProperty('--announce-height', '0px')
        root.style.setProperty('--safe-top-offset', 'env(safe-area-inset-top, 0px)')
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => {
      window.removeEventListener('resize', updateHeight)
      root.style.setProperty('--announce-height', '0px')
      root.style.setProperty('--safe-top-offset', 'env(safe-area-inset-top, 0px)')
    }
  }, [isEnabled, dismissed, headlines])

  if (!isEnabled || dismissed) return null

  return (
    <aside
      ref={barRef}
      dir="rtl"
      role="region"
      aria-label="شريط الأخبار والإعلانات"
      className={`sticky top-0 z-[var(--z-sticky)] h-8 max-h-8 min-h-[32px] w-full max-w-full overflow-hidden select-none border-b transition-colors shadow-xs ${tone.bg} ${tone.border}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="mx-auto flex h-8 max-h-8 items-center justify-between px-2 sm:px-4 text-xs">
        {/* Right Badge: عاجل ⚽ */}
        <div className="z-20 flex shrink-0 items-center gap-1.5 pe-2.5 ps-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-black border backdrop-blur-xs shadow-xs ${tone.badgeBg}`}
          >
            <span className={`size-1.5 rounded-full animate-ping ${tone.dot}`} />
            <span className="whitespace-nowrap">عاجل ⚽</span>
          </span>
        </div>

        {/* Center: Infinite Seamless Smooth Marquee Track */}
        <div className="relative flex-1 overflow-hidden min-w-0">
          {/* Subtle lateral gradient masks */}
          <div className="pointer-events-none absolute inset-y-0 start-0 w-4 z-10 bg-gradient-to-l from-transparent to-[#0A161E]/90" />
          <div className="pointer-events-none absolute inset-y-0 end-0 w-6 z-10 bg-gradient-to-r from-transparent to-[#0A161E]/90" />

          {/* Marquee Container with pause-on-hover / pause-on-touch */}
          <div className="flex items-center gap-6 py-0.5 whitespace-nowrap animate-top-ticker pause-on-hover cursor-default">
            {/* Track 1 */}
            {headlines.map((item, idx) => (
              <span key={`trk1-${item.id || idx}`} className="inline-flex items-center gap-2">
                {item.link ? (
                  <Link
                    to={item.link}
                    className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold transition-colors hover:underline hover:${tone.accent} ${tone.text}`}
                  >
                    <span>{item.text}</span>
                  </Link>
                ) : (
                  <span className={`text-[11px] sm:text-xs font-bold ${tone.text}`}>
                    {item.text}
                  </span>
                )}
                <span className={`text-[10px] select-none ${tone.sep}`}>✦</span>
              </span>
            ))}

            {/* Track 2 (Exact duplicate for seamless continuous infinite loop) */}
            {headlines.map((item, idx) => (
              <span key={`trk2-${item.id || idx}`} className="inline-flex items-center gap-2" aria-hidden="true">
                {item.link ? (
                  <Link
                    to={item.link}
                    tabIndex={-1}
                    className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold transition-colors hover:underline hover:${tone.accent} ${tone.text}`}
                  >
                    <span>{item.text}</span>
                  </Link>
                ) : (
                  <span className={`text-[11px] sm:text-xs font-bold ${tone.text}`}>
                    {item.text}
                  </span>
                )}
                <span className={`text-[10px] select-none ${tone.sep}`}>✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Left: Subtle Dismiss Button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="إخفاء الشريط"
          title="إخفاء الشريط مؤقتاً"
          className="z-20 ms-2 grid size-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X className="size-3" />
        </button>
      </div>
    </aside>
  )
}





