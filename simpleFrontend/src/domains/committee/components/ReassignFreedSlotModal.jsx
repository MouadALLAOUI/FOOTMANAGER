import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { Button, Modal } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TeamLogo from '../../../components/profile/TeamLogo'
import { parseDateDetails } from './TournamentMatchCard'

export default function ReassignFreedSlotModal({
  open,
  onClose,
  tournamentId,
  fixture,
  onSuccess,
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fixtures, setFixtures] = useState([])
  const [search, setSearch] = useState('')
  const [submittingId, setSubmittingId] = useState(null)

  const slotDateStr = fixture?.freed_slot?.scheduled_at || fixture?.scheduled_at
  const dateInfo = useMemo(() => parseDateDetails(slotDateStr), [slotDateStr])
  const stadiumName = fixture?.freed_slot?.stadium?.name || fixture?.stadium?.name || fixture?.venue_name || 'ملعب معتمد'

  useEffect(() => {
    if (open && tournamentId) {
      setLoading(true)
      api
        .get(`/committee/tournaments/${tournamentId}/unplayed-fixtures`)
        .then((res) => {
          setFixtures(res.data?.data || [])
        })
        .catch((err) => {
          toastApiError(err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, tournamentId])

  const filteredFixtures = useMemo(() => {
    if (!fixtures) return []
    // Exclude the source fixture itself if present
    const available = fixtures.filter((f) => f.id !== fixture?.id)
    if (!search.trim()) return available
    const q = search.toLowerCase()
    return available.filter(
      (f) =>
        f.home_team?.name?.toLowerCase().includes(q) ||
        f.away_team?.name?.toLowerCase().includes(q) ||
        f.round_name?.toLowerCase().includes(q) ||
        f.group_name?.toLowerCase().includes(q)
    )
  }, [fixtures, fixture?.id, search])

  const handleReassign = async (targetFixture) => {
    if (!tournamentId || !fixture?.id || !targetFixture?.id) return
    setSubmittingId(targetFixture.id)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/reassign-freed-slot`,
        { target_fixture_id: targetFixture.id }
      )
      toast.success(
        res.data?.message ||
          `تم إسناد الموعد بنجاح لمباراة ${targetFixture.home_team?.name} ضد ${targetFixture.away_team?.name}`
      )
      onSuccess?.()
      onClose?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="space-y-4 text-start font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                إسناد الموعد المحرر لمباراة لم تُلعب بعد
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                انقر على أي مباراة لنقل هذا الموعد المتاح إليها فوراً وبضغطة زر واحدة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Slot Info Card */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-emerald-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-emerald-600" />
            <span className="text-xs font-black">الموعد المحرر المتاح للإسناد:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            {dateInfo && (
              <>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-800 shadow-2xs border border-emerald-200/60">
                  <Calendar className="size-3.5 text-emerald-600" />
                  <span>{dateInfo.fullDate}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-800 shadow-2xs border border-emerald-200/60">
                  <Clock className="size-3.5 text-emerald-600" />
                  <span className="tabular-nums">{dateInfo.time}</span>
                </span>
              </>
            )}
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-800 shadow-2xs border border-emerald-200/60">
              <MapPin className="size-3.5 text-emerald-600" />
              <span>{stadiumName}</span>
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الفريق أو الجولة..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pe-4 ps-10 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Matches List */}
        <div className="max-h-[380px] space-y-2.5 overflow-y-auto pe-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Loader2 className="size-7 animate-spin text-emerald-600" />
              <span className="text-xs font-bold">جاري تحميل المباريات غير الملعوبة...</span>
            </div>
          ) : filteredFixtures.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-8 text-center text-slate-500">
              <AlertCircle className="mx-auto size-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold">
                {search.trim()
                  ? 'لا توجد مباريات تطابق البحث.'
                  : 'لا توجد مباريات معلقة أو غير ملعوبة في البطولة حالياً.'}
              </p>
            </div>
          ) : (
            filteredFixtures.map((target) => {
              const targetDate = parseDateDetails(target.scheduled_at)
              const isSubmitting = submittingId === target.id

              return (
                <div
                  key={target.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:border-emerald-300 hover:shadow-xs transition"
                >
                  {/* Teams & Round */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                        {target.round_name || target.group_name || `مباراة #${target.id}`}
                        {target.matchday ? ` · ج ${target.matchday}` : ''}
                      </span>
                      {targetDate ? (
                        <span className="text-[10px] font-semibold text-slate-500">
                          موعد سابق: {targetDate.weekday} {targetDate.time}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
                          بانتظار تحديد الموعد
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Home */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo
                          team={target.home_team}
                          name={target.home_team?.name}
                          className="size-6 shrink-0"
                          rounded="rounded-lg"
                        />
                        <span className="truncate text-xs font-black text-slate-900">
                          {target.home_team?.name || 'فريق مضيف'}
                        </span>
                      </div>

                      <span className="text-xs font-black text-slate-400">×</span>

                      {/* Away */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo
                          team={target.away_team}
                          name={target.away_team?.name}
                          className="size-6 shrink-0"
                          rounded="rounded-lg"
                        />
                        <span className="truncate text-xs font-black text-slate-900">
                          {target.away_team?.name || 'فريق ضيف'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direct One-Click Button */}
                  <Button
                    size="sm"
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5"
                    disabled={isSubmitting || (submittingId !== null && submittingId !== target.id)}
                    onClick={() => handleReassign(target)}
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CalendarCheck className="size-3.5" />
                    )}
                    <span>إسناد الموعد بنقرة واحدة</span>
                  </Button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-700"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  )
}
