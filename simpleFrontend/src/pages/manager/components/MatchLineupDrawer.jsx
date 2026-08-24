import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Star, Zap, ChevronUp, ChevronDown, UserPlus, UserMinus, Save } from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { useMatchLineup, useMatchLineupRoster } from '../../../api/queries'
import { q, invalidateKeys } from '../../../api/queries'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { initials } from './shared'
import { positionLabels } from './shared'

const roleIcon = { captain: Shield, viceCaptain: Star, freeKickTaker: Zap }
const roleColor = {
  captain: 'text-amber-500 bg-amber-50 ring-amber-200',
  viceCaptain: 'text-sky-500 bg-sky-50 ring-sky-200',
  freeKickTaker: 'text-violet-500 bg-violet-50 ring-violet-200',
}

export default function MatchLineupDrawer({ matchRequestId, open, onClose }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: lineupData, isLoading } = useMatchLineup(matchRequestId, { enabled: open && !!matchRequestId })
  const { data: rosterData } = useMatchLineupRoster(matchRequestId, { enabled: open && !!matchRequestId })

  const [starters, setStarters] = useState([])
  const [bench, setBench] = useState([])
  const [captainId, setCaptainId] = useState(null)
  const [viceCaptainId, setViceCaptainId] = useState(null)
  const [freeKickId, setFreeKickId] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  const format = lineupData?.match_request?.player_format || '7v7'
  const required = lineupData?.required_starters || 7

  const roster = rosterData?.roster || []

  useEffect(() => {
    if (!lineupData?.lineups?.length) {
      setStarters([])
      setBench([])
      setCaptainId(null)
      setViceCaptainId(null)
      setFreeKickId(null)
      setHasChanges(false)
      return
    }

    const myLineup = lineupData.lineups.find(
      (l) => l.team_id === lineupData.match_request?.host_team_id || l.team_id === lineupData.match_request?.opponent_team_id
    )
    if (!myLineup) return

    setStarters(myLineup.starters || [])
    setBench(myLineup.bench || [])
    setCaptainId(myLineup.captain_id || null)
    setViceCaptainId(myLineup.vice_captain_id || null)
    setFreeKickId(myLineup.free_kick_taker_id || null)
    setHasChanges(false)
  }, [lineupData])

  const markChanged = () => setHasChanges(true)

  const addPlayer = useCallback(
    (player) => {
      markChanged()
      const entry = {
        id: player.id,
        name: player.name,
        position: player.position,
        shirt_number: player.number,
        is_captain: false,
        is_vice_captain: false,
        is_free_kick_taker: false,
        order_index: starters.length,
      }
      if (starters.length < required) {
        setStarters((prev) => [...prev, entry])
      } else {
        setBench((prev) => [...prev, entry])
      }
    },
    [starters.length, required]
  )

  const removePlayer = useCallback(
    (playerId) => {
      markChanged()
      setStarters((prev) => prev.filter((p) => p.id !== playerId))
      setBench((prev) => prev.filter((p) => p.id !== playerId))
      if (captainId === playerId) setCaptainId(null)
      if (viceCaptainId === playerId) setViceCaptainId(null)
      if (freeKickId === playerId) setFreeKickId(null)
    },
    [captainId, viceCaptainId, freeKickId]
  )

  const moveToStarter = useCallback(
    (playerId) => {
      if (starters.length >= required) return
      markChanged()
      const player = bench.find((p) => p.id === playerId)
      if (!player) return
      setBench((prev) => prev.filter((p) => p.id !== playerId))
      setStarters((prev) => [...prev, { ...player, order_index: prev.length }])
    },
    [bench, starters.length, required]
  )

  const moveToBench = useCallback(
    (playerId) => {
      markChanged()
      const player = starters.find((p) => p.id === playerId)
      if (!player) return
      setStarters((prev) => prev.filter((p) => p.id !== playerId))
      setBench((prev) => [...prev, player])
      if (captainId === playerId) setCaptainId(null)
      if (viceCaptainId === playerId) setViceCaptainId(null)
      if (freeKickId === playerId) setFreeKickId(null)
    },
    [starters, captainId, viceCaptainId, freeKickId]
  )

  const toggleCaptain = useCallback(
    (playerId) => {
      markChanged()
      setCaptainId((prev) => (prev === playerId ? null : playerId))
    },
    []
  )

  const toggleViceCaptain = useCallback(
    (playerId) => {
      markChanged()
      setViceCaptainId((prev) => (prev === playerId ? null : playerId))
    },
    []
  )

  const toggleFreeKick = useCallback(
    (playerId) => {
      markChanged()
      setFreeKickId((prev) => (prev === playerId ? null : playerId))
    },
    []
  )

  const mutation = useMutation({
    mutationFn: async () => {
      const players = [
        ...starters.map((p, i) => ({
          player_id: p.id,
          position: p.position,
          shirt_number: p.shirt_number,
          is_starter: true,
          is_captain: p.id === captainId,
          is_vice_captain: p.id === viceCaptainId,
          is_free_kick_taker: p.id === freeKickId,
          order_index: i,
        })),
        ...bench.map((p) => ({
          player_id: p.id,
          position: p.position,
          shirt_number: p.shirt_number,
          is_starter: false,
          is_captain: p.id === captainId,
          is_vice_captain: p.id === viceCaptainId,
          is_free_kick_taker: p.id === freeKickId,
          order_index: 0,
        })),
      ]
      const { data } = await api.put(`/manager/match-requests/${matchRequestId}/lineup`, { players })
      return data
    },
    onSuccess: () => {
      invalidateKeys([q.matchLineup(matchRequestId)])
      setHasChanges(false)
    },
    onError: (e) => toastApiError(e, t),
  })

  const inLineupIds = new Set([...starters.map((p) => p.id), ...bench.map((p) => p.id)])
  const available = roster.filter((p) => !inLineupIds.has(p.id))

  return (
    <Drawer open={open} onClose={onClose} title={t('ov.drawers.lineupTitle')} subtitle={`${t('ov.drawers.lineupSubtitle')} — ${format}`} size="xl">
      <div className="space-y-5 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold text-green-600/70">{t('ov.drawers.requiredStarters')}</p>
                <p className="text-sm font-extrabold text-slate-800">
                  {t('ov.drawers.startersCount', { count: starters.length, required })}
                </p>
              </div>
              <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">{format}</span>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900">{t('ov.drawers.starters')} ({starters.length})</h3>
              </div>
              <div className="space-y-2">
                {starters.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                    {t('ov.drawers.addToLineup')}
                  </p>
                )}
                {starters.map((p, i) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    index={i}
                    isStarter
                    canMoveToStarter={false}
                    captainId={captainId}
                    viceCaptainId={viceCaptainId}
                    freeKickId={freeKickId}
                    onMoveToBench={() => moveToBench(p.id)}
                    onRemove={() => removePlayer(p.id)}
                    onToggleCaptain={() => toggleCaptain(p.id)}
                    onToggleViceCaptain={() => toggleViceCaptain(p.id)}
                    onToggleFreeKick={() => toggleFreeKick(p.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-extrabold text-slate-900">{t('ov.drawers.bench')} ({bench.length})</h3>
              <div className="space-y-2">
                {bench.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                    —
                  </p>
                )}
                {bench.map((p, i) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    index={i}
                    isStarter={false}
                    canMoveToStarter={starters.length < required}
                    captainId={captainId}
                    viceCaptainId={viceCaptainId}
                    freeKickId={freeKickId}
                    onMoveToStarter={() => moveToStarter(p.id)}
                    onRemove={() => removePlayer(p.id)}
                    onToggleCaptain={() => toggleCaptain(p.id)}
                    onToggleViceCaptain={() => toggleViceCaptain(p.id)}
                    onToggleFreeKick={() => toggleFreeKick(p.id)}
                  />
                ))}
              </div>
            </div>

            {available.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-extrabold text-slate-500">{t('ov.drawers.addToLineup')}</h3>
                <div className="flex flex-wrap gap-2">
                  {available.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPlayer(p)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                    >
                      <UserPlus className="size-3" />
                      {p.name}
                      {p.number && <span className="text-slate-400">#{p.number}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasChanges && (
              <div className="sticky bottom-0 border-t border-slate-100 bg-white pt-4">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="size-4" />
                  {mutation.isPending ? '…' : t('common.save')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}

function PlayerRow({ player, index, isStarter, canMoveToStarter, captainId, viceCaptainId, freeKickId, onMoveToStarter, onMoveToBench, onRemove, onToggleCaptain, onToggleViceCaptain, onToggleFreeKick }) {
  const isCaptain = player.id === captainId
  const isViceCaptain = player.id === viceCaptainId
  const isFreeKick = player.id === freeKickId
  const pos = positionLabels[player.position] || player.position || ''

  return (
    <div className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
      isCaptain ? 'border-amber-200 bg-amber-50/60' :
      isViceCaptain ? 'border-sky-200 bg-sky-50/60' :
      isFreeKick ? 'border-violet-200 bg-violet-50/60' :
      'border-slate-100 bg-white hover:border-slate-200'
    }`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
        {player.shirt_number || <span className="text-[10px]">{index + 1}</span>}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{player.name}</p>
        <p className="text-[10px] font-semibold text-slate-400">{pos}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {[
          { active: isCaptain, onClick: onToggleCaptain, Icon: Shield, color: 'text-amber-500 hover:bg-amber-50', title: 'captain' },
          { active: isViceCaptain, onClick: onToggleViceCaptain, Icon: Star, color: 'text-sky-500 hover:bg-sky-50', title: 'viceCaptain' },
          { active: isFreeKick, onClick: onToggleFreeKick, Icon: Zap, color: 'text-violet-500 hover:bg-violet-50', title: 'freeKickTaker' },
        ].map(({ active, onClick, Icon, color, title }) => (
          <button
            key={title}
            type="button"
            onClick={onClick}
            title={title}
            className={`grid size-7 place-items-center rounded-lg transition ${
              active ? `bg-current/10 ring-1 ring-current/20 ${color.split(' ')[0]}` : `text-slate-300 ${color}`
            }`}
          >
            <Icon className="size-3.5" />
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-100" />

        {isStarter ? (
          <button type="button" onClick={onMoveToBench} className="grid size-7 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-500" title="bench">
            <ChevronDown className="size-3.5" />
          </button>
        ) : (
          <button type="button" onClick={onMoveToStarter} disabled={!canMoveToStarter} className="grid size-7 place-items-center rounded-lg text-slate-300 transition hover:bg-green-50 hover:text-green-600" title="starter">
            <ChevronUp className="size-3.5" />
          </button>
        )}

        <button type="button" onClick={onRemove} className="grid size-7 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500" title="remove">
          <UserMinus className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
