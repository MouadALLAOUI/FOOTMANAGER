import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faArrowRight,
  faSpinner,
  faPhone,
  faEnvelope,
  faPenToSquare,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons'
import { faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import api, { takeAuthRedirect } from '../../api/client'
import { useAuth, homeForRole } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import RoleIcon from './RoleIcon'
import PremiumField from './premiumField'

const ADMIN_ROLE = {
  id: 'admin',
  titleKey: 'auth.unified.roles.admin.title',
  defaultTitle: 'مسؤول النظام',
  descKey: 'auth.unified.roles.admin.desc',
  defaultDesc: 'لوحة تحكم الإدارة والمشرفين',
  badge: '🛡️ الإدارة',
  accentColor: 'indigo',
  cardBorder: 'hover:border-indigo-500 hover:shadow-[0_18px_40px_rgba(99,102,241,0.16)]',
  badgeClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80',
}

const ROLES = [
  {
    id: 'manager',
    titleKey: 'auth.unified.roles.manager.title',
    defaultTitle: 'مسير فريق',
    descKey: 'auth.unified.roles.manager.desc',
    defaultDesc: 'نظم فريقك ومبارياتك',
    badge: '⚽ مدير فريق',
    accentColor: 'emerald',
    cardBorder: 'hover:border-emerald-500 hover:shadow-[0_18px_40px_rgba(16,185,129,0.16)]',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
  },
  {
    id: 'terrain_owner',
    titleKey: 'auth.unified.roles.terrain_owner.title',
    defaultTitle: 'مسير ملعب',
    descKey: 'auth.unified.roles.terrain_owner.desc',
    defaultDesc: 'دبر الملعب والحجوزات',
    badge: '🏟️ أصحاب الملاعب',
    accentColor: 'amber',
    cardBorder: 'hover:border-amber-500 hover:shadow-[0_18px_40px_rgba(245,158,11,0.16)]',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
  },
  {
    id: 'player',
    titleKey: 'auth.unified.roles.player.title',
    defaultTitle: 'لاعب',
    descKey: 'auth.unified.roles.player.desc',
    defaultDesc: 'كون ملفك كلاعب',
    badge: '👤 لاعبين أحرار',
    accentColor: 'sky',
    cardBorder: 'hover:border-sky-500 hover:shadow-[0_18px_40px_rgba(14,165,233,0.16)]',
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80',
  },
  {
    id: 'committee',
    titleKey: 'auth.unified.roles.committee.title',
    defaultTitle: 'جمعية / لجنة',
    descKey: 'auth.unified.roles.committee.desc',
    defaultDesc: 'نظم البطولات والمباريات',
    badge: '🏆 دوريات وبطولات',
    accentColor: 'purple',
    cardBorder: 'hover:border-purple-500 hover:shadow-[0_18px_40px_rgba(168,85,247,0.16)]',
    badgeClass: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
  },
]

export default function UnifiedAuth() {
  const { t, i18n } = useTranslation()
  const { login, register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const isRtl = i18n.language?.startsWith('ar')

  // Flow states:
  // Step 1: null (Role Selection Screen)
  // Step 2: role chosen
  //   - subStep: 'methods' | 'check_identifier' | 'existing_login' | 'new_register'
  const [selectedRole, setSelectedRole] = useState(null)
  const [subStep, setSubStep] = useState('methods') // 'methods' | 'check_identifier' | 'existing_login' | 'new_register'

  // Input states
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isWhatsapp, setIsWhatsapp] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Account check info from backend
  const [accountInfo, setAccountInfo] = useState(null)

  // Status & Error
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // ----------------------------------------------------
  // Navigation & Reset Helpers
  // ----------------------------------------------------
  const handleSelectRole = (roleId) => {
    setSelectedRole(roleId)
    setSubStep('methods')
    setError('')
  }

  const handleBackToRoles = () => {
    setSelectedRole(null)
    setSubStep('methods')
    setError('')
    setIdentifier('')
    setPassword('')
    setConfirmPassword('')
    setAccountInfo(null)
  }

  const handleEditIdentifier = () => {
    setSubStep('check_identifier')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const redirectToOAuth = (provider) => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
    const url = new URL(`${apiBase}/auth/${provider}/redirect`)
    if (selectedRole) {
      url.searchParams.set('role', selectedRole)
    }
    window.location.href = url.toString()
  }

  // ----------------------------------------------------
  // Phone / Email Step 1: Check if Account Exists
  // ----------------------------------------------------
  const handleCheckIdentifier = async (e) => {
    e.preventDefault()
    setError('')

    const val = identifier.trim()
    if (!val) {
      setError(
        isRtl
          ? 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني'
          : 'Please enter your phone number or email',
      )
      return
    }

    setBusy(true)
    try {
      const { data } = await api.post('/check-account', { identifier: val })
      setAccountInfo(data)

      if (data.exists) {
        // User already has an account -> Move to password login
        setSubStep('existing_login')
      } else {
        // User is new -> Move to quick registration
        setSubStep('new_register')
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (isRtl
          ? 'تعذر التحقق من الحساب، يرجى المحاولة ثانية'
          : 'Unable to check account. Please try again.')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  // ----------------------------------------------------
  // Existing User: Login
  // ----------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError(isRtl ? 'يرجى إدخال كلمة المرور' : 'Please enter your password')
      return
    }

    setBusy(true)
    try {
      const loggedUser = await login(identifier.trim(), password)
      toast.success(
        isRtl
          ? `مرحباً بعودتك ${loggedUser.name || ''}! 👋`
          : `Welcome back, ${loggedUser.name || ''}! 👋`,
      )

      // Notice: If existing user had role "manager" but clicked "player",
      // we NEVER overwrite their real role. They are logged into their real account!
      if (loggedUser.status === 'pending') {
        if (loggedUser.role === 'manager' && !loggedUser.onboarding_completed_at) {
          navigate('/onboarding', { replace: true })
          return
        }
        navigate('/pending', { replace: true })
        return
      }

      const redirect = takeAuthRedirect()
      if (redirect) {
        navigate(redirect, { replace: true })
        return
      }

      navigate(homeForRole(loggedUser.role), { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (isRtl
          ? 'بيانات الدخول غير صحيحة، يرجى التحقق من كلمة المرور'
          : 'Invalid credentials, please check your password')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  // ----------------------------------------------------
  // New User: Quick Registration
  // ----------------------------------------------------
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = fullName.trim()
    const val = identifier.trim()
    const isEmail = val.includes('@')

    if (!name) {
      setError(isRtl ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name')
      return
    }

    if (!password) {
      setError(isRtl ? 'يرجى إدخال كلمة المرور' : 'Please enter a password')
      return
    }

    if (password.length < 8) {
      setError(
        isRtl
          ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل'
          : 'Password must be at least 8 characters',
      )
      return
    }

    if (password !== confirmPassword) {
      setError(
        isRtl
          ? 'كلمة المرور وتأكيد كلمة المرور غير متطابقين'
          : 'Passwords do not match',
      )
      return
    }

    setBusy(true)
    try {
      const payload = {
        name,
        password,
        password_confirmation: confirmPassword,
      }

      if (isEmail) {
        payload.email = val
        payload.phone = val.replace(/[^0-9]/g, '') || `06${Math.floor(10000000 + Math.random() * 90000000)}`
        payload.is_whatsapp = false
      } else {
        payload.phone = val
        payload.is_whatsapp = Boolean(isWhatsapp)
      }

      const res = await register(selectedRole, payload)
      toast.success(
        isRtl
          ? 'تم إنشاء حسابك بنجاح! مرحباً بك في أجي نقصرو 🎉'
          : 'Account created successfully! Welcome to Aji Nqssro 🎉',
      )

      // Hand-off directly to role-specific onboarding
      if (selectedRole === 'manager') {
        navigate('/onboarding', { replace: true })
      } else if (selectedRole === 'player') {
        navigate('/player/onboarding', { replace: true })
      } else {
        navigate('/pending', { replace: true })
      }
    } catch (err) {
      const first = Object.values(err.response?.data?.errors || {})[0]
      setError(
        first?.[0] ||
          err.response?.data?.message ||
          (isRtl
            ? 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة ثانية'
            : 'Error creating account. Please try again.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const roleObj = selectedRole === 'admin' ? ADMIN_ROLE : (ROLES.find((r) => r.id === selectedRole) || ROLES[0])
  const currentRoleTitle = t(roleObj.titleKey, roleObj.defaultTitle)

  // =========================================================================
  // SCREEN 1: "Who are you?" Role Selection (Clean, Responsive, No Forms)
  // =========================================================================
  if (!selectedRole) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-6 fade-in" style={{ animationDelay: '100ms' }}>
        {/* Welcome Area Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200/80 shadow-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isRtl ? 'بوابة الدخول الموحدة' : 'Unified Access Portal'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isRtl ? 'مرحباً بك في أجي نقصرو 👋' : 'Welcome to Aji Nqssro 👋'}
          </h1>

          <p className="text-sm font-semibold text-slate-500 leading-relaxed max-w-md mx-auto">
            {isRtl
              ? 'باش نجهزو ليك تجربة مناسبة، شكون نتا؟'
              : 'To prepare the best experience for you, who are you?'}
          </p>
        </div>

        {/* 4 Interactive Role Cards (2x2 on Desktop, Stacking Responsively) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2">
          {ROLES.map((r) => {
            const title = t(r.titleKey, r.defaultTitle)
            const desc = t(r.descKey, r.defaultDesc)

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectRole(r.id)}
                className={`group relative flex flex-col items-center sm:items-start text-center sm:text-start p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 ${r.cardBorder} active:translate-y-0 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 cursor-pointer`}
              >
                {/* Visual Sports Icon Component */}
                <div className="mb-4">
                  <RoleIcon role={r.id} className="size-16 rounded-2xl" />
                </div>

                {/* Role Title */}
                <h2 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {title}
                </h2>

                {/* Short Description */}
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  {desc}
                </p>

                {/* Bottom Callout Indicator */}
                <div className="mt-4 pt-3 w-full border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-slate-400 group-hover:text-emerald-600 transition-colors">
                  <span className="text-[11px] font-bold text-slate-400">
                    {isRtl ? 'اختيار ومتابعة' : 'Select & continue'}
                  </span>
                  <div className="grid size-6 place-items-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="size-3 ltr:rotate-0 rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Admin / Staff Access Shortcut */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin')
              setSubStep('check_identifier')
              setError('')
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faLock} className="size-3" />
            <span>{isRtl ? 'حساب إداري؟ تسجيل دخول المشرفين والإدارة' : 'Staff account? Admin sign in'}</span>
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // SCREEN 2: Unified Account Access Step Tailored to Selected Role
  // =========================================================================
  return (
    <div className="w-full max-w-md mx-auto space-y-5 fade-in" style={{ animationDelay: '100ms' }}>
      {/* Top Header with Back Navigation & Role Badge */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <button
          type="button"
          onClick={handleBackToRoles}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <FontAwesomeIcon
            icon={faArrowRight}
            className="size-3 ltr:rotate-180 rtl:rotate-0"
          />
          <span>{isRtl ? 'تغيير الدور' : 'Change role'}</span>
        </button>

        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black shadow-xs ${roleObj.badgeClass}`}>
          <RoleIcon role={roleObj.id} className="size-5 rounded-md" />
          <span>{currentRoleTitle}</span>
        </span>
      </div>

      {/* SUB-STEP 1: METHOD SELECTION (Google / Facebook / Phone-Email) */}
      {subStep === 'methods' && (
        <div className="space-y-4">
          <div className="text-center sm:text-start">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {isRtl
                ? `متابعة كـ ${currentRoleTitle}`
                : `Continue as ${currentRoleTitle}`}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isRtl
                ? 'اختر طريقة الدخول المفضلة لديك وسنتكفل بالباقي'
                : 'Choose your preferred access method and we will handle the rest'}
            </p>
          </div>

          {/* Error Message if any */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-600 leading-relaxed">
              {error}
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Google Primary Button */}
            <button
              type="button"
              onClick={() => redirectToOAuth('google')}
              className="group flex h-13 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
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
              <span>{isRtl ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
            </button>

            {/* Facebook Secondary Button */}
            <button
              type="button"
              onClick={() => redirectToOAuth('facebook')}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#1877F2]/20 bg-[#1877F2]/5 px-4 text-sm font-bold text-[#1877F2] shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 hover:shadow-md active:translate-y-0"
            >
              <FontAwesomeIcon icon={faFacebook} className="size-5 shrink-0 text-[#1877F2]" />
              <span>{isRtl ? 'المتابعة باستخدام Facebook' : 'Continue with Facebook'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">
              {isRtl ? 'أو' : 'OR'}
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Button to open Phone / Email Identifier Input */}
          <button
            type="button"
            onClick={() => setSubStep('check_identifier')}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-50 text-sm font-extrabold text-slate-700 shadow-xs transition-all duration-300 hover:border-slate-300 hover:bg-slate-100 active:scale-[0.99]"
          >
            <FontAwesomeIcon icon={faPhone} className="size-4 text-slate-400" />
            <span>
              {isRtl
                ? 'المتابعة برقم الهاتف أو البريد الإلكتروني'
                : 'Continue with Phone or Email'}
            </span>
          </button>
        </div>
      )}

      {/* SUB-STEP 2: IDENTIFIER INPUT (System checks whether account exists) */}
      {subStep === 'check_identifier' && (
        <form onSubmit={handleCheckIdentifier} className="space-y-4">
          <div className="text-center sm:text-start">
            <h2 className="text-xl font-black text-slate-900">
              {isRtl ? 'رقم الهاتف أو البريد الإلكتروني' : 'Phone number or Email'}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isRtl
                ? 'أدخل وسيلة التواصل الخاصة بك للتحقق تلقائياً من حسابك'
                : 'Enter your contact info to automatically check your account'}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-600 leading-relaxed">
              {error}
            </div>
          )}

          <PremiumField
            id="ident-input"
            label={isRtl ? 'الهاتف أو البريد' : 'Phone or Email'}
            placeholder="06XXXXXXXX أو name@example.com"
            icon={<FontAwesomeIcon icon={faEnvelope} className="size-[18px]" />}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />

          <button
            type="submit"
            disabled={busy}
            className="btn-ripple flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-600/25 transition-all duration-300 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" />
                <span>{isRtl ? 'جاري التحقق...' : 'Checking...'}</span>
              </>
            ) : (
              <>
                <span>{isRtl ? 'متابعة' : 'Continue'}</span>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="size-3 ltr:rotate-0 rtl:rotate-180"
                />
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setSubStep('methods')
                setError('')
              }}
              className="text-xs font-extrabold text-slate-400 hover:text-slate-700 transition-colors"
            >
              {isRtl ? '← طرق تسجيل أخرى' : '← Other sign-in methods'}
            </button>
          </div>
        </form>
      )}

      {/* SUB-STEP 3: EXISTING ACCOUNT -> LOGIN */}
      {subStep === 'existing_login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="text-center sm:text-start">
            {(accountInfo?.role === 'admin' || accountInfo?.role === 'sub_admin') && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/80 mb-2">
                <span>🛡️ {isRtl ? 'حساب مسؤول النظام' : 'Administrator Account'}</span>
              </span>
            )}
            <h2 className="text-xl font-black text-slate-900">
              {isRtl
                ? `مرحباً بعودتك${accountInfo?.name ? ` يا ${accountInfo.name}` : ''} 👋`
                : `Welcome back${accountInfo?.name ? `, ${accountInfo.name}` : ''} 👋`}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isRtl
                ? 'وجدنا حسابك! أدخل كلمة المرور للمتابعة'
                : 'Account found! Enter your password to continue'}
            </p>
          </div>

          {/* Identifier Display with Edit Action */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-2.5">
            <span className="text-xs font-black text-slate-800 dir-ltr">{identifier}</span>
            <button
              type="button"
              onClick={handleEditIdentifier}
              className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="size-3" />
              <span>{isRtl ? 'تعديل' : 'Edit'}</span>
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-600 leading-relaxed">
              {error}
            </div>
          )}

          {/* Password Input */}
          <PremiumField
            id="login-pass"
            label={isRtl ? 'كلمة المرور' : 'Password'}
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="size-4" />
              </button>
            }
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
            >
              {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Link>
          </div>

          {/* Submit Login Button */}
          <button
            type="submit"
            disabled={busy}
            className="btn-ripple flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-600/25 transition-all duration-300 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" />
                <span>{isRtl ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{isRtl ? 'تسجيل الدخول' : 'Sign In'}</span>
            )}
          </button>
        </form>
      )}

      {/* SUB-STEP 4: NEW ACCOUNT -> QUICK REGISTRATION */}
      {subStep === 'new_register' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="text-center sm:text-start">
            <h2 className="text-xl font-black text-slate-900">
              {isRtl ? 'أول مرة معانا؟ مرحباً بك 👋' : 'First time here? Welcome 👋'}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {isRtl
                ? `أكمل بياناتك البسيطة لإنشاء حسابك كـ ${currentRoleTitle}`
                : `Complete minimal details to create your account as ${currentRoleTitle}`}
            </p>
          </div>

          {/* Identifier Display with Edit Action */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-2.5">
            <span className="text-xs font-black text-slate-800 dir-ltr">{identifier}</span>
            <button
              type="button"
              onClick={handleEditIdentifier}
              className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="size-3" />
              <span>{isRtl ? 'تعديل' : 'Edit'}</span>
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-600 leading-relaxed">
              {error}
            </div>
          )}

          {/* Full Name */}
          <PremiumField
            id="reg-fullname"
            label={isRtl ? 'الاسم الكامل' : 'Full Name'}
            placeholder={isRtl ? 'مثال: ياسين بونو' : 'e.g. John Doe'}
            icon={<FontAwesomeIcon icon={faUser} className="size-[18px]" />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />

          {/* WhatsApp toggle if identifier is a phone number */}
          {!identifier.includes('@') && (
            <label
              htmlFor="reg-whatsapp-unified"
              className="flex items-center justify-between gap-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-xs">
                  <FontAwesomeIcon icon={faWhatsapp} className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {isRtl ? 'هذا الرقم به واتساب أيضاً' : 'This number has WhatsApp too'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'لتلقي إشعارات المباريات والحجوزات الفورية'
                      : 'To receive instant match & booking alerts'}
                  </p>
                </div>
              </div>

              <input
                id="reg-whatsapp-unified"
                type="checkbox"
                checked={Boolean(isWhatsapp)}
                onChange={(e) => setIsWhatsapp(e.target.checked)}
                className="size-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          )}

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <PremiumField
              id="reg-pass"
              label={isRtl ? 'كلمة المرور (8+ أحرف)' : 'Password (8+ chars)'}
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="size-4" />
                </button>
              }
            />

            <PremiumField
              id="reg-pass-confirm"
              label={isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              placeholder="••••••••"
              type={showConfirmPassword ? 'text' : 'password'}
              icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="size-4" />
                </button>
              }
            />
          </div>

          {/* Submit Registration Button */}
          <button
            type="submit"
            disabled={busy}
            className="btn-ripple flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-600/25 transition-all duration-300 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin" />
                <span>{isRtl ? 'جاري إنشاء الحساب...' : 'Creating account...'}</span>
              </>
            ) : (
              <>
                <span>{isRtl ? 'إنشاء الحساب ومتابعة الإعداد' : 'Create Account & Continue'}</span>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="size-3 ltr:rotate-0 rtl:rotate-180"
                />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
