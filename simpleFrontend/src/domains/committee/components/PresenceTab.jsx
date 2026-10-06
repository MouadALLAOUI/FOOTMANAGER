import React, { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, UserCheck } from 'lucide-react'
import { TeamAvatar } from '../../../pages/tournaments/shared'
import api from '../../../api/client'

// ─── Single player presence button ───────────────────────────────────────────

function PlayerPresenceRow({ player, teamId, fixtureId, tournamentId, confirmed: initialConfirmed, onToggle, t }) {
  const [confirmed, setConfirmed] = useState(initialConfirmed)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setConfirmed(initialConfirmed)
  }, [initialConfirmed])

  const toggle = async () => {
    if (busy) return
    const next = !confirmed
    if (onToggle) {
      onToggle(player.id, teamId, next)
      setConfirmed(next)
      return
    }
    setBusy(true)
    try {
      await api.post(
        `/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/lineups/confirm`,
        { player_id: player.id, team_id: teamId, confirmed: next },
      )
      setConfirmed(next)
    } catch {
      // silently revert on error — let UX handle via toast if needed
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`group flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
        confirmed
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200/70 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
      }`}
    >
      {/* Jersey number */}
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-black tabular-nums ${
          confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {player.number || '—'}
      </span>

      {/* Name */}
      <span
        className={`min-w-0 flex-1 truncate text-sm font-bold ${
          confirmed ? 'text-emerald-800' : 'text-slate-700'
        }`}
      >
        {player.name}
      </span>

      {/* Confirm button */}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={confirmed ? t('committee.presence.unconfirm') : t('committee.presence.confirm')}
        className={`ms-auto flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition-all disabled:opacity-60 ${
          confirmed
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'border border-dashed border-slate-300 bg-white text-slate-500 hover:border-emerald-400 hover:text-emerald-600'
        }`}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : confirmed ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <UserCheck className="size-3.5" />
        )}
        <span className="hidden sm:inline">
          {confirmed ? t('committee.presence.confirmed') : t('committee.presence.confirmBtn')}
        </span>
      </button>
    </div>
  )
}

// ─── One team column ──────────────────────────────────────────────────────────

function TeamPresenceColumn({ teamId, name, team, players, confirmedIds, tournamentId, fixtureId, onToggle, t }) {
  const list = players || []
  const confirmedCount = list.filter((p) => confirmedIds.has(p.id)).length

  if (list.length === 0) {
    return (
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <TeamAvatar team={team} className="size-6" />
            <span className="truncate text-xs font-black text-slate-800">{name}</span>
          </div>
        </div>
        <p className="py-6 text-center text-[11px] font-semibold text-slate-400">
          {t('committee.result.playersNoPlayers')}
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {/* Team header with confirmed count */}
      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamAvatar team={team} className="size-6" />
          <span className="truncate text-xs font-black text-slate-800">{name}</span>
        </div>
        <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
          <CheckCircle2 className="size-3" />
          {confirmedCount}/{list.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {list.map((p) => (
          <PlayerPresenceRow
            key={p.id}
            player={p}
            teamId={teamId}
            fixtureId={fixtureId}
            tournamentId={tournamentId}
            confirmed={confirmedIds.has(p.id)}
            onToggle={onToggle}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main PresenceTab export ──────────────────────────────────────────────────

export default function PresenceTab({
  homeId,
  homeName,
  homeTeam,
  awayId,
  awayName,
  awayTeam,
  homeRoster,
  awayRoster,
  tournamentId,
  fixtureId,
  confirmedHome: propConfirmedHome,
  confirmedAway: propConfirmedAway,
  onTogglePlayer,
  t,
}) {
  const [confirmedHome, setConfirmedHome] = useState(new Set())
  const [confirmedAway, setConfirmedAway] = useState(new Set())
  const [loading, setLoading] = useState(!propConfirmedHome)

  const activeConfirmedHome = propConfirmedHome || confirmedHome
  const activeConfirmedAway = propConfirmedAway || confirmedAway

  const load = useCallback(async () => {
    if (propConfirmedHome || !tournamentId || !fixtureId) return
    try {
      const r = await api.get(`/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/lineups`)
      const data = r.data?.data
      setConfirmedHome(new Set((data?.home || []).map((p) => p.player_id)))
      setConfirmedAway(new Set((data?.away || []).map((p) => p.player_id)))
    } catch {
      // fail silently — confirmed state starts empty
    } finally {
      setLoading(false)
    }
  }, [tournamentId, fixtureId, propConfirmedHome])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
        <span className="mt-0.5 text-base leading-none">🛡️</span>
        <p className="text-[11px] font-semibold text-blue-700">
          {t('committee.presence.infoBanner', 'تأكيد حضور اللاعبين المؤهلين للمباراة قبل أو أثناء التسجيل')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamPresenceColumn
          teamId={homeId}
          name={homeName}
          team={homeTeam}
          players={homeRoster}
          confirmedIds={activeConfirmedHome}
          tournamentId={tournamentId}
          fixtureId={fixtureId}
          onToggle={onTogglePlayer}
          t={t}
        />
        <TeamPresenceColumn
          teamId={awayId}
          name={awayName}
          team={awayTeam}
          players={awayRoster}
          confirmedIds={activeConfirmedAway}
          tournamentId={tournamentId}
          fixtureId={fixtureId}
          onToggle={onTogglePlayer}
          t={t}
        />
      </div>
    </div>
  )
}
