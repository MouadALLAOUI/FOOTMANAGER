import { useState } from 'react'
import { Check, CheckCircle2, Globe, Lock, Plus, Shield, Sparkles, Trash2, UserPlus, Users } from 'lucide-react'
import { Badge, Button, Card, Empty, Field, Modal, Skeleton } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'

export default function Step3Registration({
  tournament,
  refresh,
  onOpenAddModal = null,
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState([])

  const { data: teams, loading, refetch: refetchTeams } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id],
  )

  const { data: allTeams, loading: loadingAllTeams } = useApi(
    () => api.get('/committee/teams').then((r) => r.data.data),
    [tournament.id],
    { enabled: addModalOpen },
  )

  const registeredTeams = teams || []
  const registeredIds = new Set(registeredTeams.map((t) => t.team_id || t.team?.id).filter(Boolean))
  const availableTeams = (allTeams || []).filter((t) => !registeredIds.has(t.id))

  const targetCount = Number(tournament.teams_count || 8)
  const count = registeredTeams.length
  const remainingSlots = Math.max(0, targetCount - count)
  const isTargetReached = count >= targetCount

  const handleOpenRegistration = async () => {
    setBusy('open')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/open-registration`)
      toast.success('تم فتح باب التسجيل العام للفرق بنجاح')
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleCloseRegistration = async () => {
    setBusy('close')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/close-registration`)
      toast.success('تم إغلاق باب التسجيل للفرق')
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleAddTeams = async () => {
    if (!selectedTeams.length) return
    setBusy('add')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams`, {
        team_ids: selectedTeams,
      })
      toast.success(`تمت إضافة ${selectedTeams.length} فرق إلى البطولة بنجاح`)
      setSelectedTeams([])
      setAddModalOpen(false)
      refetchTeams()
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleRemoveTeam = async (teamId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إزالة هذا الفريق من البطولة؟')) return
    setBusy(`remove-${teamId}`)
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/teams/${teamId}`)
      toast.success('تمت إزالة الفريق من البطولة')
      refetchTeams()
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const toggleSelectTeam = (id) => {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Registration Overview and Quota Status */}
        <Card
          title="قائمة الفرق المسجلة"
          subtitle={`المسجل حالياً: ${count} من أصل ${targetCount} فرق مطلوبة`}
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddModalOpen(true)}
                disabled={count >= targetCount}
              >
                <Plus className="size-3.5" />
                إشراك فرق من المنصة
              </Button>
            </div>
          }
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : registeredTeams.length === 0 ? (
            <Empty
              icon={Users}
              title="لا توجد فرق مسجلة بعد"
              description="يمكنك فتح التسجيل العام للفرق أو إضافة أندية معروفة مباشرة من المنصة."
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {registeredTeams.map((entry) => {
                const team = entry.team || {}
                return (
                  <div
                    key={entry.id || team.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="size-10 rounded-xl object-cover bg-slate-100 border border-slate-200"
                        />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm">
                          {team.name ? team.name.slice(0, 2).toUpperCase() : 'FC'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {team.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {team.city || 'بدون مدينة'} {team.manager?.name ? `• إدارة ${team.manager.name}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(team.id)}
                      disabled={busy === `remove-${team.id}`}
                      className="grid size-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="إزالة الفريق"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Public Registration Control */}
        <Card title="حالة بوابة التسجيل العامة" subtitle="التحكم في إمكانية تقديم الفرق لطلبات الانضمام عبر الموقع">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className={`grid size-10 place-items-center rounded-2xl ${tournament.status === 'open_for_registration' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {tournament.status === 'open_for_registration' ? <Globe className="size-5" /> : <Lock className="size-5" />}
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  {tournament.status === 'open_for_registration' ? 'باب التسجيل مفتوح للعموم' : 'باب التسجيل مغلق حالياً'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {tournament.status === 'open_for_registration'
                    ? 'يمكن لمدراء الفرق تصفح البطولة وتقديم طلبات الانضمام الرسمية'
                    : 'لن يتمكن مدراء الفرق من تقديم طلبات جديدة حتى تقوم بفتح التسجيل'}
                </span>
              </div>
            </div>

            {tournament.status === 'open_for_registration' ? (
              <Button
                variant="outline"
                size="sm"
                loading={busy === 'close'}
                onClick={handleCloseRegistration}
              >
                <Lock className="size-3.5" />
                إغلاق التسجيل
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                loading={busy === 'open'}
                onClick={handleOpenRegistration}
              >
                <Globe className="size-3.5" />
                فتح باب التسجيل
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Guidance Sidebar */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm mb-2">
            <Sparkles className="size-4" />
            <span>نصاب اكتمال الفرق</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>الفرق المسجلة:</span>
            <span className="font-mono text-emerald-700 font-black">{count} / {targetCount}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isTargetReached ? 'bg-emerald-500' : 'bg-sky-500'}`}
              style={{ width: `${Math.min(100, Math.round((count / targetCount) * 100))}%` }}
            />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            {isTargetReached
              ? 'اكتمل النصاب المطلوب للفرق! يمكنك الآن المتابعة للمراجعة وإجراء القرعة في المراحل القادمة.'
              : `تبقى ${remainingSlots} فرق لاكتمال العدد المحدد للبطولة. يمكنك إضافة فرق مباشرة أو فتح التسجيل لمدراء الفرق.`}
          </p>
        </div>
      </div>

      {/* Add Teams Modal */}
      {addModalOpen && (
        <Modal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="إشراك فرق من المنصة"
          subtitle="اختر الفرق التي ترغب في إضافتها مباشرة لقائمة البطولة"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            {loadingAllTeams ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : availableTeams.length === 0 ? (
              <Empty
                icon={Users}
                title="لا توجد فرق أخرى متاحة"
                description="جميع الفرق المتوفرة مسجلة بالفعل في هذه البطولة."
                compact
              />
            ) : (
              <div className="space-y-2">
                {availableTeams.map((t) => {
                  const isChecked = selectedTeams.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectTeam(t.id)}
                          className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">{t.name}</p>
                          <p className="text-[11px] text-slate-400">{t.city || 'بدون مدينة'}</p>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              size="sm"
              loading={busy === 'add'}
              disabled={!selectedTeams.length}
              onClick={handleAddTeams}
            >
              إضافة الفرق المحددة ({selectedTeams.length})
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
