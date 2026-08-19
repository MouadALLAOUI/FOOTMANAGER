import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Network, RefreshCw, UserCheck } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Empty, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import CommitteeBracket from '../../../domains/committee/components/CommitteeBracket'
import TournamentStageBar from '../../../components/tournaments/TournamentStageBar'

export default function BracketTab({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)

  const hasKnockout = !['groups_only', 'league'].includes(tournament.tournament_format)

  const { data, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/bracket`).then((r) => r.data.data),
    [tournament.id, refreshKey],
    { enabled: hasKnockout },
  )

  const createBracket = async () => {
    if (busy) return
    setBusy('create')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/bracket`)
      toast.success(t('committee.detail.bracketCreated'))
      refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(null)
    }
  }

  const populate = async () => {
    if (busy) return
    setBusy('populate')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/bracket/populate`)
      toast.success(t('committee.detail.bracketPopulated'))
      refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(null)
    }
  }

  const syncBracket = async () => {
    if (busy) return
    setBusy('sync')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/bracket/sync`)
      toast.success(t('committee.detail.bracketSynced'))
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(null)
    }
  }

  if (!hasKnockout) {
    return (
      <Empty
        icon={Network}
        title={t('committee.detail.noBracket')}
        description={t('committee.detail.noBracketDesc')}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  const rounds = data || []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" loading={busy === 'sync'} onClick={syncBracket}>
          <RefreshCw className="size-4" />
          {t('committee.detail.syncBracket')}
        </Button>
        <Button size="sm" variant="outline" loading={busy === 'create'} onClick={createBracket}>
          <Network className="size-4" />
          {t('committee.detail.createBracket')}
        </Button>
        <Button size="sm" loading={busy === 'populate'} onClick={populate}>
          <UserCheck className="size-4" />
          {t('committee.detail.populateBracket')}
        </Button>
      </div>
      {rounds.length === 0 ? (
        <Empty icon={Network} title={t('committee.detail.bracketEmpty')} description={t('committee.detail.bracketEmptyDesc')} />
      ) : (
        <>
          <TournamentStageBar rounds={rounds} />
          <CommitteeBracket rounds={rounds} />
        </>
      )}
    </div>
  )
}

