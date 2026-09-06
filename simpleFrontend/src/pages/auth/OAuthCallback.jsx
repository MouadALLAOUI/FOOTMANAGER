import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, homeForRole } from '../../context/AuthContext'
import { consumeAction } from '../../lib/intent'
import { takeAuthRedirect } from '../../api/client'
import { useToast } from '../../components/ui/Toast'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const error = searchParams.get('error')
    const token = searchParams.get('token')

    if (error) {
      const decoded = decodeURIComponent(error)
      setErrorMsg(decoded)
      toast.error(decoded)
      const timer = setTimeout(() => navigate('/login', { replace: true }), 3000)
      return () => clearTimeout(timer)
    }

    if (!token) {
      const msg = t('auth.oauthMissingToken', 'لم يتم العثور على رمز تسجيل الدخول')
      setErrorMsg(msg)
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2500)
      return () => clearTimeout(timer)
    }

    let isMounted = true

    loginWithToken(token)
      .then((user) => {
        if (!isMounted) return
        toast.success(t('auth.oauthSuccess', 'تم تسجيل الدخول بنجاح!'))

        if (user.status === 'pending') {
          navigate('/pending', { replace: true })
          return
        }

        const pending = consumeAction()
        if (pending?.type === 'book' && pending.id) {
          navigate('/fields?book=' + pending.id, { replace: true })
          return
        }

        const redirect = takeAuthRedirect()
        if (redirect) {
          navigate(redirect, { replace: true })
          return
        }

        navigate(homeForRole(user.role), { replace: true })
      })
      .catch((err) => {
        if (!isMounted) return
        const msg = err.response?.data?.message || t('auth.errors.loginFailed', 'فشل تسجيل الدخول')
        setErrorMsg(msg)
        toast.error(msg)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      })

    return () => {
      isMounted = false
    }
  }, [searchParams, loginWithToken, navigate, t, toast])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mx-auto size-16">
        <div className="size-16 animate-spin rounded-full border-4 border-slate-200 border-t-green-500" />
      </div>
      <h2 className="mt-5 text-lg font-black text-slate-900">
        {errorMsg ? t('auth.oauthFailed', 'تعذر إكمال تسجيل الدخول') : t('auth.oauthProcessing', 'جارٍ تسجيل الدخول...')}
      </h2>
      <p className="mt-1 text-sm font-semibold text-slate-400">
        {errorMsg || t('auth.oauthWait', 'يرجى الانتظار لحظات ريثما يتم تحويلك إلى حسابك')}
      </p>
    </div>
  )
}
