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
      <div className="relative overflow-hidden rounded-xl bg-[#101211] border border-[#303832] px-6 py-8 sm:px-10 sm:py-10 shadow-xl">
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
              className="flex h-12 sm:h-13 w-full sm:w-auto justify-center items-center gap-2.5 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] hover:brightness-105 px-7 text-xs sm:text-sm font-black text-[#111313] shadow-md transition-all active:scale-98"
            >
              <FontAwesomeIcon icon={faFacebook} className="size-4" />
              <span>{t('landing.footer.banner.facebook')}</span>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 sm:h-13 w-full sm:w-auto justify-center items-center gap-2.5 rounded-lg border-2 border-white/30 hover:bg-white/10 px-7 text-xs sm:text-sm font-black text-white transition-all active:scale-98"
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
