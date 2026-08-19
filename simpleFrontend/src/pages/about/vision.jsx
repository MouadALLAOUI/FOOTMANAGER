import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFlag, faHeart } from '@fortawesome/free-solid-svg-icons'
import Reveal from '../matches/reveal'

export default function AboutVision() {
  const { t } = useTranslation()

  return (
    <section className="bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] bg-[#111827] px-6 py-16 text-center shadow-[0_45px_100px_rgba(2,6,23,0.4)] ring-1 ring-white/10 sm:p-[64px]">
            <div
              className="animate-gradient-move pointer-events-none absolute -inset-24 bg-[radial-gradient(60%_80%_at_18%_15%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(50%_70%_at_92%_100%,rgba(16,185,129,0.12),transparent_60%)]"
              aria-hidden="true"
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
              viewBox="0 0 1440 600"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              aria-hidden="true"
            >
              <g stroke="#ffffff" strokeWidth="2">
                <line x1="0" y1="300" x2="1440" y2="300" />
                <line x1="720" y1="0" x2="720" y2="600" />
                <circle cx="720" cy="300" r="150" />
                <rect x="320" y="190" width="300" height="220" />
                <rect x="820" y="190" width="300" height="220" />
              </g>
            </svg>

            <FontAwesomeIcon
              icon={faHeart}
              aria-hidden="true"
              className="animate-float pointer-events-none absolute -top-4 start-10 size-14 text-white/5"
            />

            <div className="relative mx-auto max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-green-300 ring-1 ring-white/20 backdrop-blur-sm">
                <FontAwesomeIcon icon={faFlag} className="size-3.5" />
                {t('about.vision.subtitle')}
              </span>
              <h2 className="mt-6 text-3xl font-black leading-[1.25] text-white lg:text-4xl">
                {t('about.vision.title')}
              </h2>
              <p className="mt-7 text-sm leading-[2] text-slate-300 lg:text-base">{t('about.vision.p1')}</p>
              <p className="mt-5 text-sm leading-[2] text-slate-400 lg:text-base">{t('about.vision.p2')}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
