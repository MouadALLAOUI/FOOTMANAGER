import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Empty, Skeleton } from '../../../components/dashboard/ui'
import { Trophy } from 'lucide-react'
import { StatisticsView } from '../../tournaments/shared'

export default function StatisticsTab({ tournament, refreshKey }) {
  const { t } = useTranslation()

  const { data: stats, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/statistics`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!stats?.summary?.matches_played) {
    return <Empty icon={Trophy} title={t('committee.detail.noStats')} description={t('committee.detail.noStatsDesc')} />
  }

  return <StatisticsView stats={stats} />
}
