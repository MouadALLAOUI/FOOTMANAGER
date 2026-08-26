import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react'
import api from '../../../api/client'
import { getFieldErrors } from '../../../lib/errorState'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [status, setStatus] = useState('validating')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token || !email) {
      setStatus('invalid')
      return
    }
    api
      .post('/forgot-password/validate-token', { token, login: decodeURIComponent(email) })
      .then((res) => {
        setStatus(res.data.valid ? 'valid' : 'invalid')
      })
      .catch(() => setStatus('invalid'))
  }, [token, email])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

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
      await api.post('/reset-password', {
        token,
        login: decodeURIComponent(email),
        password,
        password_confirmation: passwordConfirm,
      })
      setSuccess(true)
    } catch (err) {
      const fe = getFieldErrors(err)
      const first = Object.values(fe)[0]
      setError(first?.[0] || err.response?.data?.message || 'الرابط غير صالح أو منتهي الصلاحية')
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
          <h1 className="text-2xl font-black text-slate-900">تم تحديث كلمة المرور</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-green-500 px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition hover:bg-green-600"
          >
            تسجيل الدخول
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'validating') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-4 border-green-500/30 border-t-green-600" />
          <p className="mt-4 text-sm text-slate-500">جارٍ التحقق من صلاحية الرابط…</p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-rose-500/10">
            <ShieldAlert className="size-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">الرابط غير صالح</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            اطلب رابطاً جديداً لإعادة تعيين كلمة المرور
          </p>
          <Link
            to="/forgot-password"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-green-500 px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition hover:bg-green-600"
          >
            طلب رابط جديد
            <ArrowRight className="size-4" />
          </Link>
          <div className="mt-6">
            <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-slate-600">
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-green-500/10">
            <Lock className="size-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">كلمة مرور جديدة</h1>
          <p className="mt-2 text-sm text-slate-500">أنشئ كلمة مرور جديدة لحسابك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">كلمة المرور الجديدة</label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-12 ps-10 text-sm text-slate-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                placeholder="8 أحرف على الأقل"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
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
                onChange={(e) => { setPasswordConfirm(e.target.value); setError('') }}
              />
            </div>
          </div>

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
            ) : (
              <>
                حفظ كلمة المرور الجديدة
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-slate-600">
            العودة إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}
