import { useMemo } from 'react'
import {
  CalendarDays,
  Clock,
  MapPin,
  Play,
  ArrowLeftRight,
  Unlink,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Eye,
  Home,
  Loader2,
  Calendar,
  RotateCcw,
  Ban,
  Clock4,
  Link2,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'

const DATE_THEMES = [
  {
    banner: 'bg-sky-50 text-sky-700 border-sky-100',
    number: 'text-sky-900',
    roundPill: 'bg-sky-100/90 text-sky-800',
  },
  {
    banner: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    number: 'text-emerald-900',
    roundPill: 'bg-emerald-100/90 text-emerald-800',
  },
  {
    banner: 'bg-purple-50 text-purple-700 border-purple-100',
    number: 'text-purple-900',
    roundPill: 'bg-purple-100/90 text-purple-800',
  },
  {
    banner: 'bg-amber-50 text-amber-800 border-amber-100',
    number: 'text-amber-900',
    roundPill: 'bg-amber-100/90 text-amber-800',
  },
]

export function parseDateDetails(dateStr) {
  if (!dateStr) return null
  try {
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return null

    const weekday = d.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long' })
    const day = d.getDate()
    const month = d.toLocaleDateString('ar-EG-u-nu-latn', { month: 'long' })
    const year = d.getFullYear()
    const fullDate = `${weekday} ${day} ${month} ${year}`
    const time =
      d.toLocaleTimeString('ar-EG-u-nu-latn', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) || dateStr.slice(11, 16)

    return { weekday, day, month, year, fullDate, time }
  } catch {
    return null
  }
}

export default function TournamentMatchCard({
  fixture,
  index = 0,
  onResult,
  onDetails,
  onReschedule,
  onUnassign,
  onSwapOpponent,
  onPostpone,
  onRescheduleSuggestion,
  onCancel,
  onRestore,
  onDelegatedLink,
  onReviewSubmission,
  isUnassigning = false,
  busy = false,
  locked = false,
  customRoundLabel,
}) {
  const isScheduled = Boolean(fixture.scheduled_at) && fixture.status !== 'waiting_for_booking'
  const isPlayed = fixture.status === 'played' || fixture.match?.status === 'finished'
  const isLive = ['kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties'].includes(fixture.match?.status)
  const isCancelled = fixture.status === 'cancelled' || fixture.match?.status === 'cancelled'
  const isPostponed = fixture.status === 'postponed' || fixture.match?.status === 'postponed'
  const hasScore = isPlayed || isLive || (fixture.match?.home_score !== null && fixture.match?.home_score !== undefined)
  const isBorrowed = Boolean(fixture.match?.notes?.includes('توقيت مستعار'))
  const hasExceptionReason = Boolean(fixture.unscheduled_reason)

  const dateInfo = useMemo(() => parseDateDetails(fixture.scheduled_at), [fixture.scheduled_at])

  // Pick theme color based on matchday or index
  const themeIndex = ((fixture.matchday || index || 0) + (dateInfo?.day || 0)) % DATE_THEMES.length
  const theme = DATE_THEMES[themeIndex] || DATE_THEMES[0]

  // Round label resolution (e.g. "الجولة 1", "المجموعة A - ج 2", "ربع النهائي")
  const roundText = useMemo(() => {
    if (customRoundLabel) return customRoundLabel
    if (fixture.group?.name && fixture.matchday) {
      return `${fixture.group.name} · ج ${fixture.matchday}`
    }
    if (fixture.matchday) {
      return `الجولة ${fixture.matchday}`
    }
    if (fixture.round?.name) {
      return fixture.round.name
    }
    if (fixture.stage_round) {
      return fixture.stage_round
    }
    return 'مباراة'
  }, [customRoundLabel, fixture.group, fixture.matchday, fixture.round, fixture.stage_round])

  const venueName = fixture.stadium?.name || fixture.venue_name || 'ملعب معتمد'

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm transition hover:shadow-md">
      {/* Top Main Section: Left Date Banner + Right Content */}
      <div className="flex items-stretch gap-3 sm:gap-4">
        {/* Left Column: Date Banner (exactly like image 2) */}
        <div
          className={`flex min-w-[76px] sm:min-w-[84px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center ${
            isScheduled && dateInfo ? theme.banner : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}
        >
          {isScheduled && dateInfo ? (
            <>
              <span className="text-[11px] font-bold sm:text-xs">{dateInfo.weekday}</span>
              <span className={`my-1 text-2xl font-black sm:text-3xl leading-none ${theme.number}`}>
                {dateInfo.day}
              </span>
              <span className="text-[11px] font-bold leading-tight sm:text-xs">{dateInfo.month}</span>
              <span className="mt-0.5 text-[10px] font-semibold opacity-75">{dateInfo.year}</span>
            </>
          ) : (
            <>
              <Calendar className="size-5 text-slate-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-500 leading-tight">بانتظار</span>
              <span className="text-[10px] font-bold text-slate-500 leading-tight">الموعد</span>
            </>
          )}
        </div>

        {/* Right / Main Column: Round badge, Borrowed badge, Teams, Scores, Info */}
        <div className="min-w-0 flex-1 flex flex-col justify-between">
          {/* Header Row: Round Badge on start + Badges on end */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-[11px] font-black sm:text-xs ${theme.roundPill}`}
            >
              {roundText}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Borrowed Slot Badge */}
              {isBorrowed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-700">
                  <Sparkles className="size-3 text-purple-500" />
                  <span>توقيت مستعار</span>
                </span>
              )}

              {/* Pending Delegated Submission Badge */}
              {fixture.delegated_submission && !isPlayed && (
                <button
                  type="button"
                  onClick={() => onReviewSubmission && onReviewSubmission(fixture)}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-900 animate-pulse hover:bg-amber-100 transition cursor-pointer"
                  title="نتيجة مرسلة عبر المندوب بانتظار الاعتماد"
                >
                  <AlertCircle className="size-3 text-amber-600" />
                  <span>بانتظار الاعتماد ({fixture.delegated_submission.home_score} - {fixture.delegated_submission.away_score})</span>
                </button>
              )}

              {/* Unassigned Events Badge (أحداث بلا لاعب) */}
              {fixture.has_unassigned_events && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-black text-orange-800"
                  title="هناك أهداف أو أحداث مسجلة دون تعيين اللاعبين المسجلين لها"
                >
                  <AlertCircle className="size-3 text-orange-600" />
                  <span>أحداث بلا لاعب</span>
                </span>
              )}

              {/* Finished Badge */}
              {isPlayed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  <span>انتهت المباراة</span>
                </span>
              )}

              {/* Live Badge */}
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                  <span className="size-1.5 animate-pulse rounded-full bg-rose-600" />
                  <span>مباشر الآن</span>
                </span>
              )}

              {/* Postponed Badge */}
              {isPostponed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                  <Clock4 className="size-3 text-amber-600" />
                  <span>مؤجلة</span>
                </span>
              )}

              {/* Cancelled Badge */}
              {isCancelled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                  <Ban className="size-3 text-slate-400" />
                  <span>ملغاة</span>
                </span>
              )}

              {/* Unscheduled Exception Badge */}
              {hasExceptionReason && !isScheduled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                  <AlertCircle className="size-3 text-rose-500" />
                  <span>{fixture.unscheduled_reason}</span>
                </span>
              )}
            </div>
          </div>

          {/* Teams and Score Row (Centerpiece) */}
          <div className="flex items-center justify-between gap-2 py-1">
            {/* Home Team (Right side in Arabic RTL) */}
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <TeamLogo
                team={fixture.home_team}
                name={fixture.home_team?.name}
                className="size-11 sm:size-12 shrink-0"
                rounded="rounded-2xl"
                fontSize="text-sm font-black"
                ring="ring-1 ring-slate-200/80"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <Home className="size-3 shrink-0 text-slate-600" title="الفريق المضيف" />
                  <span className="truncate text-xs sm:text-sm font-extrabold text-slate-900">
                    {fixture.home_team?.name || 'فريق مضيف'}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Pill in Center */}
            <div className="shrink-0 px-1">
              <div className="rounded-xl bg-slate-900 px-3.5 sm:px-4 py-1.5 text-center text-xs sm:text-sm font-black text-white shadow-xs tracking-wider tabular-nums">
                {hasScore
                  ? `${fixture.match?.home_score ?? 0} - ${fixture.match?.away_score ?? 0}`
                  : '0 - 0'}
              </div>
            </div>

            {/* Away Team (Left side in Arabic RTL) */}
            <div className="flex flex-1 items-center justify-end gap-2 min-w-0 text-end">
              <div className="min-w-0 flex-1">
                <span className="truncate text-xs sm:text-sm font-extrabold text-slate-900 block">
                  {fixture.away_team?.name || 'فريق ضيف'}
                </span>
              </div>
              <TeamLogo
                team={fixture.away_team}
                name={fixture.away_team?.name}
                className="size-11 sm:size-12 shrink-0"
                rounded="rounded-2xl"
                fontSize="text-sm font-black"
                ring="ring-1 ring-slate-200/80"
              />
            </div>
          </div>

          {/* Match Info Row (Time, Date, Venue) */}
          <div className="mt-2.5 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100/80">
            {isScheduled && dateInfo ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1 text-xs sm:text-sm font-black text-slate-900 shadow-2xs">
                  <Clock className="size-3.5 text-emerald-600" />
                  <span className="tabular-nums tracking-wide">{dateInfo.time}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-slate-400" />
                  <span>{dateInfo.fullDate}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-400" />
                  <span className="text-slate-700 font-bold">{venueName}</span>
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                <AlertCircle className="size-3" />
                <span>بانتظار برمجة وتحديد موعد المواجهة</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons Row */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        {/* Review Delegated Submission Button (if pending) */}
        {fixture.delegated_submission && !isPlayed && onReviewSubmission && (
          <Button
            size="sm"
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs"
            onClick={() => onReviewSubmission(fixture)}
            disabled={busy}
          >
            <ShieldAlert className="size-3.5" />
            <span>مراجعة واعتماد نتيجة المندوب</span>
          </Button>
        )}

        {/* Delegated Match Link Button (Organizer -> Referee / Volunteer) */}
        {onDelegatedLink && !isPlayed && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => onDelegatedLink(fixture)}
            disabled={busy || locked}
            title="إنشاء ومشاركة رابط تسجيل المباراة السري مع المندوب أو الحكم"
          >
            <Link2 className="size-3.5 text-emerald-600" />
            <span>رابط تسجيل المباراة</span>
          </Button>
        )}

        {/* Play/Enter Result Button */}
        {onResult && !isPlayed && (
          <Button
            size="sm"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            onClick={() => onResult(fixture)}
            disabled={busy || locked}
          >
            <Play className="size-3 fill-current" />
            <span>تسجيل النتيجة والأحداث</span>
          </Button>
        )}

        {/* View Details / Edit for Played Match */}
        {isPlayed && (
          <>
            {onDetails && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 rounded-xl border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => onDetails(fixture)}
                disabled={busy}
              >
                <Eye className="size-3.5 text-slate-500" />
                <span>عرض التفاصيل</span>
              </Button>
            )}
            {onResult && (
              <Button
                size="sm"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 px-3.5 py-1.5 text-xs font-bold"
                onClick={() => onResult(fixture)}
                disabled={busy || locked}
              >
                <Play className="size-3 text-emerald-600" />
                <span>تعديل النتيجة والأحداث</span>
              </Button>
            )}
          </>
        )}

        {/* Reschedule Button */}
        {onReschedule && !isPlayed && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => onReschedule(fixture)}
            disabled={busy}
          >
            <CalendarDays className="size-3.5 text-slate-500" />
            <span>{isScheduled ? 'تعديل الموعد' : 'تحديد الموعد'}</span>
          </Button>
        )}

        {/* Unassign Booking Button */}
        {onUnassign && isScheduled && !isPlayed && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => onUnassign(fixture.id)}
            disabled={isUnassigning || busy}
          >
            {isUnassigning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Unlink className="size-3.5 text-slate-500" />
            )}
            <span>إلغاء ربط الحجز</span>
          </Button>
        )}

        {/* Swap Opponent Button */}
        {onSwapOpponent && !isPlayed && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => onSwapOpponent(fixture)}
            disabled={busy}
          >
            <ArrowLeftRight className="size-3.5 text-slate-500" />
            <span>تبديل الخصم</span>
          </Button>
        )}

        {/* Postpone Button */}
        {onPostpone && (fixture.status === 'pending' || fixture.status === 'scheduled') && !isPlayed && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-amber-200 bg-amber-50/50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
            onClick={() => onPostpone(fixture)}
            disabled={busy}
          >
            <Clock4 className="size-3.5 text-amber-600" />
            <span>تأجيل</span>
          </Button>
        )}

        {/* Reschedule Postponed Match with Suggestions */}
        {onRescheduleSuggestion && isPostponed && !isPlayed && (
          <Button
            size="sm"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
            onClick={() => onRescheduleSuggestion(fixture)}
            disabled={busy}
          >
            <Sparkles className="size-3.5 text-amber-300" />
            <span>إعادة جدولة</span>
          </Button>
        )}

        {/* Restore Button */}
        {onRestore && (isPostponed || isCancelled) && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => onRestore(fixture)}
            disabled={busy}
          >
            <RotateCcw className="size-3.5 text-slate-500" />
            <span>استعادة</span>
          </Button>
        )}

        {/* Cancel Button */}
        {onCancel && (fixture.status === 'pending' || fixture.status === 'scheduled') && !isPlayed && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 rounded-xl border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
            onClick={() => onCancel(fixture)}
            disabled={busy}
          >
            <Ban className="size-3.5 text-red-500" />
            <span>إلغاء</span>
          </Button>
        )}
      </div>
    </div>
  )
}
