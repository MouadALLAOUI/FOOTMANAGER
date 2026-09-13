import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Lock } from 'lucide-react'
import api from '../../../api/client'
import { Skeleton, Toggle } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

/**
 * Team profile visibility switch (public/private) in manager settings.
 * Private shows only the team's basic identity to others; public shows the
 * full profile. Going public is subscription-gated on the backend — the
 * error toast explains it and the switch stays on "private".
 */
export default function TeamVisibilityCard() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    api
      .get('/manager/team-profile')
      .then((res) => {
        if (mounted) setTeam(res.data?.team || null)
      })
      .catch(() => {
        if (mounted) setTeam(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const isPublic = team?.visibility !== 'private'

  const toggle = async (next) => {
    if (saving || loading || next === isPublic) return
    setSaving(true)
    try {
      const res = await api.put('/manager/team-profile', { visibility: next ? 'public' : 'private' })
      setTeam((prev) => ({ ...(prev || {}), visibility: next ? 'public' : 'private' }))
      toast.success(res.data?.message || t('dash.profileVisibilityUpdated'))
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          {isPublic && !loading ? <Eye className="size-4" /> : <Lock className="size-4" />}
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">{t('dash.profileVisibility')}</h3>
          <p className="text-[11px] font-semibold text-slate-400">{t('dash.profileVisibilityHint')}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-14 rounded-2xl" />
      ) : !team ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-4 text-center text-xs font-semibold text-slate-400">
          {t('dash.noTeamLinkedToYourAccountYet')}
        </p>
      ) : (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            isPublic ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-100 bg-slate-50/60'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">{isPublic ? t('dash.profileVisibilityPublic') : t('dash.profileVisibilityPrivate')}</p>
          </div>
          <Toggle checked={isPublic} disabled={saving} onChange={toggle} />
        </div>
      )}
    </div>
  )
}
