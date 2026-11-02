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
import { Moon, Sun } from 'lucide-react'
import { useAuth, homeForRole } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const links = ['home', 'fields', 'matches', 'tournaments', 'about', 'pricing']

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
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
    `relative text-xs lg:text-sm font-bold whitespace-nowrap transition-colors ${
      active === key
        ? 'text-[#111313] dark:text-[#F5F7F2]'
        : 'text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2]'
    }`

  return (
    <header
      className="sticky top-0 z-[var(--z-header)] h-14 min-h-[56px] max-h-[56px] w-full bg-white dark:bg-[#1B201D] border-b border-[#E1E5DF] dark:border-[#303832] text-[#111313] dark:text-[#F5F7F2] shadow-xs select-none transition-colors"
      style={{ paddingTop: 'var(--safe-top-offset, 0px)' }}
    >
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 w-full max-w-7xl">
        <div className="flex items-center gap-3 lg:gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              goTo('home')
            }}
            className="group flex items-center gap-2.5 sm:gap-3"
            aria-label="أجي نقصرو"
          >
            <img
              src="/logo.jpeg"
              alt="أجي نقصرو"
              className="size-8 sm:size-9 shrink-0 rounded-lg object-cover border border-[#E1E5DF] dark:border-[#303832] transition-transform duration-200 group-hover:scale-105"
            />
            <div className="leading-tight">
              <p className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">أجي نقصرو</p>
              <p className="hidden text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3] sm:block">{t('landing.nav.tagline')}</p>
            </div>
          </a>
        </div>

        <nav className="mx-auto hidden items-center gap-3.5 md:flex lg:gap-8 xl:gap-10">
          {links.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(key)}
              className={linkClass(key)}
            >
              {t(`landing.nav.links.${key}`)}
              <span
                className={`absolute -bottom-1 start-1/2 h-[2px] -translate-x-1/2 rounded-full bg-[#B8F000] dark:bg-[#D0FF38] transition-all duration-200 ease-out rtl:translate-x-1/2 ${
                  active === key ? 'w-full' : 'w-0'
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 lg:gap-2.5">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'الوضع النهاري' : 'الوضع الداكن'}
            title={isDark ? 'الوضع النهاري' : 'الوضع الداكن'}
            className="grid size-9 place-items-center rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2] transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-[#111313]" />}
          </button>

          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLang}
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#252B27] px-2.5 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition-colors hover:bg-[#E9ECE7] dark:hover:bg-[#303832] md:flex lg:px-3 cursor-pointer"
          >
            <FontAwesomeIcon icon={faGlobe} className="size-3.5" />
            <span className="hidden lg:inline">{currentLang}</span>
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => navigate(homeForRole(user.role))}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] dark:text-[#101211] font-black px-3.5 text-xs shadow-xs transition-all hover:opacity-90 active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <FontAwesomeIcon icon={faGaugeHigh} className="size-3.5" />
                {t('landing.nav.dashboard')}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#252B27] px-3 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hover:text-[#D93636] transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <FontAwesomeIcon icon={faArrowRightFromBracket} className="size-3.5" />
                {t('landing.nav.logout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#111313] dark:bg-[#252B27] text-[#F5F7F2] px-3.5 text-xs font-bold transition-all hover:bg-[#252B27] dark:hover:bg-[#303832] active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <FontAwesomeIcon icon={faUser} className="size-3.5" />
                {t('landing.nav.login')}
              </button>

              <button
                type="button"
                onClick={() => navigate('/register')}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] dark:text-[#101211] font-black px-4 text-xs shadow-xs transition-all hover:opacity-90 active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlus} className="size-3.5" />
                {t('landing.nav.addField')}
              </button>
            </div>
          )}

          {!user && (
            <button
              type="button"
              onClick={() => navigate('/register')}
              aria-label={t('landing.nav.addField')}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] dark:text-[#101211] font-black px-3 text-xs shadow-xs transition-all hover:opacity-90 active:scale-95 md:hidden cursor-pointer"
            >
              <FontAwesomeIcon icon={faPlus} className="size-3.5" />
              <span className="hidden sm:inline">{t('landing.nav.addField')}</span>
            </button>
          )}

          <button
            type="button"
            aria-label={t('landing.nav.menu')}
            onClick={() => setOpen(true)}
            className="grid size-9 place-items-center rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] transition-colors md:hidden cursor-pointer"
          >
            <FontAwesomeIcon icon={faBars} className="size-4" />
          </button>
        </div>
      </div>

      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[var(--z-drawer)] transition-opacity duration-200 ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t('landing.nav.menu')}
              className={`fixed inset-y-0 start-0 flex h-[100dvh] w-72 max-w-[85vw] flex-col bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] border-e border-[#E1E5DF] dark:border-[#303832] shadow-xl transition-transform duration-300 ease-out select-none ${
                visible
                  ? 'translate-x-0'
                  : 'translate-x-full rtl:-translate-x-full'
              }`}
            >
              <div className="flex h-14 items-center justify-between border-b border-[#E1E5DF] dark:border-[#303832] px-5">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.jpeg"
                    alt=""
                    className="size-8 rounded-lg object-cover border border-[#E1E5DF] dark:border-[#303832]"
                  />
                  <p className="text-base font-black text-[#111313] dark:text-[#F5F7F2]">أجي نقصرو</p>
                </div>
                <button
                  type="button"
                  aria-label={t('common.close')}
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-lg text-[#65706A] dark:text-[#B2B9B3] transition-colors hover:bg-[#E9ECE7] dark:hover:bg-[#252B27] cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} className="size-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-1">
                {links.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => goTo(key)}
                    className={`flex w-full items-center rounded-lg px-4 py-3 text-start text-sm font-bold transition-colors ${
                      active === key
                        ? 'bg-[#B8F000]/20 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]'
                        : 'text-[#65706A] dark:text-[#B2B9B3] hover:bg-[#E9ECE7] dark:hover:bg-[#252B27] hover:text-[#111313] dark:hover:text-[#F5F7F2]'
                    }`}
                  >
                    {t(`landing.nav.links.${key}`)}
                  </button>
                ))}
              </nav>

              <div className="space-y-2.5 border-t border-[#E1E5DF] dark:border-[#303832] p-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-[#E1E5DF] dark:border-[#303832] px-4 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition-colors hover:bg-[#E9ECE7] dark:hover:bg-[#252B27]"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
                    <span>{isDark ? 'الوضع النهاري' : 'الوضع الداكن'}</span>
                  </span>
                  <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">{isDark ? 'مُفعّل' : 'معطّل'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleLang}
                  className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#E1E5DF] dark:border-[#303832] px-4 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition-colors hover:bg-[#E9ECE7] dark:hover:bg-[#252B27]"
                >
                  <FontAwesomeIcon icon={faGlobe} className="size-4" />
                  {currentLang}
                </button>

                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(homeForRole(user.role))}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] text-xs font-black text-[#111313] dark:text-[#101211] shadow-xs hover:opacity-90"
                    >
                      <FontAwesomeIcon icon={faGaugeHigh} className="size-4" />
                      {t('landing.nav.dashboard')}
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E1E5DF] dark:border-[#303832] text-xs font-bold text-[#D93636] dark:text-[#FF6868] hover:bg-rose-50/20"
                    >
                      <FontAwesomeIcon icon={faArrowRightFromBracket} className="size-4" />
                      {t('landing.nav.logout')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#111313] dark:bg-[#252B27] text-xs font-bold text-[#F5F7F2] hover:bg-[#252B27] dark:hover:bg-[#303832]"
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
