import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, Stat, Spinner, SectionTitle, Empty, StatusBadge } from '../../../components/dashboard/ui'
import { faStar, faFutbol, faMedal, faPercent } from '@fortawesome/free-solid-svg-icons'

export default function Overview() {
  const { t, i18n } = useTranslation()
  const { data: statsData } = useApi(() => api.get('/player/stats').then((r) => r.data))
  const { data: profileData } = useApi(() => api.get('/player/profile').then((r) => r.data))
  const { data: matchesData, loading } = useApi(() => api.get('/player/matches').then((r) => r.data))

  const stats = statsData?.stats || {}
  const profile = profileData?.profile
  const matches = matchesData?.matches || []

  const positions = {
    goalkeeper: t('player.overview.positions.goalkeeper'),
    defender: t('player.overview.positions.defender'),
    midfielder: t('player.overview.positions.midfielder'),
    forward: t('player.overview.positions.forward'),
  }

  return (
    <div>
      <SectionTitle title={t('player.overview.title')} subtitle={t('player.overview.subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={faStar} label={t('player.overview.stat.rating')} value={stats.rating ?? 0} />
        <Stat icon={faMedal} label={t('player.overview.stat.points')} value={stats.points ?? 0} />
        <Stat icon={faFutbol} label={t('player.overview.stat.matchesPlayed')} value={stats.matches_played ?? 0} />
        <Stat icon={faPercent} label={t('player.overview.stat.winRate')} value={`${stats.win_rate ?? 0}%`} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card
          title={t('player.overview.profile')}
          action={
            <Link to="/player/profile" className="text-xs font-bold text-green-600 hover:text-green-700">{t('player.overview.edit')}</Link>
          }
        >
          {profile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {profile.photo_url && (
                  <img loading="lazy" decoding="async" src={profile.photo_url} alt="" className="size-14 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-base font-extrabold text-slate-900">{profileData?.user?.name}</p>
                  <p className="text-xs text-slate-500">{positions[profile.position] || t('player.overview.noPosition')} • {profile.city || t('player.overview.noCity')}</p>
                </div>
              </div>
              <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${profile.is_available ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-600'}`}>
                {profile.is_available ? t('player.overview.available') : t('player.overview.unavailable')}
              </span>
            </div>
          ) : (
            <Empty title={t('player.overview.emptyProfile')} description={t('player.overview.emptyProfileDesc')} />
          )}
        </Card>

        <Card
          title={t('player.overview.matches')}
          action={
            <Link to="/player/matches" className="text-xs font-bold text-green-600 hover:text-green-700">{t('player.overview.viewAll')}</Link>
          }
        >
          {loading ? (
            <Spinner />
          ) : matches.length === 0 ? (
            <Empty title={t('player.overview.emptyMatches')} description={t('player.overview.emptyMatchesDesc')} />
          ) : (
            <div className="space-y-3">
              {matches.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{m.host_team?.name || t('player.overview.team')}</p>
                    <p className="text-[11px] text-slate-500">
                      {m.match_datetime ? new Date(m.match_datetime).toLocaleString(i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
