import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faGlobe,
  faPlus,
  faUser,
  faXmark,
  faArrowRightFromBracket,
  faGaugeHigh,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth, homeForRole } from '../context/AuthContext'

const links = ['home', 'fields', 'matches', 'tournaments', 'about', 'pricing']

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (location.pathname.startsWith('/fields')) setActive('fields')
    else if (location.pathname.startsWith('/matches')) setActive('matches')
    else if (location.pathname.startsWith('/tournaments')) setActive('tournaments')
    else if (location.pathname.startsWith('/about')) setActive('about')
    else if (location.pathname.startsWith('/pricing')) setActive('pricing')
    else setActive('home')
  }, [location.pathname])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const timer = setTimeout(() => setMounted(false), 320)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    document.body.classList.add('sheet-open')
    return () => document.body.classList.remove('sheet-open')
  }, [mounted])

  const currentLang = i18n.language.startsWith('ar') ? 'العربية' : 'English'

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language.startsWith('ar') ? 'en' : 'ar')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const goTo = (key) => {
    setActive(key)
    setOpen(false)
    if (key === 'home') {
      if (location.pathname !== '/') navigate('/')
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (key === 'fields') {
      if (location.pathname !== '/fields') navigate('/fields')
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (key === 'matches') {
      if (location.pathname !== '/matches') navigate('/matches')
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (key === 'tournaments') {
      if (location.pathname !== '/tournaments') navigate('/tournaments')
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (key === 'about') {
      if (location.pathname !== '/about') navigate('/about')
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (key === 'pricing') {
      if (location.pathname !== '/pricing') navigate('/pricing')
      else window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate('/')
  }

  const linkClass = (key) =>
    `relative text-sm font-semibold transition-colors duration-300 ${
      active === key ? 'text-white' : 'text-white/70 hover:text-green-400'
    }`

  return (
    <header
      className={`fixed inset-x-0 z-50 transition-all duration-[350ms] ease-out ${
        scrolled ? 'top-[calc(var(--announce-height,0px)+18px)]' : 'top-[var(--announce-height,0px)]'
      }`}
    >
      <div
        className={`mx-auto flex h-[80px] items-center px-6 transition-all duration-[350ms] ease-out ${
          scrolled
            ? 'w-[calc(100%-60px)] max-w-[1400px] rounded-[20px] bg-[rgba(10,16,26,0.78)] shadow-[0_24px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/10 backdrop-blur-[18px]'
            : 'w-full max-w-[1400px] bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              goTo('home')
            }}
            className="group flex items-center gap-3"
            aria-label="أجي نقصرو"
          >
            <img
              src="/logo.jpeg"
              alt=""
              className="size-11 shrink-0 rounded-xl object-cover shadow-[0_8px_20px_rgba(22,163,74,0.45)] ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="leading-tight">
              <p className="text-base font-extrabold text-white">أجي نقصرو</p>
              <p className="hidden text-[11px] text-white/60 sm:block">{t('landing.nav.tagline')}</p>
            </div>
          </a>
        </div>

        <nav className="mx-auto hidden items-center gap-6 md:flex lg:gap-12">
          {links.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(key)}
              className={linkClass(key)}
            >
              {t(`landing.nav.links.${key}`)}
              <span
                className={`absolute -bottom-1 start-1/2 h-[2px] -translate-x-1/2 rounded-full bg-green-400 transition-all duration-300 ease-out rtl:translate-x-1/2 ${
                  active === key ? 'w-full' : 'w-0'
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 lg:gap-3">
          <button
            type="button"
            onClick={toggleLang}
            className="hidden h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white md:flex lg:px-4"
          >
            <FontAwesomeIcon icon={faGlobe} className="size-4" />
            <span className="hidden lg:inline">{currentLang}</span>
          </button>

          {user ? (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={() => navigate(homeForRole(user.role))}
                className="flex h-11 items-center gap-2 rounded-2xl bg-green-500 px-6 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 active:translate-y-0"
              >
                <FontAwesomeIcon icon={faGaugeHigh} className="size-4" />
                {t('landing.nav.dashboard')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-11 items-center gap-2 rounded-2xl border border-white/20 px-4 text-sm font-semibold text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
              >
                <FontAwesomeIcon icon={faArrowRightFromBracket} className="size-4" />
                {t('landing.nav.logout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex h-11 items-center gap-2 rounded-[14px] border border-white/20 px-5 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 active:translate-y-0"
              >
                <FontAwesomeIcon icon={faUser} className="size-4" />
                {t('landing.nav.login')}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register')}
                className="hidden h-11 items-center gap-2 rounded-2xl bg-green-500 px-7 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_18px_45px_rgba(22,163,74,0.55)] active:translate-y-0 md:flex"
              >
                <FontAwesomeIcon icon={faPlus} className="size-4" />
                {t('landing.nav.addField')}
              </button>
            </div>
          )}

          {!user && (
            <button
              type="button"
              onClick={() => navigate('/register')}
              aria-label={t('landing.nav.addField')}
              className="flex h-11 items-center gap-2 rounded-2xl bg-green-500 px-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 hover:bg-green-600 active:scale-95 md:hidden"
            >
              <FontAwesomeIcon icon={faPlus} className="size-4" />
              <span className="hidden sm:inline">{t('landing.nav.addField')}</span>
            </button>
          )}

          <button
            type="button"
            aria-label={t('landing.nav.menuAria')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-2xl text-white transition-colors hover:bg-white/10 md:hidden"
          >
            {open ? <FontAwesomeIcon icon={faXmark} className="size-6" /> : <FontAwesomeIcon icon={faBars} className="size-6" />}
          </button>
        </div>
      </div>

      {mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] md:hidden">
            <div
              onClick={() => setOpen(false)}
              aria-hidden="true"
              className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
                visible ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t('landing.nav.menuAria')}
              className={`absolute end-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col bg-[rgba(10,16,26,0.97)] shadow-[0_24px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/10 backdrop-blur-xl ${
                visible ? 'drawer-in' : 'drawer-out'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.jpeg"
                    alt=""
                    className="size-10 rounded-xl object-cover ring-1 ring-white/20"
                  />
                  <p className="text-base font-extrabold text-white">أجي نقصرو</p>
                </div>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  onClick={() => setOpen(false)}
                  className="grid size-10 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <FontAwesomeIcon icon={faXmark} className="size-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain p-4">
                {links.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => goTo(key)}
                    className={`flex w-full items-center rounded-xl px-4 py-3.5 text-start text-sm font-semibold transition-colors ${
                      active === key
                        ? 'bg-white/10 text-green-400'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t(`landing.nav.links.${key}`)}
                  </button>
                ))}
              </nav>

              <div className="space-y-3 border-t border-white/10 p-5">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="flex h-11 w-full items-center gap-2 rounded-[14px] border border-white/20 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <FontAwesomeIcon icon={faGlobe} className="size-4" />
                  {currentLang}
                </button>

                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(homeForRole(user.role))}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-colors hover:bg-green-600"
                    >
                      <FontAwesomeIcon icon={faGaugeHigh} className="size-4" />
                      {t('landing.nav.dashboard')}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-white/20 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
                    >
                      <FontAwesomeIcon icon={faArrowRightFromBracket} className="size-4" />
                      {t('landing.nav.logout')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-white/20 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <FontAwesomeIcon icon={faUser} className="size-4" />
                    {t('landing.nav.login')}
                  </button>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  )
}
