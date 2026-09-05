import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDown, faCircleQuestion } from '@fortawesome/free-solid-svg-icons'

export default function FaqHeader({ content }) {
  const { t } = useTranslation()

  const explore = () => {
    const el = document.getElementById(content.categories[0]?.id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative flex flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-full overflow-hidden rounded-b-[60px] bg-slate-950 sm:rounded-b-[70px] lg:rounded-b-[90px]">
        <img
          src="/backgrounds/hero_section_bg.jpeg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute -top-32 start-1/4 size-[30rem] rounded-full bg-green-500/10 blur-[120px]" />
        <div className="absolute bottom-0 end-[-120px] size-[26rem] rounded-full bg-emerald-400/10 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-24 pt-36 text-center lg:pt-44">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-green-300 ring-1 ring-white/20 backdrop-blur-sm">
          <FontAwesomeIcon icon={faCircleQuestion} className="size-3.5" />
          {t('faq.page.badge')}
        </span>

        <h1 className="mt-7 text-4xl leading-snug font-black text-white drop-shadow-lg sm:text-5xl md:text-6xl">
          {t('faq.page.title1')}
          <br />
          <span className="text-green-500">{t('faq.page.title2')}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
          {t('faq.page.subtitle')}
        </p>

        <button
          type="button"
          onClick={explore}
          className="mt-10 flex h-[56px] items-center gap-2.5 rounded-2xl bg-green-500 px-8 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0"
        >
          <FontAwesomeIcon icon={faArrowDown} className="size-5" />
          {t('faq.page.ctaExplore')}
        </button>
      </div>
    </section>
  )
}