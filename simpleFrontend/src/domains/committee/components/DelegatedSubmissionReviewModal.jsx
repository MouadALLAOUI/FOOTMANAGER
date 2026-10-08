import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Phone,
  ShieldAlert,
  ArrowRight,
  Eye,
  Edit3,
  Calendar,
  FileText,
  Users,
} from 'lucide-react'
import { Modal, Button } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import api from '../../../api/client'

function getEventDisplayInfo(ev) {
  const type = ev.type || 'other'
  const punishment = ev.punishment || ''
  const goalType = ev.goalType || ''

  if (type === 'goal' || type === 'penalty_goal' || type === 'own_goal') {
    let label = 'هدف'
    if (type === 'penalty_goal' || goalType === 'penalty') label = 'هدف (ركلة جزاء)'
    else if (type === 'own_goal' || goalType === 'own') label = 'هدف في مرماه'
    else if (goalType === 'freekick') label = 'هدف (ضربة حرة)'
    else if (goalType === 'header') label = 'هدف (رأسية)'

    return {
      icon: '⚽',
      label,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      badgeBg: 'bg-emerald-50 text-emerald-700',
    }
  }

  if (type === 'yellow_card' || (type === 'foul' && punishment === 'yellow')) {
    return {
      icon: '🟨',
      label: 'بطاقة صفراء',
      tone: 'bg-amber-50 text-amber-700 ring-amber-200',
      badgeBg: 'bg-amber-50 text-amber-700',
    }
  }

  if (type === 'second_yellow' || (type === 'foul' && punishment === 'second_yellow')) {
    return {
      icon: '🟨🟥',
      label: 'إنذار ثانٍ (طرد)',
      tone: 'bg-rose-50 text-rose-700 ring-rose-200',
      badgeBg: 'bg-rose-50 text-rose-700',
    }
  }

  if (type === 'red_card' || (type === 'foul' && punishment === 'red')) {
    return {
      icon: '🟥',
      label: 'بطاقة حمراء مباشرة',
      tone: 'bg-rose-50 text-rose-700 ring-rose-200',
      badgeBg: 'bg-rose-50 text-rose-700',
    }
  }

  if (type === 'substitution') {
    return {
      icon: '🔄',
      label: 'تبديل',
      tone: 'bg-sky-50 text-sky-700 ring-sky-200',
      badgeBg: 'bg-sky-50 text-sky-700',
    }
  }

  if (type === 'foul') {
    return {
      icon: '🚦',
      label: 'مخالفة / خطأ',
      tone: 'bg-slate-100 text-slate-700 ring-slate-200',
      badgeBg: 'bg-slate-100 text-slate-700',
    }
  }

  return {
    icon: '📝',
    label: 'حدث',
    tone: 'bg-slate-100 text-slate-700 ring-slate-200',
    badgeBg: 'bg-slate-100 text-slate-700',
  }
}

