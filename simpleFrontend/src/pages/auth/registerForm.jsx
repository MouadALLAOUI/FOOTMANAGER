import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faUserGroup,
  faBolt,
  faShieldHalved,
  faTrophy,
  faArrowRight,
  faSpinner,
  faPhone,
  faCircleCheck,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import PremiumField from './premiumField'

const roles = [
  {
    id: 'manager',
    icon: faUserGroup,
    emoji: '⚽',
    title: 'مسير فريق',
    badge: 'الأكثر طلباً 🔥',
    desc: 'تنظيم المباريات والبحث عن خصوم وإدارة تشكيلة الفريق',
    features: ['تحدي ومبارزة الفرق', 'حجز الملاعب المتاحة', 'إدارة لاعبي التشكيلة'],
    accentBg: 'bg-emerald-500/10 text-emerald-600',
    hoverBorder: 'hover:border-emerald-500 hover:shadow-[0_16px_36px_rgba(16,185,129,0.14)]',
    badgeBg: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
    iconBg: 'bg-emerald-500 text-white',
  },
  {
    id: 'terrain_owner',
    icon: faBolt,
    emoji: '🏟️',
    title: 'صاحب ملعب',
    badge: 'إدارة وتأجير الملاعب',
    desc: 'إدارة ملاعبك واستقبال حجوزات الفرق وتنظيم التوقيت اليومي',
    features: ['جدول المواعيد الأسبوعي', 'استقبال وتأكيد الحجوزات', 'إحصائيات الحجوزات'],
    accentBg: 'bg-amber-500/10 text-amber-600',
    hoverBorder: 'hover:border-amber-500 hover:shadow-[0_16px_36px_rgba(245,158,11,0.14)]',
    badgeBg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
    iconBg: 'bg-amber-500 text-white',
  },
  {
    id: 'player',
    icon: faShieldHalved,
    emoji: '🏃',
    title: 'لاعب حر',
    badge: 'انضم لمباريات',
    desc: 'البحث عن فرق ومباريات شاغرة والانضمام لتشكيلات الملاعب',
    features: ['الانضمام للفرق المحلية', 'مباريات ودية وبطولات', 'ملف رياضي وإحصائيات'],
    accentBg: 'bg-sky-500/10 text-sky-600',
    hoverBorder: 'hover:border-sky-500 hover:shadow-[0_16px_36px_rgba(14,165,233,0.14)]',
    badgeBg: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80',
    iconBg: 'bg-sky-500 text-white',
  },
  {
    id: 'committee',
    icon: faTrophy,
    emoji: '🏢',
    title: 'لجنة تنظيم دوريات',
    badge: 'دوريات وبطولات',
    desc: 'تنظيم بطولات كروية وجدولة المباريات ومتابعة الترتيب',
    features: ['إدارة المجموعات والمسابقات', 'لوحة النتائج والترتيب', 'تنسيق الفرق المشاركة'],
    accentBg: 'bg-purple-500/10 text-purple-600',
    hoverBorder: 'hover:border-purple-500 hover:shadow-[0_16px_36px_rgba(168,85,247,0.14)]',
    badgeBg: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
    iconBg: 'bg-purple-500 text-white',
  },
]

