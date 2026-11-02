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
    <section id="leaderboard" className="scroll-mt-24 bg-[#F7F8F5] dark:bg-[#101211] text-[#111313] dark:text-[#F5F7F2] pt-[60px] pb-[70px] lg:pt-[80px] lg:pb-[90px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
              <FontAwesomeIcon icon={faChartLine} className="size-3.5" />
              {t('matchesPage.leaderboard.subtitle')}
            </span>
            <h2 className="mt-5 text-3xl font-black text-[#111313] dark:text-[#F5F7F2] lg:text-4xl">
              {t('matchesPage.leaderboard.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('matchesPage.leaderboard.subtitle')}
            </p>
          </header>
        </Reveal>

        <Reveal className="mt-12">
          <div className="overflow-hidden rounded-xl bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#111313] dark:text-[#F5F7F2] shadow-sm">
            <div
              className={`${gridClass} border-b border-[#E1E5DF] dark:border-[#303832] py-4 text-xs font-bold uppercase tracking-wide text-[#65706A] dark:text-[#B2B9B3]`}
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
