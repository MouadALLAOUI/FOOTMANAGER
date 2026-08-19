import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import Reveal from '../matches/reveal'

export default function AboutCta() {
  const { t } = useTranslation()

  return (
    <section className="bg-[#f6f7fb] pb-[140px] pt-[100px] lg:pb-[160px] lg:pt-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-l from-green-600/50 via-[#134e2e] to-slate-900 px-8 py-14 text-center shadow-[0_45px_100px_rgba(2,6,23,0.5),0_25px_70px_rgba(22,163,74,0.2)] ring-1 ring-white/15 lg:p-[60px]">
            <FontAwesomeIcon
              icon={faFutbol}
              aria-hidden="true"
              className="animate-float pointer-events-none absolute -top-6 end-10 size-24 text-white/10"
            />
            <FontAwesomeIcon
              icon={faFutbol}
              aria-hidden="true"
              className="animate-float pointer-events-none absolute -bottom-8 start-12 size-16 text-white/10"
              style={{ animationDelay: '1.6s' }}
            />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-black leading-[1.3] text-white lg:text-[38px]">
                {t('about.cta.title')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 lg:text-base">{t('about.cta.subtitle')}</p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="btn-ripple flex h-[54px] items-center gap-2.5 rounded-2xl bg-green-500 px-8 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0"
                >
                  <FontAwesomeIcon icon={faUserPlus} className="size-5" />
                  {t('about.cta.primary')}
                </Link>
                <Link
                  to="/fields"
                  className="flex h-[54px] items-center gap-2.5 rounded-2xl border border-white/25 px-8 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-green-400 hover:text-green-300 active:translate-y-0"
                >
                  <FontAwesomeIcon icon={faFutbol} className="size-5" />
                  {t('about.cta.secondary')}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
