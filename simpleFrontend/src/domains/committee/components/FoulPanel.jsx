import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ShieldX, Timer, X } from 'lucide-react'
import api from '../../../api/client'
import SectionCard from '../../../components/ui/SectionCard'
import { Button } from '../../../components/dashboard/ui'

const minuteText = (m, added) => (Number(added) > 0 ? `${Number(m) || 0}'+${Number(added)}` : `${Number(m) || 0}'`)

export default function FoulPanel({ tournamentId, fixtureId, homeId, awayId, homeName, awayName, refetchTick, onAwardConverted, t }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/penalties`)
      setStatus(r.data?.data || null)
      setError(false)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [tournamentId, fixtureId])

  useEffect(() => { load() }, [load, refetchTick])

  const confirmSuggestion = async (suggestion, actionConfirm) => {
    setBusy(true)
    try {
      const endpoint = suggestion.type === 'player_penalty' ? 'player' : 'award'
      const r = await api.post(`/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/penalties/${endpoint}`, {
        event_id: suggestion.event_id,
        action_confirm: actionConfirm,
      })
      if (r.data?.status) setStatus(r.data.status)
    } catch (e) {
      // surface via a lightweight rerender; keep panel usable
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const endPenalty = async (penalty) => {
    setBusy(true)
    try {
      await api.post(`/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/penalties/player/${penalty.id}/end`)
      await load()
    } catch (e) {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const resolveAward = async (award, outcome) => {
    setBusy(true)
    try {
      await api.post(`/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/penalties/award/${award.id}/resolve`, { outcome })
      await load()
    } catch (e) {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const byTeam = useMemo(() => {
    const map = {}
    for (const row of status?.teams || []) {
      if (!map[row.team_id]) map[row.team_id] = 0
      map[row.team_id] = Math.max(map[row.team_id], Number(row.count) || 0)
    }
    return map
  }, [status])

  const activeByTeam = useMemo(() => {
    const map = {}
    for (const p of status?.active_penalties || []) map[p.team_id] = (map[p.team_id] || 0) + 1
    return map
  }, [status])

  const activePenalties = useMemo(() => (status?.active_penalties || []), [status])

  const teamCounter = (id) => byTeam[id] || 0
  const shortHanded = (id) => (activeByTeam[id] || 0) > 0
  const threshold = status?.settings?.team_threshold

  if (loading) {
    return (
      <SectionCard title={t('committee.result.foulPanel.title')} icon={AlertTriangle}>
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-8 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </SectionCard>
    )
  }

  if (error || !status) {
    return (
      <SectionCard title={t('committee.result.foulPanel.title')} icon={AlertTriangle}>
        <p className="text-center text-xs font-bold text-slate-400">{t('committee.result.foulPanel.loadFailed')}</p>
      </SectionCard>
    )
  }

  if (!status.enabled) {
    return (
      <SectionCard title={t('committee.result.foulPanel.title')} icon={AlertTriangle}>
        <p className="text-center text-xs font-bold text-slate-400">{t('committee.result.foulPanel.disabled')}</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t('committee.result.foulPanel.title')} icon={AlertTriangle}>
      <div className="space-y-4">
        {/* Foul counters */}
        <div className="grid grid-cols-2 gap-2">
          {[{ id: homeId, name: homeName }, { id: awayId, name: awayName }].map(({ id, name }) => (
            <div key={id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${shortHanded(id) ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-slate-50/60'}`}>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-extrabold text-slate-700">{name}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {t('committee.result.foulPanel.fouls')}: {teamCounter(id)}
                  {threshold ? ` / ${threshold}` : ''}
                </p>
              </div>
              {shortHanded(id) && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-500 text-white" title={t('committee.result.foulPanel.shortHanded')}>
                  <ShieldX className="size-3.5" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {(status.suggestions || []).length > 0 && (
          <div className="space-y-2">
            {(status.suggestions || []).map((s, i) => (
              <div key={`${s.type}-${s.batch}-${i}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1 text-[11px] font-bold text-amber-800">
                    {s.type === 'player_penalty' ? (
                      t('committee.result.foulPanel.suggestPlayer', {
                        name: s.player_name || t('committee.detail.tbd'),
                        count: s.count,
                        threshold: s.threshold,
                        minutes: s.minutes,
                      })
                    ) : (
                      t('committee.result.foulPanel.suggestTeam', {
                        team: s.committing_team_name || t('committee.detail.tbd'),
                        opp: s.awarded_to_team_name || t('committee.detail.tbd'),
                        count: s.count,
                        threshold: s.threshold,
                      })
                    )}
                    <span className="mt-0.5 block text-[10px] font-semibold text-amber-500">
                      {minuteText(s.minute, 0)} • {t('committee.result.foulPanel.batch')} #{s.batch}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" loading={busy} onClick={() => confirmSuggestion(s, true)}>
                    <Check className="size-3.5" />
                    {t('committee.result.foulPanel.confirm')}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" loading={busy} onClick={() => confirmSuggestion(s, false)}>
                    <X className="size-3.5" />
                    {t('committee.result.foulPanel.dismiss')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active penalties */}
        {activePenalties.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-extrabold text-slate-600">{t('committee.result.foulPanel.activePenalties')}</p>
            <div className="space-y-2">
              {activePenalties.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <Timer className="size-4 shrink-0 text-rose-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">
                      {p.player?.name || t('committee.detail.tbd')} <span className="text-slate-400">#{p.player?.number || '—'}</span>
                    </p>
                    <p className="text-[10px] font-bold text-rose-500">
                      {minuteText(p.start_minute, 0)} → {minuteText(p.end_minute, 0)} ({p.duration_minutes}′)
                    </p>
                  </div>
                  <button type="button" onClick={() => endPenalty(p)} className="shrink-0 rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-black text-white hover:bg-rose-600">
                    {t('committee.result.foulPanel.endEarly')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending awards */}
        {(status.pending_awards || []).length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-extrabold text-slate-600">{t('committee.result.foulPanel.pendingAwards')}</p>
            <div className="space-y-2">
              {(status.pending_awards || []).map((a) => (
                <div key={a.id} className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-[11px] font-extrabold text-violet-800">
                    {t('committee.result.foulPanel.awardTo', { team: a.awarded_to_name || t('committee.detail.tbd') })}
                  </p>
                  <p className="text-[10px] font-bold text-violet-500">{minuteText(a.minute, 0)}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="flex-1" loading={busy} onClick={() => (onAwardConverted ? onAwardConverted(a) : resolveAward(a, 'converted'))}>
                      ⚽ {t('committee.result.foulPanel.outcomeConverted')}
                    </Button>
                    <Button size="sm" variant="soft" className="flex-1" loading={busy} onClick={() => resolveAward(a, 'missed')}>
                      {t('committee.result.foulPanel.outcomeMissed')}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" loading={busy} onClick={() => resolveAward(a, 'saved')}>
                      {t('committee.result.foulPanel.outcomeSaved')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!status.suggestions?.length && !activePenalties.length && !status.pending_awards?.length && (
          <p className="text-center text-[11px] font-bold text-slate-400">{t('committee.result.foulPanel.allClear')}</p>
        )}
      </div>
    </SectionCard>
  )
}