import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons'
import { hideBrokenImage } from '../../lib/imageErrors'

export default function MatchesHero() {
  const { t } = useTranslation()

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative h-[260px] overflow-hidden">
      <img
        src="/backgrounds/hero_section_bg.jpeg"
        alt=""
        fetchPriority="high"
        decoding="async"
        onError={hideBrokenImage}
        className="absolute inset-0 size-full object-cover object-[50%_30%] md:object-center"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-black/20 md:hidden" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_140%_at_50%_0%,rgba(22,163,74,0.28),transparent_60%)]" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-16 text-center">
        <h1 className="text-4xl font-black text-white drop-shadow-lg md:text-5xl">
          {t('matchesPage.hero.title')}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
          {t('matchesPage.hero.subtitle')}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollTo('create-match')}
            className="btn-ripple flex h-12 items-center gap-2 rounded-[16px] bg-green-500 px-8 text-sm font-bold text-white shadow-[0_14px_35px_rgba(22,163,74,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_20px_50px_rgba(22,163,74,0.6)] active:translate-y-0"
          >
            <FontAwesomeIcon icon={faPlus} className="size-4" />
            {t('matchesPage.hero.create')}
          </button>
          <button
            type="button"
            onClick={() => scrollTo('opponent-teams')}
            className="flex h-12 items-center gap-2 rounded-[16px] border-2 border-white/70 px-8 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-green-700 active:translate-y-0"
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="size-4" />
            {t('matchesPage.hero.search')}
          </button>
        </div>
      </div>
    </section>
  )
}
