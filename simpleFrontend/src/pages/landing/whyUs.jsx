import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBolt,
  faPlus,
  faShieldHalved,
  faUsers,
  faWallet,
} from '@fortawesome/free-solid-svg-icons'

const features = [
  { key: 'fast', icon: faBolt },
  { key: 'verified', icon: faShieldHalved },
  { key: 'price', icon: faWallet },
  { key: 'community', icon: faUsers },
]

function FieldIllustration() {
  return (
    <svg
      viewBox="0 0 640 500"
      fill="none"
      className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#052e16" />
        </linearGradient>
        <linearGradient id="turfStripe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
        <radialGradient id="turfGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fefce8" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#fde68a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <clipPath id="turfClip">
          <path d="M110,215 L530,215 L612,475 L28,475 Z" />
        </clipPath>
        <pattern
          id="net"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path d="M0,0 L14,14 M14,0 L0,14" stroke="#e2e8f0" strokeWidth="1.4" />
        </pattern>
      </defs>

      <ellipse cx="320" cy="470" rx="240" ry="26" fill="#000000" opacity="0.55" />
      <ellipse cx="320" cy="466" rx="170" ry="17" fill="#000000" opacity="0.35" />

      <ellipse cx="320" cy="360" rx="300" ry="180" fill="url(#turfGlow)" />

      <g>
        <path d="M250,80 L390,80 L390,212 L250,212 Z" fill="url(#net)" opacity="0.55" />
        <path
          d="M250,80 L250,212 M390,80 L390,212 M250,80 L390,80"
          stroke="#f8fafc"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      <g>
        <line x1="62" y1="120" x2="62" y2="225" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        <rect x="44" y="106" width="36" height="16" rx="8" fill="#e2e8f0" />
        <circle cx="62" cy="106" r="46" fill="url(#lamp)" />
        <line x1="578" y1="120" x2="578" y2="225" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        <rect x="560" y="106" width="36" height="16" rx="8" fill="#e2e8f0" />
        <circle cx="578" cy="106" r="46" fill="url(#lamp)" />
      </g>

      <path d="M110,215 L530,215 L612,475 L28,475 Z" fill="url(#turf)" />

      <g clipPath="url(#turfClip)">
        <rect x="-50" y="240" width="740" height="52" fill="url(#turfStripe)" />
        <rect x="-50" y="340" width="740" height="52" fill="url(#turfStripe)" />
        <rect x="-50" y="440" width="740" height="52" fill="url(#turfStripe)" />
      </g>

      <g stroke="#ffffff" strokeWidth="2.5" opacity="0.75" fill="none" strokeLinejoin="round">
        <path d="M110,215 L530,215 L612,475 L28,475 Z" />
        <path d="M320,215 L320,475" />
        <ellipse cx="320" cy="345" rx="62" ry="20" />
        <path d="M150,215 L150,258 L490,258 L490,215" />
        <path d="M150,475 L150,432 L490,432 L490,475" />
      </g>

      <g transform="translate(336,452)">
        <circle r="11" fill="#ffffff" />
        <path d="M-3,-6 L3,-6 L0,5 Z" fill="#111827" />
        <path d="M-9,2 L-2,-2 L-6,8 Z" fill="#111827" />
        <path d="M9,2 L2,-2 L6,8 Z" fill="#111827" />
      </g>
    </svg>
  )
}

export default function WhyUs() {
  const { t } = useTranslation()

  return (
    <section className="bg-white pt-[100px] pb-[160px] lg:pt-[120px] lg:pb-[140px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="mx-auto max-w-2xl text-center">
          <span className="mb-3 block h-1 w-10 rounded-full bg-green-500" aria-hidden="true" />
          <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">
            {t('landing.why.title')}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-500 lg:text-base">
            {t('landing.why.subtitle')}
          </p>
        </header>

        <div className="mt-14 flex flex-wrap justify-center gap-4 sm:gap-8">
          {features.map(({ key, icon: Icon }) => (
            <article
              key={key}
              className="group w-[calc(50%-0.5rem)] rounded-2xl bg-white p-4 text-center shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.15)] hover:ring-1 hover:ring-green-500 sm:w-[calc(50%-1rem)] sm:rounded-[24px] sm:p-9 lg:w-[calc(25%-1.5rem)]"
            >
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-green-50 transition-colors duration-300 group-hover:bg-green-100 sm:size-[76px] sm:rounded-[22px]">
                <FontAwesomeIcon
                  icon={Icon}
                  className="size-5 text-green-600 transition-transform duration-300 ease-out group-hover:scale-110 sm:size-9"
                />
              </div>

              <h3 className="mt-3 text-sm font-extrabold text-slate-900 sm:mt-6 sm:text-lg">
                {t(`landing.why.features.${key}.title`)}
              </h3>
              <p className="mx-auto mt-1 line-clamp-2 max-w-[220px] text-xs leading-relaxed text-slate-500 sm:mt-2 sm:text-sm">
                {t(`landing.why.features.${key}.description`)}
              </p>
            </article>
          ))}
        </div>

        <div className="relative mt-14 overflow-hidden rounded-[28px] bg-[#111827] px-6 py-14 sm:p-[60px]">
          <div
            className="animate-gradient-move pointer-events-none absolute -inset-24 bg-[radial-gradient(60%_80%_at_18%_15%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(50%_70%_at_92%_100%,rgba(16,185,129,0.12),transparent_60%)]"
            aria-hidden="true"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
            viewBox="0 0 1440 400"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            aria-hidden="true"
          >
            <g stroke="#ffffff" strokeWidth="2">
              <line x1="0" y1="200" x2="1440" y2="200" />
              <line x1="720" y1="0" x2="720" y2="400" />
              <circle cx="720" cy="200" r="120" />
              <rect x="140" y="70" width="220" height="260" />
              <rect x="1080" y="70" width="220" height="260" />
            </g>
          </svg>

          <div className="relative flex flex-wrap items-center gap-12 lg:flex-nowrap">
            <div className="w-full text-center lg:w-1/2 lg:text-start">
              <h3 className="text-3xl font-black leading-[1.25] text-white lg:text-[40px]">
                {t('landing.why.cta.title1')}{' '}
                <span className="text-green-400">{t('landing.why.cta.title2')}</span>
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-slate-300 lg:text-base">
                {t('landing.why.cta.description')}
              </p>
              <button
                type="button"
                className="mt-9 inline-flex h-[58px] items-center gap-2 rounded-[18px] bg-green-500 px-9 text-base font-bold text-white shadow-[0_14px_35px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-[0_20px_50px_rgba(22,163,74,0.6)] active:translate-y-0"
              >
                <FontAwesomeIcon icon={faPlus} className="size-5" />
                {t('landing.why.cta.button')}
              </button>
            </div>

            <div className="flex w-full justify-center lg:w-1/2 lg:justify-end">
              <div className="animate-float w-full max-w-[520px]">
                <FieldIllustration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
