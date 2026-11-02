import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { Home, Trophy, Radio, Landmark, Smartphone, X, Share, PlusSquare } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function BottomNav({ theme }) {
  const location = useLocation()
  const { isDark: ctxDark } = useTheme()
  const [showPwaModal, setShowPwaModal] = useState(false)

  useEffect(() => {
    const handleShowModal = () => setShowPwaModal(true)
    window.addEventListener('aji_show_pwa_modal', handleShowModal)
    return () => window.removeEventListener('aji_show_pwa_modal', handleShowModal)
  }, [])

  useEffect(() => {
    if (showPwaModal) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [showPwaModal])

  const isDark = theme ? theme === 'dark' : (ctxDark ?? document.documentElement.classList.contains('dark'))

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
        className="fixed bottom-0 inset-x-0 z-[var(--z-bottom-nav)] sm:hidden border-t backdrop-blur-xl transition-colors h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom)] select-none bg-white/95 dark:bg-[#1B201D]/95 border-[#E1E5DF] dark:border-[#303832]"
      >
        <div className="grid grid-cols-4 h-16 items-center px-2">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
                  active
                    ? 'text-[#111313] dark:text-[#D0FF38] font-black'
                    : 'text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2]'
                }`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-xl transition-colors ${
                    active ? 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20' : ''
                  }`}
                >
                  <Icon className={`size-5 ${active ? 'stroke-[2.5]' : ''}`} />
                </span>
                <span className="text-[11px] font-bold leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* PWA / App Install Guidance Modal */}
      {showPwaModal &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center p-4"
          >
            <div
              className="fixed inset-0 z-[var(--z-overlay)] bg-black/70 backdrop-blur-xs"
              onClick={() => setShowPwaModal(false)}
            />
            <div
              className={`relative z-[var(--z-modal)] w-full max-w-sm rounded-xl p-5 border shadow-xl transition-all max-h-[calc(100dvh-32px)] flex flex-col ${
                isDark ? 'bg-[#1B201D] border-[#303832] text-[#F5F7F2]' : 'bg-white border-[#E1E5DF] text-[#111313]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E1E5DF] dark:border-[#303832] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#B8F000]/20 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
                    <Smartphone className="size-5" />
                  </span>
                  <h3 className="text-sm font-black">تثبيت تطبيق أجي نقصرو</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPwaModal(false)}
                  aria-label="إغلاق"
                  className="grid size-9 place-items-center rounded-lg text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2] cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <p className="font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                ثبّت التطبيق على هاتفك مجاناً للوصول السريع لحجز الملاعب ومتابعة نتائج البطولات مباشرة!
              </p>
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-[#252B27] border-[#303832]' : 'bg-[#E9ECE7]/50 border-[#E1E5DF]'
                }`}
              >
                <p className="font-bold text-[#16834A] dark:text-[#D0FF38] mb-2 flex items-center gap-1.5">
                  <span>📱 لمستخدمي آيفون (Safari):</span>
                </p>
                <p className="text-[12px] leading-relaxed text-[#65706A] dark:text-[#B2B9B3]">
                  اضغط على زر المشاركة{' '}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-500 dark:text-blue-400 font-bold">
                    <Share className="size-3 inline" /> مشاركة
                  </span>{' '}
                  في أسفل المتصفح، ثم اختر{' '}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#B8F000]/30 dark:bg-[#D0FF38]/25 text-[#111313] dark:text-[#D0FF38] font-bold">
                    <PlusSquare className="size-3 inline" /> إضافة إلى الشاشة الرئيسية
                  </span>
                </p>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  isDark ? 'bg-[#252B27] border-[#303832]' : 'bg-[#E9ECE7]/50 border-[#E1E5DF]'
                }`}
              >
                <p className="font-bold text-[#16834A] dark:text-[#D0FF38] mb-1">🤖 لمستخدمي أندرويد (Chrome):</p>
                <p className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                  اضغط على القائمة (⋮) أعلى المتصفح ثم اختر <b>"تثبيت التطبيق" (Install App)</b>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2.5 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] hover:opacity-90 text-[#111313] dark:text-[#101211] font-black text-xs shadow-xs transition-all cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
