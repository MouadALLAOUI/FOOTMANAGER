import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Trophy, MapPin, X, Phone, Shield, UserPlus, Radio } from 'lucide-react'
import GenieMascot from '../../components/mascot/GenieMascot'
import { useMascotSettings, DEFAULT_MASCOT_SETTINGS } from '../../utils/mascotSettings'

export default function FloatingHelper({ theme = 'dark' }) {
  const settings = useMascotSettings()
  const [open, setOpen] = useState(false)
  const [scrolledPastStats, setScrolledPastStats] = useState(false)

  // Avoid placing the mascot over the stats card on initial top view
  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastStats(window.scrollY > 280)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (settings.mascot_enabled === false) return null

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')
  const message = settings.mascot_message || DEFAULT_MASCOT_SETTINGS.mascot_message
  const subtext = settings.mascot_subtext || DEFAULT_MASCOT_SETTINGS.mascot_subtext

  return (
    <div
      className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-start transition-all duration-300 ${
        scrolledPastStats
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
    >
      {/* Interactive Speech Bubble Card */}
      {open && (
        <aside
          role="dialog"
          aria-label="المساعد السريع لمنصة أجي نقصرو"
          className={`fade-in mb-3 w-[330px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border p-4 shadow-2xl transition-all ${
            isDark
              ? 'bg-[#14221C]/95 border-emerald-500/40 text-white backdrop-blur-md shadow-black/80 ring-1 ring-emerald-500/25'
              : 'bg-white/95 border-emerald-300 text-slate-900 backdrop-blur-md shadow-xl ring-1 ring-emerald-500/20'
          }`}
        >
          {/* Header with Official Genie Mascot & Close Button */}
          <div className="flex items-center justify-between gap-2.5 mb-2.5 border-b border-slate-700/25 pb-2">
            <div className="flex items-center gap-2.5">
              <GenieMascot size={38} border status={false} />
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="size-2.5 text-amber-400" />
                  <span>المساعد الذكي</span>
                </span>
                <p className="text-[11px] font-bold text-slate-400">الجني ذو الطربوش</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق نافذة المساعد"
              className={`grid size-7 place-items-center rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Welcoming Permanent Profile Invitation from the Mascot */}
          <div className="space-y-1.5 my-2">
            <p className="text-xs sm:text-sm font-black leading-snug text-white">
              {message}
            </p>
            {subtext && (
              <p className="text-[11px] font-semibold text-slate-400 leading-normal">
                {subtext}
              </p>
            )}
          </div>

          {/* Main Permanent Profile CTA Action Buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-700/25 flex flex-col gap-2">
            <Link
              to="/register-player"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-emerald-100" />
                <span>سجّل كلاعب (برقم هاتفك فقط) ⚡</span>
              </div>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-lg">مجاناً</span>
            </Link>

            <Link
              to="/register?role=manager"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition-all active:scale-95 border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="size-3.5 text-emerald-400" />
                <span>سجّل كمسير (لإدارة فريقك) 🛡️</span>
              </div>
              <span className="text-[10px] text-emerald-400">فريقك جاهز</span>
            </Link>
          </div>

          {/* Secondary Quick Shortcuts */}
          <div className="mt-2.5 pt-2 border-t border-slate-700/20 flex items-center justify-between gap-1 text-[11px]">
            <Link
              to="/stadiums"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold"
            >
              <MapPin className="size-3" />
              <span>ملاعب القرب</span>
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/tournaments"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold"
            >
              <Trophy className="size-3" />
              <span>البطولات</span>
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              to="/live"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 font-bold"
            >
              <Radio className="size-3" />
              <span>مباشر</span>
            </Link>
          </div>
        </aside>
      )}

      {/* Floating Circular Trigger Button with #D9A441 3px Ring & #1F7A4D Available Dot */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="فتح المساعد الذكي"
        title="المساعد الذكي لمنصة أجي نقصرو"
        className="group relative grid size-14 sm:size-16 place-items-center rounded-full border-[3px] border-[#D9A441] bg-[#14221C] p-0.5 shadow-2xl shadow-black/60 active:scale-95 transition-all cursor-pointer"
      >
        <img
          src="/mascot-avatar.png"
          alt="الجني ذو الطربوش المغربي"
          className="size-full rounded-full object-cover object-center transition-transform group-hover:scale-105"
        />
        {/* Available Green Dot #1F7A4D in the corner */}
        <span
          className="absolute bottom-0 end-0 size-3.5 rounded-full bg-[#1F7A4D] border-2 border-[#14221C] shadow-xs"
          title="المساعد متاح"
        />
      </button>
    </div>
  )
}
