import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import LeaderboardRow from './leaderboardRow'
import Reveal from './reveal'

const gridClass =
  'grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 md:grid-cols-[64px_minmax(0,1.3fr)_minmax(0,1fr)_88px_88px_88px_96px] md:gap-4 md:px-8'

export default function Leaderboard({ rows }) {
  const { t } = useTranslation()

  return (
    <section id="leaderboard" className="scroll-mt-24 bg-white pt-[100px] pb-[110px] lg:pt-[120px] lg:pb-[130px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
              <FontAwesomeIcon icon={faChartLine} className="size-3.5" />
              {t('matchesPage.leaderboard.subtitle')}
            </span>
            <h2 className="mt-5 text-3xl font-black text-slate-900 lg:text-4xl">
              {t('matchesPage.leaderboard.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('matchesPage.leaderboard.subtitle')}
            </p>
          </header>
        </Reveal>

        <Reveal className="mt-12">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
            <div
              className={`${gridClass} border-b border-slate-100 py-4 text-xs font-bold uppercase tracking-wide text-slate-400`}
            >
              <span>{t('matchesPage.leaderboard.rank')}</span>
              <span>{t('matchesPage.leaderboard.team')}</span>
              <span className="hidden md:block">{t('matchesPage.leaderboard.city')}</span>
              <span className="hidden text-center md:block">{t('matchesPage.leaderboard.played')}</span>
              <span className="hidden text-center md:block">{t('matchesPage.leaderboard.wins')}</span>
              <span className="hidden text-center md:block">{t('matchesPage.leaderboard.goals')}</span>
              <span className="text-center">{t('matchesPage.leaderboard.points')}</span>
            </div>

            {rows.map((row) => (
              <LeaderboardRow key={row.id} row={row} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
