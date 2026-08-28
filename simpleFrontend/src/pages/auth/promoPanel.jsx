import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol, faCalendarDay, faPeopleGroup, faTrophy } from '@fortawesome/free-solid-svg-icons'
import {
  faFacebook,
  faInstagram,
  faTiktok,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons'
import { useNavigate } from 'react-router-dom'

const featureIcons = [faCalendarDay, faPeopleGroup, faTrophy]

const socials = [
  { icon: faFacebook, label: 'facebook' },
  { icon: faInstagram, label: 'instagram' },
  { icon: faTiktok, label: 'tiktok' },
  { icon: faYoutube, label: 'youtube' },
]

export default function PromoPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const features = t('auth.promo.features', { returnObjects: true })

  return (
    <aside className="relative hidden overflow-hidden lg:order-2 lg:col-span-2 lg:flex lg:flex-col">
      <img
        src="/backgrounds/hero_section_bg.jpeg"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/95" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(34,197,94,0.22),transparent_60%)]" />

      <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

      <div className="relative z-10 flex flex-1 flex-col p-10 xl:p-12">
        <div className="flex items-center gap-3 cursor-pointer" onClick={(e) => navigate('/')}>
          <img
            src="/logo.jpeg"
            alt=""
            className="size-12 shrink-0 rounded-2xl object-cover shadow-[0_14px_34px_rgba(22,163,74,0.5)] ring-1 ring-white/20"
          />
          <div className="leading-tight">
            <p className="text-xl font-black text-white">{t('common.appName')}</p>
            <p className="mt-1 text-xs text-white/60">{t('auth.promo.tagline')}</p>
          </div>
        </div>

        <div className="pt-14 xl:pt-20">
          <h1 className="text-4xl leading-[1.3] font-black text-white xl:text-[44px]">
            {t('auth.promo.welcomeLine1')}
            <br />
            <span className="text-green-400">{t('auth.promo.welcomeLine2')}</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 xl:text-base">
            {t('auth.promo.description')}
          </p>

          <div className="mt-8 space-y-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="fade-in flex items-start gap-4 rounded-[18px] border border-white/15 bg-white/[0.07] p-4 backdrop-blur-md transition-colors duration-300 hover:border-green-400/40 hover:bg-white/[0.1]"
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-500/20 text-green-300 ring-1 ring-green-400/30">
                  <FontAwesomeIcon icon={featureIcons[i]} className="size-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-10">
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
            {t('auth.promo.followUs')}
          </p>
          <div className="mt-4 flex gap-3">
            {socials.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-[0_14px_32px_rgba(34,197,94,0.45)] active:translate-y-0"
              >
                <FontAwesomeIcon icon={s.icon} className="size-5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <FontAwesomeIcon
        icon={faFutbol}
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -bottom-6 -end-4 size-40 text-white/[0.08]"
      />
      <FontAwesomeIcon
        icon={faFutbol}
        aria-hidden="true"
        className="animate-float pointer-events-none absolute top-1/2 start-6 size-16 text-white/[0.06]"
        style={{ animationDelay: '1.8s' }}
      />
    </aside>
  )
}
