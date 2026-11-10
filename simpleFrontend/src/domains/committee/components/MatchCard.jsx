import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  ChevronDown,
  Clock,
  History,
  MapPin,
  X,
} from 'lucide-react'
import { Button, Skeleton } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../../pages/tournaments/shared'
import { matchDay, formatTime } from '../../../lib/adapters'
import { formatGroupName } from '../../../lib/groupNames'
import { getGroupColor } from '../../../lib/groupColors'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import { LIVE_STATUSES, PILL_STYLES } from '../../../data/fixtures'
import TournamentMatchCard from './TournamentMatchCard'

function fixtureStatus(f) {
  const m = f.match
  if (f.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
  if (f.status === 'postponed' || m?.status === 'postponed') return 'postponed'
  if (m?.status === 'finished') return 'completed'
  if (LIVE_STATUSES.has(m?.status)) return 'live'
  if (f.scheduled_at && new Date(f.scheduled_at) > Date.now()) return 'upcoming'
  return 'pending'
}

export default function MatchCard({
  f,
  number,
  busy,
  locked,
  tournament,
  prevRoundKey,
  prevData,
  onOpenPrev,
  onResult,
  onDetails,
  onReschedule,
  onPostpone,
  onCancel,
  onRestore,
  onDelegatedLink,
  onReviewSubmission,
  layoutMode,
  draft,
  teamById,
  onStageSlot,
  slotErrors,
  orderedGroups = [],
}) {
  const { t, i18n } = useTranslation()
  const [prevOpen, setPrevOpen] = useState(false)
  useEffect(() => {
    setPrevOpen(false)
  }, [prevRoundKey])
  const st = fixtureStatus(f)
  const played = st === 'completed'
  const live = st === 'live'
  const showScore = played || live
  const lang = i18n.language
  const isGroupFixture = Boolean(f.group)
  const editableSlot =
    layoutMode && (f.slot_type || isGroupFixture) && (st === 'pending' || st === 'upcoming') && (isGroupFixture || !locked)
  const homeName = f.home_team?.name || f.slots?.home || t('committee.detail.tbd')
  const awayName = f.away_team?.name || f.slots?.away || t('committee.detail.tbd')
  const integratedRes = (tournament?.terrain_reservation_mode ?? 'independent') === 'integrated'
  const isDraftReservation = integratedRes && f.is_confirmed === false

  if (!editableSlot) {
    return (
      <div className="space-y-1">
        <TournamentMatchCard
          fixture={f}
          index={number}
          busy={busy}
          locked={locked}
          customRoundLabel={
            f.group?.name
              ? `${formatGroupName(f.group.name, { groupId: f.group.id, tournamentId: tournament?.id })} · ج ${f.matchday || number}`
              : t('committee.detail.matchNumber', { n: number })
          }
          orderedGroups={orderedGroups}
          onResult={onResult}
          onDetails={onDetails}
          onReschedule={onReschedule}
          onPostpone={onPostpone ? () => onPostpone(f) : undefined}
          onCancel={onCancel ? () => onCancel(f) : undefined}
          onRestore={onRestore ? () => onRestore(f) : undefined}
          onDelegatedLink={onDelegatedLink ? () => onDelegatedLink(f) : undefined}
          onReviewSubmission={onReviewSubmission ? () => onReviewSubmission(f) : undefined}
        />
        {prevRoundKey && (
          <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]">
            <button
              type="button"
              onClick={() => {
                setPrevOpen((v) => !v)
                if (!prevOpen && !prevData?.loading && !prevData?.fixtures?.length) onOpenPrev()
              }}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-[#65706A] dark:text-[#B2B9B3] transition-colors hover:text-[#111313] dark:hover:text-[#F5F7F2]"
            >
              <span className="inline-flex items-center gap-1.5">
                <History className="size-3.5" />
                {t('committee.detail.prevResults')}
              </span>
              <ChevronDown className={`size-4 transition-transform ${prevOpen ? 'rotate-180' : ''}`} />
            </button>
            {prevOpen && (
              <div className="space-y-1.5 border-t border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-4 py-3">
                {prevData?.loading ? (
                  <Skeleton className="h-10" />
                ) : (() => {
                    const list = f.group?.id
                      ? (prevData.fixtures || []).filter((pf) => pf.group?.id === f.group.id)
                      : prevData.fixtures || []
                    return list.length ? (
                      list.map((pf) => <PrevResultRow key={pf.id} f={pf} tournament={tournament} />)
                    ) : (
                      <p className="py-2 text-center text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                        {t('committee.detail.prevResultsEmpty')}
                      </p>
                    )
                  })()}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const slotGroupColor = f.group ? getGroupColor(f.group, orderedGroups) : null

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs ${
        slotGroupColor ? 'border-s-4' : ''
      }`}
      style={slotGroupColor ? { borderInlineStartColor: slotGroupColor.hex } : undefined}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#E1E5DF] dark:border-[#303832] px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {slotGroupColor && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${slotGroupColor.badgeCls}`}>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: slotGroupColor.hex }} />
              <span>{formatGroupName(f.group.name, { groupId: f.group.id, tournamentId: tournament?.id })}</span>
            </span>
          )}
          <span className="text-[11px] font-black uppercase tracking-wide text-[#65706A] dark:text-[#B2B9B3]">
            {t('committee.detail.matchNumber', { n: number })}
          </span>
        </div>
        <span className="flex items-center gap-2">
          {isDraftReservation && (
            <span className="inline-flex items-center rounded-full bg-[#D97706]/15 px-2.5 py-1 text-[10px] font-black text-[#D97706]">
              مسودة حجز
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${PILL_STYLES[st]}`}>
            {st === 'live' && <span className="me-1 size-1.5 animate-pulse rounded-full bg-[#D92D20]" />}
            {t(`committee.detail.status.${st}`)}
          </span>
        </span>
      </div>

      {editableSlot ? (
        <FixtureSlots
          f={f}
          isGroup={isGroupFixture}
          busy={busy}
          draft={draft}
          teamById={teamById}
          onStageSlot={onStageSlot}
          slotErrors={slotErrors}
          t={t}
        />
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
          <TeamSide team={f.home_team} name={homeName} align="start" />
          <div className="flex min-w-[92px] flex-col items-center">
            {showScore ? (
              <span className="text-xl font-black tracking-tight text-[#111313] dark:text-[#F5F7F2]">
                {f.match?.home_score ?? 0} - {f.match?.away_score ?? 0}
              </span>
            ) : (
              <span className="text-sm font-black text-[#65706A] dark:text-[#B2B9B3]">VS</span>
            )}
            {st === 'pending' && (
              <span className="mt-0.5 text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                {t('committee.detail.status.pending')}
              </span>
            )}
          </div>
          <TeamSide team={f.away_team} name={awayName} align="end" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E5DF] dark:border-[#303832] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
          {f.scheduled_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {matchDay(f.scheduled_at, lang)} · {formatTime(f.scheduled_at)}
            </span>
          )}
          {f.stadium && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {f.stadium.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {st === 'completed' && (
            <>
              <Button size="sm" variant="soft" disabled={busy} onClick={onDetails}>
                {t('committee.detail.viewDetails')}
              </Button>
              <Button size="sm" variant="outline" disabled={busy || locked} onClick={onResult}>
                {t('committee.detail.editResult', 'تعديل النتيجة والأحداث')}
              </Button>
            </>
          )}
          {st === 'live' && (
            <>
              <Button size="sm" variant="soft" disabled={busy || locked} onClick={onResult}>
                {t('committee.detail.enterResult')}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={onDetails}>
                {t('committee.detail.viewDetails')}
              </Button>
            </>
          )}
          {(st === 'pending' || st === 'upcoming') && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={onReschedule}>
                {t('committee.detail.edit')}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onPostpone(f)}>
                {t('committee.detail.postpone')}
              </Button>
              <Button size="sm" variant="dangerSoft" disabled={busy} onClick={() => onCancel(f)}>
                {t('committee.detail.cancelMatch')}
              </Button>
              <Button size="sm" disabled={busy || locked} onClick={onResult}>
                {t('committee.detail.enterResult')}
              </Button>
            </>
          )}
          {st === 'postponed' && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(f)}>
                {t('committee.detail.restoreMatch')}
              </Button>
              <Button size="sm" variant="outline" disabled={busy || locked} onClick={onResult}>
                {t('committee.detail.enterResult')}
              </Button>
              <Button size="sm" disabled={busy} onClick={onReschedule}>
                {t('committee.detail.reschedule')}
              </Button>
            </>
          )}
          {st === 'cancelled' && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(f)}>
                {t('committee.detail.restoreMatch')}
              </Button>
              <Button size="sm" variant="outline" disabled={busy || locked} onClick={onResult}>
                {t('committee.detail.editResult', 'تعديل النتيجة والأحداث')}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={onDetails}>
                {t('committee.detail.viewDetails')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PrevResultRow({ f, tournament }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const st = fixtureStatus(f)
  const homeName = f.home_team?.name || f.slots?.home || t('committee.detail.tbd')
  const awayName = f.away_team?.name || f.slots?.away || t('committee.detail.tbd')
  const isFinished = st === 'completed'
  const isPostponed = st === 'postponed'
  const isCancelled = st === 'cancelled'
  const points = isFinished ? matchPoints(tournament, f) : null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-2">
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <TeamAvatar
          team={f.home_team}
          className="size-6"
          onClick={f.home_team?.id != null ? () => openTeam(f.home_team) : undefined}
        />
        {f.home_team?.id != null ? <button type="button" onClick={() => openTeam(f.home_team)} className="min-w-0 truncate text-start text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2] hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{homeName}</button> : <span className="min-w-0 truncate text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2]">{homeName}</span>}
      </span>
      {isFinished && points ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1F9D55]/15 px-2.5 py-0.5 text-[11px] font-black text-[#1F9D55] dark:text-[#30D158]">
          {f.match?.home_score ?? 0} - {f.match?.away_score ?? 0}
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[10px] font-black text-[#65706A] dark:text-[#B2B9B3]">
          {isPostponed ? t('committee.detail.status.postponed') : isCancelled ? t('committee.detail.status.cancelled') : 'VS'}
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {f.away_team?.id != null ? <button type="button" onClick={() => openTeam(f.away_team)} className="min-w-0 truncate text-end text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2] hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{awayName}</button> : <span className="min-w-0 truncate text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2]">{awayName}</span>}
        <TeamAvatar
          team={f.away_team}
          className="size-6"
          onClick={f.away_team?.id != null ? () => openTeam(f.away_team) : undefined}
        />
      </span>
    </div>
  )
}

function matchPoints(tournament, f) {
  const m = f.match
  if (!m || m.status !== 'finished') return null
  const hs = m.home_score ?? 0
  const as = m.away_score ?? 0
  if (hs > as) return { home: tournament.points_for_win, away: tournament.points_for_loss }
  if (hs < as) return { home: tournament.points_for_loss, away: tournament.points_for_win }
  return { home: tournament.points_for_draw, away: tournament.points_for_draw }
}

function TeamSide({ team, name, align }) {
  const { openTeam } = useProfileModal()
  const slot = !team
  const clickable = !!team?.id
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === 'end' ? 'flex-row-reverse' : ''}`}>
      {slot ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]">
          <Clock className="size-4" />
        </span>
      ) : (
        <TeamAvatar team={team} className="size-8" onClick={clickable ? () => openTeam(team) : undefined} />
      )}
      {clickable ? (
        <button
          type="button"
          onClick={() => openTeam(team)}
          className="min-w-0 truncate text-start text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition-colors hover:text-[#1F9D55] dark:hover:text-[#D0FF38]"
        >
          {name}
        </button>
      ) : (
        <span className={`min-w-0 truncate text-xs font-bold ${slot ? 'text-[#65706A] italic' : 'text-[#111313] dark:text-[#F5F7F2]'}`}>
          {name}
        </span>
      )}
    </div>
  )
}

