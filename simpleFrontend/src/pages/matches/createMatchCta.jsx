import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol, faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons'
import Reveal from './reveal'

function KickoffIllustration() {
  return (
    <svg
      viewBox="0 0 560 340"
      fill="none"
      aria-hidden="true"
      className="w-full drop-shadow-[0_30px_70px_rgba(2,6,23,0.5)]"
    >
      <defs>
        <linearGradient id="kickoffPitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
        <linearGradient id="kickoffStripe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
        </linearGradient>
        <radialGradient id="kickoffGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="280" cy="320" rx="250" ry="22" fill="#000000" opacity="0.45" />
      <ellipse cx="280" cy="316" rx="180" ry="13" fill="#000000" opacity="0.3" />

      <ellipse cx="280" cy="250" rx="290" ry="150" fill="url(#kickoffGlow)" />

      <path d="M70,120 L490,120 L560,330 L0,330 Z" fill="url(#kickoffPitch)" />
      <path d="M70,120 L490,120 L560,330 L0,330 Z" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" />

      <g stroke="#ffffff" strokeWidth="2.5" opacity="0.45">
        <path d="M280,120 L280,330" />
        <ellipse cx="280" cy="230" rx="92" ry="30" />
        <path d="M130,120 L130,170 L430,170 L430,120" />
        <path d="M195,330 L195,280 L365,280 L365,330" />
      </g>

      <g opacity="0.35">
        <rect x="-40" y="170" width="640" height="46" fill="url(#kickoffStripe)" />
        <rect x="-40" y="270" width="640" height="46" fill="url(#kickoffStripe)" />
      </g>

      <g fill="#0b1220">
        <g transform="translate(178,196)">
          <circle cx="0" cy="-52" r="15" />
          <path d="M-17,-36 C-19,-12 -12,-4 -4,-4 L4,-4 C12,-4 19,-12 17,-36 L10,-38 C8,-16 2,-10 0,-10 C-2,-10 -8,-16 -10,-38 Z" />
          <path d="M-10,0 L-14,38 L-4,34 L0,10 L4,34 L14,38 L10,0 Z" />
          <path d="M-4,-4 L0,-10 L4,-4 Z" />
        </g>

        <g transform="translate(382,196) scale(-1,1)">
          <circle cx="0" cy="-52" r="15" />
          <path d="M-17,-36 C-19,-12 -12,-4 -4,-4 L4,-4 C12,-4 19,-12 17,-36 L10,-38 C8,-16 2,-10 0,-10 C-2,-10 -8,-16 -10,-38 Z" />
          <path d="M-10,0 L-14,38 L-4,34 L0,10 L4,34 L14,38 L10,0 Z" />
          <path d="M-4,-4 L0,-10 L4,-4 Z" />
        </g>
      </g>

      <g transform="translate(280,272)">
        <circle r="11" fill="#ffffff" />
        <path d="M-3,-6 L3,-6 L0,5 Z" fill="#0b1220" />
        <path d="M-9,2 L-2,-2 L-6,8 Z" fill="#0b1220" />
        <path d="M9,2 L2,-2 L6,8 Z" fill="#0b1220" />
      </g>
    </svg>
  )
}

export default function CreateMatchCta({ onCreate, onExplore }) {
  const { t } = useTranslation()

  return (
    <section id="create-match" className="scroll-mt-24 bg-white pb-48 pt-[40px] lg:pb-40">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(120%_160%_at_10%_0%,rgba(34,197,94,0.35),transparent_55%),radial-gradient(100%_140%_at_95%_100%,rgba(5,150,105,0.5),transparent_60%),linear-gradient(135deg,#064e3b,#022c22)] px-8 py-12 shadow-[0_40px_100px_rgba(2,6,23,0.5)] ring-1 ring-white/10 lg:px-[70px] lg:py-[60px]">
            <div
              aria-hidden="true"
              className="animate-gradient-move pointer-events-none absolute -inset-24 bg-[radial-gradient(55%_70%_at_15%_20%,rgba(34,197,94,0.22),transparent_60%),radial-gradient(45%_60%_at_90%_85%,rgba(16,185,129,0.18),transparent_60%)]"
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
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

            <div className="relative flex flex-col items-center gap-12 lg:flex-row">
              <div className="w-full text-center lg:w-[55%] lg:text-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-green-300 ring-1 ring-white/15">
                  <FontAwesomeIcon icon={faFutbol} className="size-3.5" />
                  {t('matchesPage.cta.explore')}
                </span>
                <h2 className="mt-5 text-3xl font-black leading-[1.25] text-white lg:text-[42px]">
                  {t('matchesPage.cta.title')}
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 lg:text-base">
                  {t('matchesPage.cta.description')}
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="btn-ripple flex h-[54px] items-center gap-2 rounded-[16px] bg-green-500 px-8 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0"
                  >
                    <FontAwesomeIcon icon={faPlus} className="size-4" />
                    {t('matchesPage.cta.create')}
                  </button>
                  <button
                    type="button"
                    onClick={onExplore}
                    className="flex h-[54px] items-center gap-2 rounded-[16px] border-2 border-white/30 px-8 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 active:translate-y-0"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="size-4" />
                    {t('matchesPage.cta.explore')}
                  </button>
                </div>
              </div>

              <div className="w-full lg:w-[45%]">
                <div className="animate-float mx-auto w-full max-w-[520px]">
                  <KickoffIllustration />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
