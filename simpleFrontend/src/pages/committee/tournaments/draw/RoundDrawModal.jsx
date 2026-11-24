import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  RefreshCw,
  Shuffle,
  Sparkles,
  Swords,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react'
import api from '../../../../api/client'
import { Button, Modal } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { TeamAvatar } from '../../../tournaments/shared'

export default function RoundDrawModal({ open, onClose, tournament, round, onSuccess }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [assignments, setAssignments] = useState({})
  const [saving, setSaving] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [autoDrawing, setAutoDrawing] = useState(false)

  const roundId = round?.id || round?.round_id

  const loadDrawData = async () => {
    if (!tournament?.id || !roundId) return
    setLoading(true)
    try {
      const res = await api.get(`/committee/tournaments/${tournament.id}/bracket/rounds/${roundId}/draw-data`)
      const d = res.data?.data || {}
      setData(d)

      // Initialize assignments from existing fixtures
      const initial = {}
      ;(d.fixtures || []).forEach((f) => {
        let defaultDate = ''
        if (f.scheduled_at) {
          // Format to datetime-local (YYYY-MM-DDTHH:mm)
          const dt = new Date(f.scheduled_at)
          if (!isNaN(dt.getTime())) {
            const pad = (n) => String(n).padStart(2, '0')
            defaultDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
          }
        }

        initial[f.id] = {
          fixture_id: f.id,
          home_team_id: f.home_team_id ? String(f.home_team_id) : '',
          away_team_id: f.away_team_id ? String(f.away_team_id) : '',
          scheduled_at: defaultDate,
          stadium_id: f.stadium_id ? String(f.stadium_id) : (d.main_stadium_id ? String(d.main_stadium_id) : ''),
        }
      })
      setAssignments(initial)
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && roundId) {
      loadDrawData()
    }
  }, [open, roundId])

  const fixtures = data?.fixtures || []
  const qualifiedTeams = data?.qualified_teams || []
  const stadiums = data?.stadiums || []
  const isConfirmed = data?.draw_status === 'confirmed'
  const canUnlock = Boolean(data?.can_unlock)
  const canConfirm = Boolean(data?.can_confirm)
  const allPreviousFinished = data?.all_previous_finished !== false

  // Set of all currently assigned team IDs across all fixtures
  const assignedTeamIds = useMemo(() => {
    const set = new Set()
    Object.values(assignments).forEach((a) => {
      if (a.home_team_id) set.add(Number(a.home_team_id))
      if (a.away_team_id) set.add(Number(a.away_team_id))
    })
    return set
  }, [assignments])

  // Count assigned slots
  const totalSlots = fixtures.length * 2
  const filledSlots = assignedTeamIds.size
  const isAllFilled = filledSlots === totalSlots && totalSlots > 0

  const handleTeamChange = (fixtureId, side, teamId) => {
    setAssignments((prev) => {
      const current = prev[fixtureId] || { fixture_id: fixtureId }
      return {
        ...prev,
        [fixtureId]: {
          ...current,
          [side === 'home' ? 'home_team_id' : 'away_team_id']: teamId,
        },
      }
    })
  }

  const handleScheduleChange = (fixtureId, field, value) => {
    setAssignments((prev) => {
      const current = prev[fixtureId] || { fixture_id: fixtureId }
      return {
        ...prev,
        [fixtureId]: {
          ...current,
          [field]: value,
        },
      }
    })
  }

  const handleAutoDraw = async () => {
    if (!tournament?.id || !roundId) return
    setAutoDrawing(true)
    try {
      const res = await api.get(`/committee/tournaments/${tournament.id}/bracket/rounds/${roundId}/auto-draw`)
      const list = res.data?.data || []
      setAssignments((prev) => {
        const next = { ...prev }
        list.forEach((item) => {
          if (item.fixture_id) {
            next[item.fixture_id] = {
              fixture_id: item.fixture_id,
              home_team_id: String(item.home_team_id || ''),
              away_team_id: String(item.away_team_id || ''),
              scheduled_at: prev[item.fixture_id]?.scheduled_at || item.scheduled_at || '',
              stadium_id: prev[item.fixture_id]?.stadium_id || String(item.stadium_id || ''),
            }
          }
        })
        return next
      })
      toast.success(res.data?.message || 'تم إجراء القرعة التلقائية بنجاح')
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setAutoDrawing(false)
    }
  }

  const handleUnlock = async () => {
    if (!window.confirm(`هل أنت متأكد من فك قفل قرعة (${data?.round?.name || 'هذا الدور'}) وإعادتها لحالة المسودة للتعديل؟`)) {
      return
    }
    setUnlocking(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/bracket/rounds/${roundId}/unlock-draw`)
      toast.success(res.data?.message || 'تم فك قفل القرعة بنجاح للتعديل')
      await loadDrawData()
      if (onSuccess) onSuccess()
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setUnlocking(false)
    }
  }

  const handleSaveAndConfirm = async () => {
    if (!isAllFilled) {
      toast.error(`يرجى تسكين جميع الفرق في مواجهات الدور (${filledSlots}/${totalSlots} خانات مكتملة)`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        assignments: Object.values(assignments).map((a) => ({
          fixture_id: a.fixture_id,
          home_team_id: Number(a.home_team_id),
          away_team_id: Number(a.away_team_id),
          scheduled_at: a.scheduled_at || null,
          stadium_id: a.stadium_id ? Number(a.stadium_id) : null,
        })),
        reason: `اعتماد قرعة وبرمجة ${data?.round?.name || 'الدور'}`,
      }

      const res = await api.post(`/committee/tournaments/${tournament.id}/bracket/rounds/${roundId}/confirm-draw`, payload)
      toast.success(res.data?.message || 'تم اعتماد قرعة ومباريات الدور بنجاح')
      onClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`إدارة وقرعة ومباريات ${data?.round?.name || round?.name || 'الدور الإقصائي'}`}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#65706A]">
          <RefreshCw className="size-8 animate-spin text-[#179955]" />
          <p className="mt-3 text-sm font-bold">جاري تحميل بيانات وتسكين الدور...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#179955]/15 text-[#179955] dark:text-[#42D889] font-black">
                <Swords className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  {data?.round?.name || 'الدور الإقصائي'}
                </h4>
                <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                  {fixtures.length} مباريات • {fixtures.length * 2} فرق متنافسة
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5 ${
                  isConfirmed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {isConfirmed ? (
                  <>
                    <Lock className="size-3.5" />
                    معتمدة ومقفلة رسمياً
                  </>
                ) : (
                  <>
                    <Unlock className="size-3.5" />
                    مسودة مفتوحة للتسكين والتعديل
                  </>
                )}
              </span>

              {isConfirmed && canUnlock && (
                <Button
                  size="xs"
                  variant="outline"
                  loading={unlocking}
                  onClick={handleUnlock}
                  className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                >
                  <Unlock className="size-3.5" />
                  فك القفل للتعديل
                </Button>
              )}

              {!isConfirmed && (
                <Button
                  size="xs"
                  variant="outline"
                  loading={autoDrawing}
                  disabled={!allPreviousFinished || qualifiedTeams.filter((t) => t.is_confirmed).length < totalSlots}
                  onClick={handleAutoDraw}
                  className="border-[#179955]/40 text-[#179955] dark:text-[#42D889] hover:bg-[#179955]/10 font-bold"
                >
                  <Shuffle className="size-3.5" />
                  قرعة عشوائية تلقائية
                </Button>
              )}
            </div>
          </div>

          {/* Incomplete Previous Round Warning */}
          {!allPreviousFinished && data?.previous_round && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">تنبيه حسم المتأهلين:</p>
                <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                  لم تكتمل كافة مباريات الدور السابق ({data.previous_round.name}) بعد. يمكنك البدء في برمجة المواعيد والملاعب أو تسكين الفرق المتأهلة المؤكدة، لكن القرعة التلقائية تتطلب اكتمال نتائج الدور السابق.
                </p>
              </div>
            </div>
          )}

          {/* Qualified Teams Pool */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-1.5">
                <Users className="size-4 text-[#179955]" />
                الفرق المتأهلة لهذا الدور ({qualifiedTeams.filter((t) => t.is_confirmed).length} من أصل {totalSlots} فرق مؤكدة):
              </h5>
              <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                تم تسكين {filledSlots} من {totalSlots}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {qualifiedTeams.map((team, idx) => {
                const isAssigned = team.team_id ? assignedTeamIds.has(team.team_id) : false
                return (
                  <div
                    key={team.team_id || `unconfirmed_${idx}`}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition text-xs ${
                      !team.is_confirmed
                        ? 'border-dashed border-[#E1E5DF] dark:border-[#303832] opacity-60 bg-transparent'
                        : isAssigned
                        ? 'border-[#179955]/30 bg-[#179955]/10 dark:bg-[#179955]/20 text-[#179955] dark:text-[#42D889]'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2]'
                    }`}
                  >
                    {team.is_confirmed ? (
                      <TeamAvatar team={team} className="size-6 shrink-0" />
                    ) : (
                      <div className="grid size-6 place-items-center rounded-full bg-gray-200 dark:bg-gray-800 text-[10px]">
                        ⏳
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold leading-tight">{team.name}</p>
                      <p className="truncate text-[10px] text-[#65706A] dark:text-[#B2B9B3] mt-0.5">
                        {team.source_label || (isAssigned ? 'مسكن في مواجهة' : 'متاح للتسكين')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Matches & Schedule Configuration Grid */}
          <div className="space-y-3">
            <h5 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
              مباريات ومواجهات وملاعب الدور ({fixtures.length} مباريات):
            </h5>

            <div className="space-y-3">
              {fixtures.map((fixture, idx) => {
                const currentAssignment = assignments[fixture.id] || {}
                const homeId = currentAssignment.home_team_id
                const awayId = currentAssignment.away_team_id
                const isLocked = fixture.is_locked || isConfirmed

                return (
                  <div
                    key={fixture.id}
                    className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E5DF]/60 dark:border-[#303832]/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-[#179955] text-white text-[11px] font-black">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-[#111313] dark:text-[#F5F7F2]">
                          المباراة {idx + 1} ({data?.round?.name})
                        </span>
                      </div>

                      {fixture.is_locked && (
                        <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 px-2.5 py-0.5 text-[10px] font-bold">
                          المباراة بدأت أو انتهت (مقفلة)
                        </span>
                      )}
                    </div>

                    {/* Team Selection: Home vs Away */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 items-center">
                      {/* Home Team */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1">
                          الفريق المستضيف (الطرف الأول)
                        </label>
                        <select
                          disabled={isLocked}
                          value={homeId || ''}
                          onChange={(e) => handleTeamChange(fixture.id, 'home', e.target.value)}
                          className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none disabled:opacity-60"
                        >
                          <option value="">-- اختر الفريق المستضيف --</option>
                          {qualifiedTeams
                            .filter((t) => t.is_confirmed)
                            .map((t) => {
                              const alreadyUsedElsewhere =
                                assignedTeamIds.has(t.team_id) &&
                                Number(homeId) !== t.team_id &&
                                Number(awayId) !== t.team_id
                              return (
                                <option
                                  key={t.team_id}
                                  value={t.team_id}
                                  disabled={alreadyUsedElsewhere || Number(awayId) === t.team_id}
                                >
                                  {t.name} {alreadyUsedElsewhere ? '(مسكن في مباراة أخرى)' : ''}
                                </option>
                              )
                            })}
                        </select>
                      </div>

                      {/* Away Team */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1">
                          الفريق الضيف (الطرف الثاني)
                        </label>
                        <select
                          disabled={isLocked}
                          value={awayId || ''}
                          onChange={(e) => handleTeamChange(fixture.id, 'away', e.target.value)}
                          className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none disabled:opacity-60"
                        >
                          <option value="">-- اختر الفريق الضيف --</option>
                          {qualifiedTeams
                            .filter((t) => t.is_confirmed)
                            .map((t) => {
                              const alreadyUsedElsewhere =
                                assignedTeamIds.has(t.team_id) &&
                                Number(homeId) !== t.team_id &&
                                Number(awayId) !== t.team_id
                              return (
                                <option
                                  key={t.team_id}
                                  value={t.team_id}
                                  disabled={alreadyUsedElsewhere || Number(homeId) === t.team_id}
                                >
                                  {t.name} {alreadyUsedElsewhere ? '(مسكن في مباراة أخرى)' : ''}
                                </option>
                              )
                            })}
                        </select>
                      </div>
                    </div>

                    {/* Schedule: Date/Time + Stadium */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1 border-t border-dashed border-[#E1E5DF]/60 dark:border-[#303832]/60">
                      <div>
                        <label className="block text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1 flex items-center gap-1">
                          <Calendar className="size-3 text-[#179955]" />
                          تاريخ وتوقيت المباراة
                        </label>
                        <input
                          type="datetime-local"
                          disabled={isLocked}
                          value={currentAssignment.scheduled_at || ''}
                          onChange={(e) => handleScheduleChange(fixture.id, 'scheduled_at', e.target.value)}
                          className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-1.5 text-xs text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1 flex items-center gap-1">
                          <MapPin className="size-3 text-[#179955]" />
                          ملعب المباراة المخصص
                        </label>
                        <select
                          disabled={isLocked}
                          value={currentAssignment.stadium_id || ''}
                          onChange={(e) => handleScheduleChange(fixture.id, 'stadium_id', e.target.value)}
                          className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-1.5 text-xs text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none disabled:opacity-60"
                        >
                          <option value="">-- اختر الملعب --</option>
                          {stadiums.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.city ? `(${s.city})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E5DF] dark:border-[#303832] pt-4">
            <Button variant="ghost" onClick={onClose} disabled={saving || unlocking}>
              إغلاق
            </Button>

            {!isConfirmed && (
              <Button
                variant="primary"
                loading={saving}
                disabled={!isAllFilled || !canConfirm}
                onClick={handleSaveAndConfirm}
                className="bg-[#179955] hover:bg-[#138047] text-white font-bold"
              >
                <UserCheck className="size-4" />
                تثبيت واعتماد برنامج {data?.round?.name || 'الدور'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
