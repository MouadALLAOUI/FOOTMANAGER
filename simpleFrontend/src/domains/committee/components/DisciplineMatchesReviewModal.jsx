import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { Badge, Button, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function DisciplineMatchesReviewModal({
  open,
  onClose,
  tournamentId,
  team,
  onSuccess,
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [applyingMatchId, setApplyingMatchId] = useState(null)
  const [reversing, setReversing] = useState(false)
  const [confirmingFixture, setConfirmingFixture] = useState(null)

  const loadData = () => {
    if (!tournamentId || !team?.id) return
    setLoading(true)
    api
      .get(`/committee/tournaments/${tournamentId}/teams/${team.id}/discipline-preview`)
      .then((res) => {
        setData(res.data?.data || null)
      })
      .catch((err) => {
        toastApiError(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, tournamentId, team?.id])

  if (!open) return null

  const isWithdrawn = data?.team?.is_withdrawn
  const isDisqualified = data?.team?.is_disqualified
  const statusLabel = isWithdrawn ? 'منسحب' : isDisqualified ? 'مُقصى' : 'مسجل'

  // Reverse decision
  const handleReverse = async () => {
    if (!window.confirm(`هل أنت متأكد من التراجع عن قرار ${statusLabel} واستعادة وضع الفريق النشط؟`)) {
      return
    }
    setReversing(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournamentId}/teams/${team.id}/reverse-discipline`)
      toast.success(res.data?.message || 'تم التراجع عن القرار بنجاح واستعادة وضع الفريق')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toastApiError(err)
    } finally {
      setReversing(false)
    }
  }

  // Apply default result to individual match
  const handleApplyDefault = async (fixture) => {
    setApplyingMatchId(fixture.id)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/apply-default-result`,
        { withdrawn_team_id: team.id }
      )
      toast.success(res.data?.message || 'تم تطبيق النتيجة الاعتبارية للمباراة بنجاح')
      setConfirmingFixture(null)
      loadData()
      if (onSuccess) onSuccess()
    } catch (err) {
      toastApiError(err)
    } finally {
      setApplyingMatchId(null)
    }
  }

  const remainingMatches = data?.remaining_matches || []
  const completedMatches = data?.completed_matches || []
  const inProgressMatches = data?.in_progress_matches || []
  const canReverse = Boolean(data?.can_reverse)
  const isFinal = Boolean(data?.is_final)
  const defaultWinScore = data?.tournament?.default_win_score || '3-0'
  const pointsForWin = data?.tournament?.points_for_win || 3

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="مراجعة المباريات والنتائج الاعتبارية"
      subtitle={`فريق ${team?.name || ''} (${statusLabel})`}
    >
      <div className="space-y-5" dir="rtl">
        {/* Team Banner */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center gap-3">
            <TeamLogo team={team} className="size-10 rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">{team?.name || '—'}</span>
                <Badge variant={isDisqualified ? 'danger' : 'warning'}>{statusLabel}</Badge>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {isFinal
                  ? 'تم تطبيق نتائج اعتبارية — القرار نهائي ولا يمكن التراجع عنه'
                  : 'لم يتم تطبيق نتائج اعتبارية بعد — يمكن التراجع عن القرار'}
              </p>
            </div>
          </div>

          {canReverse && (
            <Button
              size="sm"
              variant="outline"
              loading={reversing}
              onClick={handleReverse}
              className="text-xs font-black text-slate-700 hover:text-green-700"
            >
              <RotateCcw className="size-3.5" />
              تراجع عن القرار
            </Button>
          )}
        </div>

        {/* Live Match Notice if any */}
        {inProgressMatches.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-bold text-amber-900">
            <ShieldAlert className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-black">مباراة جارية حالياً ({inProgressMatches.length})</p>
              <p className="mt-0.5 text-[11px] text-amber-800">
                المباراة جارية على أرض الملعب، وسيتم استكمالها وتسجيل نتيجتها كالمعتاد قبل اعتماد أي نتائج اعتبارية لباقي المباريات.
              </p>
            </div>
          </div>
        )}

        {/* Individual Matches List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h5 className="text-xs font-black text-slate-900">
              المباريات المتبقية — مراجعة واعتماد فردي ({remainingMatches.length})
            </h5>
            <span className="text-[11px] text-slate-400 font-medium">
              الفوز الاعتباري: {defaultWinScore} ({pointsForWin} نقاط)
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : remainingMatches.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
              لا توجد مباريات متبقية معلقة لهذا الفريق.
            </p>
          ) : (
            <div className="max-h-72 space-y-2.5 overflow-y-auto pe-1">
              {remainingMatches.map((m) => {
                const isAlreadyDefault = m.is_default_result
                const isConfirming = confirmingFixture?.id === m.id
                const isBusy = applyingMatchId === m.id

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      isAlreadyDefault
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {m.is_home ? `${m.team_name} ضد ${m.opponent?.name || '—'}` : `${m.opponent?.name || '—'} ضد ${m.team_name}`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            الجولة {m.matchday || '—'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 font-medium">
                          {m.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {m.scheduled_at}
                            </span>
                          )}
                          {m.stadium_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {m.stadium_name}
                            </span>
                          )}
                        </div>

                        {/* Booking Handling Badge & Explanation */}
                        {m.booking_info && (
                          <div className="mt-2 text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                            <span className="text-indigo-800 font-black">حجز الملعب: </span>
                            {m.booking_info.note}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-start">
                        {isAlreadyDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                            <Check className="size-3.5" />
                            تم اعتماد الفوز الاعتباري ({defaultWinScore})
                          </span>
                        ) : isConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="danger"
                              loading={isBusy}
                              onClick={() => handleApplyDefault(m)}
                              className="text-xs font-bold"
                            >
                              تأكيد الاعتماد
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => setConfirmingFixture(null)}
                              className="text-xs"
                            >
                              إلغاء
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setConfirmingFixture(m)}
                            className="text-xs font-black shadow-xs"
                          >
                            تطبيق النتيجة الاعتبارية
                          </Button>
                        )}
                      </div>
                    </div>

                    {isConfirming && (
                      <p className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-amber-800 bg-amber-50/70 p-2 rounded-lg">
                        ⚠️ سيتم منح الفوز ونقاط المباراة ({pointsForWin} نقاط) لفريق {m.opponent?.name || 'الخصم'} بنتيجة اعتبارية دون إضافة أهداف لحصيلة الأهداف أو فارق الأهداف.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Completed Matches Summary */}
        {completedMatches.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-xs font-black text-slate-700 mb-2">
              المباريات المكتملة السابقة ({completedMatches.length}) — محفوظة بالكامل
            </p>
            <div className="max-h-32 space-y-1.5 overflow-y-auto pe-1 text-[11px] font-semibold text-slate-600">
              {completedMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-slate-200/60">
                  <span>
                    {m.team_name} {m.home_score ?? 0} - {m.away_score ?? 0} {m.opponent?.name || '—'}
                  </span>
                  <Badge variant="success">ملعوبة ومحفوظة</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="px-6 font-bold">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  )
}
