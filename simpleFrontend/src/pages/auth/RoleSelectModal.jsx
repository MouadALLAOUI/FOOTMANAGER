import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUserGroup,
  faShieldHalved,
  faBolt,
  faTrophy,
  faXmark,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons'

const roles = [
  {
    id: 'manager',
    icon: faUserGroup,
    title: 'مدير فريق (Manager)',
    badge: 'شائع',
    desc: 'إنشاء وإدارة فريقك، تنظيم وتحدي الفرق في مباريات ودية ورسمية.',
    bg: 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-800',
    iconBg: 'bg-emerald-500 text-white',
    ring: 'focus:ring-emerald-500',
  },
  {
    id: 'player',
    icon: faShieldHalved,
    title: 'لاعب (Player)',
    desc: 'البحث عن فرق ومباريات شاغرة، والانضمام لتشكيلات الملاعب.',
    bg: 'bg-sky-50 hover:bg-sky-100/70 border-sky-200 text-sky-800',
    iconBg: 'bg-sky-500 text-white',
    ring: 'focus:ring-sky-500',
  },
  {
    id: 'terrain_owner',
    icon: faBolt,
    title: 'صاحب ملعب (Terrain Owner)',
    desc: 'إدارة وتأجير التيران، وتنظيم أوقات الحجوزات الأسبوعية.',
    bg: 'bg-amber-50 hover:bg-amber-100/70 border-amber-200 text-amber-800',
    iconBg: 'bg-amber-500 text-white',
    ring: 'focus:ring-amber-500',
  },
  {
    id: 'committee',
    icon: faTrophy,
    title: 'لجنة تنظيم (Tournament Committee)',
    desc: 'تنظيم الدوريات والبطولات الرياضية ومتابعة نتائج المجموعات.',
    bg: 'bg-purple-50 hover:bg-purple-100/70 border-purple-200 text-purple-800',
    iconBg: 'bg-purple-500 text-white',
    ring: 'focus:ring-purple-500',
  },
]

export default function RoleSelectModal({ isOpen, onClose, onSelectRole, provider = 'google' }) {
  if (!isOpen) return null

  const providerName = provider === 'facebook' ? 'Facebook' : 'Google'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 transition-all sm:p-8"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 start-5 grid size-9 place-items-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
          title="إغلاق"
        >
          <FontAwesomeIcon icon={faXmark} className="size-4" />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200/80">
            المتابعة عبر {providerName}
          </span>
          <h2 className="mt-3 text-xl font-black text-slate-900 sm:text-2xl">
            اختر نوع الحساب الذي تريد إنشاءه
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            حدد دورك في المنصة للبدء في تخصيص إعداداتك ومبارياتك
          </p>
        </div>

        {/* Roles Grid */}
        <div className="mt-6 space-y-2.5">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRole(r.id)}
              className={`group flex w-full items-center justify-between gap-3.5 rounded-2xl border p-4 text-start transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${r.bg}`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm ${r.iconBg}`}>
                  <FontAwesomeIcon icon={r.icon} className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 group-hover:text-slate-950">
                      {r.title}
                    </span>
                    {r.badge && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                        {r.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">
                    {r.desc}
                  </p>
                </div>
              </div>

              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/80 text-slate-400 group-hover:bg-white group-hover:text-slate-800 shadow-2xs transition-colors">
                <FontAwesomeIcon icon={faChevronLeft} className="size-3.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] font-semibold text-slate-400">
          سيتم تحويلك إلى {providerName} لمصادقة معلوماتك بشكل آمن ومباشر
        </p>
      </div>
    </div>
  )
}
