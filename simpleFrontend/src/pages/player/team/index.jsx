import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Star, Users } from 'lucide-react'
import api from '../../../api/client'
import { Skeleton } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'

const positionLabels = { goalkeeper: 'حارس مرمى', defender: 'مدافع', midfielder: 'وسط ميدان', forward: 'مهاجم' }

export default function PlayerTeam() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await api.get('/player/my-team')
        if (active) setData(res.data)
      } catch (e) {
        if (active) setError(e.response?.data?.message || t('common.error'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm font-bold text-slate-400">{error}</p>
      </div>
    )
  }

  if (!data?.membership) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="mx-auto size-12 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-500">{t('player.team.noTeam')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('player.team.noTeamDesc')}</p>
        </div>
      </div>
    )
  }

  const { membership, team, teammates } = data

  return (
    <div className="space-y-5 p-4">
      {/* Team Card */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-4">
          <TeamLogo team={team} className="size-16" rounded="rounded-2xl" fontSize="text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-slate-900">{team.name}</p>
            <p className="text-xs font-semibold text-slate-400">
              {team.city || ''} {team.city && team.category ? '• ' : ''}{team.category === 'adult' ? 'كبار' : team.category === 'teenager' ? 'شباب' : team.category || ''}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200">
            {team.member_count} {t('player.team.members')}
          </span>
        </div>
      </div>

      {/* My Info */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">{t('player.team.myInfo')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('player.team.position'), value: positionLabels[membership.position] || membership.position || '—' },
            { label: t('player.team.number'), value: membership.number ?? '—' },
            { label: t('player.team.status'), value: membership.is_essential ? t('player.team.essential') : t('player.team.member') },
            { label: t('player.team.joined'), value: membership.joined_at ? new Date(membership.joined_at).toLocaleDateString('ar') : '—' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-center">
              <p className="text-sm font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
        {membership.is_essential && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 ring-1 ring-amber-200">
            <Star className="size-4 fill-amber-400 text-amber-500" />
            <p className="text-xs font-bold text-amber-700">{t('player.team.essentialNotice')}</p>
          </div>
        )}
      </div>

      {/* Teammates */}
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900">{t('player.team.teammates')}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {teammates.length}
          </span>
        </div>
        <div className="space-y-2">
          {teammates.map((tm) => (
            <div key={tm.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-black ${
                  tm.number != null
                    ? 'bg-slate-900 text-white'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {tm.number ?? tm.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-slate-900">{tm.name}</p>
                  {tm.is_essential && (
                    <Star className="size-3 shrink-0 fill-amber-400 text-amber-500" />
                  )}
                </div>
                <p className="text-[11px] font-semibold text-slate-400">
                  {positionLabels[tm.position] || tm.position || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