function EventItem({ ev, homeTeamId, awayTeamId, homeName, awayName }) {
  const meta = getEventDisplayInfo(ev)
  const isHome = Number(ev.team_id) === Number(homeTeamId)
  const isAway = Number(ev.team_id) === Number(awayTeamId)
  const teamLabel = isHome ? homeName : (isAway ? awayName : null)

  const minText =
    ev.added_time && Number(ev.added_time) > 0
      ? `${ev.minute || 1}'+${ev.added_time}`
      : `${ev.minute || 1}'`

  const playerName =
    ev.player ||
    ev.player_name ||
    ev.description ||
    (ev.player_id ? `لاعب #${ev.player_id}` : 'لاعب غير محدد')

  const playerNumber = ev.player_number ? `#${ev.player_number}` : ''

  const isSub = ev.type === 'substitution'
  const playerOut = isSub
    ? ev.player || ev.player_name || ev.description || (ev.player_id ? `لاعب #${ev.player_id}` : '—')
    : null
  const playerIn = isSub
    ? ev.assist_player || ev.assist || (ev.assist_player_id ? `لاعب #${ev.assist_player_id}` : '—')
    : null
  const assistPlayer = !isSub ? (ev.assist_player || ev.assist) : null

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition-colors hover:bg-slate-50">
      {/* Minute Badge */}
      <span className="shrink-0 w-12 rounded-lg bg-white px-1 py-1 text-center text-[10px] font-black tabular-nums text-slate-700 shadow-2xs ring-1 ring-slate-200">
        {minText}
      </span>

      {/* Icon */}
      <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs ring-1 ${meta.tone}`}>
        {meta.icon}
      </span>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-800">{meta.label}</p>
          {teamLabel && (
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                isHome ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
              }`}
            >
              {teamLabel}
            </span>
          )}
        </div>

        {isSub ? (
          <div className="mt-1 space-y-0.5 text-[11px] font-bold">
            <p className="text-rose-600">خروج: {playerOut}</p>
            <p className="text-emerald-600">دخول: {playerIn}</p>
          </div>
        ) : (
          <p className="mt-0.5 truncate text-xs font-bold text-slate-700">
            {playerName}
            {playerNumber && (
              <span className="ms-1 text-[10px] text-slate-400 font-mono">({playerNumber})</span>
            )}
          </p>
        )}

        {assistPlayer && (
          <p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-600">
            تمريرة حاسمة: {assistPlayer}
          </p>
        )}

        {ev.reason && (
          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
            السبب: {ev.reason}
          </p>
        )}

        {ev.note && (
          <p className="mt-0.5 text-[10px] font-semibold text-slate-500 leading-relaxed">
            ملاحظة: {ev.note}
          </p>
        )}
      </div>
    </div>
  )
}

