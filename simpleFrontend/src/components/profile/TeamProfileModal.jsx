import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin, Shield, Target, Users, Trophy } from 'lucide-react'
import { usePublicTeamProfile } from '../../api/queries'
import { Modal, Skeleton, Badge } from '../dashboard/ui'
import TeamLogo from './TeamLogo'

function Stat({ label, value, accent = 'text-slate-900' }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className={`text-base font-black tabular-nums ${accent}`}>{value ?? '—'}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-slate-400" />
      <span className="shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className="min-w-0 truncate font-bold text-slate-700">{value}</span>
    </div>
  )
}

export default function TeamProfileModal({ team, onClose }) {
  const { t } = useTranslation()
  const teamId = team?.id
  const { data, isLoading, isError, error } = usePublicTeamProfile(teamId, { enabled: !!teamId })
  const info = data?.team
  const display = info || team || {}
  const isHidden = (info && info.visibility === 'private') || error?.response?.status === 404

  return (
    <Modal open={Boolean(team)} onClose={onClose} title={display.name || t('profile.public.teamTitle')} subtitle={display.city}>
      {isLoading && !info ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : isHidden ? (
        <div className="py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-slate-100 text-slate-400">
            <Shield className="size-7" />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">{t('profile.public.teamPrivate')}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">{t('profile.public.teamPrivateDesc')}</p>
        </div>
      ) : isError || !info ? (
        <p className="py-12 text-center text-sm font-semibold text-slate-400">{t('profile.public.loadFailed')}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <TeamLogo team={info} className="size-16" rounded="rounded-2xl" ring="ring-1 ring-slate-100" fontSize="text-xl" />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-lg font-black text-slate-900">{info.name}</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {info.category && (
                  <Badge variant="success">{info.category}</Badge>
                )}
                {info.level && <Badge variant="info">{t(`matchesPage.teams.levels.${info.level}`)}</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Stat label={t('profile.public.points')} value={info.points} accent="text-emerald-600" />
            <Stat label={t('profile.public.played')} value={info.matches_played} />
            <Stat label={t('profile.public.wins')} value={info.wins} />
            <Stat label={t('profile.public.draws')} value={info.draws} />
            <Stat label={t('profile.public.losses')} value={info.losses} />
            <Stat label={t('profile.public.goals')} value={info.goals_for} />
          </div>

          <div className="space-y-2.5 rounded-2xl border border-slate-100 p-4">
            <Row icon={Users} label={t('profile.public.playersCount')} value={info.players_count ?? '—'} />
            <Row icon={CalendarDays} label={t('profile.public.founded')} value={info.founded_year ?? '—'} />
            <Row icon={Shield} label={t('profile.public.association')} value={info.association_name} />
            <Row icon={MapPin} label={t('profile.public.city')} value={info.city} />
            {info.description && (
              <div className="flex items-start gap-2.5 text-sm">
                <Target className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span className="shrink-0 text-xs font-bold text-slate-400">{t('profile.public.description')}</span>
                <span className="min-w-0 text-sm leading-relaxed text-slate-600">{info.description}</span>
              </div>
            )}
          </div>

          {info.manager && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              {info.manager.avatar_url ? (
                <img src={info.manager.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-green-100 text-sm font-black text-green-700">
                  {(info.manager.name || '؟').slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <Trophy className="size-3.5" />
                  {t('profile.public.manager')}
                </p>
                <p className="truncate text-sm font-extrabold text-slate-900">{info.manager.name}</p>
                {info.manager.city && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <MapPin className="size-3" />
                    {info.manager.city}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}