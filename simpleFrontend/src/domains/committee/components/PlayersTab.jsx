import React, { useEffect, useMemo, useState } from 'react'
import { Check, Plus, RefreshCw, Users, X } from 'lucide-react'
import api from '../../../api/client'
import Jersey from '../../../pages/manager/live/components/Jersey'

/**
 * Enhanced Player Card matching the AJI NQSSRO Live Match UI:
 * - Rounded card with white background and crisp border/shadow
 * - Kit jersey graphic with shirt number (or photo)
 * - Top badges: Captain (C) on start, Number (#10) on end
 * - Goal count badge (⚽ N) when player scored
 * - Card indicator (🟨 / 🟥)
 * - Immediate touch target for one-tap event recording
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
  const isCaptain = Boolean(player.is_captain)

  return (
    <button
      type="button"
      disabled={blocked || busy}
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-between rounded-2xl border p-2 text-center transition-all select-none min-h-[110px] sm:min-h-[120px] ${
        blocked
          ? 'cursor-not-allowed border-slate-200 bg-slate-50/70 opacity-40'
          : busy
            ? 'cursor-wait border-slate-200 bg-slate-50 opacity-70'
            : isSelected
              ? 'border-[#00C853] bg-emerald-50/50 shadow-md ring-2 ring-[#00C853]/30 active:scale-95'
              : 'border-slate-200/90 bg-white shadow-xs hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md active:scale-95'
      }`}
    >
      {/* Top Badges Row: Captain & Shirt Number */}
      <div className="flex items-center justify-between w-full px-0.5">
        {isCaptain ? (
          <span className="size-4.5 rounded-md bg-amber-500 text-white font-black text-[9px] grid place-items-center shadow-xs" title="قائد الفريق">
            C
          </span>
        ) : (
          <span className="size-4.5" />
        )}

        {player.number != null && (
          <span className="text-[10px] font-black text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded-md">
            #{player.number}
          </span>
        )}
      </div>

      {/* Player photo or Jersey visual */}
      <div className="relative my-1 flex items-center justify-center">
        {photoSrc ? (
          <div className="relative">
            <img
              src={photoSrc}
              alt={player.name}
              className="size-13 sm:size-14 rounded-2xl object-cover ring-2 ring-white shadow-xs"
            />
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

        {/* Substituted out badge (informational only) */}
        {isSubbedOut && (
          <span className="absolute -top-1 -start-1 flex size-4 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 border border-slate-200 shadow-xs" title="تم استبداله سابقاً">
            ↩️
          </span>
        )}
      </div>

      {/* Player Name */}
      <span className="w-full text-center text-xs font-black leading-tight text-slate-800 truncate px-1 mt-0.5" title={player.name}>
        {player.name}
      </span>
    </button>
  )
}

/**
 * Team Roster Section:
 * Displays all starters (on pitch) and all bench players together in one card section,
 * allowing instant access without toggling between tabs.
 */
