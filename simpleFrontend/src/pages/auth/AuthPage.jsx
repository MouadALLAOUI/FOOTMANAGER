import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PromoPanel from './promoPanel'
import LanguageSelector from './languageSelector'
import UnifiedAuth from './UnifiedAuth'
import SecurityCard from './securityCard'
import useSeo from '../../hooks/useSeo'

export default function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useSeo({
    title: 'الدخول إلى المنصة | أجي نقصرو',
    description: 'بوابة الدخول الموحدة لمنصة أجي نقصرو — اختر دورك وابدأ تنظيم ومشاركة مباريات كرة القدم وحجز الملاعب بسهولة.',
    canonical: 'https://ajin9essro.com/login',
    keywords: 'أجي نقصرو, تسجيل دخول, حساب مسير فريق, حجز ملاعب, aji nqssro auth',
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-5">
      {/* Desktop Promo Panel */}
      <PromoPanel />

      <main id="main-content" className="relative flex flex-col overflow-hidden bg-slate-50 lg:order-1 lg:col-span-3 min-h-screen">
        {/* Subtle Decorative Background Blurs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 end-[-140px] size-[460px] rounded-full bg-emerald-500/10 blur-[130px]" />
          <div className="absolute bottom-[-180px] start-[-120px] size-[420px] rounded-full bg-green-400/10 blur-[120px]" />
          <div className="absolute top-1/2 start-1/4 size-72 rounded-full bg-lime-300/10 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full flex-col px-4 py-8 sm:px-8 lg:px-12 xl:px-14 my-auto">
          {/* Top Bar with Language Selector */}
          <div className="flex items-center justify-between w-full mb-4">
            <div
              className="flex items-center gap-2 lg:hidden cursor-pointer"
              onClick={() => navigate('/')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
            >
              <img
                src="/logo.jpeg"
                alt="Aji Nqssro"
                className="size-11 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200"
              />
              <span className="text-base font-black text-slate-900">أجي نقصرو</span>
            </div>

            <div className="ms-auto">
              <LanguageSelector />
            </div>
          </div>

          {/* Unified Account Access Experience (Role Selection -> Method -> Auto Detection) */}
          <div className="py-2">
            <UnifiedAuth />
          </div>

          {/* Privacy & Security Card */}
          <div className="mt-8">
            <SecurityCard />
          </div>

          {/* Footer Note */}
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            {t('auth.footerNote.prefix')}{' '}
            <Link
              to="/terms"
              className="font-bold text-slate-600 transition-colors hover:text-emerald-600 hover:underline hover:underline-offset-4"
            >
              {t('auth.footerNote.terms')}
            </Link>{' '}
            {t('auth.footerNote.and')}{' '}
            <Link
              to="/privacy"
              className="font-bold text-slate-600 transition-colors hover:text-emerald-600 hover:underline hover:underline-offset-4"
            >
              {t('auth.footerNote.privacy')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
