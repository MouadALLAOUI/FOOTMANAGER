import React, { useEffect, useState } from 'react'
import api from '../../../api/client'
import MatchGlassModal from '../../../components/matches/MatchGlassModal'
import { LIVE_STATUSES } from '../../../data/fixtures'

const mapEvent = (e) => {
  const md = e.metadata || {}
  const isSub = e.type === 'substitution'
  const isNote = e.type === 'other'
  return {
    _key: `srv-${e.id}`,
    type: e.type,
    team_id: e.team?.id ?? null,
    player_id: isNote ? null : (e.player?.id ?? null),
    player: isNote ? '' : e.player?.name || (isSub ? md.out : e.description) || '',
    assist_player_id: isSub ? (e.assist_player?.id ?? null) : (isNote ? null : (e.assist_player?.id ?? null)),
    assist_player: isSub ? (e.assist_player?.name || md.in || '') : (isNote ? '' : e.assist_player?.name || ''),
    minute: e.minute ?? 0,
    added_time: e.added_time ?? 0,
    half: e.half ?? null,
    punishment:
      e.punishment ||
      (e.type === 'red_card'
        ? 'red'
        : e.type === 'second_yellow'
          ? 'second_yellow'
          : e.type === 'yellow_card'
            ? 'yellow'
            : e.type === 'foul'
              ? md.punishment || 'none'
              : ''),
    reason: md.reason || '',
    note: isNote ? md.note || e.description || '' : '',
  }
}

export default function MatchDetailsModal({ fixture, tournament, onClose }) {
  const st = (() => {
    const m = fixture?.match
    if (fixture?.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
    if (fixture?.status === 'postponed' || m?.status === 'postponed') return 'postponed'
    if (m?.status === 'finished') return 'completed'
    if (LIVE_STATUSES.has(m?.status)) return 'live'
    return 'pending'
  })()

  const canShowEvents = st === 'completed' || st === 'live'
  const [events, setEvents] = useState([])
  const [eventsStatus, setEventsStatus] = useState(canShowEvents ? 'loading' : 'idle')

  useEffect(() => {
    if (!canShowEvents || !tournament?.id || !fixture?.id) {
      setEvents([])
      setEventsStatus('idle')
      return
    }
    let cancelled = false
    setEventsStatus('loading')
    api
      .get(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/result`)
      .then((r) => {
        if (cancelled) return
        setEvents((r.data?.data?.match?.events || []).map(mapEvent))
        setEventsStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setEventsStatus('idle')
      })
    return () => {
      cancelled = true
    }
  }, [canShowEvents, tournament?.id, fixture?.id])

  const combinedMatch = {
    ...fixture.match,
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    scheduled_at: fixture.scheduled_at,
    stadium: fixture.stadium,
    group: fixture.group,
    tournament: tournament,
    events: events,
  }

  return (
    <MatchGlassModal
      open
      onClose={onClose}
      match={combinedMatch}
      loading={eventsStatus === 'loading'}
    />
  )
}