import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightToBracket, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import PromoPanel from './promoPanel'
import LanguageSelector from './languageSelector'
import LoginForm from './loginForm'
import RegisterForm from './registerForm'
import SocialLogin from './socialLogin'
import SecurityCard from './securityCard'

const tabs = [
  { id: 'login', labelKey: 'auth.loginTab', icon: faRightToBracket },
  { id: 'register', labelKey: 'auth.registerTab', icon: faUserPlus },
]

export default function AuthPage({ initialTab = 'login' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const select = (id) => {
    setTab(id)
    navigate(id === 'register' ? '/register' : '/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-5">
      <PromoPanel />

      <main id="main-content" className="relative flex flex-col overflow-hidden bg-slate-50 lg:order-1 lg:col-span-3">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 end-[-140px] size-[460px] rounded-full bg-green-500/10 blur-[130px]" />
          <div className="absolute bottom-[-180px] start-[-120px] size-[420px] rounded-full bg-emerald-400/10 blur-[120px]" />
          <div className="absolute top-1/2 start-1/4 size-72 rounded-full bg-lime-300/10 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto flex w-full flex-col px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <LanguageSelector />

          <div className="fade-in my-auto w-full" style={{ animationDelay: '140ms' }}>
            <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
              <img
                src="/logo.jpeg"
                alt=""
                className="size-14 rounded-2xl object-cover shadow-[0_12px_30px_rgba(22,163,74,0.4)] ring-1 ring-slate-200"
              />
            </div>

            <header>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                {t(`auth.${tab}Title`)}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t(`auth.${tab}Subtitle`)}
              </p>
            </header>

            <div className="mt-7 flex gap-2 border-b border-slate-100">
              {tabs.map(({ id, labelKey, icon }) => {
                const active = tab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => select(id)}
                    className="relative flex flex-1 items-center justify-center gap-2 pb-4"
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      className={`size-4 transition-colors duration-300 ${active ? 'text-green-500' : 'text-slate-400'}`}
                    />
                    <span
                      className={`text-sm font-extrabold transition-colors duration-300 ${
                        active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {t(labelKey)}
                    </span>
                    <span
                      className={`absolute bottom-0 start-1/2 h-[3px] w-[64px] -translate-x-1/2 rounded-full bg-green-500 transition-all duration-300 ease-out rtl:translate-x-1/2 ${
                        active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            <div className="mt-7">{tab === 'login' ? <LoginForm /> : <RegisterForm />}</div>

            <SocialLogin />
            <SecurityCard />

            <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
              {t('auth.footerNote.prefix')}{' '}
              <Link
                to="/terms"
                className="font-bold text-slate-600 transition-colors hover:text-green-600 hover:underline hover:underline-offset-4"
              >
                {t('auth.footerNote.terms')}
              </Link>{' '}
              {t('auth.footerNote.and')}{' '}
              <a
                href="#"
                className="font-bold text-slate-600 transition-colors hover:text-green-600 hover:underline hover:underline-offset-4"
              >
                {t('auth.footerNote.privacy')}
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
