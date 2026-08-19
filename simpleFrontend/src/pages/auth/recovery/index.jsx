import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import api from '../../../api/client'
import { useAuth } from '../../../context/AuthContext'

export default function RecoveryApply() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const [step, setStep] = useState('token')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (step === 'token') {
      if (!token.trim()) {
        setError('أدخل رمز الاسترداد')
        return
      }
      if (token.length !== 64) {
        setError('رمز الاسترداد غير صالح')
        return
      }
      setStep('password')
      return
    }

    if (!password) {
      setError('أدخل كلمة المرور الجديدة')
      return
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (password !== passwordConfirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/recovery/apply', {
        token: token.trim(),
        password,
        password_confirmation: passwordConfirm,
      })
      const { user, token: authToken } = res.data
      authLogin(user, authToken)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/${user.role === 'admin' || user.role === 'sub_admin' ? 'admin' : user.role === 'manager' ? 'dashboard' : user.role === 'terrain_owner' ? 'terrain' : user.role === 'player' ? 'player' : 'committee'}`)
      }, 1500)
    } catch (e) {
      setError(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-green-500/10">
            <CheckCircle className="size-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">تم استرداد الحساب بنجاح</h1>
          <p className="mt-3 text-sm text-slate-500">جاري تحويلك إلى لوحة التحكم...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-violet-500/10">
            <KeyRound className="size-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">استرداد الحساب</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'token'
              ? 'أدخل الرمز الذي حصلت عليه من المسؤول'
              : 'أنشئ كلمة مرور جديدة لحسابك'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 'token' ? (
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600">رمز الاسترداد</label>
              <div className="relative">
                <KeyRound className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  dir="ltr"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-4 ps-10 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                  placeholder="الصق الرمز هنا..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-12 ps-10 text-sm text-slate-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                    placeholder="8 أحرف على الأقل"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-600">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-4 ps-10 text-sm text-slate-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                    placeholder="أعد إدخال كلمة المرور"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : step === 'token' ? (
              'التالي'
            ) : (
              'استرداد الحساب'
            )}
            {!loading && <ArrowRight className="size-4" />}
          </button>

          {step === 'password' && (
            <button
              type="button"
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700"
              onClick={() => { setStep('token'); setError('') }}
            >
              تغيير الرمز
            </button>
          )}
        </form>

        <div className="mt-8 text-center">
          <a href="/login" className="text-xs font-bold text-slate-400 hover:text-slate-600">
            العودة إلى تسجيل الدخول
          </a>
        </div>
      </div>
    </div>
  )
}
