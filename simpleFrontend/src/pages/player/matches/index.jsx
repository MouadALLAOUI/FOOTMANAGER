import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, Spinner, SectionTitle, StatusBadge, Empty } from '../../../components/dashboard/ui'

export default function Matches() {
  const { data, loading } = useApi(() => api.get('/player/matches').then((r) => r.data))

  const matches = data?.matches || []

  return (
    <div>
      <SectionTitle title="مبارياتي" subtitle="المباريات التي انضممت إليها كلاعب حر" />

      {loading ? (
        <Spinner />
      ) : matches.length === 0 ? (
        <Card>
          <Empty title="لا توجد مباريات بعد" description="اقبل دعوة مسير أو تقدم لمباراة متاحة" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-base font-extrabold text-white">{m.host_team?.name || 'فريق'}</p>
                <StatusBadge status={m.status} />
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-white/50">
                <p>
                  {m.match_datetime ? new Date(m.match_datetime).toLocaleString('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                </p>
                <p>🏟️ {m.stadium?.name || m.custom_terrain_name || 'ملعب غير محدد'}</p>
                {m.price_per_player && <p>💰 {m.price_per_player} درهم / لاعب</p>}
              </div>
              {m.host_score !== null && (
                <div className="mt-4 rounded-xl bg-white/5 p-3 text-center">
                  <span className="text-lg font-extrabold text-white">{m.host_score} - {m.opponent_score}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
