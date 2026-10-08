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
  isSubbedOut = false,
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

        {/* Substituted out badge (informational only, blocks nothing) */}
        {isSubbedOut && (
          <span className="absolute -top-1 -start-1 flex size-4 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 border border-slate-200 shadow-xs" title="تم استبداله سابقاً (متاح للعودة)">
            ↩️
          </span>
        )}
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

  // Split into starters and substitutes, taking into account rolling substitutions recorded in events
  const { onPitch, bench, subbedOut } = useMemo(() => {
    const targetStarters = startersCount || 5
    const hasExplicitStarters = eligiblePlayers.some((p) => p.is_starter)
    const initialStarters = hasExplicitStarters
      ? eligiblePlayers.filter((p) => p.is_starter)
      : eligiblePlayers.slice(0, targetStarters)
    const initialStartersSet = new Set(initialStarters.map((p) => Number(p.id)))

    // Find substitutions for this team in events
    const teamSubs = (events || []).filter(
      (e) => e.type === 'substitution' && Number(e.team_id) === Number(teamId)
    )

    // Build event index mapping for stable chronological tie-breaking
    const eventIndexMap = new Map((events || []).map((e, idx) => [e._key || e.id || idx, idx]))

    // Sort substitutions chronologically (half, minute, added_time, then event insertion order)
    const sortedSubs = [...teamSubs].sort((a, b) => {
      const hA = a.half === 'second' || a.half === '2' ? 2 : 1
      const hB = b.half === 'second' || b.half === '2' ? 2 : 1
      if (hA !== hB) return hA - hB
      const minDiff = (Number(a.minute) || 0) - (Number(b.minute) || 0)
      if (minDiff !== 0) return minDiff
      const addDiff = (Number(a.added_time) || 0) - (Number(b.added_time) || 0)
      if (addDiff !== 0) return addDiff
      const idxA = eventIndexMap.get(a._key || a.id) ?? 0
      const idxB = eventIndexMap.get(b._key || b.id) ?? 0
      return idxA - idxB
    })

    // Derive each player's state (on pitch / on bench) from their LATEST substitution event
    // (or from starting lineup if no substitutions involve them)
    const activePitch = []
    const activeBench = []
    const subbedOutList = []

    for (const player of eligiblePlayers) {
      const pid = Number(player.id)
      let latestSub = null
      let hasEverBeenSubbedOut = false

      for (let i = sortedSubs.length - 1; i >= 0; i--) {
        const sub = sortedSubs[i]
        const outId = sub.player_id ? Number(sub.player_id) : null
        const inId = sub.assist_player_id ? Number(sub.assist_player_id) : null

        if (outId === pid) {
          hasEverBeenSubbedOut = true
        }
        if (!latestSub && (outId === pid || inId === pid)) {
          latestSub = sub
        }
      }

      let isOnPitch = false
      if (latestSub) {
        // If in latest substitution this player entered (assist_player_id), they are on pitch.
        // If they left (player_id), they are on the bench.
        isOnPitch = Number(latestSub.assist_player_id) === pid
      } else {
        isOnPitch = initialStartersSet.has(pid)
      }

      if (isOnPitch) {
        activePitch.push(player)
      } else {
        activeBench.push(player)
        if (hasEverBeenSubbedOut) {
          subbedOutList.push(player)
        }
      }
    }

    return {
      onPitch: activePitch,
      bench: activeBench,
      subbedOut: subbedOutList,
    }
  }, [eligiblePlayers, startersCount, events, teamId])

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

        {/* Badges: Total Limit, On pitch count, Bench count */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 font-black text-slate-700">
            <Users className="size-3.5" />
            <span>لاعبو المباراة ({limitDisplay})</span>
          </span>
          <span className="rounded-xl bg-emerald-50 text-emerald-800 px-2 py-1 font-bold">
            {onPitch.length} بالملعب
          </span>
          <span className="rounded-xl bg-sky-50 text-sky-800 px-2 py-1 font-bold">
            {bench.length} احتياط
          </span>
          {subbedOut.length > 0 && (
            <span className="rounded-xl bg-slate-100 text-slate-600 px-2 py-1 font-bold">
              {subbedOut.length} مستبدلون
            </span>
          )}
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

      {/* Section 1: On Pitch (اللاعبون في أرضية الملعب) */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-emerald-900">
          <span className="grid size-5 place-items-center rounded-lg bg-emerald-600 text-[11px] text-white">
            ⚽
          </span>
          <span>({onPitch.length}) في أرضية الملعب</span>
        </div>

        {onPitch.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد لاعبين في الملعب
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {onPitch.map((player) => {
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
                  onClick={() => onSelectPlayer(player, teamId, teamVariant, bench)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: Substitutes (دكة الاحتياط) */}
      <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-sky-900">
          <span className="grid size-5 place-items-center rounded-lg bg-sky-600 text-[11px] text-white">
            🔄
          </span>
          <span>({bench.length}) دكة الاحتياط</span>
        </div>

        {bench.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد لاعبين في دكة الاحتياط
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {bench.map((player) => {
              const blocked = (suspendedIds || []).includes(player.id) || (redCardedIds || []).includes(player.id)
              const busy = busyId === player.id
              const isSelected = selectedPlayerId === player.id
              const stats = playerStats[player.id] || { goals: 0, yellowCard: false, redCard: false }
              const isSubbed = subbedOut.some((sp) => Number(sp.id) === Number(player.id))

              return (
                <MatchPlayerCard
                  key={player.id}
                  player={player}
                  teamVariant={teamVariant}
                  isSelected={isSelected}
                  blocked={blocked}
                  busy={busy}
                  stats={stats}
                  isSubbedOut={isSubbed}
                  onClick={() => onSelectPlayer(player, teamId, teamVariant, bench)}
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
  confirmedHome: propConfirmedHome,
  confirmedAway: propConfirmedAway,
}) {
  const [selectedPlayerState, setSelectedPlayerState] = useState(null) // { player, teamId, variant }
  const [fetchedHome, setFetchedHome] = useState([])
  const [fetchedAway, setFetchedAway] = useState([])

  // Load lineups / presence if fixture has existing records and not provided via props
  useEffect(() => {
    let cancelled = false
    if (tournament?.id && fixture?.id && !propConfirmedHome && !propConfirmedAway) {
      api.get(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/lineups`)
        .then((res) => {
          if (cancelled) return
          const data = res.data?.data
          if (data?.home) setFetchedHome(data.home)
          if (data?.away) setFetchedAway(data.away)
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [tournament?.id, fixture?.id, propConfirmedHome, propConfirmedAway])

  const normalizeConfirmed = (propVal, fetchedVal) => {
    if (propVal != null) {
      if (Array.isArray(propVal)) return propVal
      if (propVal instanceof Set) {
        return Array.from(propVal).map((id) => ({ player_id: Number(id), is_starter: true }))
      }
    }
    return fetchedVal
  }

  const confirmedHome = useMemo(() => normalizeConfirmed(propConfirmedHome, fetchedHome), [propConfirmedHome, fetchedHome])
  const confirmedAway = useMemo(() => normalizeConfirmed(propConfirmedAway, fetchedAway), [propConfirmedAway, fetchedAway])

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

  const handleSelectPlayer = (player, teamId, variant, bench = []) => {
    // When parent provides onTapPlayer callback, use it to open the OneTapEventSheet
    if (onTapPlayer) {
      onTapPlayer(player, teamId, variant, bench)
      return
    }
    // Otherwise fallback to toggling docked bottom action bar
    if (selectedPlayerState?.player?.id === player.id) {
      setSelectedPlayerState(null)
      return
    }
    setSelectedPlayerState({ player, teamId, variant, bench })
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