import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import api from '../../../api/client'
import { getFieldErrors } from '../../../lib/errorState'

export default function ForgotPassword() {
  const [login, setLogin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!login.trim()) {
      setError('أدخل بريدك الإلكتروني أو رقم هاتفك')
      return
    }

    setLoading(true)
    try {
      await api.post('/forgot-password', { login: login.trim() })
      setSent(true)
    } catch (err) {
      const fe = getFieldErrors(err)
      const first = Object.values(fe)[0]
      setError(first?.[0] || err.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-green-500/10">
            <CheckCircle className="size-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">تم الإرسال</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            إذا كان حسابك مرتبطاً ببريد إلكتروني أو رقم هاتف، ستصل رسالة إعادة التعيين خلال دقائق. تحقق أيضاً من صندوق الرسائل غير المرغوبة.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:underline hover:underline-offset-4"
          >
            العودة إلى تسجيل الدخول
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-green-500/10">
            <Mail className="size-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">نسيت كلمة المرور؟</h1>
          <p className="mt-2 text-sm text-slate-500">
            أدخل بريدك الإلكتروني أو رقم هاتفك وسنرسل لك رابطاً لإعادة التعيين
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">البريد الإلكتروني أو رقم الهاتف</label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                dir="ltr"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-4 ps-10 text-sm text-slate-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                placeholder="email@example.com"
                value={login}
                onChange={(e) => { setLogin(e.target.value); setError('') }}
                autoFocus
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
                إرسال رابط إعادة التعيين
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
