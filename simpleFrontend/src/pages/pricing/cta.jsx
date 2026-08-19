import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LayoutDashboard, UserPlus } from 'lucide-react'
import { useAuth, homeForRole } from '../../context/AuthContext'

export default function PricingCta() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAuthenticated = Boolean(user)

  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-16 lg:py-20">
      <div className="absolute -top-24 start-1/2 size-[24rem] -translate-x-1/2 rounded-full bg-green-500/10 blur-[100px] rtl:translate-x-1/2" />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-2xl font-black text-white lg:text-3xl">{t('pricing.page.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/80">{t('pricing.page.ctaSubtitle')}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              to={homeForRole(user.role)}
              className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 active:translate-y-0"
            >
              <LayoutDashboard className="size-5" />
              {t('pricing.page.ctaDashboard')}
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 active:translate-y-0"
              >
                <UserPlus className="size-5" />
                {t('pricing.page.ctaGuest')}
              </Link>
              <Link
                to="/login"
                className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border-2 border-white/20 px-7 text-sm font-bold text-white transition-colors hover:border-white/40"
              >
                {t('pricing.page.ctaLogin')}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
