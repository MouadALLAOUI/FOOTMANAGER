import React, { useEffect, useMemo, useState } from 'react'
import { Check, Plus, RefreshCw, Users, X } from 'lucide-react'
import api from '../../../api/client'
import Jersey from '../../../pages/manager/live/components/Jersey'

/**
 * Enhanced Player Card matching the AJI NQSSRO Live Match UI:
 * - Rounded card with white background and subtle border/shadow
 * - Kit jersey graphic with shirt number (home = emerald, away = white)
 * - Goal count badge (⚽ N) when player scored
 * - Card indicator (🟨 / 🟥)
 * - Selected active state with green ring and glow
 */
function MatchPlayerCard({
  player,
  teamVariant,
  isSelected,
  blocked,
  busy,
  stats,
  onClick,
}) {
  const photoSrc = player.photo_thumbnail_url || player.photo_url

  return (
    <button
      type="button"
      disabled={blocked || busy}
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-between rounded-2xl border p-2.5 text-center transition-all select-none ${
        blocked
          ? 'cursor-not-allowed border-slate-200 bg-slate-50/70 opacity-50'
          : busy
            ? 'cursor-wait border-slate-200 bg-slate-50 opacity-70'
            : isSelected
              ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20 active:scale-95'
              : 'border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:scale-95'
      }`}
    >
      {/* Player photo or Jersey visual */}
      <div className="relative my-1 flex items-center justify-center">
        {photoSrc ? (
          <div className="relative">
            <img
              src={photoSrc}
              alt={player.name}
              className="size-13 rounded-2xl object-cover ring-2 ring-white shadow-sm sm:size-14"
            />
            {player.number != null && (
              <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black text-white shadow">
                {player.number}
              </span>
            )}
          </div>
        ) : (
          <Jersey
            number={player.number}
            variant={teamVariant}
            className="h-12 w-11"
          />
        )}

        {/* Goals Badge (⚽ 1 or ⚽ 2) */}
        {stats.goals > 0 && (
          <span className="absolute -bottom-1 -start-1 flex items-center gap-0.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
            <span>⚽</span>
            {stats.goals > 1 && <span>{stats.goals}</span>}
          </span>
        )}

        {/* Cards Badge (🟨 / 🟥) */}
        {stats.redCard ? (
          <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-sm bg-rose-600 text-[10px] shadow" title="بطاقة حمراء">
            🟥
          </span>
        ) : stats.yellowCard ? (
          <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-sm bg-amber-400 text-[10px] shadow" title="بطاقة صفراء">
            🟨
          </span>
        ) : null}
      </div>

      {/* Player Name */}
      <span className="mt-1.5 w-full text-center text-xs font-bold leading-tight text-slate-800 break-words" title={player.name}>
        {player.name}
      </span>
    </button>
  )
}

/**
 * Team Squad Section:
 * Displays team header with jersey icon, team name, total eligible players badge,
 * Starters section with (N) الأساسيون, and Substitutes section with (N) الاحتياط.
 */
function TeamRosterSection({
  teamId,
  name,
  teamVariant,
  players,
  confirmedList,
  rosterLimit,
  startersCount,
  suspendedIds,
  redCardedIds,
  busyId,
  selectedPlayerId,
  events,
  onSelectPlayer,
  onAddPlayer,
  t,
}) {
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const addBusy = busyId === '__add__'

  const submitAdd = async () => {
    const value = addName.trim()
    if (!value) return
    const ok = await onAddPlayer(teamId, value)
    if (ok) setAddName('')
    setAdding(false)
  }

  // Calculate event statistics per player (goals, yellow/red cards)
  const playerStats = useMemo(() => {
    const map = {}
    for (const e of events || []) {
      if (!e.player_id) continue
      if (!map[e.player_id]) map[e.player_id] = { goals: 0, yellowCard: false, redCard: false }
      if (e.type === 'goal' || e.type === 'penalty_goal') {
        map[e.player_id].goals += 1
      } else if (e.type === 'yellow_card' || (e.type === 'foul' && e.punishment === 'yellow')) {
        map[e.player_id].yellowCard = true
      } else if (
        e.type === 'red_card' ||
        e.type === 'second_yellow' ||
        (e.type === 'foul' && (e.punishment === 'red' || e.punishment === 'second_yellow'))
      ) {
        map[e.player_id].redCard = true
      }
    }
    return map
  }, [events])

  // Partition players into eligible match roster (starters + substitutes)
  // If confirmed presence exists, prioritize confirmed players; otherwise use active roster
  const eligiblePlayers = useMemo(() => {
    const list = players || []
    if (confirmedList && confirmedList.length > 0) {
      const confMap = new Map(confirmedList.map((c) => [c.player_id, c]))
      // Map confirmed into player objects with starter flags
      return list
        .filter((p) => confMap.has(p.id))
        .map((p) => {
          const c = confMap.get(p.id)
          return {
            ...p,
            is_starter: c?.is_starter !== undefined ? c.is_starter : p.is_starter,
          }
        })
    }
    return list
  }, [players, confirmedList])

  // Split into starters and substitutes
  const { starters, bench } = useMemo(() => {
    const targetStarters = startersCount || 5
    // If explicit is_starter flags exist
    const hasExplicitStarters = eligiblePlayers.some((p) => p.is_starter)
    if (hasExplicitStarters) {
      return {
        starters: eligiblePlayers.filter((p) => p.is_starter),
        bench: eligiblePlayers.filter((p) => !p.is_starter),
      }
    }
    // Otherwise partition first N as starters, remainder as bench
    return {
      starters: eligiblePlayers.slice(0, targetStarters),
      bench: eligiblePlayers.slice(targetStarters),
    }
  }, [eligiblePlayers, startersCount])

  const totalEligible = eligiblePlayers.length
  const limitDisplay = rosterLimit ? `${totalEligible}/${rosterLimit}` : `${totalEligible}`

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
      {/* Team Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <Jersey
            number=""
            variant={teamVariant}
            className="h-8 w-7 shrink-0 drop-shadow-none"
          />
          <h3 className="truncate text-base font-black text-slate-900">{name}</h3>
        </div>

        {/* Badges: Total Limit, Starters count, Bench count */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 font-black text-slate-700">
            <Users className="size-3.5" />
            <span>لاعبو المباراة ({limitDisplay})</span>
          </span>
          <span className="rounded-xl bg-slate-100 px-2 py-1 font-bold text-slate-600">
            {starters.length} أساسيين
          </span>
          <span className="rounded-xl bg-slate-100 px-2 py-1 font-bold text-slate-600">
            {bench.length} احتياط
          </span>
        </div>
      </div>

      {/* Quick Add Player Inline */}
      {adding ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2">
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitAdd() }}
            placeholder={t('committee.result.playersAddPlaceholder') || 'اسم اللاعب الكامل...'}
            autoFocus
            disabled={addBusy}
            className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={submitAdd}
            disabled={addBusy || !addName.trim()}
            className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            aria-label={t('committee.result.addPlayer')}
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setAddName('') }}
            disabled={addBusy}
            className="grid size-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={addBusy}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          <span>{t('committee.result.addPlayer')}</span>
        </button>
      )}

      {/* Section 1: Starters (الأساسيون) */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-900">
          <span className="grid size-5 place-items-center rounded-lg bg-emerald-600 text-[11px] text-white">
            ⚽
          </span>
          <span>({starters.length}) الأساسيون</span>
        </div>

        {starters.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد لاعبين أساسيين مسجلين
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {starters.map((player) => {
              const blocked = (suspendedIds || []).includes(player.id) || (redCardedIds || []).includes(player.id)
              const busy = busyId === player.id
              const isSelected = selectedPlayerId === player.id
              const stats = playerStats[player.id] || { goals: 0, yellowCard: false, redCard: false }

              return (
                <MatchPlayerCard
                  key={player.id}
                  player={player}
                  teamVariant={teamVariant}
                  isSelected={isSelected}
                  blocked={blocked}
                  busy={busy}
                  stats={stats}
                  onClick={() => onSelectPlayer(player, teamId, teamVariant)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: Substitutes (الاحتياط) */}
      <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-sky-900">
          <span className="grid size-5 place-items-center rounded-lg bg-sky-600 text-[11px] text-white">
            🔄
          </span>
          <span>({bench.length}) الاحتياط</span>
        </div>

        {bench.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد لاعبين بدلاء
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {bench.map((player) => {
              const blocked = (suspendedIds || []).includes(player.id) || (redCardedIds || []).includes(player.id)
              const busy = busyId === player.id
              const isSelected = selectedPlayerId === player.id
              const stats = playerStats[player.id] || { goals: 0, yellowCard: false, redCard: false }

              return (
                <MatchPlayerCard
                  key={player.id}
                  player={player}
                  teamVariant={teamVariant}
                  isSelected={isSelected}
                  blocked={blocked}
                  busy={busy}
                  stats={stats}
                  onClick={() => onSelectPlayer(player, teamId, teamVariant)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Docked Quick Action Toolbar for the selected player:
 * Displays selected player badge/jersey, goal, yellow card, red card, substitution buttons.
 */
function DockedPlayerActionBar({
  player,
  teamName,
  variant,
  onAction,
  onClose,
}) {
  if (!player) return null

  return (
    <div className="sticky bottom-0 z-30 mt-4 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Selected player info */}
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <Jersey
              number={player.number}
              photoUrl={player.photo_thumbnail_url || player.photo_url}
              variant={variant}
              className="h-11 w-10"
            />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-black text-slate-900">{player.name}</h4>
            <p className="truncate text-[11px] font-semibold text-slate-400">{teamName || '—'}</p>
          </div>
        </div>

        {/* Event Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Goal */}
          <button
            type="button"
            onClick={() => onAction('goal')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-800 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
          >
            <span className="text-base leading-none">⚽</span>
            <span>هدف</span>
          </button>

          {/* Yellow Card */}
          <button
            type="button"
            onClick={() => onAction('yellow_card')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-900 shadow-sm transition-all hover:bg-amber-100 active:scale-95"
          >
            <span className="text-base leading-none">🟨</span>
            <span>بطاقة صفراء</span>
          </button>

          {/* Red Card */}
          <button
            type="button"
            onClick={() => onAction('red_card')}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-900 shadow-sm transition-all hover:bg-rose-100 active:scale-95"
          >
            <span className="text-base leading-none">🟥</span>
            <span>بطاقة حمراء</span>
          </button>

          {/* Substitution */}
          <button
            type="button"
            onClick={() => onAction('substitution')}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-black text-sky-900 shadow-sm transition-all hover:bg-sky-100 active:scale-95"
          >
            <RefreshCw className="size-3.5" />
            <span>تبديل</span>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="إلغاء التحديد"
            aria-label="إلغاء التحديد"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Main PlayersTab component:
 * Renders the Home and Away team rosters side-by-side using the tournament/match configuration
 * with large player cards, starters, bench, event markers, and docked action toolbar.
 */
export default function PlayersTab({
  homeId,
  homeName,
  homeTeam,
  awayId,
  awayName,
  awayTeam,
  homeRoster,
  awayRoster,
  suspendedByTeam,
  redCardedIds,
  busyId,
  events,
  tournament,
  fixture,
  onTapPlayer,
  onActionPick,
  onAddPlayer,
  t,
}) {
  const [selectedPlayerState, setSelectedPlayerState] = useState(null) // { player, teamId, variant }
  const [confirmedHome, setConfirmedHome] = useState([])
  const [confirmedAway, setConfirmedAway] = useState([])

  // Load lineups / presence if fixture has existing records
  useEffect(() => {
    let cancelled = false
    if (tournament?.id && fixture?.id) {
      api.get(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/lineups`)
        .then((res) => {
          if (cancelled) return
          const data = res.data?.data
          if (data?.home) setConfirmedHome(data.home)
          if (data?.away) setConfirmedAway(data.away)
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [tournament?.id, fixture?.id])

  // Derive dynamic roster limits and format starters count
  const rosterLimit = tournament?.max_players_per_team || 8
  const startersCount = useMemo(() => {
    const fmt = String(tournament?.tournament_format || '').toLowerCase()
    if (fmt.includes('7') || fmt.includes('sept')) return 7
    if (fmt.includes('6') || fmt.includes('six')) return 6
    if (fmt.includes('8') || fmt.includes('huit')) return 8
    if (fmt.includes('11')) return 11
    return 5
  }, [tournament?.tournament_format])

  const handleSelectPlayer = (player, teamId, variant) => {
    // When parent provides onTapPlayer callback, use it to open the EventTypePicker modal
    if (onTapPlayer) {
      onTapPlayer(player, teamId, variant)
      return
    }
    // Otherwise fallback to toggling docked bottom action bar
    if (selectedPlayerState?.player?.id === player.id) {
      setSelectedPlayerState(null)
      return
    }
    setSelectedPlayerState({ player, teamId, variant })
  }

  const handleAction = (type) => {
    if (!selectedPlayerState) return
    const { player, teamId } = selectedPlayerState
    if (onActionPick) {
      onActionPick(player, teamId, type)
    }
    setSelectedPlayerState(null)
  }

  const currentSelectedTeamName = selectedPlayerState?.teamId === homeId ? homeName : awayName

  return (
    <div className="space-y-4">
      {/* 2-Column Responsive Grid for Home and Away Rosters */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Right / Home Team Column (Green theme) */}
        <TeamRosterSection
          teamId={homeId}
          name={homeName}
          teamVariant="home"
          players={homeRoster}
          confirmedList={confirmedHome}
          rosterLimit={rosterLimit}
          startersCount={startersCount}
          suspendedIds={suspendedByTeam[homeId] || []}
          redCardedIds={redCardedIds[homeId] || []}
          busyId={busyId}
          selectedPlayerId={selectedPlayerState?.player?.id}
          events={events}
          onSelectPlayer={handleSelectPlayer}
          onAddPlayer={onAddPlayer}
          t={t}
        />

        {/* Left / Away Team Column (White theme) */}
        <TeamRosterSection
          teamId={awayId}
          name={awayName}
          teamVariant="away"
          players={awayRoster}
          confirmedList={confirmedAway}
          rosterLimit={rosterLimit}
          startersCount={startersCount}
          suspendedIds={suspendedByTeam[awayId] || []}
          redCardedIds={redCardedIds[awayId] || []}
          busyId={busyId}
          selectedPlayerId={selectedPlayerState?.player?.id}
          events={events}
          onSelectPlayer={handleSelectPlayer}
          onAddPlayer={onAddPlayer}
          t={t}
        />
      </div>

      {/* Docked Action Bar when player is tapped */}
      {selectedPlayerState && (
        <DockedPlayerActionBar
          player={selectedPlayerState.player}
          teamName={currentSelectedTeamName}
          variant={selectedPlayerState.variant}
          onAction={handleAction}
          onClose={() => setSelectedPlayerState(null)}
        />
      )}
    </div>
  )
}