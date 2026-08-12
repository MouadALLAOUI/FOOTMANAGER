import { useTranslation } from 'react-i18next'
import Carousel from '../../components/Carousel'
import LiveMatchCard from './liveMatchCard'
import EmptyState from './emptyState'
import Reveal from './reveal'

export default function LiveMatches({ matches, onEmptyAction }) {
  const { t } = useTranslation()

  return (
    <section id="live-matches" className="scroll-mt-24 bg-white pt-[100px] lg:pt-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold text-red-600">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              {t('matchesPage.live.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-black text-slate-900 lg:text-4xl">
              {t('matchesPage.live.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('matchesPage.live.subtitle')}
            </p>
          </header>
        </Reveal>

        <Reveal className="mt-12">
          {matches.length > 0 ? (
            <Carousel step={448}>
              {matches.map((match) => (
                <LiveMatchCard key={match.id} match={match} />
              ))}
            </Carousel>
          ) : (
            <EmptyState variant="live" onAction={onEmptyAction} />
          )}
        </Reveal>
      </div>
    </section>
  )
}
