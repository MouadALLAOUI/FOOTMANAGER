import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { toLiveMatchCard, toTeamCard, toLeaderboardRow } from '../../lib/adapters'
import MatchRequestModal from '../../components/public/MatchRequestModal'
import { usePublicActions } from '../../components/public/usePublicActions'
import MatchesHero from './hero'
import LiveMatches from './liveMatches'
import OpponentTeams from './opponentTeams'
import Leaderboard from './leaderboard'
import CommunityStats from './stats'
import CreateMatchCta from './createMatchCta'
import LoadingState from './loadingState'

export default function Matches() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [challenge, setChallenge] = useState(null)
  const live = useApi(() => api.get('/v1/live-matches').then((r) => r.data))
  const teams = useApi(() => api.get('/v1/matches', { params: { per_page: 8 } }).then((r) => r.data))
  const board = useApi(() => api.get('/v1/leaderboard', { params: { per_page: 10 } }).then((r) => r.data))

  const { openChallenge } = usePublicActions({ onChallenge: setChallenge })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const challengeParam = searchParams.get('challenge')
  const teamNameParam = searchParams.get('teamName')

  useEffect(() => {
    if (challengeParam) {
      openChallenge({ teamId: challengeParam, teamName: teamNameParam || '' })
      const next = new URLSearchParams(searchParams)
      next.delete('challenge')
      next.delete('teamName')
      setSearchParams(next, { replace: true })
    }
  }, [challengeParam, teamNameParam, searchParams, setSearchParams, openChallenge])

  const liveMatches = (live.data?.data || []).map(toLiveMatchCard)
  const opponentTeams = (teams.data?.data || []).map(toTeamCard)
  const leaderboard = (board.data?.data || []).map(toLeaderboardRow)

  const loading = live.loading || teams.loading || board.loading

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <MatchesHero />
      <main>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <LiveMatches matches={liveMatches} onEmptyAction={() => scrollTo('create-match')} />
            <OpponentTeams
              teams={opponentTeams}
              onEmptyAction={() => scrollTo('create-match')}
              onChallenge={openChallenge}
            />
            <Leaderboard rows={leaderboard} />
            <CommunityStats />
            <CreateMatchCta
              onCreate={() => scrollTo('opponent-teams')}
              onExplore={() => scrollTo('opponent-teams')}
            />
          </>
        )}
      </main>

      <MatchRequestModal open={Boolean(challenge)} onClose={() => setChallenge(null)} team={challenge} />
    </>
  )
}
