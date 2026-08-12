import { useState } from 'react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, Spinner, SectionTitle, Button, Empty, Modal } from '../../../components/dashboard/ui'
import { toast } from '../../../components/ui/Toast'
import { logoThumb } from '../../../lib/thumb'

export default function Feed() {
  const { data, loading, refetch } = useApi(() => api.get('/player/match-feed').then((r) => r.data))
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const matches = data?.matches || []

  const apply = async () => {
    setBusy(true)
    try {
      const res = await api.post(`/player/matches/${selected.id}/apply`, { message: message || undefined })
      toast.success(res.data.message || 'تم إرسال الطلب')
      setSelected(null)
      setMessage('')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر إرسال الطلب')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <SectionTitle title="المباريات المتاحة" subtitle="مباريات تبحث عن لاعب حر للانضمام" />

      {loading ? (
        <Spinner />
      ) : matches.length === 0 ? (
        <Card>
          <Empty title="لا توجد مباريات متاحة حالياً" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-white">{m.host_team?.name || 'فريق'}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {m.host_team?.city || ''} • {m.host_team?.category || 'بدون فئة'}
                  </p>
                </div>
                {m.host_team?.logo_url && (
                  <img loading="lazy" decoding="async" src={logoThumb(m.host_team)} alt="" className="size-12 rounded-2xl object-cover" />
                )}
              </div>

              <div className="mt-4 space-y-2 text-[12px] text-white/60">
                <p>📅 {m.match_datetime ? new Date(m.match_datetime).toLocaleString('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                <p>🏟️ {m.stadium?.name || m.custom_terrain_name || 'ملعب غير محدد'}</p>
                {m.price_per_player && <p>💰 {m.price_per_player} درهم / لاعب</p>}
              </div>

              {m.needs_players && (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2.5">
                  <span className="text-[11px] font-bold text-white/60">👥 اللاعبون المطلوبون</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                      (m.players_remaining ?? 0) === 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {m.players_joined ?? 0} / {m.players_needed}
                  </span>
                </div>
              )}

              <div className="mt-4">
                <Button className="w-full" disabled={(m.players_remaining ?? 0) === 0} onClick={() => setSelected(m)}>
                  {(m.players_remaining ?? 0) === 0 ? 'اكتمل عدد اللاعبين' : 'التقدم للمباراة'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`التقدم لمباراة ${selected.host_team?.name}`}>
          <div className="space-y-4">
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              placeholder="رسالة اختيارية للمسير..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>إلغاء</Button>
              <Button className="flex-1" disabled={busy} onClick={apply}>
                {busy ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
