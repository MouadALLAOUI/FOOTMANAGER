import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Trophy, Radio, Landmark, Smartphone, X, Share, PlusSquare } from 'lucide-react'

export default function BottomNav({ theme = 'dark' }) {
  const location = useLocation()
  const [showPwaModal, setShowPwaModal] = useState(false)

  useEffect(() => {
    const handleShowModal = () => setShowPwaModal(true)
    window.addEventListener('aji_show_pwa_modal', handleShowModal)
    return () => window.removeEventListener('aji_show_pwa_modal', handleShowModal)
  }, [])

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  // Exactly 4 items requested: الرئيسية، البطولات، مباشر، الملاعب
  const items = [
    { label: 'الرئيسية', to: '/', icon: Home, exact: true },
    { label: 'البطولات', to: '/tournaments', icon: Trophy },
    { label: 'مباشر', to: '/live', icon: Radio },
    { label: 'الملاعب', to: '/stadiums', icon: Landmark },
  ]

  const isActive = (item) => {
    if (item.exact) return location.pathname === '/'
    if (item.to === '/live') return location.pathname === '/live' || location.pathname.startsWith('/matches')
    if (item.to === '/stadiums') return location.pathname === '/stadiums' || location.pathname.startsWith('/fields')
    return location.pathname.startsWith(item.to)
  }

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي للهاتف"
        className={`fixed bottom-0 inset-x-0 z-50 sm:hidden border-t backdrop-blur-xl transition-colors ${
          isDark
            ? 'bg-[#14221C]/95 border-emerald-900/50 text-slate-400'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
        <div className="grid grid-cols-4 h-16 items-center px-2">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
                  active
                    ? 'text-emerald-500 font-black'
                    : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`size-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[11px] font-bold leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* PWA / App Install Guidance Modal */}
      {showPwaModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all ${
              isDark ? 'bg-[#14221C] border-emerald-900/50 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Smartphone className="size-5" />
                </span>
                <h3 className="text-sm font-black">تثبيت تطبيق أجي نقصرو</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPwaModal(false)}
                aria-label="إغلاق"
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <p className="font-semibold text-slate-300">
                ثبّت التطبيق على هاتفك مجاناً للوصول السريع لحجز الملاعب ومتابعة نتائج البطولات مباشرة!
              </p>
              <div
                className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <p className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span>📱 لمستخدمي آيفون (Safari):</span>
                </p>
                <p className="text-[12px] leading-relaxed text-slate-300">
                  اضغط على زر المشاركة{' '}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold">
                    <Share className="size-3 inline" /> مشاركة
                  </span>{' '}
                  في أسفل المتصفح، ثم اختر{' '}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
                    <PlusSquare className="size-3 inline" /> إضافة إلى الشاشة الرئيسية
                  </span>
                </p>
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <p className="font-bold text-emerald-400 mb-1">🤖 لمستخدمي أندرويد (Chrome):</p>
                <p className="text-[11px] text-slate-400">
                  اضغط على القائمة (⋮) أعلى المتصفح ثم اختر <b>"تثبيت التطبيق" (Install App)</b>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  )
}
