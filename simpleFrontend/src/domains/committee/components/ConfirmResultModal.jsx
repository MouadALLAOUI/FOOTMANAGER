import React, { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'
import { EVENT_META, absoluteMinute, minuteText } from '../constants'
import { REFEREE_ROLES } from '../../../data/matchConstants'

function SectionCard({ icon, title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <span className="text-sm leading-none">{icon}</span>
        <h4 className="text-xs font-black text-slate-700">{title}</h4>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

function GoalRow({ ev, teamName, own, minute, t }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-emerald-50/60 px-2.5 py-2">
      <span className="w-11 shrink-0 rounded-md bg-white px-1 py-0.5 text-center text-[10px] font-black tabular-nums text-emerald-700 ring-1 ring-emerald-100">
        {minute}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-black text-slate-800">{ev.player || t('committee.result.player')}</p>
        <p className="truncate text-[10px] font-semibold text-slate-400">{teamName}{own ? ` • ${t('committee.result.ev.ownGoal')}` : ''}</p>
        {ev.assist_player && (
          <p className="truncate text-[10px] font-semibold text-emerald-600">{t('committee.result.assist')}: {ev.assist_player}</p>
        )}
      </div>
    </li>
  )
}

function CardRow({ ev, teamName, minute, t }) {
  const meta = EVENT_META[ev.type] || EVENT_META.yellow_card
  return (
    <li className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
      <span className="w-11 shrink-0 rounded-md bg-white px-1 py-0.5 text-center text-[10px] font-black tabular-nums text-slate-600 ring-1 ring-slate-100">
        {minute}
      </span>
      <span className="text-sm leading-none">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-black text-slate-800">{ev.player || t('committee.result.player')}</p>
        <p className="truncate text-[10px] font-semibold text-slate-400">{teamName}{ev.reason ? ` • ${ev.reason}` : ''}</p>
      </div>
    </li>
  )
}

function SubRow({ ev, minute, t }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-sky-50/60 px-2.5 py-2">
      <span className="w-11 shrink-0 rounded-md bg-white px-1 py-0.5 text-center text-[10px] font-black tabular-nums text-sky-700 ring-1 ring-sky-100">
        {minute}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[11px] font-black text-rose-600">{t('committee.result.playerOut')}: {ev.player || '—'}</p>
        <p className="truncate text-[11px] font-black text-emerald-600">{t('committee.result.playerIn')}: {ev.assist_player || '—'}</p>
      </div>
    </li>
  )
}

export default function ConfirmResultModal({
  events,
  score,
  homeName,
  awayName,
  homeId,
  awayId,
  isKnockout,
  homePen,
  awayPen,
  referees,
  assigned,
  saving,
  onConfirm,
  onCancel,
  t,
  halfDuration,
}) {
  const teamNameOf = (teamId) => {
    const id = Number(teamId)
    if (id === Number(homeId)) return homeName
    if (id === Number(awayId)) return awayName
    return t('committee.result.selectTeam')
  }
  const evMinute = (ev) => minuteText(absoluteMinute(ev.minute, ev.half, halfDuration), ev.added_time)

  const goals = useMemo(
    () => events.filter((e) => e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal'),
    [events],
  )
  const cards = useMemo(
    () => events.filter((e) => e.type === 'yellow_card' || e.type === 'second_yellow' || e.type === 'red_card'),
    [events],
  )
  const subs = useMemo(() => events.filter((e) => e.type === 'substitution'), [events])

  const homeGoals = goals.filter((e) => Number(e.team_id) === Number(homeId))
  const awayGoals = goals.filter((e) => Number(e.team_id) === Number(awayId))
  const ownGoalHome = homeGoals.filter((e) => e.type === 'own_goal')
  const ownGoalAway = awayGoals.filter((e) => e.type === 'own_goal')

  const assignedReferees = useMemo(() => {
    return REFEREE_ROLES
      .map(({ value }) => {
        const id = assigned?.[value]
        if (!id) return null
        const ref = referees.find((r) => String(r.id) === String(id))
        return ref ? { role: value, name: ref.name } : null
      })
      .filter(Boolean)
  }, [assigned, referees])

  const noData = goals.length === 0 && cards.length === 0 && subs.length === 0 && assignedReferees.length === 0

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="pop-in flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-green-50 text-lg">🏁</span>
            <div>
              <h3 className="text-sm font-black text-slate-900">{t('committee.result.reviewTitle')}</h3>
              <p className="text-[11px] font-semibold text-slate-400">{t('committee.result.reviewDesc')}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('common.close')} className="grid size-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white">
            <p className="text-center text-[10px] font-black uppercase tracking-wider text-emerald-100">{t('committee.result.reviewScore')}</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <div className="min-w-0 flex-1 text-end">
                <p className="truncate text-sm font-black">{homeName}</p>
              </div>
              <p className="shrink-0 text-4xl font-black tabular-nums">{score.home}<span className="mx-1 text-xl font-black text-emerald-200">-</span>{score.away}</p>
              <div className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-black">{awayName}</p>
              </div>
            </div>
            {isKnockout && homePen != null && awayPen != null && (
              <p className="mt-2 text-center text-[11px] font-bold text-emerald-100">
                {t('committee.result.penalties')}: {homePen} - {awayPen}
              </p>
            )}
          </div>

          {noData && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-xs font-bold text-slate-500">
              {t('committee.result.reviewEmpty')}
            </p>
          )}

          {goals.length > 0 && (
            <SectionCard icon="⚽" title={t('committee.result.goals')}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  {homeGoals.length > 0 && (
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{homeName}</p>
                  )}
                  {homeGoals.map((ev) => (
                    <GoalRow key={ev._key} ev={ev} teamName={teamNameOf(ev.team_id)} own={ev.type === 'own_goal'} minute={evMinute(ev)} t={t} />
                  ))}
                  {ownGoalAway.length > 0 && ownGoalAway.map((ev) => (
                    <GoalRow key={ev._key} ev={ev} teamName={teamNameOf(ev.team_id)} own minute={evMinute(ev)} t={t} />
                  ))}
                </div>
                <div className="space-y-1.5">
                  {awayGoals.length > 0 && (
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{awayName}</p>
                  )}
                  {awayGoals.map((ev) => (
                    <GoalRow key={ev._key} ev={ev} teamName={teamNameOf(ev.team_id)} own={ev.type === 'own_goal'} minute={evMinute(ev)} t={t} />
                  ))}
                  {ownGoalHome.length > 0 && ownGoalHome.map((ev) => (
                    <GoalRow key={ev._key} ev={ev} teamName={teamNameOf(ev.team_id)} own minute={evMinute(ev)} t={t} />
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {cards.length > 0 && (
            <SectionCard icon="🟨" title={t('committee.result.reviewCards')}>
              <ul className="space-y-1.5">
                {cards.map((ev) => (
                  <CardRow key={ev._key} ev={ev} teamName={teamNameOf(ev.team_id)} minute={evMinute(ev)} t={t} />
                ))}
              </ul>
            </SectionCard>
          )}

          {subs.length > 0 && (
            <SectionCard icon="🔄" title={t('committee.result.substitutions')}>
              <ul className="space-y-1.5">
                {subs.map((ev) => (
                  <SubRow key={ev._key} ev={ev} minute={evMinute(ev)} t={t} />
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard icon="🟦" title={t('committee.result.reviewReferee')}>
            {assignedReferees.length === 0 ? (
              <p className="py-1 text-center text-[11px] font-bold text-slate-400">{t('committee.result.noReferee')}</p>
            ) : (
              <ul className="space-y-1.5">
                {assignedReferees.map(({ role, name }) => (
                  <li key={role} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2">
                    <span className="text-[11px] font-black text-slate-700">{name}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{t(`committee.result.refereeRoles.${role}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            <X className="size-4" />
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" loading={saving} onClick={onConfirm}>
            <Check className="size-4" />
            {t('committee.result.confirmFinish')}
          </Button>
        </footer>
      </div>
    </div>
  )
}