function FixtureSlots({ f, isGroup, busy, draft, teamById, onStageSlot, slotErrors, t }) {
  const isBye = f.slot_type === 'bye'
  const slots = draft || {}

  const at = (side, fallback) => {
    const key = `${f.id}:${side}`
    return key in slots ? slots[key] : fallback
  }

  if (isBye) {
    return (
      <div className="px-4 py-4">
        <div className="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-[#D97706]">
          {t('committee.detail.byeSlotHint')}
        </div>
        <SlotZone
          side="bye"
          team={at('bye', f.bye_team || null)}
          busy={busy}
          error={slotErrors?.[`${f.id}:bye`]}
          onDropTeam={(teamId) => onStageSlot(f, 'bye', teamById.get(teamId) || null)}
          onClear={() => onStageSlot(f, 'bye', null)}
          t={t}
        />
      </div>
    )
  }

  if (!isGroup && f.slot_type !== 'pair') return null

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
      <SlotZone
        side="home"
        team={at('home', f.home_team || null)}
        busy={busy}
        error={slotErrors?.[`${f.id}:home`]}
        onDropTeam={(teamId) => onStageSlot(f, 'home', teamById.get(teamId) || null)}
        onClear={() => onStageSlot(f, 'home', null)}
        t={t}
      />
      <div className="flex flex-col items-center">
        <span className="text-sm font-black text-[#65706A] dark:text-[#B2B9B3]">VS</span>
        <span className="mt-0.5 text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
          {t('committee.detail.status.pending')}
        </span>
      </div>
      <SlotZone
        side="away"
        team={at('away', f.away_team || null)}
        busy={busy}
        error={slotErrors?.[`${f.id}:away`]}
        onDropTeam={(teamId) => onStageSlot(f, 'away', teamById.get(teamId) || null)}
        onClear={() => onStageSlot(f, 'away', null)}
        t={t}
      />
    </div>
  )
}

