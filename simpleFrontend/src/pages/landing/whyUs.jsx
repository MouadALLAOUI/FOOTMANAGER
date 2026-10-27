import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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
      className="w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
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
    <section aria-labelledby="why-us-heading" className="py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* القسم الأول: لماذا أجي نقصرو */}
        <header className="mx-auto max-w-2xl text-center mb-8 sm:mb-12">
          <span className="mx-auto mb-2.5 block h-1 w-10 rounded-full bg-[#1F7A4D]" aria-hidden="true" />
          <h2 id="why-us-heading" className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14221C] tracking-tight">
            {t('landing.why.title')}
          </h2>
          <p className="mt-2 text-xs sm:text-sm lg:text-base leading-relaxed text-slate-600 font-medium">
            {t('landing.why.subtitle')}
          </p>
        </header>

        {/* شبكة المزايا الأربع */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {features.map(({ key, icon: Icon }) => (
            <article
              key={key}
              className="group rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-7 text-center shadow-sm border border-slate-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#1F7A4D]"
            >
              <div className="mx-auto grid size-12 sm:size-16 place-items-center rounded-2xl bg-emerald-50 text-[#1F7A4D] transition-colors duration-300 group-hover:bg-[#1F7A4D] group-hover:text-white">
                <FontAwesomeIcon icon={Icon} className="size-5 sm:size-7" />
              </div>

              <h3 className="mt-3 sm:mt-5 text-xs sm:text-base font-black text-[#14221C]">
                {t(`landing.why.features.${key}.title`)}
              </h3>
              <p className="mx-auto mt-1 line-clamp-2 text-[11px] sm:text-xs leading-relaxed text-slate-600 font-medium">
                {t(`landing.why.features.${key}.description`)}
              </p>
            </article>
          ))}
        </div>

        {/* القسم الثاني: هل تملك ملعباً؟ (قسم داكن مخصص) */}
        <div className="relative mt-10 sm:mt-14 overflow-hidden rounded-[24px] sm:rounded-[32px] bg-[#0F172A] border border-slate-700/60 p-6 sm:p-12 shadow-2xl">
          <div
            className="pointer-events-none absolute -inset-24 bg-[radial-gradient(60%_80%_at_18%_15%,rgba(31,122,77,0.22),transparent_60%),radial-gradient(50%_70%_at_92%_100%,rgba(16,185,129,0.15),transparent_60%)]"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col-reverse items-center gap-8 lg:flex-row lg:justify-between">
            <div className="w-full text-center lg:w-1/2 lg:text-start">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-[1.25] text-white">
                {t('landing.why.cta.title1')}{' '}
                <span className="text-emerald-400">{t('landing.why.cta.title2')}</span>
              </h3>
              <p className="mt-3 text-xs sm:text-sm lg:text-base leading-relaxed text-slate-300 font-medium">
                {t('landing.why.cta.description')}
              </p>
              <Link
                to="/stadiums"
                className="mt-6 sm:mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#1F7A4D] hover:bg-[#1A6841] px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-98"
              >
                <FontAwesomeIcon icon={faPlus} className="size-4" />
                <span>{t('landing.why.cta.button')}</span>
              </Link>
            </div>

            <div className="flex w-full justify-center lg:w-1/2 lg:justify-end">
              <div className="w-full max-w-[380px] sm:max-w-[460px]">
                <FieldIllustration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
