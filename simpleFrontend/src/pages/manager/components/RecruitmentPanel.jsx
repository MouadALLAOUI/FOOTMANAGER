import { MapPin, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Empty, Skeleton } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section, initials, levelLabels, positionLabels } from '../components/shared'
import { photoThumb } from '../../../lib/thumb'

export default function RecruitmentPanel() {
  const { t } = useTranslation()
  const { recruits, loadingBy, openInvite } = useCommandCenter()
  const loading = loadingBy?.recruits

  return (
    <Section
      id="recruitment"
      icon={UserPlus}
      tint="amber"
      title={t('ov.recruitment.title')}
      subtitle={t('ov.recruitment.subtitle')}
      badge={
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600 ring-1 ring-amber-200">
          {recruits.length}
        </span>
      }
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : recruits.length === 0 ? (
        <Empty title={t('ov.recruitment.emptyTitle')} description={t('ov.recruitment.emptyDesc')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recruits.map((r) => {
            const name = r.user?.name || r.player_profile?.full_name || r.full_name || t('ov.common.player')
            return (
              <div
                key={r.id ?? r.user_id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition-colors hover:border-amber-200"
              >
                {r.player_profile?.avatar_url || r.player_profile?.photo_url ? (
                  <img loading="lazy" decoding="async" src={photoThumb(r.player_profile)} alt="" className="size-11 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-sm font-black text-amber-600">
                    {initials(name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">{name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold text-slate-400">
                    <span>{positionLabels[r.position] && t('ov.positions.' + r.position) || positionLabels[r.position] || r.player_profile?.position || '—'}</span>
                    {r.skill_level && (
                      <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-black text-violet-600">
                        {levelLabels[r.skill_level] && t('ov.levels.' + r.skill_level) || levelLabels[r.skill_level] || r.skill_level}
                      </span>
                    )}
                    {r.player_profile?.city && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="size-3 text-green-500" />
                        {r.player_profile.city}
                      </span>
                    )}
                  </p>
                </div>
                <Button size="sm" variant="soft" onClick={() => openInvite(r)}>
                  {t('ov.recruitment.invite')}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}