function SlotZone({ team, busy, onDropTeam, onClear, t, error }) {
  const { openTeam } = useProfileModal()
  const [over, setOver] = useState(false)
  const base = error
    ? 'border-[#D92D20] bg-[#D92D20]/10'
    : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27]'
  const joined = over ? 'border-[#B8F000] bg-[#B8F000]/15' : base
  const emptyText = team ? null : t('committee.detail.dropTeamHere')

  return (
    <div
      role="button"
      onDragOver={(e) => {
        if (busy) return
        e.preventDefault()
        e.stopPropagation()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setOver(false)
        if (busy) return
        const raw =
          e.dataTransfer.getData('application/x-footmanager-team') || e.dataTransfer.getData('text/plain')
        const id = Number(raw)
        if (!Number.isFinite(id) || !id) return
        onDropTeam(id)
      }}
      className={`rounded-2xl border-2 border-dashed px-3 py-3 text-center transition-colors ${joined}`}
    >
      {team ? (
        <div className="flex items-center justify-center gap-2">
          <TeamAvatar
            team={team}
            className="size-7"
            onClick={team?.id != null ? (e) => { e?.stopPropagation?.(); openTeam(team) } : undefined}
          />
          {team?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(team) }} className="min-w-0 truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{team.name}</button> : <span className="min-w-0 truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">{team.name}</span>}
          <button
            type="button"
            title={t('committee.detail.clearSlot')}
            className="grid size-6 shrink-0 place-items-center rounded-full text-[#65706A] transition-colors hover:bg-white hover:text-[#D92D20] disabled:opacity-40"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">{emptyText}</span>
      )}
      {error && <div className="mt-1.5 text-center text-[10px] font-bold leading-tight text-[#D92D20]">{error}</div>}
    </div>
  )
}
