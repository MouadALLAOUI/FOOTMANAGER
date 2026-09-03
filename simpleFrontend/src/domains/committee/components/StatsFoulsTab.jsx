import React from 'react'
import MiniStat from './MiniStat'
import FoulPanel from './FoulPanel'
import ShootoutCard from './ShootoutCard'

export default function StatsFoulsTab({ displayScore, counts, isKnockout, homeName, awayName, homePen, awayPen, setHomePen, setAwayPen, homeTeam, awayTeam, tournamentId, fixtureId, homeId, awayId, foulRefetchTick, onAwardConverted, t }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MiniStat label={t('committee.result.goals')} value={counts.goals} />
        <MiniStat label={t('committee.result.yellowCards')} value={counts.yellows} tone="amber" />
        <MiniStat label={t('committee.result.redCards')} value={counts.reds} tone="rose" />
        <MiniStat label={t('committee.result.substitutions')} value={counts.subs} tone="sky" />
        <MiniStat label={t('committee.result.penaltyGoals')} value={counts.pens} tone="violet" />
      </div>

      <FoulPanel
        tournamentId={tournamentId}
        fixtureId={fixtureId}
        homeId={homeId}
        awayId={awayId}
        homeName={homeName}
        awayName={awayName}
        refetchTick={foulRefetchTick}
        onAwardConverted={onAwardConverted}
        t={t}
      />

      {isKnockout && displayScore.home === displayScore.away && (
        <ShootoutCard
          homeName={homeName}
          awayName={awayName}
          homePen={homePen}
          awayPen={awayPen}
          setHomePen={setHomePen}
          setAwayPen={setAwayPen}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          t={t}
        />
      )}
    </div>
  )
}