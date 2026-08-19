import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, StatusBadge, Empty, SkeletonCards } from '../../../components/dashboard/ui'

export default function Matches() {
  const { t } = useTranslation()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/matches').then((r) => r.data))

  const matches = data?.matches || []

  return (
    <div>
      <SectionTitle title={t('player.matches.title')} subtitle={t('player.matches.subtitle')} />

      {errorState ? (
        <Card>
          <SectionError state={errorState} onRetry={refetch} />
        </Card>
      ) : loading ? (
        <SkeletonCards count={4} className="grid gap-4 lg:grid-cols-2" />
      ) : matches.length === 0 ? (
        <Card>
          <Empty title={t('player.matches.empty')} description={t('player.matches.emptyDesc')} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-base font-extrabold text-slate-900">{m.host_team?.name || t('player.feed.team')}</p>
                <StatusBadge status={m.status} />
              </div>
              <div className="mt-3 space-y-2 text-[12px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-green-500" />
                  {m.match_datetime
                    ? new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(m.match_datetime))
                    : '—'}
                </span>
                {m.match_datetime && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-green-500" />
                    {new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.match_datetime))}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-green-500" />
                  {m.stadium?.name || m.custom_terrain_name || t('player.matches.stadium')}
                </span>
                {m.price_per_player ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-green-500" />
                    {t('player.matches.perPlayer', { price: m.price_per_player })}
                  </span>
                ) : null}
              </div>
              {m.host_score !== null && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400">{t('player.matches.score')}</span>
                  <span className="ms-2 text-lg font-black text-slate-900">
                    {m.host_score} - {m.opponent_score}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
