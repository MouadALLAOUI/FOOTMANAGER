import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Crown,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  Network,
  Share2,
  Sparkles,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Skeleton } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../tournaments/shared'
import JourneyShareModal from './JourneyShareModal'

export default function TeamTournamentJourney({ team, onOpenMatch }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)

  const journeyUrl = selectedTournamentId
    ? `/v1/teams/${team?.id}/tournaments/${selectedTournamentId}/journey`
    : `/v1/teams/${team?.id}/tournaments/journey`

  const { data, loading, refetch } = useApi(
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

  if (loading) {
    return (
      <div className="space-y-4 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-6 shadow-2xs">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  // Clean empty state when team has no tournament history
  if (!data?.has_tournaments || tournaments.length === 0) {
    return (
      <section className="space-y-4 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 sm:p-6 shadow-2xs" dir="rtl">
        <div className="flex items-center gap-3 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 pb-4">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]">
            <Trophy className="size-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
              رحلة الفريق في البطولة
            </h2>
            <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
              تتبع المسار التنافسي المباشر، نتائج دور المجموعات، ومواجهات خروج المغلوب
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/40 py-10 px-4 text-center">
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#111313] dark:bg-[#D0FF38] px-4 py-2 text-xs font-black text-white dark:text-[#111313] hover:opacity-90 transition"
          >
            <span>استكشاف البطولات المتاحة</span>
            <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
        <div className="flex items-center gap-3">
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
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
                رحلة الفريق في البطولة
              </h2>
              {summary?.is_champion && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-600 dark:text-amber-400">
                  <Crown className="size-3.5" />
                  البطل المتوج
                </span>
              )}
            </div>
            <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
              تتبع المسار التنافسي المباشر، نتائج الأدوار، والمواجهات الإقصائية
            </p>
          </div>
        </div>

        {/* Header Controls: Tournament Switcher & Actions */}
        <div className="flex items-center gap-2">
          {tournaments.length > 1 && (
            <div className="relative">
              <select
                value={selectedTour?.id || ''}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-2 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hover:text-[#179955] hover:border-[#179955] transition"
            >
              <Network className="size-4 text-[#179955]" />
              <span>عرض شجرة الإقصائيات</span>
            </Link>
          )}
        </div>
      </div>

      {/* Multiple Tournaments Quick Switcher Pills */}
      {tournaments.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] shrink-0">
            البطولات المشارك بها:
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

      {/* Champion Banner (Only if team won the tournament and confirmed) */}
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

      {/* Summary Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4">
          <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">البطولة</span>
          <p className="mt-1 truncate text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            {selectedTour?.name || '-'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4">
          <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">المرحلة الحالية</span>
          <p className="mt-1 truncate text-sm font-black text-[#179955] dark:text-[#42D889]">
            {summary?.current_stage_label || '-'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4">
          <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">المباريات الملعوبة</span>
          <p className="mt-1 text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            {summary?.total_matches || 0} مباراة
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4">
          <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">الانتصارات</span>
          <p className="mt-1 text-sm font-black text-[#179955] dark:text-[#42D889]">
            {summary?.total_wins || 0} انتصار
          </p>
        </div>
      </div>

      {/* Group Stage Summary Strip */}
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
              {group.qualified ? `تأهل بالمركز ${group.rank} ✓` : `المركز ${group.rank}`}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-x-reverse divide-[#E1E5DF] dark:divide-[#303832] text-center text-xs">
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">لعب</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">{group.played}</p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">فاز</span>
              <p className="mt-0.5 font-bold font-mono text-[#179955] dark:text-[#42D889]">{group.won}</p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">تعادل</span>
              <p className="mt-0.5 font-bold font-mono text-[#111313] dark:text-[#F5F7F2]">{group.drawn}</p>
            </div>
            <div className="p-3">
              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">خسر</span>
              <p className="mt-0.5 font-bold font-mono text-red-500">{group.lost}</p>
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
                مباريات دور المجموعات ({group.matches.length}):
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
                        {m.opponent && <TeamAvatar team={m.opponent} className="size-7 shrink-0" />}
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

      {/* Knockout Progression Vertical Timeline */}
      {knockout.length > 0 && (
        <div className="rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 sm:p-6 shadow-2xs">
          <div className="mb-6 flex items-center justify-between border-b border-[#E1E5DF] dark:border-[#303832] pb-4">
            <div className="flex items-center gap-2.5">
              <Swords className="size-5 text-[#179955] dark:text-[#42D889]" />
              <div>
                <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  سلسلة المواجهات الإقصائية
                </h3>
                <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                  خط سير الفريق في مباريات خروج المغلوب
                </p>
              </div>
            </div>
          </div>

          <div className="relative space-y-8 pe-4">
            {/* Vertical Connecting Line */}
            <div className="absolute end-4 top-4 bottom-4 w-0.5 bg-[#E1E5DF] dark:bg-[#303832]" />

            {knockout.map((stage, sIdx) => {
              const isCompleted = stage.status === 'completed'
              const isCurrent = stage.status === 'current'
              const isEliminated = stage.status === 'eliminated'
              const isUpcoming = stage.status === 'upcoming'
              const isFinal = stage.stage === 'final'

              return (
                <div key={stage.round_id} className="relative flex items-start gap-4">
                  {/* Timeline Node Badge */}
                  <div
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full font-bold text-xs ring-4 ring-white dark:ring-[#1B201D] ${
                      isCompleted && stage.won
                        ? 'bg-[#179955] text-white'
                        : isEliminated
                        ? 'bg-red-500 text-white'
                        : isCurrent
                        ? 'bg-[#B8F000] text-[#111313] ring-[#179955]/30'
                        : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] border border-[#E1E5DF] dark:border-[#303832]'
                    }`}
                  >
                    {isCompleted && stage.won ? (
                      <CheckCircle2 className="size-4" />
                    ) : isEliminated ? (
                      <XCircle className="size-4" />
                    ) : isCurrent ? (
                      <Flame className="size-4 text-[#111313]" />
                    ) : (
                      sIdx + 1
                    )}
                  </div>

                  {/* Stage Card */}
                  <div className="min-w-0 flex-1 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-4">
                    {/* Stage Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E5DF]/60 dark:border-[#303832]/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                          {stage.round_name}
                        </span>
                        {isFinal && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                            النهائي الكبير 🏆
                          </span>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isCompleted && stage.won
                            ? 'bg-[#179955]/15 text-[#179955] dark:text-[#42D889]'
                            : isEliminated
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : isCurrent
                            ? 'bg-[#B8F000]/25 text-[#111313] dark:text-[#D0FF38] animate-pulse'
                            : 'bg-gray-100 dark:bg-gray-800 text-[#65706A]'
                        }`}
                      >
                        {isCompleted && stage.won
                          ? 'تأهل إلى الدور التالي ✓'
                          : isEliminated
                          ? 'أُقصي من هذا الدور'
                          : isCurrent
                          ? 'المباراة الحالية'
                          : 'في الانتظار'}
                      </span>
                    </div>

                    {/* Opponent Card & Results */}
                    {stage.opponent ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white dark:bg-[#1B201D] p-3 border border-[#E1E5DF] dark:border-[#303832]">
                          {/* Opponent Info */}
                          <div className="flex items-center gap-3">
                            <TeamAvatar team={stage.opponent} className="size-10 shrink-0" />
                            <div>
                              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">الخصم:</span>
                              <Link
                                to={`/teams/${stage.opponent.id}`}
                                className="block text-xs font-black text-[#111313] dark:text-[#F5F7F2] hover:text-[#179955] hover:underline"
                              >
                                {stage.opponent.name}
                              </Link>
                            </div>
                          </div>

                          {/* Aggregate / Leg Results */}
                          {stage.has_multiple_legs && stage.aggregate ? (
                            <div className="flex items-center gap-3 text-center">
                              <div className="rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-1">
                                <span className="text-[9px] text-[#65706A]">المجموع</span>
                                <p className="font-mono text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                                   {stage.aggregate.team_score} - {stage.aggregate.opponent_score}
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* Matches List in this Stage */}
                        <div className="space-y-2">
                          {(stage.matches || []).map((m, mIdx) => {
                            const isFinished = m.status === 'finished' || m.status === 'completed'
                            const canOpen = Boolean(onOpenMatch) && Boolean(m.match_id)

                            return (
                              <div
                                key={m.fixture_id}
                                onClick={() => canOpen && onOpenMatch({ id: m.fixture_id, match_id: m.match_id })}
                                className={`flex items-center justify-between rounded-xl border border-[#E1E5DF]/70 dark:border-[#303832]/70 bg-white dark:bg-[#1B201D] px-3 py-2 text-xs transition ${
                                  canOpen ? 'cursor-pointer hover:border-[#179955]' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-[#F7F8F5] dark:bg-[#252B27] px-1.5 py-0.5 text-[10px] font-bold text-[#65706A]">
                                    {stage.has_multiple_legs
                                      ? m.leg === 1
                                        ? 'مباراة الذهاب'
                                        : 'مباراة الإياب'
                                      : 'مواجهة فاصلة'}
                                  </span>
                                  {m.scheduled_at && (
                                    <span className="text-[10px] text-[#65706A]">
                                      {new Date(m.scheduled_at).toLocaleDateString('ar-MA')}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {isFinished ? (
                                    <div className="flex items-center gap-1.5 font-mono font-black tabular-nums">
                                      <span
                                        className={
                                          m.team_score > m.opponent_score
                                            ? 'text-[#179955] dark:text-[#42D889]'
                                            : ''
                                        }
                                      >
                                        {m.team_score}
                                      </span>
                                      <span className="text-[#65706A]">-</span>
                                      <span
                                        className={
                                          m.opponent_score > m.team_score ? 'text-red-500' : ''
                                        }
                                      >
                                        {m.opponent_score}
                                      </span>
                                      {m.team_penalties !== null && (
                                        <span className="text-[10px] text-[#65706A]">
                                          ({m.team_penalties}-{m.opponent_penalties} ر.ت)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-bold text-[#65706A]">قادمة</span>
                                  )}

                                  {canOpen && (
                                    <ChevronLeft className="size-3.5 text-[#65706A] hover:text-[#179955]" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-[#E1E5DF] dark:border-[#303832] py-4 text-center text-xs text-[#65706A]">
                        في انتظار تحديد المنافس من نتائج الدور السابق
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
