import { useState } from 'react'
import { AlertTriangle, Check, CheckCheck, Clock, ShieldAlert, Sparkles, UserCheck, Users, Wallet, X } from 'lucide-react'
import { Badge, Button, Card, Empty, Skeleton, StatusBadge } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import TeamSquadModal from '../teamSquadModal'

export default function Step4TeamReview({ tournament, refresh }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [squadTeam, setSquadTeam] = useState(null)

  const { data: registrations, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/registrations`).then((r) => r.data.data),
    [tournament.id],
  )

  const allRegistrations = registrations || []
  const pendingRegistrations = allRegistrations.filter((r) => r.status === 'pending')
  const approvedTeams = allRegistrations.filter((r) => r.status === 'registered')
  const targetTeams = Number(tournament.teams_count || 8)

  const handleRespond = async (teamId, action) => {
    setBusy(`respond-${teamId}`)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/${action}`)
      toast.success(action === 'approve' ? 'تمت الموافقة على انضمام الفريق' : 'تم رفض طلب الانضمام')
      refetch()
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleTogglePayment = async (teamId, isPaid) => {
    setBusy(`pay-${teamId}`)
    try {
      const endpoint = isPaid ? 'payment/unmark' : 'payment'
      await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/${endpoint}`)
      toast.success(isPaid ? 'تم إلغاء تأكيد دفع الرسوم' : 'تم تأكيد استلام رسوم الاشتراك')
      refetch()
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Pending Requests Queue */}
        <Card
          title="طلبات الانضمام المعلقة للمراجعة"
          subtitle={pendingRegistrations.length ? `يوجد ${pendingRegistrations.length} طلبات بانتظار قرار اللجنة` : 'لا توجد طلبات معلقة حالياً'}
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : pendingRegistrations.length === 0 ? (
            <Empty
              icon={CheckCheck}
              title="تمت معالجة جميع الطلبات"
              description="لا توجد أي طلبات انضمام قيد الانتظار حالياً."
              compact
            />
          ) : (
            <div className="space-y-3">
              {pendingRegistrations.map((r) => {
                const team = r.team || {}
                return (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700 font-extrabold text-sm shrink-0">
                        {team.name ? team.name.slice(0, 2).toUpperCase() : 'FC'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{team.name}</p>
                        <p className="text-xs text-slate-500">
                          {team.city || 'بدون مدينة'} {team.manager?.name ? `• مدرب/مدير: ${team.manager.name}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy === `respond-${team.id}`}
                        onClick={() => handleRespond(team.id, 'approve')}
                      >
                        <Check className="size-3.5" />
                        قبول الفريق
                      </Button>
                      <Button
                        size="sm"
                        variant="dangerSoft"
                        loading={busy === `respond-${team.id}`}
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من رغبتك في رفض هذا الطلب؟')) {
                            handleRespond(team.id, 'reject')
                          }
                        }}
                      >
                        <X className="size-3.5" />
                        رفض
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Approved Teams Roster & Payment Status */}
        <Card
          title="الفرق المؤكدة رسمياً للبطولة"
          subtitle={`المجموع: ${approvedTeams.length} فرق معتمدة`}
        >
          {loading ? (
            <Skeleton className="h-24" />
          ) : approvedTeams.length === 0 ? (
            <Empty
              icon={Users}
              title="لم يتم تأكيد أي فريق بعد"
              description="قم بقبول طلبات الانضمام أو إضافة فرق في الخطوة السابقة لتأكيدها."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {approvedTeams.map((entry) => {
                const team = entry.team || {}
                const isPaid = entry.payment_status === 'paid'
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs shrink-0">
                        {team.name ? team.name.slice(0, 2).toUpperCase() : 'FC'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-800 truncate">{team.name}</p>
                        <button
                          type="button"
                          onClick={() => setSquadTeam(entry)}
                          className="text-[11px] font-bold text-sky-600 hover:underline"
                        >
                          عرض قائمة اللاعبين
                        </button>
                      </div>
                    </div>

                    {tournament.requires_registration_fee && (
                      <button
                        type="button"
                        onClick={() => handleTogglePayment(team.id, isPaid)}
                        disabled={busy === `pay-${team.id}`}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title={isPaid ? 'اضغط للإلغاء' : 'اضغط لتأكيد الدفع'}
                      >
                        <Wallet className="size-3" />
                        {isPaid ? 'تم دفع الرسوم' : 'غير مدفوع'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Verification & Quota Guidance Sidebar */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
            <UserCheck className="size-4 text-emerald-600" />
            <span>فحص جاهزية النصاب للقرعة</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">الفرق المعتمدة:</span>
              <span className="font-extrabold font-mono text-slate-900">{approvedTeams.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">العدد المطلوب للصيغة:</span>
              <span className="font-extrabold font-mono text-slate-900">{targetTeams}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 font-bold">
              <span>الحالة:</span>
              <span className={approvedTeams.length === targetTeams ? 'text-emerald-600' : 'text-amber-600'}>
                {approvedTeams.length === targetTeams ? 'جاهز لإجراء القرعة' : `${Math.abs(targetTeams - approvedTeams.length)} فرق متبقية`}
              </span>
            </div>
          </div>

          {approvedTeams.length !== targetTeams && (
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50/70 p-3 text-[11px] text-amber-800 border border-amber-200/60">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                لضمان عدالة القرعة وتفادي جداول ناقصة، يجب أن يتطابق عدد الفرق المعتمدة مع نصاب البطولة ({targetTeams} فرق) قبل إنشاء المباريات.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Squad Modal */}
      {squadTeam && (
        <TeamSquadModal
          tournament={tournament}
          team={squadTeam.team}
          onClose={() => setSquadTeam(null)}
          refresh={refetch}
        />
      )}
    </div>
  )
}
