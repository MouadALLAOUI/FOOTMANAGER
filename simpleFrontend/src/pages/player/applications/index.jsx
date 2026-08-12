import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, Spinner, SectionTitle, Button, Empty, StatusBadge } from '../../../components/dashboard/ui'

const typeLabels = { apply: 'طلب انضمام', invite: 'دعوة من مسير' }

export default function Applications() {
  const { data, loading, refetch } = useApi(() => api.get('/player/applications').then((r) => r.data))

  const applications = data?.applications || []

  const act = async (id, action) => {
    if (action === 'cancel' && !window.confirm('إلغاء هذا الطلب؟')) return
    try {
      if (action === 'cancel') await api.put(`/player/applications/${id}/cancel`)
      else await api.put(`/player/applications/${id}/respond`, { action })
      refetch()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <SectionTitle title="طلباتي ودعواتي" subtitle="حالة طلبات الانضمام والدعوات المستلمة" />

      {loading ? (
        <Spinner />
      ) : applications.length === 0 ? (
        <Card>
          <Empty title="لا توجد طلبات أو دعوات" description="تقدم للمباريات من صفحة المباريات المتاحة" />
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => {
            const m = a.match_request
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-white">{m?.host_team?.name || 'مباراة'}</p>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                        {typeLabels[a.type] || a.type}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      {m?.match_datetime ? new Date(m.match_datetime).toLocaleString('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      {' • '}{m?.stadium?.name || 'ملعب غير محدد'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {a.status === 'pending' && a.type === 'apply' && (
                      <Button variant="outline" className="!px-3 !py-1.5 text-xs !text-red-400" onClick={() => act(a.id, 'cancel')}>
                        إلغاء
                      </Button>
                    )}
                    {a.status === 'pending' && a.type === 'invite' && (
                      <>
                        <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={() => act(a.id, 'decline')}>
                          رفض
                        </Button>
                        <Button className="!px-3 !py-1.5 text-xs" onClick={() => act(a.id, 'accept')}>
                          قبول
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
