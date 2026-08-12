import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Empty, Skeleton } from '../../../components/dashboard/ui'
import { Trophy } from 'lucide-react'
import { StandingsTable } from '../../tournaments/shared'

export default function StandingsTab({ tournament, refreshKey }) {
  const { t } = useTranslation()

  const { data, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/standings`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!data?.groups?.length) {
    return <Empty icon={Trophy} title={t('committee.detail.noStandings')} description={t('committee.detail.noStandingsDesc')} />
  }

  return <StandingsTable groups={data.groups} />
}
