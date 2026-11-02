import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandshake } from '@fortawesome/free-solid-svg-icons'
import EmptyState from './emptyState'
import Reveal from './reveal'
import TeamCard from './teamCard'

export default function OpponentTeams({ teams, onEmptyAction, onChallenge }) {
  const { t } = useTranslation()

  return (
    <section id="opponent-teams" className="scroll-mt-24 bg-[#F7F8F5] dark:bg-[#101211] text-[#111313] dark:text-[#F5F7F2] pt-[60px] pb-[70px] lg:pt-[80px] lg:pb-[90px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
              <FontAwesomeIcon icon={faHandshake} className="size-3.5" />
              {t('matchesPage.teams.sendRequest')}
            </span>
            <h2 className="mt-5 text-3xl font-black text-[#111313] dark:text-[#F5F7F2] lg:text-4xl">
              {t('matchesPage.teams.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#65706A] dark:text-[#B2B9B3] lg:text-base">
              {t('matchesPage.teams.subtitle')}
            </p>
          </header>
        </Reveal>

        <Reveal className="mt-12">
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} onChallenge={onChallenge} />
              ))}
            </div>
          ) : (
            <EmptyState variant="teams" onAction={onEmptyAction} />
          )}
        </Reveal>
      </div>
    </section>
  )
}
