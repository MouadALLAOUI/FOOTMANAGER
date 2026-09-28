import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'

export default function ProductionHeroHeader() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, openCreate, setBookTerrain } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const firstName = user?.name ? user.name.split(' ')[0] : (isRtl ? 'محمد' : 'Manager')

  const cards = [
    {
      id: 'book_stadium',
      title: isRtl ? 'حجز ملعب' : 'Book a Stadium',
      desc: isRtl ? 'لقى ملعب قريب وحجز الوقت المناسب' : 'Find nearby pitches & book slots',
      iconSrc: '/icon_stadium.png',
      bgColor: 'bg-[#f0fdf4]',
      borderColor: 'border-[#bbf7d0]',
      hoverBorder: 'hover:border-emerald-500 hover:shadow-[0_16px_36px_rgba(34,197,94,0.18)]',
      btnBg: 'bg-emerald-600 group-hover:bg-emerald-700',
      action: () => navigate('/fields'),
    },
    {
      id: 'challenge_team',
      title: isRtl ? 'تحدي فريق' : 'Challenge a Team',
      desc: isRtl ? 'اختار فريق وبدأ مباراة ودية' : 'Pick an opponent & start a friendly',
      iconSrc: '/icon_swords.png',
      bgColor: 'bg-[#eff6ff]',
      borderColor: 'border-[#bfdbfe]',
      hoverBorder: 'hover:border-blue-500 hover:shadow-[0_16px_36px_rgba(59,130,246,0.18)]',
      btnBg: 'bg-blue-600 group-hover:bg-blue-700',
      action: () => navigate('/dashboard/feed'),
    },
    {
      id: 'tournament',
      title: isRtl ? 'المشاركة في بطولة' : 'Join a Tournament',
      desc: isRtl ? 'اكتشف البطولات وسجل فريقك' : 'Discover tournaments & enroll team',
      iconSrc: '/icon_trophy.png',
      bgColor: 'bg-[#fffbeb]',
      borderColor: 'border-[#fde68a]',
      hoverBorder: 'hover:border-amber-500 hover:shadow-[0_16px_36px_rgba(245,158,11,0.18)]',
      btnBg: 'bg-amber-600 group-hover:bg-amber-700',
      action: () => navigate('/dashboard/tournaments'),
    },
    {
      id: 'my_team',
      title: isRtl ? 'فريقي' : 'My Team',
      desc: isRtl ? 'إدارة اللاعبين وتفاصيل الفريق' : 'Manage players & team details',
      iconSrc: '/icon_team.png',
      bgColor: 'bg-[#faf5ff]',
      borderColor: 'border-[#e9d5ff]',
      hoverBorder: 'hover:border-purple-500 hover:shadow-[0_16px_36px_rgba(168,85,247,0.18)]',
      btnBg: 'bg-purple-600 group-hover:bg-purple-700',
      action: () => navigate('/dashboard/team'),
    },
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#e6f4ea]/60 via-[#f0fdf4]/40 to-transparent p-5 sm:p-7 border border-emerald-100/60 shadow-xs">
      {/* Background Player Graphic (Exact as reference image) */}
      <div className="pointer-events-none absolute top-0 end-0 h-full w-[180px] sm:w-[240px] md:w-[320px] overflow-hidden opacity-90 rtl:scale-x-100 ltr:-scale-x-100">
        <img
          src="/hero-player.png"
          alt=""
          className="h-full w-full object-cover object-left-top mix-blend-multiply opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f0fdf4] via-transparent to-transparent opacity-60" />
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Welcome Hand & Name */}
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-wave">👋</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isRtl ? `مرحباً ${firstName}` : `Hello ${firstName}`}
          </h2>
        </div>

        {/* Main Question Header */}
        <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
          {isRtl ? 'شنو بغيتي دير اليوم؟' : 'What do you want to do today?'}
        </h1>

        {/* Subtitle */}
        <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600">
          {isRtl
            ? 'اختار الان من بين الخدمات الأساسية وابدأ'
            : 'Select one of the essential services and get started'}
        </p>
      </div>

      {/* 4 Action Cards Grid (Responsive 2x2 on Mobile, 4 columns on Desktop) */}
      <div className="relative z-10 mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={c.action}
            className={`group relative flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl sm:rounded-3xl border ${c.borderColor} ${c.bgColor} shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 ${c.hoverBorder} active:translate-y-0 active:scale-[0.99] cursor-pointer`}
          >
            {/* Action Illustration */}
            <div className="mb-3 h-14 sm:h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <img
                src={c.iconSrc}
                alt={c.title}
                className="max-h-full max-w-[64px] object-contain drop-shadow-sm"
              />
            </div>

            {/* Title */}
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
              {c.title}
            </h3>

            {/* Short Description */}
            <p className="mt-1 text-[11px] sm:text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
              {c.desc}
            </p>

            {/* Circular Action Button */}
            <div className="mt-3 sm:mt-4">
              <div
                className={`grid size-7 sm:size-8 place-items-center rounded-full text-white shadow-sm transition-transform duration-300 group-hover:scale-110 ${c.btnBg}`}
              >
                <ArrowIcon className="size-3.5 sm:size-4 stroke-[2.5]" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
