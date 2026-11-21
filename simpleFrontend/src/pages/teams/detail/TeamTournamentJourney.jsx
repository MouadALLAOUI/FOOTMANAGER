import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Layers,
  Network,
  Radio,
  Share2,
  Sparkles,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Skeleton } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'
import JourneyShareModal from './JourneyShareModal'

/**
 * Premium Tournament Journey — Visual Road to the Title
 * "طريق الفريق نحو اللقب"
 * Subtitle: "تابع رحلة الفريق من دور المجموعات إلى النهائي"
 */
export default function TeamTournamentJourney({ team, onOpenMatch }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const scrollContainerRef = useRef(null)
  const [canScrollStart, setCanScrollStart] = useState(false)
  const [canScrollEnd, setCanScrollEnd] = useState(false)

  const journeyUrl = selectedTournamentId
    ? `/v1/teams/${team?.id}/tournaments/${selectedTournamentId}/journey`
    : `/v1/teams/${team?.id}/tournaments/journey`

  const { data, loading } = useApi(
    () => api.get(journeyUrl).then((r) => r.data.data),
    [team?.id, selectedTournamentId],
    { enabled: Boolean(team?.id) },
  )

  const tournaments = data?.tournaments || []
  const selectedTour = data?.selected_tournament
  const group = data?.group_stage
  const knockout = data?.knockout_stages || []
  const summary = data?.summary

  // Set initial selected tournament if available and not yet set
  useEffect(() => {
    if (selectedTour?.id && !selectedTournamentId) {
      setSelectedTournamentId(selectedTour.id)
    }
  }, [selectedTour?.id])

  // Update horizontal scroll indicators
  const updateScrollState = () => {
    const el = scrollContainerRef.current
    if (!el) return
    // In RTL, scrollLeft is 0 or negative depending on browser
    const maxScroll = el.scrollWidth - el.clientWidth
    const current = Math.abs(el.scrollLeft)
    setCanScrollStart(current > 10)
    setCanScrollEnd(current < maxScroll - 10)
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollContainerRef.current
    if (el) {
      el.addEventListener('scroll', updateScrollState, { passive: true })
      window.addEventListener('resize', updateScrollState)
      return () => {
        el.removeEventListener('scroll', updateScrollState)
        window.removeEventListener('resize', updateScrollState)
      }
    }
  }, [knockout, group])

  const scrollByAmount = (offset) => {
    const el = scrollContainerRef.current
    if (el) {
      el.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-6 shadow-2xs">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    )
  }

  // Requirement 10: Clean, dignified empty state when team has no tournament history
  if (!data?.has_tournaments || tournaments.length === 0) {
    return (
      <section className="space-y-4 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 sm:p-6 shadow-2xs" dir="rtl">
        <div className="flex items-center gap-3 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 pb-4">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]">
            <Trophy className="size-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
              طريق الفريق نحو اللقب
            </h2>
            <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
              تابع رحلة الفريق من دور المجموعات إلى النهائي
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/40 py-12 px-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#E1E5DF]/50 dark:bg-[#303832]/60 text-[#65706A] dark:text-[#B2B9B3] mb-3">
            <Trophy className="size-7 opacity-75" />
          </div>
          <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            لم يسجل الفريق في أي بطولة حتى الآن
          </h3>
          <p className="mt-1 max-w-sm text-xs text-[#65706A] dark:text-[#B2B9B3]">
            عند انضمام الفريق ومشاركته في البطولات الرسمية، سيتم هنا عرض ترتيبه في دور المجموعات ومساره خطوة بخطوة في الأدوار الإقصائية.
          </p>
          <Link
            to="/tournaments"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#111313] dark:bg-[#D0FF38] px-4 py-2 text-xs font-black text-white dark:text-[#111313] hover:opacity-90 transition shadow-2xs"
          >
            <span>استكشاف البطولات المتاحة</span>
            <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
          </Link>
        </div>
      </section>
    )
  }

  // Determine stage progression chain for the horizontal journey
  const stagesChain = []

  // Stage 0: Group Stage Node (if tournament has groups)
  if (group) {
    const isCompleted = group.played > 0 && group.qualified
    const isEliminated = group.played > 0 && !group.qualified && selectedTour?.status === 'completed'
    stagesChain.push({
      key: 'group_stage',
      type: 'group',
      title: 'دور المجموعات',
      subtitle: group.group_name,
      status: isCompleted ? 'completed' : isEliminated ? 'eliminated' : 'current',
      won: group.qualified,
      groupData: group,
    })
  }

  // Knockout Stages Nodes (Quarter-finals, Semi-finals, Final)
  // Only display rounds that actually exist in the selected tournament
  let foundElimination = false
  for (const stg of knockout) {
    if (foundElimination) break // Journey stops at the elimination stage! No false future progression

    const isCompleted = stg.status === 'completed'
    const isEliminated = stg.status === 'eliminated'
    const isCurrent = stg.status === 'current'
    const isUpcoming = stg.status === 'upcoming'

    stagesChain.push({
      key: `round_${stg.round_id}`,
      type: 'knockout',
      title: stg.round_name,
      stage: stg.stage,
      status: stg.status,
      won: stg.won,
      isEliminated,
      isCurrent,
      isUpcoming,
      opponent: stg.opponent,
      matches: stg.matches || [],
      aggregate: stg.aggregate,
      hasMultipleLegs: stg.has_multiple_legs,
    })

    if (isEliminated) {
      foundElimination = true
    }
  }

  // Final Endpoint: Trophy / Championship Node
  const finalStage = knockout.find((k) => k.stage === 'final')
  const isChampion = Boolean(summary?.is_champion || (finalStage && finalStage.status === 'completed' && finalStage.won))
  const isFinalistEliminated = Boolean(finalStage && finalStage.status === 'eliminated')

  if (!isFinalistEliminated) {
    stagesChain.push({
      key: 'trophy_endpoint',
      type: 'trophy',
      title: isChampion ? 'البطل المتوج 🏆' : 'كأس البطولة',
      status: isChampion ? 'champion' : foundElimination ? 'locked' : 'upcoming',
      isChampion,
    })
  }

  return (
    <section className="space-y-6" dir="rtl">
      {/* 1. Header with Tournament Identity, Title & Full Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {selectedTour?.logo_url ? (
            <img
              src={selectedTour.logo_url}
              alt={selectedTour.name}
              className="size-12 rounded-2xl object-cover border border-[#E1E5DF] dark:border-[#303832] shrink-0"
            />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]">
              <Trophy className="size-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2] truncate">
                طريق الفريق نحو اللقب
              </h2>
              {summary?.is_champion && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400 shrink-0">
                  <Crown className="size-3.5" />
                  البطل المتوج
                </span>
              )}
            </div>
            <p className="text-xs text-[#65706A] dark:text-[#B2B9B3] truncate">
              تابع رحلة الفريق من دور المجموعات إلى النهائي
            </p>
          </div>
        </div>

        {/* Header Controls: Multi-Tournament Switcher & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {tournaments.length > 1 && (
            <div className="relative">
              <select
                value={selectedTour?.id || ''}
                onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
                className="appearance-none rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] py-2 pe-8 ps-3 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-hidden cursor-pointer"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[#65706A]" />
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="size-4" />
            <span className="hidden sm:inline">مشاركة المسار</span>
          </Button>

          {selectedTour?.slug && (
            <Link
              to={`/tournaments/${selectedTour.slug}?tab=bracket&highlightTeam=${team?.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-2 text-xs font-black text-[#111313] dark:text-[#F5F7F2] hover:text-[#179955] hover:border-[#179955] transition shadow-2xs"
            >
              <Network className="size-4 text-[#179955]" />
              <span>عرض شجرة الإقصائيات كاملة</span>
            </Link>
          )}
        </div>
      </div>

      {/* Multiple Tournaments Quick Switcher Pills */}
      {tournaments.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] shrink-0">
            البطولات المشارك بها ({tournaments.length}):
          </span>
          {tournaments.map((t) => {
            const isSelected = (selectedTour?.id === t.id) || (selectedTournamentId === t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTournamentId(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#179955] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5]'
                }`}
              >
                <Trophy className="size-3.5" />
                <span>{t.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Champion Banner (If team clinched the title) */}
      {summary?.is_champion && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300/60 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 via-white to-amber-100/40 dark:from-[#2B2312] dark:via-[#1B201D] dark:to-[#171B18] p-6 shadow-sm">
          <div className="absolute -top-10 -start-10 size-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-start">
              <div className="relative grid size-16 shrink-0 place-items-center rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-2 ring-amber-400/40">
                <Trophy className="size-8" />
                <Sparkles className="absolute -top-1 -end-1 size-4 text-amber-500 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black text-amber-700 dark:text-amber-400">
                  <Crown className="size-3.5" />
                  بطل بطولة {selectedTour?.name}
                </span>
                <h3 className="mt-1 text-xl font-black text-[#111313] dark:text-[#F5F7F2]">
                  تتويج مستحق بالكأس الغالية 🏆
                </h3>
                <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                  اجتاز الفريق كافة الأدوار وصولاً إلى المباراة النهائية وانتزع اللقب رسمياً
                </p>
              </div>
            </div>

            <Button variant="primary" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              نشر إنجاز التتويج
            </Button>
          </div>
        </div>
      )}

      {/* 2. CENTRAL VISUAL FEATURE: Horizontal Connected Road to Title */}
      <div className="space-y-3 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 sm:p-6 shadow-2xs">
        {/* Section Top Header with Scroll Controls */}
        <div className="flex items-center justify-between border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="size-4.5 text-[#179955] dark:text-[#42D889]" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-[#111313] dark:text-[#F5F7F2]">
              مسار المنافسة والتقدم نحو اللقب
            </h3>
          </div>

          {/* Desktop/Mobile Horizontal Scroll Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByAmount(260)}
              disabled={!canScrollStart}
              className="grid size-7 place-items-center rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] transition disabled:opacity-30 hover:border-[#179955] cursor-pointer"
              title="تمرير لليمين"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(-260)}
              disabled={!canScrollEnd}
              className="grid size-7 place-items-center rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] transition disabled:opacity-30 hover:border-[#179955] cursor-pointer"
              title="تمرير لليسار"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Connected Nodes Track */}
        <div
          ref={scrollContainerRef}
          className="relative overflow-x-auto no-scrollbar scroll-smooth py-3 px-1 snap-x snap-mandatory"
        >
          <div className="flex items-stretch gap-3 sm:gap-4 min-w-max">
            {stagesChain.map((node, idx) => {
              const isLast = idx === stagesChain.length - 1
              const isCompleted = node.status === 'completed' || node.status === 'champion'
              const isCurrent = node.status === 'current'
              const isEliminated = node.status === 'eliminated'

              return (
                <div key={node.key} className="relative flex items-center shrink-0">
                  {/* Stage Visual Card */}
                  <div
                    className={`w-[240px] sm:w-[270px] flex flex-col justify-between rounded-2xl border p-4 transition shadow-2xs snap-start ${
                      isCurrent
                        ? 'border-[#179955] dark:border-[#42D889] bg-[#179955]/5 dark:bg-[#42D889]/10 ring-2 ring-[#179955]/30'
                        : isCompleted
                        ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : isEliminated
                        ? 'border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27]'
                    }`}
                  >
                    {/* Stage Header Badge */}
                    <div className="flex items-center justify-between gap-1.5 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 pb-2 mb-3">
                      <span className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                        {node.title}
                      </span>

                      {/* Status indicator pill */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : isEliminated
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            : isCurrent
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse'
                            : 'bg-gray-100 dark:bg-gray-800 text-[#65706A] dark:text-[#B2B9B3]'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            <span>تأهل الفريق ✓</span>
                          </>
                        ) : isEliminated ? (
                          <>
                            <XCircle className="size-3" />
                            <span>أُقصي من هذا الدور</span>
                          </>
                        ) : isCurrent ? (
                          <>
                            <Flame className="size-3" />
                            <span>المرحلة الحالية</span>
                          </>
                        ) : (
                          <span>في الانتظار</span>
                        )}
                      </span>
                    </div>

                    {/* NODE TYPE 1: GROUP STAGE */}
                    {node.type === 'group' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#1B201D] p-2.5 border border-[#E1E5DF]/80 dark:border-[#303832]/80">
                          <div className="flex items-center gap-2">
                            <TeamLogo team={team} className="size-8 rounded-lg shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                                {team?.name}
                              </p>
                              <span className="text-[10px] text-[#65706A]">
                                {node.groupData.group_name}
                              </span>
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <span className="block text-xs font-black text-[#179955] dark:text-[#42D889]">
                              {node.groupData.qualified ? `المركز ${node.groupData.rank} ✓` : `المركز ${node.groupData.rank}`}
                            </span>
                            <span className="text-[10px] text-[#65706A]">
                              {node.groupData.points} نقطة
                            </span>
                          </div>
                        </div>

                        {/* Group Mini Stats */}
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] bg-[#F7F8F5] dark:bg-[#252B27] rounded-lg p-1.5 border border-[#E1E5DF]/60 dark:border-[#303832]/60">
                          <div>
                            <span className="text-[#65706A] block">لعب</span>
                            <strong className="text-[#111313] dark:text-[#F5F7F2] font-mono">{node.groupData.played}</strong>
                          </div>
                          <div>
                            <span className="text-[#65706A] block">فاز</span>
                            <strong className="text-[#179955] dark:text-[#42D889] font-mono">{node.groupData.won ?? node.groupData.wins ?? 0}</strong>
                          </div>
                          <div>
                            <span className="text-[#65706A] block">تعادل</span>
                            <strong className="text-[#111313] dark:text-[#F5F7F2] font-mono">{node.groupData.drawn ?? node.groupData.draws ?? 0}</strong>
                          </div>
                          <div>
                            <span className="text-[#65706A] block">خسر</span>
                            <strong className="text-red-500 font-mono">{node.groupData.lost ?? node.groupData.losses ?? 0}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NODE TYPE 2: KNOCKOUT MATCH */}
                    {node.type === 'knockout' && (
                      <div className="space-y-3">
                        {/* Opponent Card with original crest and name */}
                        {node.opponent ? (
                          <div className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#1B201D] p-2.5 border border-[#E1E5DF]/80 dark:border-[#303832]/80">
                            {/* Opponent Identity */}
                            <div className="flex items-center gap-2 min-w-0">
                              <TeamLogo team={node.opponent} className="size-8 rounded-lg shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-[#65706A] block">الخصم:</span>
                                <Link
                                  to={`/teams/${node.opponent.id}`}
                                  className="block truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2] hover:text-[#179955] hover:underline"
                                >
                                  {node.opponent.name}
                                </Link>
                              </div>
                            </div>

                            {/* Two-Leg Aggregate or Single-Leg Score */}
                            {node.hasMultipleLegs && node.aggregate ? (
                              <div className="text-center rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] px-2 py-1 shrink-0 border border-[#E1E5DF]/60 dark:border-[#303832]/60">
                                <span className="text-[9px] text-[#65706A] block">المجموع</span>
                                <p className="font-mono text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                                  {node.aggregate.team_score} - {node.aggregate.opponent_score}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#E1E5DF] dark:border-[#303832] p-3 text-center text-xs text-[#65706A]">
                            بانتظار تحديد المنافس
                          </div>
                        )}

                        {/* Matches list for this stage */}
                        <div className="space-y-1.5">
                          {node.matches.map((m) => {
                            const isFinished = m.status === 'finished' || m.status === 'completed'
                            const isLive = m.status === 'live' || m.status === 'in_progress'
                            const canOpen = Boolean(onOpenMatch) && Boolean(m.match_id)
                            const hasScores = m.team_score !== null && m.opponent_score !== null

                            return (
                              <div
                                key={m.fixture_id}
                                onClick={() => canOpen && onOpenMatch({ id: m.fixture_id, match_id: m.match_id })}
                                className={`flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-[#1B201D] px-2.5 py-1.5 text-xs border border-[#E1E5DF]/60 dark:border-[#303832]/60 transition ${
                                  canOpen ? 'cursor-pointer hover:border-[#179955]' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[10px] font-bold text-[#65706A]">
                                    {node.hasMultipleLegs ? `جولة ${m.leg}` : (m.is_home ? 'ذهاب/داخل' : 'خارج')}
                                  </span>
                                  {isLive && (
                                    <span className="flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.2 text-[9px] font-bold text-red-600 animate-pulse">
                                      <Radio className="size-2.5" />
                                      مباشر
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 font-mono font-black">
                                  {isFinished && hasScores ? (
                                    <div className="flex items-center gap-1">
                                      <span className={m.team_score > m.opponent_score ? 'text-[#179955] dark:text-[#42D889]' : ''}>
                                        {m.team_score}
                                      </span>
                                      <span className="text-[#65706A]">-</span>
                                      <span className={m.opponent_score > m.team_score ? 'text-red-500' : ''}>
                                        {m.opponent_score}
                                      </span>
                                      {m.team_penalties !== null && (
                                        <span className="text-[9px] text-[#65706A]">
                                          ({m.team_penalties}-{m.opponent_penalties})
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-[#65706A]">
                                      {m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString('ar-MA') : 'قادمة'}
                                    </span>
                                  )}
                                  {canOpen && <ChevronLeft className="size-3 text-[#65706A]" />}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* NODE TYPE 3: TROPHY / CHAMPION ENDPOINT */}
                    {node.type === 'trophy' && (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div
                          className={`grid size-16 place-items-center rounded-3xl border transition ${
                            isChampion
                              ? 'border-amber-400 bg-amber-400/20 text-amber-500 shadow-lg ring-4 ring-amber-400/20'
                              : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]'
                          }`}
                        >
                          <Trophy className="size-8" />
                        </div>
                        <h4 className="mt-2.5 text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                          {isChampion ? 'حامل اللقب الرسمي' : 'الكأس المنشودة'}
                        </h4>
                        <p className="mt-0.5 text-[10px] text-[#65706A]">
                          {isChampion ? 'انتزع الكأس بجدارة' : 'المحطة النهائية للبطولة'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Connecting Arrow / Line (flows from stage to stage in RTL) */}
                  {!isLast && (
                    <div className="flex items-center px-1.5 sm:px-2 shrink-0">
                      <div
                        className={`h-0.5 w-6 sm:w-8 transition-colors ${
                          isCompleted
                            ? 'bg-[#179955]'
                            : isCurrent
                            ? 'bg-[#B8F000] dark:bg-[#D0FF38]'
                            : 'bg-[#E1E5DF] dark:bg-[#303832]'
                        }`}
                      />
                      <ChevronLeft
                        className={`size-4 -ms-1 transition-colors ${
                          isCompleted
                            ? 'text-[#179955]'
                            : isCurrent
                            ? 'text-[#B8F000] dark:text-[#D0FF38]'
                            : 'text-[#E1E5DF] dark:text-[#303832]'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3. GROUP STAGE SUMMARY CARD WITH ACCURATE OFFICIAL STATS (Section 5) */}
      {group && (
        <div className="overflow-hidden rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-5 py-3">
            <div className="flex items-center gap-2.5">
              <Layers className="size-4 text-[#179955] dark:text-[#42D889]" />
              <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                مرحلة المجموعات — {group.group_name}
              </h3>
            </div>

            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                group.qualified
                  ? 'bg-[#179955]/15 text-[#179955] dark:text-[#42D889]'
                  : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]'
              }`}
            >
              {group.qualified ? `تأهل رسمي بالمركز ${group.rank} ✓` : `المركز ${group.rank}`}
            </span>
          </div>

          {/* Mathematical & Authoritative Group Stats Strip */}
          <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-x-reverse divide-[#E1E5DF] dark:divide-[#303832] text-center text-xs">
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">لعب</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">{group.played}</p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">فاز</span>
              <p className="mt-0.5 font-bold font-mono text-[#179955] dark:text-[#42D889]">
                {group.won ?? group.wins ?? 0}
              </p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">تعادل</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">
                {group.drawn ?? group.draws ?? 0}
              </p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">خسر</span>
              <p className="mt-0.5 font-bold font-mono text-red-500">
                {group.lost ?? group.losses ?? 0}
              </p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">له</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">{group.goals_for}</p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">عليه</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">{group.goals_against}</p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">الفارق</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">
                {group.goal_difference > 0 ? `+${group.goal_difference}` : group.goal_difference}
              </p>
            </div>
            <div className="p-3 bg-[#179955]/5 dark:bg-[#42D889]/10">
              <span className="text-[10px] font-bold text-[#179955] dark:text-[#42D889]">النقاط</span>
              <p className="mt-0.5 font-black font-mono text-sm text-[#179955] dark:text-[#42D889]">
                {group.points}
              </p>
            </div>
          </div>

          {/* Group Stage Matches List */}
          {group.matches?.length > 0 && (
            <div className="border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 p-4 space-y-2 bg-[#F7F8F5]/30 dark:bg-[#252B27]/20">
              <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] block mb-1">
                نتائج مباريات دور المجموعات ({group.matches.length}):
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.matches.map((m) => {
                  const isFinished = m.status === 'finished' || m.status === 'completed'
                  const canOpen = Boolean(onOpenMatch) && Boolean(m.match_id)
                  const hasScores = m.team_score !== null && m.opponent_score !== null
                  const isWin = isFinished && hasScores && m.team_score > m.opponent_score
                  const isLoss = isFinished && hasScores && m.team_score < m.opponent_score

                  return (
                    <div
                      key={m.fixture_id}
                      onClick={() => canOpen && onOpenMatch({ id: m.fixture_id, match_id: m.match_id })}
                      className={`flex items-center justify-between gap-3 rounded-xl border border-[#E1E5DF]/70 dark:border-[#303832]/70 bg-white dark:bg-[#1B201D] px-3.5 py-2.5 text-xs transition ${
                        canOpen ? 'cursor-pointer hover:border-[#179955]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.opponent && <TeamLogo team={m.opponent} className="size-7 rounded-lg shrink-0" />}
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#111313] dark:text-[#F5F7F2]">
                            {m.opponent?.name || 'خصم غير محدد'}
                          </p>
                          <span className="text-[10px] text-[#65706A]">
                            {m.is_home ? 'داخل الديار' : 'خارج الديار'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isFinished && hasScores ? (
                          <div className="flex items-center gap-1.5 font-mono font-black tabular-nums">
                            <span className={isWin ? 'text-[#179955] dark:text-[#42D889]' : isLoss ? 'text-red-500' : ''}>
                              {m.team_score}
                            </span>
                            <span className="text-[#65706A]">-</span>
                            <span className={isLoss ? 'text-red-500' : ''}>{m.opponent_score}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            مجدولة
                          </span>
                        )}
                        {canOpen && <ChevronLeft className="size-3 text-[#65706A]" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      <JourneyShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        journeyData={data}
        team={team}
      />
    </section>
  )
}
