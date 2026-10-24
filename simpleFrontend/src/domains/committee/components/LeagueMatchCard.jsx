import { useState, useMemo } from 'react'
import {
  Clock,
  MapPin,
  MoreVertical,
  Edit3,
  Trophy,
  Link2,
  CalendarDays,
  Share2,
  Info,
  Home,
  CheckCircle2,
  AlertCircle,
  Clock4,
  RotateCcw,
  Sparkles,
  X,
  ChevronLeft,
  Hourglass,
} from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'
import { useToast } from '../../../components/ui/Toast'
import api from '../../../api/client'

// Distinctive Stadium Arena Icon for the far-right panel
function StadiumIcon({ className, color = 'currentColor' }) {
  return (
    <svg className={className} viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="18" cy="12" rx="16" ry="9" stroke={color} strokeWidth="1.8" />
      <ellipse cx="18" cy="12" rx="10" ry="5.5" stroke={color} strokeWidth="1.4" strokeDasharray="2 1.5" />
      <circle cx="18" cy="12" r="2" stroke={color} strokeWidth="1.2" />
      <line x1="2" y1="12" x2="5" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="31" y1="12" x2="34" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="3" x2="18" y2="4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="19.5" x2="18" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function LeagueMatchCard({
  fixture,
  dayConfig,
  onManageMatch,
  onResult,
  onDetails,
  onDelegatedLink,
  onPostpone,
  onRescheduleSuggestion,
  onMoveToOwnSlot,
  onRefresh,
}) {
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  const isScheduled = Boolean(fixture.scheduled_at) && fixture.status !== 'waiting_for_booking'
  const isPlayed = fixture.status === 'played' || fixture.match?.status === 'finished'
  const isLive = ['kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties'].includes(fixture.match?.status)
  const isPostponed = fixture.status === 'postponed' || fixture.match?.status === 'postponed'
  const pendingSubmission = fixture.delegated_submission?.status === 'pending'
  const hasExceptionReason = Boolean(fixture.unscheduled_reason)

  // Extract kickoff time
  const timeStr = useMemo(() => {
    if (!fixture.scheduled_at) return null
    return fixture.scheduled_at.slice(11, 16)
  }, [fixture.scheduled_at])

  const venueName = fixture.stadium?.name || fixture.venue_name || 'ملعب معتمد'
  const roundLabel = fixture.round?.name || (fixture.matchday ? `الأسبوع ${fixture.matchday}` : '')

  const handleShare = async (e) => {
    e?.stopPropagation?.()
    setSharing(true)
    try {
      let publicUrl = fixture.match?.public_url || fixture.public_url
      if (!publicUrl) {
        const tournamentId = fixture.tournament_id || fixture.competition_id
        if (tournamentId) {
          const res = await api.get(`/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/public-link`)
          publicUrl = res.data?.data?.public_url
        }
      }
      if (navigator.share && publicUrl) {
        await navigator.share({
          title: `${fixture.home_team?.name} ضد ${fixture.away_team?.name}`,
          url: publicUrl,
        })
      } else if (publicUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl)
        toast.success('تم نسخ رابط المباراة بنجاح!')
      } else {
        toast.info('رابط المباراة غير متوفر حالياً')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('تعذر مشاركة رابط المباراة')
      }
    } finally {
      setSharing(false)
      setMenuOpen(false)
    }
  }

  return (
    <>
      {/* Horizontal Information-Rich Card (RTL Layout) */}
      <div className="group rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-row items-stretch min-h-[92px]">
        {/* ======================================================== */}
        {/* SECTION 1: FAR RIGHT — MATCH TIME AND VENUE PANEL       */}
        {/* ======================================================== */}
        <div
          className="shrink-0 w-[105px] sm:w-[155px] md:w-[175px] p-2 sm:p-3 flex flex-col justify-center items-center text-center relative border-s-0 border-e border-slate-100"
          style={{ backgroundColor: dayConfig?.cardTint || '#EBF3FF' }}
        >
          {/* Top/Corner Stadium Arena Icon */}
          <div className="flex items-center justify-center mb-1">
            <StadiumIcon className="size-5 sm:size-6" color={dayConfig?.accentColor || '#1769FF'} />
          </div>

          {/* Kickoff Time */}
          {isPlayed ? (
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-base sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
              <span>{fixture.match?.home_score ?? 0}</span>
              <span className="text-slate-400 font-light">-</span>
              <span>{fixture.match?.away_score ?? 0}</span>
            </div>
          ) : timeStr ? (
            <span className="text-base sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
              {timeStr}
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              غير محدد
            </span>
          )}

          {/* Stadium / Venue Name */}
          <div
            className="mt-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold text-slate-700 max-w-full truncate px-0.5"
            title={venueName}
          >
            <MapPin className="size-3 sm:size-3.5 shrink-0" style={{ color: dayConfig?.accentColor || '#1769FF' }} />
            <span className="truncate">{venueName}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTIONS 2, 3, 4: TEAMS & CENTER MATCH INFORMATION       */}
        {/* ======================================================== */}
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2">
          {/* SECTION 2: AWAY TEAM (Right side in RTL, beside time panel) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0">
            <span
              className="flex-1 truncate text-end text-[11px] sm:text-sm font-extrabold text-[#102A43] leading-tight"
              title={fixture.away_team?.name}
            >
              {fixture.away_team?.name || 'فريق غير محدد'}
            </span>
            <div className="shrink-0">
              <TeamLogo
                team={fixture.away_team}
                size="md"
                className="size-8 sm:size-11 rounded-xl border border-slate-200/80 shadow-2xs"
              />
            </div>
          </div>

          {/* SECTION 3: CENTER — MATCH INFO (Week & ضد) */}
          <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-2 text-center">
            {roundLabel ? (
              <span className="rounded-lg bg-slate-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-slate-700 border border-slate-200/60 whitespace-nowrap">
                {roundLabel}
              </span>
            ) : (
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                مباراة
              </span>
            )}
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5">ضد</span>
          </div>

          {/* SECTION 4: HOME TEAM (Left side in RTL, with Home Icon) */}
          <div className="flex items-center justify-start gap-1.5 sm:gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <TeamLogo
                team={fixture.home_team}
                size="md"
                className="size-8 sm:size-11 rounded-xl border border-slate-200/80 shadow-2xs"
              />
              {/* Home Roof Indicator Icon */}
              <span
                className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full bg-[#102A43] text-white shadow-xs"
                title="المستضيف (صاحب الأرض)"
              >
                <Home className="size-2.5 stroke-[2.5]" />
              </span>
            </div>
            <span
              className="flex-1 truncate text-start text-[11px] sm:text-sm font-extrabold text-[#102A43] leading-tight"
              title={fixture.home_team?.name}
            >
              {fixture.home_team?.name || 'فريق غير محدد'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 5: FAR LEFT — STATUS AND ACTIONS                 */}
        {/* ======================================================== */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 border-s border-slate-100 bg-slate-50/40">
          {/* Status Chip & Primary Result Button Column */}
          <div className="flex flex-col items-center justify-center gap-1 min-w-[78px] sm:min-w-[105px]">
            {/* Status Chip (Independent of Day Color) */}
            <div className="w-full text-center">
              {isPlayed ? (
                <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#E6F7ED] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-extrabold text-[#00A84F] border border-[#A7F3D0]">
                  <CheckCircle2 className="size-2.5 sm:size-3" />
                  <span>منتهية</span>
                </span>
              ) : isLive ? (
                <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-black text-[#008F46] border border-emerald-300 animate-pulse">
                  <span className="size-1.5 rounded-full bg-[#00C853]" />
                  <span>مباشر</span>
                </span>
              ) : isPostponed ? (
                <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#FFEAEB] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-extrabold text-[#E53935] border border-[#FFCDD2]">
                  <Hourglass className="size-2.5 sm:size-3" />
                  <span>مؤجلة</span>
                </span>
              ) : pendingSubmission ? (
                <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#FFF4E5] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-extrabold text-[#FF9800] border border-[#FFE0B2]">
                  <AlertCircle className="size-2.5 sm:size-3" />
                  <span>بانتظار المصادقة</span>
                </span>
              ) : isScheduled ? (
                <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#E8F1FF] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-extrabold text-[#1769FF] border border-[#C7DCFE]">
                  <Clock className="size-2.5 sm:size-3" />
                  <span>قادمة</span>
                </span>
              ) : (
                <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-amber-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-extrabold text-amber-800 border border-amber-200">
                  <AlertCircle className="size-2.5 sm:size-3" />
                  <span>بانتظار الموعد</span>
                </span>
              )}
            </div>

            {/* Primary Action Button: تسجيل مباراة */}
            <button
              type="button"
              onClick={() => onResult?.(fixture)}
              className="w-full flex h-7 sm:h-8 items-center justify-center gap-1 rounded-xl bg-[#1769FF] hover:bg-blue-700 px-2 text-[10px] sm:text-xs font-extrabold text-white shadow-2xs transition active:scale-95 whitespace-nowrap"
            >
              <Trophy className="size-2.5 sm:size-3" />
              <span>تسجيل مباراة</span>
            </button>
          </div>

          {/* Secondary ⋯ Overflow Button (Far Left) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="خيارات إضافية للمباراة"
            className="flex h-11 w-7 sm:w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95"
          >
            <MoreVertical className="size-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Secondary Actions Bottom Sheet / Modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header with Match Info */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0 flex-1 pe-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-black text-[#102A43] tabular-nums">
                    {timeStr || 'غير محدد'}
                  </span>
                  {roundLabel && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {roundLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-[#102A43] truncate">
                  {fixture.home_team?.name} ضد {fixture.away_team?.name}
                </p>
                <p className="text-[11px] text-[#52657A] mt-0.5 flex items-center gap-1">
                  <MapPin className="size-3 text-[#1769FF]" />
                  <span>{venueName}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* List of All Per-Match Secondary Operations */}
            <div className="space-y-1.5">
              {/* 1. تعديل المباراة */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onManageMatch?.(fixture)
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[#1769FF]">
                    <Edit3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#102A43]">تعديل المباراة</p>
                    <p className="text-[11px] text-[#52657A]">تغيير الموعد أو الملعب أو الفريق</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>

              {/* 2. تسجيل أو فتح النتيجة */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onResult?.(fixture)
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-[#00A84F]">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#102A43]">تسجيل أو فتح النتيجة</p>
                    <p className="text-[11px] text-[#52657A]">إدخال أهداف وأحداث المباراة</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>

              {/* 3. إرسال رابط مفوض */}
              {onDelegatedLink && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelegatedLink(fixture)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Link2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">إرسال رابط مفوض</p>
                      <p className="text-[11px] text-[#52657A]">تفويض مندوب أو حكم لتسجيل الأحداث</p>
                    </div>
                  </div>
                  <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
                </button>
              )}

              {/* 4. تأجيل المباراة */}
              {onPostpone && !isPlayed && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onPostpone(fixture)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Clock4 className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">تأجيل المباراة</p>
                      <p className="text-[11px] text-[#52657A]">تحديد سبب التأجيل وإتاحة الموعد للبطولة</p>
                    </div>
                  </div>
                  <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
                </button>
              )}

              {/* 5. اقتراحات إعادة الجدولة */}
              {onRescheduleSuggestion && !isPlayed && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onRescheduleSuggestion(fixture)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">اقتراحات المواعيد المتاحة</p>
                      <p className="text-[11px] text-[#52657A]">فحص المواعيد البديلة المستوفية لشروط الراحة</p>
                    </div>
                  </div>
                  <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
                </button>
              )}

              {/* 6. نقل إلى موعد الفريق المالك */}
              {onMoveToOwnSlot && !isPlayed && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onMoveToOwnSlot(fixture)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                      <CalendarDays className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">نقل لحجز أحد الفريقين</p>
                      <p className="text-[11px] text-[#52657A]">الاستفادة من حجز مؤكد يملكه الفريق المضيف أو الضيف</p>
                    </div>
                  </div>
                  <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
                </button>
              )}

              {/* 7. مشاركة رابط المباراة */}
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Share2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#102A43]">مشاركة بطاقة المباراة</p>
                    <p className="text-[11px] text-[#52657A]">نسخ أو إرسال رابط المواجهة للفرق والجمهور</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>

              {/* 8. تفاصيل المباراة */}
              {onDetails && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDetails(fixture)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F3F6FA] text-start transition active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Info className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">تفاصيل المباراة</p>
                      <p className="text-[11px] text-[#52657A]">عرض تقرير المباراة والبيانات الفنية الكاملة</p>
                    </div>
                  </div>
                  <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
