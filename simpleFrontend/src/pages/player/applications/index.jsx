import { CalendarDays, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Button, Empty, StatusBadge, Badge, SkeletonCards } from '../../../components/dashboard/ui'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'

const typeBadge = {
  apply: 'warning',
  invite: 'info',
}

export default function Applications() {
  const { t } = useTranslation()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/applications').then((r) => r.data))

  const applications = data?.applications || []

  const act = async (id, action) => {
    try {
      if (action === 'cancel') await api.put(`/player/applications/${id}/cancel`)
      else await api.put(`/player/applications/${id}/respond`, { action })
      refetch()
    } catch (e) {
      console.error(e)
    }
  }

  const confirm = useConfirm()
  const confirmCancel = (a) => {
    confirm.run(() => act(a.id, 'cancel'), {
      title: t('player.applications.cancelConfirm'),
      description: t('player.applications.cancelConfirmDesc'),
      confirmLabel: t('player.applications.cancel'),
    })
  }
  const confirmDecline = (a) => {
    confirm.run(() => act(a.id, 'decline'), {
      title: t('player.applications.declineConfirm'),
      description: t('player.applications.declineConfirmDesc'),
      confirmLabel: t('player.applications.decline'),
    })
  }

  return (
    <div>
      <SectionTitle title={t('player.applications.title')} subtitle={t('player.applications.subtitle')} />

      {errorState ? (
        <Card>
          <SectionError state={errorState} onRetry={refetch} />
        </Card>
      ) : loading ? (
        <SkeletonCards count={3} className="space-y-3" />
      ) : applications.length === 0 ? (
        <Card>
          <Empty title={t('player.applications.empty')} description={t('player.applications.emptyDesc')} />
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => {
            const m = a.match_request
            const pending = a.status === 'pending'
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900">{m?.host_team?.name || t('player.feed.team')}</p>
                      <Badge variant={typeBadge[a.type] || 'neutral'}>
                        {a.type === 'invite' ? t('player.applications.typeInvite') : t('player.applications.typeApply')}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-green-500" />
                        {m?.match_datetime
                          ? new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(m.match_datetime))
                          : '—'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-green-500" />
                        {m?.stadium?.name || t('player.feed.stadium')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {pending && a.type === 'apply' && (
                      <Button variant="outline" size="sm" onClick={() => confirmCancel(a)}>
                        {t('player.applications.cancel')}
                      </Button>
                    )}
                    {pending && a.type === 'invite' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => confirmDecline(a)}>
                          {t('player.applications.decline')}
                        </Button>
                        <Button size="sm" onClick={() => act(a.id, 'accept')}>
                          {t('player.applications.accept')}
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

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        cancelLabel={confirm.options.cancelLabel}
        tone={confirm.options.tone}
        onConfirm={confirm.confirm}
        onClose={confirm.close}
      />
    </div>
  )
}