function TeamRosterSection({
  teamId,
  name,
  team,
  teamVariant,
  players,
  confirmedList,
  rosterLimit,
  startersCount,
  suspendedIds,
  redCardedIds,
  busyId,
  events,
  onSelectPlayer,
  onAddPlayer,
  t,
}) {
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const addBusy = busyId === '__add__'

  const logoUrl = team?.logo_url || team?.logo

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
  const eligiblePlayers = useMemo(() => {
    const list = players || []
    if (confirmedList && confirmedList.length > 0) {
      const confMap = new Map(confirmedList.map((c) => [c.player_id, c]))
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

  // Split into starters and substitutes with dynamic substitution tracking
  const { onPitch, bench, subbedOut } = useMemo(() => {
    const targetStarters = startersCount || 5
    const hasExplicitStarters = eligiblePlayers.some((p) => p.is_starter)
    const initialStarters = hasExplicitStarters
      ? eligiblePlayers.filter((p) => p.is_starter)
      : eligiblePlayers.slice(0, targetStarters)
    const initialStartersSet = new Set(initialStarters.map((p) => Number(p.id)))

    const teamSubs = (events || []).filter(
      (e) => e.type === 'substitution' && Number(e.team_id) === Number(teamId)
    )

    const eventIndexMap = new Map((events || []).map((e, idx) => [e._key || e.id || idx, idx]))
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
        if (outId === pid) hasEverBeenSubbedOut = true
        if (!latestSub && (outId === pid || inId === pid)) latestSub = sub
      }

      let isOnPitch = false
      if (latestSub) {
        isOnPitch = Number(latestSub.assist_player_id) === pid
      } else {
        isOnPitch = initialStartersSet.has(pid)
      }

      if (isOnPitch) {
        activePitch.push(player)
      } else {
        activeBench.push(player)
        if (hasEverBeenSubbedOut) subbedOutList.push(player)
      }
    }

    return { onPitch: activePitch, bench: activeBench, subbedOut: subbedOutList }
  }, [eligiblePlayers, startersCount, events, teamId])

  const totalEligible = eligiblePlayers.length
  const limitDisplay = rosterLimit ? `${totalEligible}/${rosterLimit}` : `${totalEligible}`

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
      {/* Team Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="size-8 object-contain shrink-0 rounded-lg" />
          ) : (
            <Jersey
              number=""
              variant={teamVariant}
              className="h-8 w-7 shrink-0 drop-shadow-none"
            />
          )}
          <h3 className="truncate text-base font-black text-slate-900">{name}</h3>
        </div>

        {/* Badges: Total Limit, On pitch count, Bench count */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 font-black text-slate-700">
            <Users className="size-3.5" />
            <span>({limitDisplay})</span>
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
            className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#00C853] text-white hover:bg-[#00B048] disabled:opacity-50"
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
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100/60 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          <span>{t('committee.result.addPlayer', 'إضافة لاعب')}</span>
        </button>
      )}

      {/* SECTION 1: Starters (في أرضية الملعب) */}
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-2.5 sm:p-3">
        <div className="mb-2.5 flex items-center justify-between text-xs font-black text-emerald-950">
          <div className="flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-lg bg-[#00C853] text-[11px] text-white">
              ⚽
            </span>
            <span>اللاعبون الأساسيون ({onPitch.length})</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700">في أرضية الملعب</span>
        </div>

        {onPitch.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد لاعبين في الملعب
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
            {onPitch.map((player) => {
              const blocked = (suspendedIds || []).includes(player.id) || (redCardedIds || []).includes(player.id)
              const busy = busyId === player.id
              const stats = playerStats[player.id] || { goals: 0, yellowCard: false, redCard: false }

              return (
                <MatchPlayerCard
                  key={player.id}
                  player={player}
                  teamVariant={teamVariant}
                  isSelected={false}
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

      {/* SECTION 2: Bench (دكة الاحتياط) */}
      <div className="rounded-2xl border border-sky-200/80 bg-sky-50/30 p-2.5 sm:p-3">
        <div className="mb-2.5 flex items-center justify-between text-xs font-black text-sky-950">
          <div className="flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-lg bg-sky-600 text-[11px] text-white">
              🔄
            </span>
            <span>الاحتياط ({bench.length})</span>
          </div>
          <span className="text-[11px] font-bold text-sky-700">دكة البدلاء</span>
        </div>

        {bench.length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد لاعبين في دكة الاحتياط
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
            {bench.map((player) => {
              const blocked = (suspendedIds || []).includes(player.id) || (redCardedIds || []).includes(player.id)
              const busy = busyId === player.id
              const stats = playerStats[player.id] || { goals: 0, yellowCard: false, redCard: false }
              const isSubbed = subbedOut.some((sp) => Number(sp.id) === Number(player.id))

              return (
                <MatchPlayerCard
                  key={player.id}
                  player={player}
                  teamVariant={teamVariant}
                  isSelected={false}
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
 * Main PlayersTab component:
 * Renders BOTH teams (Home and Away) with ALL starters and bench players simultaneously
 * on the exact same page, enabling rapid one-tap recording for operators without any tab switching.
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
  const [fetchedHome, setFetchedHome] = useState([])
  const [fetchedAway, setFetchedAway] = useState([])

  // Load lineups / presence if fixture has existing records
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

  const rosterLimit = tournament?.max_players_per_team || 8
  const startersCount = useMemo(() => {
    const fmt = String(tournament?.tournament_format || '').toLowerCase()
    if (fmt.includes('7') || fmt.includes('sept')) return 7
    if (fmt.includes('6') || fmt.includes('six')) return 6
    if (fmt.includes('8') || fmt.includes('huit')) return 8
    if (fmt.includes('11')) return 11
    return 5
  }, [tournament?.tournament_format])

  return (
    <div className="space-y-4">
      {/* 2-Column Responsive Layout: Home Team & Away Team simultaneously */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Home Team Column */}
        <TeamRosterSection
          teamId={homeId}
          name={homeName}
          team={homeTeam}
          teamVariant="home"
          players={homeRoster}
          confirmedList={confirmedHome}
          rosterLimit={rosterLimit}
          startersCount={startersCount}
          suspendedIds={(suspendedByTeam && suspendedByTeam[homeId]) || []}
          redCardedIds={(redCardedIds && redCardedIds[homeId]) || []}
          busyId={busyId}
          events={events}
          onSelectPlayer={onTapPlayer}
          onAddPlayer={onAddPlayer}
          t={t}
        />

        {/* Away Team Column */}
        <TeamRosterSection
          teamId={awayId}
          name={awayName}
          team={awayTeam}
          teamVariant="away"
          players={awayRoster}
          confirmedList={confirmedAway}
          rosterLimit={rosterLimit}
          startersCount={startersCount}
          suspendedIds={(suspendedByTeam && suspendedByTeam[awayId]) || []}
          redCardedIds={(redCardedIds && redCardedIds[awayId]) || []}
          busyId={busyId}
          events={events}
          onSelectPlayer={onTapPlayer}
          onAddPlayer={onAddPlayer}
          t={t}
        />
      </div>
    </div>
  )
}
