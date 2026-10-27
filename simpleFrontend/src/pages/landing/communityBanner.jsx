import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol } from '@fortawesome/free-solid-svg-icons'
import { faFacebook, faInstagram } from '@fortawesome/free-brands-svg-icons'

export default function CommunityBanner({ theme = 'dark' }) {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="community-banner-heading"
      className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-8 sm:my-12"
    >
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-gradient-to-l from-[#134E2E] via-[#0F3D2E] to-[#0A161E] px-6 py-8 sm:px-10 sm:py-12 shadow-[0_20px_50px_rgba(15,61,46,0.35)] ring-1 ring-white/15">
        {/* Subtle Decorative Soccer Ball Background Shapes */}
        <FontAwesomeIcon
          icon={faFutbol}
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 end-8 size-28 text-white/5"
        />
        <FontAwesomeIcon
          icon={faFutbol}
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 start-10 size-20 text-white/5"
        />

        <div className="relative z-10 flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-start">
          <div className="max-w-xl">
            <h2
              id="community-banner-heading"
              className="text-xl sm:text-2xl lg:text-3xl font-black leading-[1.3] text-white"
            >
              {t('landing.footer.banner.title')}
            </h2>
            <p className="mt-2 text-xs sm:text-sm lg:text-base leading-relaxed text-slate-200 font-medium">
              {t('landing.footer.banner.subtitle')}
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 sm:h-13 w-full sm:w-auto justify-center items-center gap-2.5 rounded-2xl bg-[#1F7A4D] hover:bg-[#1A6841] px-7 text-xs sm:text-sm font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-98"
            >
              <FontAwesomeIcon icon={faFacebook} className="size-4" />
              <span>{t('landing.footer.banner.facebook')}</span>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 sm:h-13 w-full sm:w-auto justify-center items-center gap-2.5 rounded-2xl border-2 border-[#1F7A4D] hover:bg-[#1F7A4D]/20 px-7 text-xs sm:text-sm font-black text-white backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] active:scale-98"
            >
              <FontAwesomeIcon icon={faInstagram} className="size-4" />
              <span>{t('landing.footer.banner.instagram')}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