export default function DelegatedSubmissionReviewModal({
  isOpen,
  onClose,
  tournamentId,
  fixture,
  onApproved,
  onRejected,
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'home' | 'away'
  const [submissionData, setSubmissionData] = useState(null)

  // Fetch full submission on open to ensure fresh events, presence, etc.
  useEffect(() => {
    if (!isOpen || !fixture) {
      setSubmissionData(null)
      return
    }
    if (fixture.delegated_submission) {
      setSubmissionData(fixture.delegated_submission)
    }

    let active = true
    api.get(`/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/delegated-submission`)
      .then((res) => {
        if (active && res.data?.data) {
          setSubmissionData(res.data.data)
        }
      })
      .catch(() => {
        // Fallback to fixture.delegated_submission
      })

    return () => {
      active = false
    }
  }, [isOpen, fixture, tournamentId])

  if (!isOpen || !fixture) return null

  const sub = submissionData || fixture.delegated_submission
  if (!sub) return null

  const homeTeamId = Number(fixture.home_team?.id || fixture.home_team_id)
  const awayTeamId = Number(fixture.away_team?.id || fixture.away_team_id)
  const homeName = fixture.home_team?.name || 'الفريق المضيف'
  const awayName = fixture.away_team?.name || 'الفريق الضيف'

  const rawEvents = Array.isArray(sub.events) ? sub.events : []
  const sortedEvents = [...rawEvents].sort(
    (a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0) || (Number(a.added_time) || 0) - (Number(b.added_time) || 0)
  )

  const filteredEvents = sortedEvents.filter((ev) => {
    if (activeTab === 'home') return Number(ev.team_id) === homeTeamId
    if (activeTab === 'away') return Number(ev.team_id) === awayTeamId
    return true
  })

  const homeEventsCount = sortedEvents.filter((e) => Number(e.team_id) === homeTeamId).length
  const awayEventsCount = sortedEvents.filter((e) => Number(e.team_id) === awayTeamId).length

  const homeFouls = sortedEvents.filter((e) => e.type === 'foul' && Number(e.team_id) === homeTeamId).length
  const awayFouls = sortedEvents.filter((e) => e.type === 'foul' && Number(e.team_id) === awayTeamId).length
  const totalFouls = homeFouls + awayFouls

  const anomalies = sub.anomalies || []
  const isDisputed = Boolean(sub.is_disputed)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/delegated-submission/approve`
      )
      toast.success(res.data.message || 'تم اعتماد نتيجة المباراة وتحديث الجداول بنجاح!')
      if (onApproved) onApproved(res.data.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر اعتماد النتيجة')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/delegated-submission/reject`,
        { reason: rejectReason || null }
      )
      toast.success(res.data.message || 'تم رفض النتيجة وإعادة المباراة للحالة السابقة')
      if (onRejected) onRejected()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر رفض النتيجة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="مراجعة واعتماد نتيجة المباراة (مسجلة عبر مندوب)"
      size="md"
    >
      <div className="space-y-4 py-1 text-slate-800" dir="rtl">
        {/* Match and Score Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 text-center shadow-xs">
          <div className="text-xs font-bold text-slate-400 mb-2">النتيجة المسجلة عبر الرابط السري</div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-end">
              <p className="text-sm font-black text-slate-900">{homeName}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-5 py-2 text-2xl font-black text-white shadow-xs tracking-wider tabular-nums">
              {sub.home_score} - {sub.away_score}
            </div>
            <div className="flex-1 text-start">
              <p className="text-sm font-black text-slate-900">{awayName}</p>
            </div>
          </div>
          {sub.extra_time && (
            <p className="text-[11px] font-bold text-amber-600 mt-2">شوطين إضافيين</p>
          )}
          {sub.home_penalties !== null && sub.home_penalties !== undefined && (
            <p className="text-xs font-bold text-purple-700 mt-1">
              ركلات الترجيح: {sub.home_penalties} - {sub.away_penalties}
            </p>
          )}
        </div>

        {/* Recorder Identification Card */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2">
          <p className="text-[11px] font-black text-slate-500">بيانات المسجل (مندوب المباراة)</p>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <User className="size-4 text-slate-400" />
              <span>{sub.recorder_name || 'غير معروف'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-slate-700" dir="ltr">
              <Phone className="size-3.5 text-slate-400" />
              <span>{sub.recorder_phone || 'بدون هاتف'}</span>
            </div>
          </div>
        </div>

        {/* Fouls & Cumulative Penalties Summary */}
        {totalFouls > 0 && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-xs text-slate-800">
                <span className="text-sm">🚦</span>
                <span>المخالفات المسجلة والأخطاء التراكمية:</span>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 tabular-nums">
                {totalFouls} مخالفات
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded-xl p-2.5 border ${homeFouls >= 6 ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-100 bg-slate-50 text-slate-800'}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>{homeName}</span>
                  <span className="font-black">{homeFouls} أخطاء</span>
                </div>
                {homeFouls >= 6 && (
                  <p className="text-[10px] font-black text-rose-700 mt-1">
                    ⚠️ تجاوز حد 6 أخطاء — ركلة جزاء مستحقة للخصم
                  </p>
                )}
              </div>

              <div className={`rounded-xl p-2.5 border ${awayFouls >= 6 ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-100 bg-slate-50 text-slate-800'}`}>
                <div className="flex items-center justify-between font-bold">
                  <span>{awayName}</span>
                  <span className="font-black">{awayFouls} أخطاء</span>
                </div>
                {awayFouls >= 6 && (
                  <p className="text-[10px] font-black text-rose-700 mt-1">
                    ⚠️ تجاوز حد 6 أخطاء — ركلة جزاء مستحقة للخصم
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Match Events Section */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-black text-xs text-slate-800">
              <span className="text-sm">📋</span>
              <span>أحداث المباراة المسجلة:</span>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 tabular-nums">
              {sortedEvents.length} {sortedEvents.length === 1 ? 'حدث' : 'أحداث'}
            </span>
          </div>

          {/* Optional Filter by Team if events exist */}
          {sortedEvents.length > 0 && (homeEventsCount > 0 || awayEventsCount > 0) && (
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({sortedEvents.length})
              </button>
              {homeEventsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className={`rounded-lg px-2.5 py-1 transition-colors ${
                    activeTab === 'home'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {homeName} ({homeEventsCount})
                </button>
              )}
              {awayEventsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('away')}
                  className={`rounded-lg px-2.5 py-1 transition-colors ${
                    activeTab === 'away'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  {awayName} ({awayEventsCount})
                </button>
              )}
            </div>
          )}

          {/* Events List or Empty State */}
          {sortedEvents.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold text-slate-500">لا توجد أحداث تفصيلية مسجلة لهذه المباراة</p>
              <p className="text-[10px] text-slate-400 mt-0.5">تم تسجيل النتيجة النهائية فقط بواسطة المندوب</p>
            </div>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto pe-1">
              {filteredEvents.map((ev, idx) => (
                <EventItem
                  key={ev._key || ev.id || idx}
                  ev={ev}
                  homeTeamId={homeTeamId}
                  awayTeamId={awayTeamId}
                  homeName={homeName}
                  awayName={awayName}
                />
              ))}
            </div>
          )}
        </div>

        {/* Presence Confirmation (if recorded by delegated link) */}
        {sub.client_meta?.presence && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-black text-slate-700">
              <Users className="size-3.5 text-emerald-600" />
              <span>تأكيد حضور اللاعبين:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-600 pe-1">
              <span className="text-emerald-700">
                {homeName}: {sub.client_meta.presence.home?.length || 0} لاعب حاضر
              </span>
              <span>•</span>
              <span className="text-sky-700">
                {awayName}: {sub.client_meta.presence.away?.length || 0} لاعب حاضر
              </span>
            </div>
          </div>
        )}

        {/* Notes from recorder (if any) */}
        {sub.notes && (
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-black text-amber-800">
              <FileText className="size-3.5 text-amber-600" />
              <span>ملاحظات مسجل المباراة:</span>
            </div>
            <p className="text-[11px] font-semibold text-amber-900 pe-1 leading-relaxed">
              {sub.notes}
            </p>
          </div>
        )}

        {/* Anomaly Alerts (if any) */}
        {anomalies.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 space-y-2 text-rose-900">
            <div className="flex items-center gap-1.5 font-black text-xs text-rose-800">
              <AlertTriangle className="size-4 text-rose-600" />
              <span>تنبيهات غير معتادة تم رصدها (Anomalies):</span>
            </div>
            <ul className="text-xs list-disc list-inside space-y-1 font-semibold text-rose-800 pe-1">
              {anomalies.includes('unusual_score') && (
                <li>النتيجة تحتوي على عدد أهداف كبير جداً (10 أهداف أو أكثر).</li>
              )}
              {anomalies.includes('recorded_after_window') && (
                <li>تم تسجيل النتيجة متأخراً بعد انتهاء الموعد المسموح به للمباراة.</li>
              )}
              {anomalies.includes('multi_device_or_ip') && (
                <li>تم فتح الرابط واستخدامه من أكثر من جهاز أو عنوان IP مختلف في وقت قصير.</li>
              )}
              {anomalies.includes('pending_review_delayed') && (
                <li>النتيجة بانتظار المراجعة منذ أكثر من 12 ساعة.</li>
              )}
            </ul>
          </div>
        )}

        {/* Dispute Alert (if manager objected) */}
        {isDisputed && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-black text-xs text-amber-800">
              <ShieldAlert className="size-4 text-amber-600" />
              <span>يوجد اعتراض مسجل من مدير الفريق (متنازع عليها):</span>
            </div>
            <p className="text-xs font-semibold text-amber-800 pr-5">
              {sub.dispute_reason || 'اعترض مدير الفريق على هذه النتيجة دون تفاصيل إضافية.'}
            </p>
          </div>
        )}

        {/* Reject optional reason box */}
        {showRejectInput && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700">سبب الرفض (اختياري)</label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: النتيجة غير صحيحة بناء على تقرير الحكم الرسمي"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-emerald-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl px-4 py-2 gap-1.5 shadow-xs"
              loading={loading}
              onClick={handleApprove}
            >
              <CheckCircle2 className="size-4" />
              اعتماد النتيجة رسمياً
            </Button>
          </div>

          {!showRejectInput ? (
            <Button
              variant="outline"
              className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl px-3"
              onClick={() => setShowRejectInput(true)}
            >
              <XCircle className="size-3.5 me-1" />
              رفض النتيجة
            </Button>
          ) : (
            <Button
              variant="danger"
              className="text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl px-3 py-2"
              loading={loading}
              onClick={handleReject}
            >
              تأكيد الرفض
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
