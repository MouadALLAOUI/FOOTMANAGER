import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  MapPin,
  Network,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { TeamAvatar } from '../shared'

export default function KnockoutBracketSection({ rounds, onOpenMatch, championTeam }) {
  const { t } = useTranslation()
  const [activeStageIndex, setActiveStageIndex] = useState(0)

  if (!rounds || rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]">
          <Network className="size-6" />
        </span>
        <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">
          لم يتم إنشاء السلم الإقصائي لهذه البطولة بعد
        </p>
      </div>
    )
  }

  // Find final round to extract potential champion if not passed explicitly
  const finalRound = rounds.find((r) => r.stage === 'final')
  const finalFixture = finalRound?.fixtures?.[0]
  const finalWinnerId = finalFixture?.winner_team_id
  const finalChampion =
    championTeam ||
    (finalWinnerId
      ? finalFixture?.home_team?.id === finalWinnerId
        ? finalFixture.home_team
        : finalFixture?.away_team?.id === finalWinnerId
        ? finalFixture.away_team
        : null
      : null)

  return (
    <div className="space-y-6" dir="rtl">
      {/* Champion Spotlight (If official winner exists) */}
      {finalChampion && finalFixture?.status === 'finished' && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-amber-100/50 dark:from-[#2A2312] dark:via-[#1B201D] dark:to-[#181C19] p-6 shadow-sm">
          <div className="absolute -start-10 -top-10 size-40 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-start">
              <div className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-400/40">
                <Trophy className="size-8" />
                <Sparkles className="absolute -top-1 -end-1 size-4 text-amber-500 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-black text-amber-700 dark:text-amber-400">
                  <Crown className="size-3.5" />
                  بطل المسابقة الرسمي
                </span>
                <h3 className="mt-1 text-xl font-black text-[#111313] dark:text-[#F5F7F2]">
                  {finalChampion.name}
                </h3>
                <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                  توج باللقب بعد فوزه في المباراة النهائية
                </p>
              </div>
            </div>

            <Link
              to={`/teams/${finalChampion.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition"
            >
              عرض ملف البطل
              <ChevronLeft className="size-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Mobile Stage Selector Quick Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none md:hidden">
        {rounds.map((round, idx) => (
          <button
            key={round.round_id}
            type="button"
            onClick={() => setActiveStageIndex(idx)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeStageIndex === idx
                ? 'bg-[#179955] text-white shadow-2xs'
                : 'border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3]'
            }`}
          >
            {round.name}
          </button>
        ))}
      </div>

      {/* Main Bracket Canvas (Horizontal scrollable tree) */}
      <div className="relative overflow-x-auto rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#141815] p-4 sm:p-6 pb-8">
        <div className="flex min-w-max items-stretch gap-8 sm:gap-12">
          {rounds.map((round, rIdx) => {
            const isRoundActiveOnMobile = activeStageIndex === rIdx
            const isFinalRound = round.stage === 'final'

            return (
              <div
                key={round.round_id}
                className={`flex w-72 sm:w-80 flex-col justify-around gap-6 transition ${
                  // On mobile, optionally highlight or show active round
                  ''
                }`}
              >
                {/* Round Header */}
                <div className="text-center pb-2">
                  <span
                    className={`inline-block rounded-xl px-3.5 py-1 text-xs font-black ${
                      isFinalRound
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/30'
                        : 'bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#111313] dark:text-[#F5F7F2]'
                    }`}
                  >
                    {round.name}
                  </span>
                  <p className="mt-1 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                    {round.fixtures?.length || 0} {round.fixtures?.length === 1 ? 'مباراة' : 'مباريات'}
                  </p>
                </div>

                {/* Round Fixtures */}
                <div className="flex flex-1 flex-col justify-around gap-6">
                  {(round.fixtures || []).map((fixture) => {
                    const isPlayed = fixture.status === 'finished'
                    const winnerId = fixture.winner_team_id
                    const homeId = fixture.home_team?.id ?? fixture.home_team_id
                    const awayId = fixture.away_team?.id ?? fixture.away_team_id

                    const isHomeWinner = winnerId && homeId && winnerId === homeId
                    const isAwayWinner = winnerId && awayId && winnerId === awayId
                    const hasPenalties =
                      fixture.home_penalties !== null &&
                      fixture.away_penalties !== null &&
                      (fixture.home_penalties > 0 || fixture.away_penalties > 0)

                    const canOpenMatch = Boolean(onOpenMatch) && Boolean(fixture.match_id)

                    return (
                      <div
                        key={fixture.id}
                        onClick={() => canOpenMatch && onOpenMatch(fixture)}
                        className={`group relative rounded-2xl border transition ${
                          canOpenMatch ? 'cursor-pointer hover:border-[#179955] dark:hover:border-[#42D889]' : ''
                        } ${
                          isFinalRound
                            ? 'border-amber-300 dark:border-amber-500/40 bg-white dark:bg-[#1B201D] shadow-sm'
                            : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs'
                        }`}
                      >
                        {/* Match Status / Date Header */}
                        <div className="flex items-center justify-between border-b border-[#E1E5DF]/60 dark:border-[#303832]/60 px-3.5 py-1.5 text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                          <span>
                            {isPlayed ? (
                              <span className="font-bold text-[#179955] dark:text-[#42D889]">انتهت</span>
                            ) : fixture.scheduled_at ? (
                              new Date(fixture.scheduled_at).toLocaleDateString('ar-MA', {
                                month: 'short',
                                day: 'numeric',
                              })
                            ) : (
                              'مجدولة'
                            )}
                          </span>

                          {hasPenalties && (
                            <span className="rounded bg-amber-500/10 px-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              ركلات ترجيح
                            </span>
                          )}

                          {fixture.leg && fixture.leg > 1 && (
                            <span className="rounded bg-sky-500/10 px-1 text-[9px] font-bold text-sky-600">
                              الإياب
                            </span>
                          )}
                        </div>

                        {/* Teams and Scores */}
                        <div className="p-3 space-y-2">
                          {/* Home Team Row */}
                          <div
                            className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition ${
                              isHomeWinner
                                ? 'bg-[#179955]/10 dark:bg-[#42D889]/15 font-bold text-[#111313] dark:text-[#F5F7F2]'
                                : 'text-[#65706A] dark:text-[#B2B9B3]'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {homeId ? (
                                <Link
                                  to={`/teams/${homeId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="group/t flex items-center gap-2 hover:opacity-80 transition-opacity"
                                >
                                  <TeamAvatar team={fixture.home_team} className="size-6 shrink-0" />
                                  <span className="truncate text-xs group-hover/t:underline">
                                    {fixture.home_team?.name || 'في انتظار المتأهل'}
                                  </span>
                                </Link>
                              ) : (
                                <>
                                  <TeamAvatar team={fixture.home_team} className="size-6 shrink-0" />
                                  <span className="truncate text-xs">
                                    {fixture.home_team?.name || 'في انتظار المتأهل'}
                                  </span>
                                </>
                              )}
                              {isHomeWinner && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {hasPenalties && (
                                <span className="text-[10px] text-[#65706A]">
                                  ({fixture.home_penalties})
                                </span>
                              )}
                              <span className="font-mono text-sm font-black tabular-nums">
                                {isPlayed ? fixture.home_score ?? 0 : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Away Team Row */}
                          <div
                            className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition ${
                              isAwayWinner
                                ? 'bg-[#179955]/10 dark:bg-[#42D889]/15 font-bold text-[#111313] dark:text-[#F5F7F2]'
                                : 'text-[#65706A] dark:text-[#B2B9B3]'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {awayId ? (
                                <Link
                                  to={`/teams/${awayId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="group/t flex items-center gap-2 hover:opacity-80 transition-opacity"
                                >
                                  <TeamAvatar team={fixture.away_team} className="size-6 shrink-0" />
                                  <span className="truncate text-xs group-hover/t:underline">
                                    {fixture.away_team?.name || 'في انتظار المتأهل'}
                                  </span>
                                </Link>
                              ) : (
                                <>
                                  <TeamAvatar team={fixture.away_team} className="size-6 shrink-0" />
                                  <span className="truncate text-xs">
                                    {fixture.away_team?.name || 'في انتظار المتأهل'}
                                  </span>
                                </>
                              )}
                              {isAwayWinner && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {hasPenalties && (
                                <span className="text-[10px] text-[#65706A]">
                                  ({fixture.away_penalties})
                                </span>
                              )}
                              <span className="font-mono text-sm font-black tabular-nums">
                                {isPlayed ? fixture.away_score ?? 0 : '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Match details click hint */}
                        {canOpenMatch && (
                          <div className="border-t border-[#E1E5DF]/40 dark:border-[#303832]/40 px-3 py-1 text-center text-[10px] text-[#179955] dark:text-[#42D889] opacity-0 group-hover:opacity-100 transition-opacity">
                            انقر لعرض تفاصيل وأحداث المباراة
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
