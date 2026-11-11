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
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
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
  const { openTeam } = useProfileModal()
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
      {/* ======================================================== */}
      {/* UNIFIED COMPACT MATCH CARD (Matches Master Reference)    */}
      {/* ======================================================== */}
      <div
        onClick={() => onManageMatch?.(fixture)}
        className="group rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3 sm:p-3.5 shadow-2xs transition-all hover:border-[#B8F000] dark:hover:border-[#D0FF38]/60 cursor-pointer"
      >
        {/* Top Row: Round / Venue / Status Badges + Kickoff Time & Compact Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {roundLabel && (
              <span className="inline-flex items-center rounded-md bg-[#F7F8F5] dark:bg-[#252B27] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[10px] font-black text-[#111313] dark:text-[#F5F7F2]">
                {roundLabel}
              </span>
            )}

            {venueName && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3] truncate max-w-[140px] sm:max-w-[200px]">
                <MapPin className="size-3 shrink-0 text-[#16834A] dark:text-[#D0FF38]" />
                <span className="truncate">{venueName}</span>
              </span>
            )}

            {isPlayed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#16834A]/15 px-2 py-0.5 text-[10px] font-black text-[#16834A] dark:text-[#42D889]">
                <CheckCircle2 className="size-2.5" />
                <span>منجزة</span>
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D93636]/15 px-2 py-0.5 text-[10px] font-black text-[#D93636] dark:text-[#FF6868] animate-pulse">
                <span className="size-1.5 rounded-full bg-current" />
                <span>مباشر</span>
              </span>
            ) : isPostponed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#B87500]/15 px-2 py-0.5 text-[10px] font-black text-[#B87500] dark:text-[#FFC857]">
                <Hourglass className="size-2.5" />
                <span>مؤجلة</span>
              </span>
            ) : pendingSubmission ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#B87500]/15 px-2 py-0.5 text-[10px] font-black text-[#B87500] dark:text-[#FFC857]">
                <AlertCircle className="size-2.5" />
                <span>بانتظار المصادقة</span>
              </span>
            ) : !isScheduled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#B87500]/15 px-2 py-0.5 text-[10px] font-black text-[#B87500] dark:text-[#FFC857]">
                <AlertCircle className="size-2.5" />
                <span>بانتظار الموعد</span>
              </span>
            ) : null}
          </div>

          {/* Kickoff Time + Quick Result CTA + ⋮ Menu */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="inline-flex items-center gap-1 text-xs font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
              <span>{timeStr || '—:—'}</span>
              <Clock className="size-3.5 text-[#65706A] dark:text-[#B2B9B3]" />
            </span>

            <button
              type="button"
              onClick={() => onResult?.(fixture)}
              className="rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-1 text-[10px] font-black text-[#111313] hover:opacity-90 transition cursor-pointer"
              title="تسجيل النتيجة والأحداث"
            >
              {isPlayed ? 'النتيجة ✓' : 'النتيجة'}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="خيارات إضافية للمباراة"
              className="flex size-7 items-center justify-center rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] hover:opacity-80 transition cursor-pointer"
            >
              <MoreVertical className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Center Teams Row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Home Team (Right in RTL) */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (fixture.home_team?.id != null) openTeam(fixture.home_team)
            }}
            role={fixture.home_team?.id != null ? 'button' : undefined} tabIndex={fixture.home_team?.id != null ? 0 : undefined} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && fixture.home_team?.id != null) { e.preventDefault(); e.stopPropagation(); openTeam(fixture.home_team) } }} className={`group/team flex items-center gap-2 min-w-0 ${fixture.home_team?.id != null ? 'cursor-pointer' : ''}`}
          >
            <div className="relative shrink-0">
              <TeamLogo
                team={fixture.home_team}
                size="sm"
                className="size-8 rounded-xl border border-[#E1E5DF] dark:border-[#303832]"
              />
              <span
                className="absolute -bottom-1 -end-1 flex size-3.5 items-center justify-center rounded-full bg-[#111313] dark:bg-[#D0FF38] text-white dark:text-[#111313]"
                title="المستضيف (صاحب الأرض)"
              >
                <Home className="size-2 stroke-[2.5]" />
              </span>
            </div>
            <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] transition-colors group-hover/team:text-[#16834A] dark:group-hover/team:text-[#D0FF38]">
              {fixture.home_team?.name || 'فريق غير محدد'}
            </span>
          </div>

          {/* Score or VS */}
          <div className="shrink-0 px-2 text-center">
            {isPlayed || isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#111313] dark:bg-[#D0FF38] px-2.5 py-0.5 text-xs font-black text-white dark:text-[#111313] font-mono tabular-nums">
                <span>{fixture.match?.home_score ?? 0}</span>
                <span className="font-sans opacity-70">-</span>
                <span>{fixture.match?.away_score ?? 0}</span>
              </span>
            ) : (
              <span className="text-xs font-black text-[#65706A] dark:text-[#B2B9B3]">VS</span>
            )}
          </div>

          {/* Away Team (Left in RTL) */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (fixture.away_team?.id != null) openTeam(fixture.away_team)
            }}
            role={fixture.away_team?.id != null ? 'button' : undefined} tabIndex={fixture.away_team?.id != null ? 0 : undefined} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && fixture.away_team?.id != null) { e.preventDefault(); e.stopPropagation(); openTeam(fixture.away_team) } }} className={`group/team flex items-center justify-end gap-2 min-w-0 ${fixture.away_team?.id != null ? 'cursor-pointer' : ''}`}
          >
            <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] transition-colors group-hover/team:text-[#16834A] dark:group-hover/team:text-[#D0FF38]">
              {fixture.away_team?.name || 'فريق غير محدد'}
            </span>
            <TeamLogo
              team={fixture.away_team}
              size="sm"
              className="size-8 shrink-0 rounded-xl border border-[#E1E5DF] dark:border-[#303832]"
            />
          </div>
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
