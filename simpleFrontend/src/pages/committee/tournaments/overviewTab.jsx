import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Eye, Globe, Loader2, Trash2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Card, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'

export default function OverviewTab({ tournament, refresh, refreshKey, isDraft }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)

  const { data: progress, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/progress`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const doneCount = (progress?.stages || []).filter((s) => s.done).length
  const totalCount = (progress?.stages || []).length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const stats = [
    { label: t('committee.detail.stat.teams'), value: tournament.stats?.registered_teams ?? 0 },
    { label: t('committee.detail.stat.groups'), value: tournament.stats?.groups ?? 0 },
    { label: t('committee.detail.stat.fixtures'), value: tournament.stats?.fixtures ?? 0 },
    { label: t('committee.detail.stat.finished'), value: tournament.stats?.finished_matches ?? 0 },
  ]

  const publish = async () => {
    setBusy('publish')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/publish`)
      toast.success(t('committee.detail.publishedToast'))
      refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!window.confirm(t('committee.detail.deleteConfirm'))) return
    setBusy('delete')
    try {
      await api.delete(`/committee/tournaments/${tournament.id}`)
      toast.success(t('committee.detail.deletedToast'))
      window.location.href = '/committee/tournaments'
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-2xl font-black tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <Card title={t('committee.detail.progress')} subtitle={t('committee.detail.progressDesc')}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-2" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{t('committee.detail.progressLabel')}</span>
                <span>{doneCount}/{totalCount} • {pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(progress?.stages || []).map((stage) => (
                <div key={stage.key} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full ${
                      stage.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {stage.done ? <Check className="size-4" /> : <Loader2 className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700">{stage.label}</p>
                    {stage.meta?.registered != null && (
                      <p className="text-[11px] text-slate-400">{stage.meta.registered}/{stage.meta.expected}</p>
                    )}
                    {stage.meta?.fixtures != null && (
                      <p className="text-[11px] text-slate-400">{stage.meta.fixtures}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <>
            <Button loading={busy === 'publish'} onClick={publish}>
              <Globe className="size-4" />
              {t('committee.detail.publish')}
            </Button>
            <Button variant="dangerSoft" loading={busy === 'delete'} onClick={remove}>
              <Trash2 className="size-4" />
              {t('committee.detail.delete')}
            </Button>
          </>
        ) : (
          <Link
            to={`/tournaments/${tournament.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-500 px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition-colors hover:bg-green-600"
          >
            <Eye className="size-4" />
            {t('committee.detail.viewPublic')}
          </Link>
        )}
      </div>
    </div>
  )
}
