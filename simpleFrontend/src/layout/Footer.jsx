import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol } from '@fortawesome/free-solid-svg-icons'
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
    else if (key === 'home') navigate('/')
  }

  return (
    <footer className="relative overflow-hidden bg-[#0F172A]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-gradient-move absolute -top-48 start-[20%] size-[520px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.16),transparent_65%)] blur-[60px]" />
        <div className="absolute -bottom-48 end-0 size-[440px] rounded-full bg-[radial-gradient(circle,rgba(22,163,74,0.14),transparent_65%)] blur-[70px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 pt-16 lg:pt-20">
        <div className="relative">
          <div className="overflow-hidden rounded-[30px] bg-gradient-to-l from-green-600/50 via-[#134e2e] to-slate-900 px-8 py-12 shadow-[0_45px_100px_rgba(2,6,23,0.65),0_25px_70px_rgba(22,163,74,0.25)] ring-1 ring-white/15 lg:p-[50px]">
          <FontAwesomeIcon
            icon={faFutbol}
            aria-hidden="true"
            className="animate-float pointer-events-none absolute -top-6 end-8 size-24 text-white/10"
          />
          <FontAwesomeIcon
            icon={faFutbol}
            aria-hidden="true"
            className="animate-float pointer-events-none absolute -bottom-8 start-10 size-16 text-white/10"
            style={{ animationDelay: '1.6s' }}
          />

          <div className="relative flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:text-start">
            <div className="max-w-xl">
              <h2 className="text-2xl font-black leading-[1.3] text-white lg:text-[34px]">
                {t('landing.footer.banner.title')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 lg:text-base">
                {t('landing.footer.banner.subtitle')}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <button
                type="button"
                className="flex h-[54px] items-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0"
              >
                <SocialIcon name="facebook" />
                {t('landing.footer.banner.facebook')}
              </button>
              <button
                type="button"
                className="flex h-[54px] items-center gap-2.5 rounded-2xl border border-white/25 px-7 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-green-400 hover:text-green-300 hover:shadow-[0_16px_40px_rgba(22,163,74,0.25)] active:translate-y-0"
              >
                <SocialIcon name="instagram" />
                {t('landing.footer.banner.instagram')}
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className="pt-14 pb-[70px]">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center sm:text-start">
              <div className="flex items-center justify-center gap-3 sm:justify-start">
                <img
                  src="/logo.jpeg"
                  alt=""
                  className="size-12 shrink-0 rounded-2xl object-cover shadow-[0_10px_30px_rgba(22,163,74,0.4)] ring-1 ring-white/20"
                />
                <span className="text-xl font-black text-white">أجي نقصرو</span>
              </div>
              <p className="mt-5 max-w-[280px] text-sm leading-relaxed text-slate-400">
                {t('landing.footer.description')}
              </p>
            </div>

            <nav className="text-center sm:text-start">
              <h3 className="text-sm font-bold text-white">{t('landing.footer.quick.title')}</h3>
              <ul className="mt-5 space-y-3">
                {quickLinks.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => goTo(key)}
                      className="text-sm text-slate-400 transition-colors duration-300 hover:text-green-400"
                    >
                      {t(`landing.footer.quick.links.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="text-center sm:text-start">
              <h3 className="text-sm font-bold text-white">{t('landing.footer.support.title')}</h3>
              <ul className="mt-5 space-y-3">
                {supportLinks.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => goTo(key)}
                      className="text-sm text-slate-400 transition-colors duration-300 hover:text-green-400"
                    >
                      {t(`landing.footer.support.links.${key}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="text-center sm:text-start">
              <h3 className="text-sm font-bold text-white">{t('landing.footer.social.title')}</h3>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                {socials.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={t(`landing.footer.social.labels.${key}`)}
                    className="grid size-12 place-items-center rounded-full bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-green-500 hover:text-white hover:shadow-[0_12px_32px_rgba(22,163,74,0.45)] hover:ring-green-500 active:translate-y-0"
                  >
                    <SocialIcon name={key} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={subscribe}
            className="mt-16 flex flex-col items-center justify-between gap-6 rounded-[24px] bg-white/5 px-7 py-8 ring-1 ring-white/10 lg:flex-row"
          >
            <div className="text-center lg:text-start">
              <h3 className="text-lg font-extrabold text-white">
                {t('landing.footer.newsletter.title')}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {t('landing.footer.newsletter.description')}
              </p>
            </div>
            <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('landing.footer.newsletter.placeholder')}
                dir="rtl"
                className="h-14 w-full rounded-2xl bg-white/5 px-5 text-sm text-white outline-none ring-1 ring-white/15 transition-all duration-300 placeholder:text-slate-500 focus:bg-white/10 focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="h-14 shrink-0 rounded-2xl bg-green-500 px-8 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_18px_45px_rgba(22,163,74,0.55)] active:translate-y-0"
              >
                {t('landing.footer.newsletter.button')}
              </button>
            </div>
          </form>
        </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 text-xs text-slate-500 sm:flex-row">
            <p>
              {t('landing.footer.bottom.copyright')} · {t('landing.footer.bottom.rights')}
            </p>
            <p>{t('landing.footer.bottom.madeIn')}</p>
          </div>
        </div>
    </footer>
  )
}
