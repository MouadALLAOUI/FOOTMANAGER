import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  MapPin,
  Network,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
  X,
  XCircle,
} from 'lucide-react'
import { TeamAvatar } from '../shared'
import { stageLabel } from '../../../domains/committee/lib/stages'

export default function KnockoutBracketSection({
  rounds,
  onOpenMatch,
  championTeam,
  highlightTeamId,
  onClearHighlight,
}) {
  const { t } = useTranslation()
  const [activeStageIndex, setActiveStageIndex] = useState(0)

  // Empty state if no rounds
  if (!rounds || rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]">
          <Network className="size-6" />
        </span>
        <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">
          لم يتم إنشاء شجرة الإقصائيات لهذه البطولة بعد
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

  // Highlighted team analytics
  const highlightInfo = useMemo(() => {
    if (!highlightTeamId) return null

    let teamName = ''
    let teamLogo = null
    let isChampion = false
    let isEliminated = false
    let eliminatedRoundName = ''
    let nextOpponent = null
    let nextStageName = ''
    const participatingMatches = []

    rounds.forEach((round) => {
      ;(round.fixtures || []).forEach((f) => {
        const homeId = f.home_team?.id ?? f.home_team_id
        const awayId = f.away_team?.id ?? f.away_team_id
        const isHome = homeId === highlightTeamId
        const isAway = awayId === highlightTeamId

        if (isHome || isAway) {
          participatingMatches.push(f.id)
          const currentTeam = isHome ? f.home_team : f.away_team
          const opponent = isHome ? f.away_team : f.home_team

          if (currentTeam?.name) teamName = currentTeam.name
          if (currentTeam?.logo_url) teamLogo = currentTeam.logo_url

          if (f.status === 'finished') {
            if (f.winner_team_id === highlightTeamId) {
              if (round.stage === 'final') {
                isChampion = true
              }
            } else if (f.winner_team_id) {
              isEliminated = true
              eliminatedRoundName = stageLabel(t, round.stage, round.name)
            }
          } else {
            // Next scheduled / upcoming match
            if (!nextOpponent && opponent) {
              nextOpponent = opponent
              nextStageName = stageLabel(t, round.stage, round.name)
            }
          }
        }
      })
    })

    return {
      teamId: highlightTeamId,
      teamName: teamName || `الفريق #${highlightTeamId}`,
      teamLogo,
      isChampion,
      isEliminated,
      eliminatedRoundName,
      nextOpponent,
      nextStageName,
      matchIds: new Set(participatingMatches),
    }
  }, [rounds, highlightTeamId, t])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Section Title & Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E5DF] dark:border-[#303832] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]">
            <Network className="size-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
              شجرة الإقصائيات
            </h2>
            <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
              مخطط الأدوار الإقصائية المباشر ومسارات التأهل وصولاً إلى النهائي
            </p>
          </div>
        </div>

        {/* Clear Highlight Button */}
        {highlightInfo && (
          <button
            type="button"
            onClick={onClearHighlight}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-1.5 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hover:text-[#179955] hover:border-[#179955] transition"
          >
            <RotateCcw className="size-3.5" />
            <span>عرض الشجرة كاملة (إلغاء التمييز)</span>
          </button>
        )}
      </div>

      {/* Team Path Highlight Spotlight Banner (Mandatory Requirement) */}
      {highlightInfo && (
        <div className="relative overflow-hidden rounded-2xl border border-[#179955]/40 dark:border-[#42D889]/30 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30 dark:from-[#15231B] dark:via-[#1B201D] dark:to-[#121A15] p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamAvatar team={highlightInfo} className="size-10 shrink-0 ring-2 ring-[#179955]/40" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                    مسار الفريق المميّز:
                  </span>
                  <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                    {highlightInfo.teamName}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {highlightInfo.isChampion ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-400">
                      <Crown className="size-3" />
                      بطل المسابقة الرسمي 🏆
                    </span>
                  ) : highlightInfo.isEliminated ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                      <XCircle className="size-3" />
                      أُقصي من دور {highlightInfo.eliminatedRoundName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      مستمر في المنافسة ✓
                    </span>
                  )}

                  {highlightInfo.nextOpponent && (
                    <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                      • المنافس القادم: <b className="text-[#111313] dark:text-[#F5F7F2]">{highlightInfo.nextOpponent.name}</b> في {highlightInfo.nextStageName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              to={`/teams/${highlightInfo.teamId}`}
              className="inline-flex items-center gap-1.5 self-end sm:self-center text-xs font-bold text-[#179955] dark:text-[#42D889] hover:underline"
            >
              <span>فتح ملف الفريق ورحلته</span>
              <ChevronLeft className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Champion Spotlight Card (If official winner exists) */}
      {finalChampion && finalFixture?.status === 'finished' && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-amber-100/50 dark:from-[#2A2312] dark:via-[#1B201D] dark:to-[#181C19] p-5 sm:p-6 shadow-sm">
          <div className="absolute -start-10 -top-10 size-40 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-start">
              <div className="relative grid size-14 sm:size-16 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-400/40">
                <Trophy className="size-7 sm:size-8" />
                <Sparkles className="absolute -top-1 -end-1 size-4 text-amber-500 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-black text-amber-700 dark:text-amber-400">
                  <Crown className="size-3.5" />
                  بطل المسابقة الرسمي
                </span>
                <h3 className="mt-1 text-lg sm:text-xl font-black text-[#111313] dark:text-[#F5F7F2]">
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

      {/* =========================================================================
          MOBILE VIEW: Adaptive Round Navigation & Stacked Match Cards
          (Explicitly does NOT shrink desktop tree; provides dedicated mobile UX)
         ========================================================================= */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Stage Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {rounds.map((round, idx) => {
            const isSelected = activeStageIndex === idx
            return (
              <button
                key={round.round_id}
                type="button"
                onClick={() => setActiveStageIndex(idx)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  isSelected
                    ? 'bg-[#179955] text-white shadow-2xs'
                    : 'border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3]'
                }`}
              >
                {stageLabel(t, round.stage, round.name)}
                <span className="ms-1.5 text-[10px] opacity-80">
                  ({round.fixtures?.length || 0})
                </span>
              </button>
            )
          })}
        </div>

        {/* Selected Round Matches List for Mobile */}
        {(() => {
          const currentRound = rounds[activeStageIndex] || rounds[0]
          if (!currentRound) return null

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                  مباريات {stageLabel(t, currentRound.stage, currentRound.name)}:
                </span>
                <span className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                  {currentRound.fixtures?.length || 0} مواجهات
                </span>
              </div>

              <div className="space-y-3">
                {(currentRound.fixtures || []).map((fixture, fIdx) => (
                  <BracketMatchCard
                    key={fixture.id}
                    fixture={fixture}
                    round={currentRound}
                    fIdx={fIdx}
                    t={t}
                    onOpenMatch={onOpenMatch}
                    highlightInfo={highlightInfo}
                  />
                ))}
              </div>

              {/* Prev / Next Round Pagination */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={activeStageIndex <= 0}
                  onClick={() => setActiveStageIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#65706A] disabled:opacity-30 disabled:pointer-events-none hover:text-[#179955]"
                >
                  <ChevronRight className="size-4" />
                  <span>الدور السابق</span>
                </button>

                <span className="text-xs font-bold text-[#65706A]">
                  {activeStageIndex + 1} من {rounds.length}
                </span>

                <button
                  type="button"
                  disabled={activeStageIndex >= rounds.length - 1}
                  onClick={() => setActiveStageIndex((prev) => Math.min(rounds.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#65706A] disabled:opacity-30 disabled:pointer-events-none hover:text-[#179955]"
                >
                  <span>الدور التالي</span>
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* =========================================================================
          DESKTOP VIEW: Full Horizontal Knockout Tree with Bracket Connector Lines
         ========================================================================= */}
      <div className="hidden md:block relative overflow-x-auto rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#141815] p-6 pb-8 shadow-2xs">
        <div className="flex min-w-max items-stretch gap-0">
          {rounds.map((round, rIdx) => {
            const isFinalRound = round.stage === 'final'
            const nextRound = rounds[rIdx + 1]
            const hasNextRound = Boolean(nextRound)

            return (
              <div key={round.round_id} className="flex items-stretch">
                {/* Round Column */}
                <div className="flex w-72 lg:w-80 flex-col justify-between">
                  {/* Round Header */}
                  <div className="text-center pb-5">
                    <span
                      className={`inline-block rounded-xl px-4 py-1 text-xs font-black ${
                        isFinalRound
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-400/30'
                          : 'bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#111313] dark:text-[#F5F7F2]'
                      }`}
                    >
                      {stageLabel(t, round.stage, round.name)}
                    </span>
                    <p className="mt-1 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      {round.fixtures?.length || 0} {round.fixtures?.length === 1 ? 'مباراة' : 'مباريات'}
                    </p>
                  </div>

                  {/* Matches Column */}
                  <div className="flex flex-1 flex-col justify-around gap-6">
                    {(round.fixtures || []).map((fixture, fIdx) => (
                      <BracketMatchCard
                        key={fixture.id}
                        fixture={fixture}
                        round={round}
                        fIdx={fIdx}
                        t={t}
                        onOpenMatch={onOpenMatch}
                        highlightInfo={highlightInfo}
                      />
                    ))}
                  </div>
                </div>

                {/* SVG Connector Lines Column Between Current Round and Next Round */}
                {hasNextRound && (
                  <div className="w-10 lg:w-14 shrink-0 flex flex-col justify-around pt-12">
                    <BracketConnectors
                      currentCount={round.fixtures?.length || 1}
                      nextCount={nextRound.fixtures?.length || 1}
                      highlightInfo={highlightInfo}
                      currentFixtures={round.fixtures || []}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Visual SVG Connector Lines between consecutive rounds
 * In RTL layout: Flow moves from Right (Round N) to Left (Round N+1)
 */
function BracketConnectors({ currentCount, nextCount, highlightInfo, currentFixtures }) {
  // If 2 feeder matches connect to 1 target match (Standard binary tree fold)
  const pairCount = Math.max(1, Math.floor(currentCount / 2))

  return (
    <div className="h-full w-full flex flex-col justify-around py-4">
      {Array.from({ length: pairCount }).map((_, pIdx) => {
        const topFixture = currentFixtures[pIdx * 2]
        const btmFixture = currentFixtures[pIdx * 2 + 1]

        const isTopHighlighted = highlightInfo?.matchIds?.has(topFixture?.id)
        const isBtmHighlighted = highlightInfo?.matchIds?.has(btmFixture?.id)
        const isAnyHighlighted = Boolean(highlightInfo && (isTopHighlighted || isBtmHighlighted))

        return (
          <div key={pIdx} className="h-36 lg:h-44 w-full relative">
            <svg
              className="size-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              fill="none"
            >
              {/* Default Bracket Fork (Right to Left in RTL) */}
              {/* Top branch: from (100, 25) to (50, 25) to (50, 50) */}
              <path
                d="M 100 25 L 50 25 L 50 50"
                stroke={isTopHighlighted ? '#179955' : 'currentColor'}
                strokeWidth={isTopHighlighted ? 3 : 1.5}
                className={
                  isTopHighlighted
                    ? 'text-[#179955] dark:text-[#42D889] filter drop-shadow'
                    : isAnyHighlighted
                    ? 'text-gray-300 dark:text-gray-700 opacity-40'
                    : 'text-[#CBD5E1] dark:text-[#334155]'
                }
              />
              {/* Bottom branch: from (100, 75) to (50, 75) to (50, 50) */}
              <path
                d="M 100 75 L 50 75 L 50 50"
                stroke={isBtmHighlighted ? '#179955' : 'currentColor'}
                strokeWidth={isBtmHighlighted ? 3 : 1.5}
                className={
                  isBtmHighlighted
                    ? 'text-[#179955] dark:text-[#42D889] filter drop-shadow'
                    : isAnyHighlighted
                    ? 'text-gray-300 dark:text-gray-700 opacity-40'
                    : 'text-[#CBD5E1] dark:text-[#334155]'
                }
              />
              {/* Middle Stem: from (50, 50) to (0, 50) */}
              <path
                d="M 50 50 L 0 50"
                stroke={isAnyHighlighted ? '#179955' : 'currentColor'}
                strokeWidth={isAnyHighlighted ? 3 : 1.5}
                className={
                  isAnyHighlighted
                    ? 'text-[#179955] dark:text-[#42D889] filter drop-shadow'
                    : 'text-[#CBD5E1] dark:text-[#334155]'
                }
              />
            </svg>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Atomic Bracket Match Card Component
 * Fully styled, responsive, click-to-open, and supports Team Path Highlighting
 */
function BracketMatchCard({ fixture, round, fIdx, t, onOpenMatch, highlightInfo }) {
  const isFinalRound = round.stage === 'final'
  const stagePrefix =
    round.stage === 'quarterfinal'
      ? 'QF'
      : round.stage === 'semifinal'
      ? 'SF'
      : round.stage === 'final'
      ? 'FINAL'
      : 'M'
  const matchTag = stagePrefix === 'FINAL' ? 'النهائي' : `${stagePrefix}${fIdx + 1}`
  const isPlayed = fixture.status === 'finished'
  const winnerId = fixture.winner_team_id
  const homeId = fixture.home_team?.id ?? fixture.home_team_id
  const awayId = fixture.away_team?.id ?? fixture.away_team_id

  const isHomeWinner = Boolean(winnerId && homeId && winnerId === homeId)
  const isAwayWinner = Boolean(winnerId && awayId && winnerId === awayId)
  const hasPenalties =
    fixture.home_penalties !== null &&
    fixture.away_penalties !== null &&
    (fixture.home_penalties > 0 || fixture.away_penalties > 0)

  const canOpenMatch = Boolean(onOpenMatch) && Boolean(fixture.match_id)

  // Path Highlighting calculation
  const hasHighlight = Boolean(highlightInfo)
  const isMatchHighlighted = Boolean(highlightInfo?.matchIds?.has(fixture.id))
  const isHomeHighlighted = Boolean(highlightInfo && homeId === highlightInfo.teamId)
  const isAwayHighlighted = Boolean(highlightInfo && awayId === highlightInfo.teamId)

  return (
    <div
      onClick={() => canOpenMatch && onOpenMatch(fixture)}
      className={`group relative rounded-2xl border transition-all ${
        canOpenMatch ? 'cursor-pointer hover:border-[#179955] dark:hover:border-[#42D889]' : ''
      } ${
        isMatchHighlighted
          ? 'border-[#179955] dark:border-[#42D889] bg-white dark:bg-[#1B201D] shadow-md ring-2 ring-[#179955]/30'
          : hasHighlight
          ? 'opacity-40 grayscale-20 border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:opacity-100 hover:grayscale-0'
          : isFinalRound
          ? 'border-amber-300 dark:border-amber-500/40 bg-white dark:bg-[#1B201D] shadow-2xs'
          : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs'
      }`}
    >
      {/* Match Header (Tag, Status, Date) */}
      <div className="flex items-center justify-between border-b border-[#E1E5DF]/60 dark:border-[#303832]/60 px-3.5 py-1.5 text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black font-mono px-1.5 py-0.2 rounded ${
              isMatchHighlighted
                ? 'bg-[#179955] text-white'
                : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]'
            }`}
          >
            {matchTag}
          </span>
          {isMatchHighlighted && (
            <span className="text-[#179955] dark:text-[#42D889] font-bold">
              • مسار فريقك
            </span>
          )}
        </div>

        <span>
          {isPlayed ? (
            <span className="font-bold text-[#179955] dark:text-[#42D889]">انتهت</span>
          ) : fixture.status === 'live' || fixture.status === 'in_progress' ? (
            <span className="font-bold text-amber-600 dark:text-amber-400 animate-pulse">جارية الآن</span>
          ) : fixture.status === 'pending_approval' ? (
            <span className="font-bold text-purple-600 dark:text-purple-400">بانتظار اعتماد النتيجة</span>
          ) : !homeId && !awayId ? (
            <span className="text-[#65706A]">لم تحدد المواجهة بعد</span>
          ) : !homeId || !awayId ? (
            <span className="text-[#65706A]">بانتظار المتأهل</span>
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
      </div>

      {/* Teams and Scores Box */}
      <div className="p-3 space-y-2">
        {/* Home Team Row */}
        <div
          className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition ${
            isHomeWinner
              ? 'bg-[#179955]/10 dark:bg-[#42D889]/15 font-bold text-[#111313] dark:text-[#F5F7F2]'
              : isHomeHighlighted
              ? 'bg-emerald-50 dark:bg-emerald-950/30 font-bold'
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
                <span className="truncate text-xs font-black group-hover/t:underline text-[#111313] dark:text-[#F5F7F2]">
                  {fixture.home_team?.name || 'في انتظار المتأهل'}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <TeamAvatar team={fixture.home_team} className="size-6 shrink-0" />
                <span className="truncate text-xs text-[#65706A]">
                  {fixture.home_team?.name || 'في انتظار المتأهل'}
                </span>
              </div>
            )}
            {isHomeWinner && <Crown className="size-3.5 shrink-0 text-amber-500" />}
            {isHomeHighlighted && (
              <span className="rounded bg-[#179955] px-1 py-0.2 text-[9px] font-bold text-white">
                فريقك
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasPenalties && (
              <span className="text-[10px] text-[#65706A]">
                ({fixture.home_penalties})
              </span>
            )}
            <span className="font-mono text-sm font-black tabular-nums text-[#111313] dark:text-[#F5F7F2]">
              {isPlayed ? fixture.home_score ?? 0 : '-'}
            </span>
          </div>
        </div>

        {/* Away Team Row */}
        <div
          className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition ${
            isAwayWinner
              ? 'bg-[#179955]/10 dark:bg-[#42D889]/15 font-bold text-[#111313] dark:text-[#F5F7F2]'
              : isAwayHighlighted
              ? 'bg-emerald-50 dark:bg-emerald-950/30 font-bold'
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
                <span className="truncate text-xs font-black group-hover/t:underline text-[#111313] dark:text-[#F5F7F2]">
                  {fixture.away_team?.name || 'في انتظار المتأهل'}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <TeamAvatar team={fixture.away_team} className="size-6 shrink-0" />
                <span className="truncate text-xs text-[#65706A]">
                  {fixture.away_team?.name || 'في انتظار المتأهل'}
                </span>
              </div>
            )}
            {isAwayWinner && <Crown className="size-3.5 shrink-0 text-amber-500" />}
            {isAwayHighlighted && (
              <span className="rounded bg-[#179955] px-1 py-0.2 text-[9px] font-bold text-white">
                فريقك
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasPenalties && (
              <span className="text-[10px] text-[#65706A]">
                ({fixture.away_penalties})
              </span>
            )}
            <span className="font-mono text-sm font-black tabular-nums text-[#111313] dark:text-[#F5F7F2]">
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
}