export default function RegisterForm({ onRoleChange, selectedRole: controlledRole }) {
  const { t } = useTranslation()
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [internalRole, setInternalRole] = useState(null)
  const role = controlledRole !== undefined ? controlledRole : internalRole

  const [form, setForm] = useState({
    name: '',
    phone: '',
    is_whatsapp: true,
    password: '',
    password_confirmation: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSelectRole = (roleId) => {
    setError('')
    setInternalRole(roleId)
    if (onRoleChange) onRoleChange(roleId)
  }

  const handleBackToRoles = () => {
    setError('')
    setInternalRole(null)
    if (onRoleChange) onRoleChange(null)
  }

  const redirectToOAuth = (provider) => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
    const url = new URL(`${apiBase}/auth/${provider}/redirect`)
    if (role) {
      url.searchParams.set('role', role)
    }
    window.location.href = url.toString()
  }

  const setField = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedName = form.name?.trim() || ''
    const trimmedPhone = form.phone?.trim() || ''

    if (!trimmedName) {
      setError('يرجى إدخال الاسم الكامل')
      return
    }

    if (!trimmedPhone) {
      setError('يرجى إدخال رقم الهاتف')
      return
    }

    if (!form.password) {
      setError('يرجى إدخال كلمة المرور')
      return
    }

    if (form.password.length < 8) {
      setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
      return
    }

    if (form.password !== form.password_confirmation) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقين')
      return
    }

    setBusy(true)
    try {
      await register(role, {
        name: trimmedName,
        phone: trimmedPhone,
        is_whatsapp: form.is_whatsapp ?? true,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })

      toast.success('تم إنشاء حسابك بنجاح! مرحباً بك في أجي نقصرو 🎉')

      // Direct hand-off to role onboarding:
      if (role === 'manager') {
        navigate('/onboarding', { replace: true })
      } else if (role === 'player') {
        navigate('/player/onboarding', { replace: true })
      } else {
        navigate('/pending', { replace: true })
      }
    } catch (err) {
      const first = Object.values(err.response?.data?.errors || {})[0]
      setError(first?.[0] || err.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب. يرجى مراجعة البيانات والمحاولة ثانية.')
    } finally {
      setBusy(false)
    }
  }

  // ==========================================
  // SCREEN 1: "Who are you?" Role Selection
  // ==========================================
  if (!role) {
    return (
      <div className="space-y-4 animate-fade-in" dir="rtl">
        <div className="text-center sm:text-start pb-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            الخطوة الأولى: اختر نوع الحساب
          </div>
          <h2 className="mt-2.5 text-xl font-black text-slate-900 sm:text-2xl">
            من أنت؟ اختر صفتك في المنصة
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            حدد دورك لنمنحك تجربة مصممة خصيصاً لاحتياجاتك بدون أي تعقيد
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelectRole(r.id)}
              className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 text-start transition-all duration-300 ease-out hover:-translate-y-1 ${r.hoverBorder} active:translate-y-0 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-green-500/20`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className={`grid size-12 place-items-center rounded-2xl text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${r.accentBg}`}>
                    <span>{r.emoji}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${r.badgeBg}`}>
                    {r.badge}
                  </span>
                </div>

                <h3 className="mt-3.5 text-base font-black text-slate-900 transition-colors group-hover:text-green-700">
                  {r.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {r.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-slate-400 group-hover:text-green-600 transition-colors">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <FontAwesomeIcon icon={faCircleCheck} className="size-3 text-green-500" />
                  {r.features[0]}
                </span>
                <span className="flex items-center gap-1">
                  متابعة
                  <FontAwesomeIcon icon={faArrowRight} className="size-2.5 ltr:rotate-180 transition-transform group-hover:-translate-x-1" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ==========================================
  // SCREEN 2: Role-tailored Authentication
  // ==========================================
  const selected = roles.find((r) => r.id === role) || roles[0]

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Top Header with Back Button and Role Badge */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={handleBackToRoles}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <FontAwesomeIcon icon={faArrowRight} className="size-3.5 ltr:rotate-180" />
          تغيير نوع الحساب
        </button>

        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${selected.badgeBg}`}>
          <span className="text-sm">{selected.emoji}</span>
          {selected.title}
        </span>
      </div>

      <div className="text-center sm:text-start">
        <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
          إنشاء حسابك كـ {selected.title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          خطوة واحدة فقط للبدء، ستتمكن من إكمال التفاصيل داخل لوحتك الخاصة
        </p>
      </div>

      {/* Primary & Secondary OAuth Options */}
      <div className="space-y-2.5">
        {/* Google Primary Button */}
        <button
          type="button"
          onClick={() => redirectToOAuth('google')}
          className="group relative flex h-13 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
        >
          <svg className="size-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>المتابعة باستخدام Google</span>
          <span className="ms-auto hidden sm:inline-block rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
            موصى به
          </span>
        </button>

        {/* Facebook Secondary Button */}
        <button
          type="button"
          onClick={() => redirectToOAuth('facebook')}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#1877F2]/20 bg-[#1877F2]/5 px-4 text-sm font-bold text-[#1877F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 hover:shadow-md active:translate-y-0"
        >
          <FontAwesomeIcon icon={faFacebook} className="size-5 shrink-0 text-[#1877F2]" />
          <span>المتابعة باستخدام Facebook</span>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-1">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold text-slate-400">
          أو التسجيل السريع برقم الهاتف
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Error Notice */}
      {error && (
        <div className="fade-in rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-extrabold text-red-600 leading-relaxed shadow-sm">
          {error}
        </div>
      )}

      {/* Minimal Account Identity Form */}
      <form onSubmit={submit} className="space-y-4">
        {/* Full Name */}
        <PremiumField
          id="reg-name"
          label="الاسم الكامل"
          placeholder="مثال: ياسين بونو"
          icon={<FontAwesomeIcon icon={faUser} className="size-[18px]" />}
          value={form.name}
          onChange={setField('name')}
          required
          autoComplete="name"
        />

        {/* Phone Number */}
        <PremiumField
          id="reg-phone"
          label="رقم الهاتف"
          placeholder="06XXXXXXXX"
          type="tel"
          icon={<FontAwesomeIcon icon={faPhone} className="size-[18px]" />}
          value={form.phone}
          onChange={setField('phone')}
          required
          autoComplete="tel"
        />

        {/* WhatsApp Toggle Card */}
        <label
          htmlFor="reg-whatsapp"
          className="flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition-colors hover:border-green-300 hover:bg-green-50/30 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <FontAwesomeIcon icon={faWhatsapp} className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">
                هذا الرقم به واتساب أيضاً
              </p>
              <p className="text-[11px] text-slate-500">
                لتلقي إشعارات المباريات والحجوزات الفورية
              </p>
            </div>
          </div>

          <input
            id="reg-whatsapp"
            type="checkbox"
            checked={Boolean(form.is_whatsapp)}
            onChange={setField('is_whatsapp')}
            className="size-5 rounded-lg border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
          />
        </label>

        {/* Passwords Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <PremiumField
            id="reg-password"
            label="كلمة المرور (8 أحرف فأكثر)"
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
            value={form.password}
            onChange={setField('password')}
            required
            autoComplete="new-password"
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-green-600"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="size-[18px]" />
              </button>
            }
          />

          <PremiumField
            id="reg-password-confirm"
            label="تأكيد كلمة المرور"
            placeholder="••••••••"
            type={showConfirmPassword ? 'text' : 'password'}
            icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
            value={form.password_confirmation}
            onChange={setField('password_confirmation')}
            required
            autoComplete="new-password"
            endAdornment={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-green-600"
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="size-[18px]" />
              </button>
            }
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          className="btn-ripple mt-2 flex h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-green-500 text-[15px] font-black text-white shadow-[0_16px_36px_rgba(22,163,74,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_20px_45px_rgba(22,163,74,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="size-5 animate-spin" />
              <span>جارٍ إنشاء الحساب...</span>
            </>
          ) : (
            <>
              <span>إنشاء الحساب ومتابعة الإعداد</span>
              <FontAwesomeIcon icon={faArrowRight} className="size-3.5 ltr:rotate-180" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
