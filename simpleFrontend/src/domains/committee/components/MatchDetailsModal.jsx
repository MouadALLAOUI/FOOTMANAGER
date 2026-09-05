import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Crown } from 'lucide-react'
import { Modal, Button, Spinner } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../../pages/tournaments/shared'
import { matchDay, formatTime } from '../../../lib/adapters'
import TimelineColumn from './TimelineColumn'
import { LIVE_STATUSES, PILL_STYLES } from '../../../data/fixtures'
import api from '../../../api/client'

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
    punishment: e.punishment || (e.type === 'red_card' ? 'red' : e.type === 'second_yellow' ? 'second_yellow' : e.type === 'yellow_card' ? 'yellow' : e.type === 'foul' ? md.punishment || 'none' : ''),
    reason: md.reason || '',
    note: isNote ? md.note || e.description || '' : '',
  }
}

export default function MatchDetailsModal({ fixture, tournament, onClose }) {
  const { t, i18n } = useTranslation()

  const st = (() => {
    const m = fixture?.match
    if (fixture?.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
    if (fixture?.status === 'postponed' || m?.status === 'postponed') return 'postponed'
    if (m?.status === 'finished') return 'completed'
    if (LIVE_STATUSES.has(m?.status)) return 'live'
    return 'pending'
  })()

  const canShowEvents = st === 'completed' || st === 'live'
  const lang = i18n.language
  const tbd = t('committee.detail.tbd')
  const homeName = fixture.home_team?.name || fixture.slots?.home || tbd
  const awayName = fixture.away_team?.name || fixture.slots?.away || tbd
  const homeId = fixture.home_team?.id ?? null
  const awayId = fixture.away_team?.id ?? null

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
    api.get(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/result`)
      .then((r) => {
        if (cancelled) return
        setEvents((r.data?.data?.match?.events || []).map(mapEvent))
        setEventsStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setEventsStatus('idle')
      })
    return () => { cancelled = true }
  }, [canShowEvents, tournament?.id, fixture?.id])

  const homeEvents = events.filter((e) => Number(e.team_id) === Number(homeId))
  const awayEvents = events.filter((e) => Number(e.team_id) === Number(awayId))
  const generalEvents = events.filter((e) => Number(e.team_id) !== Number(homeId) && Number(e.team_id) !== Number(awayId))
  const halfDuration = fixture.match?.half_duration_minutes || Math.round((fixture.match?.match_duration_minutes || 0) / 2) || 0

  const summary = (() => {
    let goals = 0
    let yellows = 0
    let reds = 0
    let subs = 0
    for (const e of events) {
      if (['goal', 'penalty_goal', 'own_goal'].includes(e.type)) goals += 1
      if (e.type === 'yellow_card' || e.type === 'second_yellow') yellows += 1
      if (e.type === 'red_card') reds += 1
      if (e.type === 'foul' && e.punishment) {
        if (e.punishment === 'yellow') yellows += 1
        else if (e.punishment === 'second_yellow') { yellows += 1; reds += 1 }
        else if (e.punishment === 'red') reds += 1
      }
      if (e.type === 'substitution') subs += 1
    }
    return { goals, yellows, reds, subs }
  })()

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t('committee.detail.matchDetails')}
      subtitle={`${homeName} vs ${awayName}`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <TeamAvatar team={fixture.home_team} className="size-12" />
            <span className="max-w-[120px] truncate text-center text-xs font-bold text-slate-800">{homeName}</span>
          </div>
          <span className="min-w-[90px] text-center text-2xl font-black text-slate-900">
            {st === 'completed' ? `${fixture.match?.home_score ?? 0} - ${fixture.match?.away_score ?? 0}` : 'VS'}
          </span>
          <div className="flex flex-col items-center gap-1.5">
            <TeamAvatar team={fixture.away_team} className="size-12" />
            <span className="max-w-[120px] truncate text-center text-xs font-bold text-slate-800">{awayName}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center justify-between">
            <span>{t('committee.detail.statusLabel')}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${PILL_STYLES[st]}`}>
              {st === 'live' && <span className="me-1 size-1.5 animate-pulse rounded-full bg-rose-500" />}
              {t(`committee.detail.status.${st}`)}
            </span>
          </div>
          {fixture.match?.winner_team_id && (
            <div className="flex items-center justify-between">
              <span>{t('committee.detail.winner')}</span>
              <span className="inline-flex items-center gap-1 font-black text-slate-900">
                <Crown className="size-3.5 text-amber-500" />
                {fixture.match.winner_team_id === fixture.home_team?.id ? homeName : awayName}
              </span>
            </div>
          )}
          {fixture.scheduled_at && (
            <div className="flex items-center justify-between">
              <span>{t('committee.detail.datetime')}</span>
              <span>{matchDay(fixture.scheduled_at, lang)} · {formatTime(fixture.scheduled_at)}</span>
            </div>
          )}
          {fixture.stadium && (
            <div className="flex items-center justify-between">
              <span>{t('committee.detail.stadium')}</span>
              <span>{fixture.stadium.name}</span>
            </div>
          )}
          {fixture.group && (
            <div className="flex items-center justify-between">
              <span>{t('committee.detail.groupName')}</span>
              <span>{fixture.group.name}</span>
            </div>
          )}
        </div>

        {canShowEvents && eventsStatus === 'loading' && <Spinner />}

        {canShowEvents && eventsStatus === 'ready' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-slate-900">{t('committee.result.events')}</p>
              {events.length > 0 && (
                <span className="flex flex-wrap items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                  <span>⚽ {summary.goals}</span>
                  <span>🟨 {summary.yellows}</span>
                  <span>🟥 {summary.reds}</span>
                  <span>🔄 {summary.subs}</span>
                </span>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <TimelineColumn
                team={{ id: homeId, name: homeName, team: fixture.home_team, score: fixture.match?.home_score ?? 0 }}
                events={homeEvents}
                halfDuration={halfDuration}
                readOnly
                t={t}
              />
              <TimelineColumn
                team={{ id: awayId, name: awayName, team: fixture.away_team, score: fixture.match?.away_score ?? 0 }}
                events={awayEvents}
                halfDuration={halfDuration}
                readOnly
                t={t}
              />
            </div>
            {generalEvents.length > 0 && (
              <TimelineColumn
                team={null}
                events={generalEvents}
                halfDuration={halfDuration}
                readOnly
                t={t}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
      </div>
    </Modal>
  )
}