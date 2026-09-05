import { useTranslation } from 'react-i18next'

export default function Hero({ children }) {
  const { t } = useTranslation()

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[90%] overflow-hidden rounded-b-[60px] bg-slate-950 sm:rounded-b-[70px] lg:rounded-b-[90px]">
        <img
          src="/backgrounds/hero_section_bg.jpeg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute -top-32 start-1/4 size-[30rem] rounded-full bg-green-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pt-24 pb-8 text-center">
        <h1 className="text-4xl leading-snug font-black text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
          {t('landing.hero.titleLine1')}
          <br />
          {t('landing.hero.titleLine2')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
          {t('landing.hero.subtitle')}
        </p>
      </div>

      <div className="relative z-10 pb-12">{children}</div>
    </section>
  )
}
