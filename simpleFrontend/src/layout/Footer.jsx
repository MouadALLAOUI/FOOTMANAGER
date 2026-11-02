import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFacebook,
  faInstagram,
  faTiktok,
  faWhatsapp,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons'

const brandIcons = {
  facebook: faFacebook,
  instagram: faInstagram,
  tiktok: faTiktok,
  youtube: faYoutube,
  whatsapp: faWhatsapp,
}

function SocialIcon({ name }) {
  return <FontAwesomeIcon icon={brandIcons[name]} className="size-5" />
}

const socials = ['facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp']

export default function Footer() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const quickLinks = ['home', 'fields', 'matches', 'about', 'pricing', 'addField']
  const supportLinks = ['help', 'faq', 'contact', 'privacy', 'terms']

  const subscribe = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setEmail('')
  }

  const goTo = (key) => {
    if (key === 'fields') navigate('/fields')
    else if (key === 'matches') navigate('/matches')
    else if (key === 'about') navigate('/about')
    else if (key === 'pricing') navigate('/pricing')
    else if (key === 'contact') navigate('/contact')
    else if (key === 'terms') navigate('/terms')
    else if (key === 'privacy') navigate('/privacy')
    else if (key === 'help') navigate('/help')
    else if (key === 'faq') navigate('/faq')
    else if (key === 'home') navigate('/')
  }

  return (
    <footer className="relative overflow-hidden bg-[#101211] border-t border-[#303832] text-[#F5F7F2]">


      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 pt-12 lg:pt-16">
        <div className="pb-10 sm:pb-14">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Branding Column */}
            <div className="text-center sm:text-start">
              <div className="flex items-center justify-center gap-3 sm:justify-start">
                <img
                  src="/logo.jpeg"
                  alt="أجي نقصرو"
                  className="size-12 shrink-0 rounded-lg object-cover border border-[#303832]"
                />
                <span className="text-xl font-black text-white">أجي نقصرو</span>
              </div>
              <p className="mt-4 max-w-[280px] text-xs sm:text-sm leading-relaxed text-slate-300 font-medium">
                {t('landing.footer.description')}
              </p>
            </div>

            {/* Quick Links Column */}
            <nav className="text-center sm:text-start">
              <h3 className="text-sm font-extrabold text-white">{t('landing.footer.quick.title')}</h3>
              <ul className="mt-4 space-y-2.5">
                {quickLinks.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => goTo(key)}
                      className="text-xs sm:text-sm text-slate-300 transition-colors duration-300 hover:text-emerald-400 font-medium cursor-pointer"
                    >
                      {t(`landing.footer.quick.links.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Support Links Column */}
            <nav className="text-center sm:text-start">
              <h3 className="text-sm font-extrabold text-white">{t('landing.footer.support.title')}</h3>
              <ul className="mt-4 space-y-2.5">
                {supportLinks.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => goTo(key)}
                      className="text-xs sm:text-sm text-slate-300 transition-colors duration-300 hover:text-emerald-400 font-medium cursor-pointer"
                    >
                      {t(`landing.footer.support.links.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Social Media Column */}
            <div className="text-center sm:text-start">
              <h3 className="text-sm font-extrabold text-white">{t('landing.footer.social.title')}</h3>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                {socials.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={t(`landing.footer.social.labels.${key}`)}
                    className="grid size-11 place-items-center rounded-lg bg-[#1B201D] text-[#B2B9B3] border border-[#303832] transition-colors hover:text-[#D0FF38] hover:border-[#D0FF38] active:scale-95 cursor-pointer"
                  >
                    <SocialIcon name={key} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Newsletter Form with Clear Visible Border and High Contrast */}
          <form
            onSubmit={subscribe}
            className="mt-10 sm:mt-14 flex flex-col items-center justify-between gap-5 rounded-xl bg-[#1B201D] border border-[#303832] p-5 sm:p-6 shadow-xs lg:flex-row"
          >
            <div className="text-center lg:text-start">
              <h3 className="text-base sm:text-lg font-black text-white">
                {t('landing.footer.newsletter.title')}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">
                {t('landing.footer.newsletter.description')}
              </p>
            </div>
            <div className="flex w-full max-w-xl flex-col gap-2.5 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('landing.footer.newsletter.placeholder')}
                dir="rtl"
                className="h-12 w-full rounded-lg border border-[#303832] bg-[#101211] px-4 text-xs sm:text-sm text-[#F5F7F2] placeholder-[#B2B9B3]/50 outline-none transition-all focus:border-[#D0FF38] focus:ring-2 focus:ring-[#D0FF38]/20"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] dark:text-[#101211] font-black px-6 sm:px-7 text-xs sm:text-sm transition-all hover:opacity-90 active:scale-98 cursor-pointer"
              >
                {t('landing.footer.newsletter.button')}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Bottom Rights */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#303832] py-6 text-xs text-[#B2B9B3] font-medium sm:flex-row">
          <p>
            {t('landing.footer.bottom.copyright')} · {t('landing.footer.bottom.rights')}
          </p>
          <p>{t('landing.footer.bottom.madeIn')}</p>
        </div>
      </div>
    </footer>
  )
}
