import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClock,
  faCircleCheck,
  faCircleXmark,
  faBan,
  faRotateRight,
  faArrowRight,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons'

export default function Pending() {
  const { user, logout, refresh } = useAuth()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    } else if (user.status === 'approved') {
      const dest =
        user.role === 'admin' || user.role === 'sub_admin'
          ? '/admin'
          : user.role === 'terrain_owner'
          ? '/terrain'
          : user.role === 'player'
          ? '/player'
          : user.role === 'committee'
          ? '/committee'
          : '/dashboard'
      navigate(dest, { replace: true })
    }
  }, [user, navigate])

  if (!user) return null

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      if (refresh) await refresh()
      else window.location.reload()
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  const roleLabel = (role) => {
    switch (role) {
      case 'manager':
        return 'مدرب فريق'
      case 'player':
        return 'لاعب'
      case 'terrain_owner':
        return 'مالك ملعب'
      case 'committee':
        return 'لجنة تنظيمية'
      default:
        return 'عضو'
    }
  }

  const config = {
    pending: {
      icon: faClock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      ring: 'ring-amber-500/20',
      shadow: 'shadow-amber-500/10',
      title: 'طلبك قيد المراجعة',
      desc: 'يراجع فريق الإدارة طلب انضمامك حالياً. سيتم تفعيل حسابك فور الموافقة عليه، عادة خلال أقل من 24 ساعة.',
    },
    rejected: {
      icon: faCircleXmark,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      ring: 'ring-red-500/20',
      shadow: 'shadow-red-500/10',
      title: 'تم رفض طلبك',
      desc: 'عذراً، لم تتم الموافقة على طلب الانضمام الخاص بك. يمكنك التواصل مع الإدارة للمزيد من التفاصيل والاستفسار.',
    },
    blocked: {
      icon: faBan,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      ring: 'ring-red-500/20',
      shadow: 'shadow-red-500/10',
      title: 'تم حظر حسابك',
      desc: 'تم حظر حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني إذا كنت تعتقد أن هذا الإجراء تم عن طريق الخطأ.',
    },
  }

  const c = config[user.status] || config.pending

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-50 px-4 py-8 sm:px-6">
      {/* Ambient background decoration */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 end-[-140px] size-[460px] rounded-full bg-green-500/10 blur-[130px]" />
        <div className="absolute bottom-[-180px] start-[-120px] size-[420px] rounded-full bg-amber-400/10 blur-[120px]" />
        <div className="absolute top-1/2 start-1/3 size-72 rounded-full bg-emerald-300/10 blur-[100px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpeg"
            alt="أجي نقصرو"
            className="size-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200"
          />
          <span className="text-base font-black text-slate-900">أجي نقصرو</span>
        </div>

        <button
          onClick={logout}
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-red-600"
        >
          تسجيل الخروج
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto my-auto flex w-full max-w-md flex-col items-center py-6 text-center">
        {/* Status Icon Badge */}
        <div className="relative mb-5">
          <div
            className={`grid size-20 place-items-center rounded-3xl ${c.bg} ${c.color} ring-1 ${c.ring} shadow-lg ${c.shadow}`}
          >
            <FontAwesomeIcon icon={c.icon} className="size-9" />
          </div>
          {user.status === 'pending' && (
            <span className="absolute -top-1 -right-1 flex size-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-4 rounded-full bg-amber-500 ring-2 ring-white" />
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {c.title}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
          {c.desc}
        </p>

        {/* User Card */}
        <div className="mt-6 w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm text-start sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20">
                <FontAwesomeIcon icon={faCircleCheck} className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-400">الاسم المسجل</div>
                <div className="truncate text-sm font-black text-slate-900">{user.name}</div>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
              {roleLabel(user.role)}
            </span>
          </div>

          <div className="my-3 h-px bg-slate-100" />

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FontAwesomeIcon icon={faCircleCheck} className="size-3.5 text-emerald-500" />
            <span>تم استلام جميع المعلومات وتأكيدها بنجاح</span>
          </div>
        </div>

        {/* Manager Onboarding Teaser Card */}
        {user.role === 'manager' && !user.onboarding_completed_at && (
          <div className="mt-4 w-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-green-50/70 p-4 text-start shadow-sm sm:p-5">
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl ring-1 ring-emerald-500/20">
                ⚽
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  استغل وقت المراجعة لضبط فريقك
                </h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                  يمكنك ضبط شعار الفريق، وتحديد مواعيد مبارياتكم المعتادة، وإضافة تشكيلة اللاعبين لتكون جاهزاً للانطلاق فور تفعيل حسابك.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-500 font-extrabold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600 active:scale-[0.99]"
            >
              <span>متابعة إعداد الفريق الآن</span>
              <FontAwesomeIcon icon={faArrowLeft} className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
        )}

        {/* Refresh Status Action */}
        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200/50 hover:text-slate-900 active:scale-95"
          >
            <FontAwesomeIcon
              icon={faRotateRight}
              className={`size-3.5 ${refreshing ? 'animate-spin text-green-500' : 'text-slate-400'}`}
            />
            <span>{refreshing ? 'جارٍ التحقق من الحساب...' : 'تحديث حالة الحساب الآن'}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs font-medium text-slate-400">
        أجي نقصرو © {new Date().getFullYear()} — منصة تنظيم مباريات كرة القدم
      </footer>
    </div>
  )
}
