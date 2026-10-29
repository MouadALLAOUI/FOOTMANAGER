import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Swords,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import TeamLogo from '../profile/TeamLogo'

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function FriendlyChallengeModal({ open, onClose, targetTeam }) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [stadiums, setStadiums] = useState([])
  const [selectedStadiumId, setSelectedStadiumId] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toISODate(d)
  })
  const [startTime, setStartTime] = useState('20:00')
  const [endTime, setEndTime] = useState('21:30')
  const [challengerTeamName, setChallengerTeamName] = useState('')
  const [busy, setBusy] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  // Pre-fill challenger team name if user is a logged-in manager
  useEffect(() => {
    if (user?.team?.name) {
      setChallengerTeamName(user.team.name)
    } else if (user?.name) {
      setChallengerTeamName(`فريق ${user.name}`)
    }
  }, [user])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const onKey = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', onKey)
      }
    }
  }, [open, onClose])

  // Load public stadiums
  useEffect(() => {
    if (!open) return
    setErrorMsg('')
    api
      .get('/stadiums')
      .then((res) => {
        const list = res.data?.stadiums || res.data?.data || res.data || []
        const arr = Array.isArray(list) ? list : []
        setStadiums(arr)
        if (arr.length > 0) {
          // If target team has primary stadium, select it
          if (targetTeam?.primary_stadium?.id) {
            setSelectedStadiumId(String(targetTeam.primary_stadium.id))
          } else {
            setSelectedStadiumId(String(arr[0].id))
          }
        }
      })
      .catch(() => {})
  }, [open, targetTeam])

  // Load available slots for selected stadium and date
  useEffect(() => {
    if (!open || !selectedStadiumId || !date) return
    setSlotsLoading(true)
    api
      .get(`/terrains/${selectedStadiumId}/slots`, { params: { date } })
      .then((res) => {
        const raw = res.data?.slots || []
        const openSlots = raw.filter((s) => s.status === 'available')
        setAvailableSlots(openSlots)
        if (openSlots.length > 0) {
          setStartTime(openSlots[0].start)
          setEndTime(openSlots[0].end)
        }
      })
      .catch(() => {
        setAvailableSlots([])
      })
      .finally(() => {
        setSlotsLoading(false)
      })
  }, [open, selectedStadiumId, date])

  if (!open || !targetTeam) return null

  const handleSlotSelect = (slot) => {
    setStartTime(slot.start)
    setEndTime(slot.end)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStadiumId || !date || !startTime || !endTime) {
      toast.error('يرجى ملء كافة تفاصيل التحدي واختيار التوقيت')
      return
    }

    setBusy(true)
    setErrorMsg('')

    try {
      const res = await api.post('/v1/friendly-matches/validate-challenge', {
        target_team_id: targetTeam.id,
        stadium_id: Number(selectedStadiumId),
        match_date: date,
        start_time: startTime,
        end_time: endTime,
        challenger_team_name: challengerTeamName.trim() || undefined,
        challenger_name: user?.name || undefined,
      })

      const data = res.data
      if (data?.whatsapp_url) {
        toast.success('تم التحقق من توفر الملعب وتجهيز رسالة التحدي بنجاح')
        window.open(data.whatsapp_url, '_blank', 'noopener,noreferrer')
        onClose()
      } else {
        toast.info('تم التحقق بنجاح. لا يتوفر رقم واتساب مباشر للمسير.')
        onClose()
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'تعذر إرسال التحدي. يرجى التحقق من توفر الملعب وحالة مسير الفريق.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)] bg-slate-950/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-modal-title"
        className="relative z-[var(--z-modal)] w-full max-w-lg overflow-hidden rounded-[26px] border border-emerald-500/40 bg-[#0F172A] text-white shadow-2xl ring-1 ring-emerald-500/20 max-h-[calc(100dvh-32px)] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0A101D] px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <Swords className="size-5" />
            </span>
            <div>
              <h3 id="challenge-modal-title" className="text-sm sm:text-base font-black text-white">
                تحدي في مباراة ودية
              </h3>
              <p className="text-[11px] font-bold text-slate-400">
                تنظيم مباراة ودية مع فريق معتمد على المنصة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="grid size-11 min-w-[44px] min-h-[44px] place-items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* Target Team Verified Header Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-12 shrink-0 rounded-xl bg-slate-800 p-1 ring-1 ring-emerald-500/40 grid place-items-center overflow-hidden">
                <TeamLogo team={targetTeam} size="md" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white truncate">
                    {targetTeam.name}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>متصل الآن</span>
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="size-3 text-emerald-400" />
                  <span>{targetTeam.city || 'المغرب'}</span>
                  {targetTeam.manager?.name && (
                    <>
                      <span>•</span>
                      <span>المسير: {targetTeam.manager.name}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs font-bold text-rose-300 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Challenger Team Name Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              اسم فريقك (أو اسمك):
            </label>
            <input
              type="text"
              required
              value={challengerTeamName}
              onChange={(e) => setChallengerTeamName(e.target.value)}
              placeholder="مثال: فريق الصقور أو الكابتن أحمد"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Stadium / Pitch Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              الملعب المقترح للمباراة:
            </label>
            <select
              value={selectedStadiumId}
              onChange={(e) => setSelectedStadiumId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              {stadiums.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.city}) {s.price_per_team ? `— ${s.price_per_team} د.م` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              تاريخ المباراة:
            </label>
            <input
              type="date"
              min={toISODate(new Date())}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 block">
                التوقيت المتاح في الملعب:
              </label>
              {slotsLoading && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <Loader2 className="size-3 animate-spin" />
                  <span>جلب الأوقات...</span>
                </span>
              )}
            </div>

            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 rounded-xl bg-slate-900/50 border border-slate-800">
                {availableSlots.map((s, idx) => {
                  const active = startTime === s.start && endTime === s.end
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSlotSelect(s)}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        active
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400'
                          : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {s.start} - {s.end}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center text-slate-400 text-[11px]">
                {slotsLoading
                  ? 'جاري فحص التوقيتات المتاحة...'
                  : 'لا توجد فترات شاغرة معلنة لهذا التاريخ. يمكنك تحديد التوقيت يدويًا أدناه.'}
              </div>
            )}

            {/* Manual Start / End fallback */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">وقت البداية:</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-white focus:border-emerald-500"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">وقت النهاية:</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-white focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Clarity Notice (No False Booking Claim) */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3 text-[11px] leading-relaxed text-emerald-300">
            <strong>تنبيه:</strong> سيتم فتح محادثة واتساب مباشرة مع مسير الفريق بالموعد المقترح. تعتبر المباراة مؤكدة فقط بعد موافقة الطرفين واعتماد الحجز في منصة أجي نقصرو.
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>التحقق من التوفر...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="size-4" />
                  <span>إرسال التحدي عبر واتساب</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
