import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin, Ruler, Star, Users } from 'lucide-react'
import {
  usePublicManagerProfile,
  usePublicPlayerProfile,
  usePublicOwnerProfile,
  usePublicCommitteeProfile,
} from '../../api/queries'
import { Badge, Modal, Skeleton } from '../dashboard/ui'
import { logoThumb } from '../../lib/thumb'

function Avatar({ url, name, className = 'size-16 text-xl' }) {
  if (url) return <img src={url} alt="" className={`${className} shrink-0 rounded-full object-cover`} loading="lazy" />
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-full bg-green-100 font-black text-green-700`}>
      {(name || '؟').slice(0, 1)}
    </span>
  )
}

function LoadingBody() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  )
}

function ErrorBody() {
  const { t } = useTranslation()
  return <p className="py-12 text-center text-sm font-semibold text-slate-400">{t('profile.public.loadFailed')}</p>
}

function Field({ icon: Icon, label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-slate-400" />
      <span className="shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className="min-w-0 truncate font-bold text-slate-700">{value}</span>
    </div>
  )
}

function ManagerBody({ id }) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = usePublicManagerProfile(id, { enabled: !!id })
  if (isLoading) return <LoadingBody />
  const m = data?.manager
  if (isError || !m) return <ErrorBody />
  const team = data?.team

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar url={m.avatar_url} name={m.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-slate-900">{m.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="info">{t('profile.public.roles.manager')}</Badge>
            {m.city && <Badge variant="neutral">{m.city}</Badge>}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-slate-100 p-4">
        <Field icon={MapPin} label={t('profile.public.city')} value={m.city} />
        <Field icon={CalendarDays} label={t('profile.public.joined')} value={m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''} />
      </div>

      {team && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Users className="size-3.5" />
            {t('profile.public.team')}
          </p>
          <div className="flex items-center gap-3">
            {team.logo_url ? (
              <img src={logoThumb(team)} alt="" className="size-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100" loading="lazy" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-green-100 text-sm font-black text-green-700">
                {(team.name || '؟').slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-900">{team.name}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                {[team.city, team.category].filter(Boolean).join(' • ')}
              </p>
            </div>
            {team.players_count != null && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                <Users className="size-3 text-slate-400" />
                {team.players_count}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerBody({ id }) {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = usePublicPlayerProfile(id, { enabled: !!id })
  if (isLoading) return <LoadingBody />
  const p = data?.player
  if (isError || !p) return <ErrorBody />
  const team = p.team
  const date = (v) => (v ? new Date(v).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB') : '')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar url={p.avatar_url} name={p.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-slate-900">{p.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="info">{t('profile.public.roles.player')}</Badge>
            {p.position && <Badge variant="neutral">{p.position}</Badge>}
            {p.number != null && <Badge variant="success">#{p.number}</Badge>}
            {p.is_essential && <Badge variant="warning"><Star className="size-3 fill-amber-500 text-amber-500" /></Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-slate-50 p-3 text-center">
          <p className="text-base font-black tabular-nums text-slate-900">{p.age ?? '—'}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('profile.public.age')}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-center">
          <p className="text-base font-black tabular-nums text-slate-900">
            {p.height_cm != null ? `${p.height_cm} ${t('profile.public.cm')}` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('profile.public.height')}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-center">
          <p className="text-base font-black tabular-nums text-slate-900">
            {p.weight_kg != null ? `${p.weight_kg} ${t('profile.public.kg')}` : '—'}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('profile.public.weight')}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-center">
          <p className="text-base font-black text-slate-900">{p.preferred_foot || '—'}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('profile.public.foot')}</p>
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-slate-100 p-4">
        <Field icon={CalendarDays} label={t('profile.public.joined')} value={date(p.joined_at)} />
        {p.skill_level && <Field icon={Ruler} label={t('profile.public.skill')} value={p.skill_level} />}
      </div>

      {team && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          {team.logo_url ? (
            <img src={logoThumb(team)} alt="" className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" loading="lazy" />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-100 text-sm font-black text-green-700">
              {(team.name || '؟').slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <Users className="size-3.5" />
              {t('profile.public.team')}
            </p>
            <p className="truncate text-sm font-extrabold text-slate-900">{team.name}</p>
            {team.city && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <MapPin className="size-3" />
                {team.city}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OwnerBody({ id }) {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = usePublicOwnerProfile(id, { enabled: !!id })
  if (isLoading) return <LoadingBody />
  const o = data?.owner
  if (isError || !o) return <ErrorBody />

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar url={o.avatar_url} name={o.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-slate-900">{o.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="warning">{t('profile.public.roles.owner')}</Badge>
            {o.city && <Badge variant="neutral">{o.city}</Badge>}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-slate-100 p-4">
        <Field icon={MapPin} label={t('profile.public.city')} value={o.city} />
        <Field icon={CalendarDays} label={t('profile.public.joined')} value={o.joined_at ? new Date(o.joined_at).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB') : ''} />
        <Field icon={Users} label={t('profile.public.terrainsCount')} value={o.terrains_count ?? 0} />
      </div>

      {(o.terrains || []).length > 0 && (
        <div className="space-y-2">
          {o.terrains.map((ter) => (
            <div key={ter.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-base ring-1 ring-slate-200">{ter.type || '⚽'}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">{ter.name}</p>
                {ter.city && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <MapPin className="size-3" />
                    {ter.city}
                  </p>
                )}
              </div>
              {ter.price_per_hour != null && (
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                  {ter.price_per_hour} {t('profile.public.priceHour')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommitteeBody({ id }) {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = usePublicCommitteeProfile(id, { enabled: !!id })
  if (isLoading) return <LoadingBody />
  const c = data?.committee
  if (isError || !c) return <ErrorBody />

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar url={c.avatar_url} name={c.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-slate-900">{c.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="success">{t('profile.public.roles.committee')}</Badge>
            {c.city && <Badge variant="neutral">{c.city}</Badge>}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 rounded-2xl border border-slate-100 p-4">
        <Field icon={MapPin} label={t('profile.public.city')} value={c.city} />
        <Field icon={CalendarDays} label={t('profile.public.joined')} value={c.joined_at ? new Date(c.joined_at).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB') : ''} />
      </div>
    </div>
  )
}

export default function UserProfileModal({ user, onClose }) {
  const { t } = useTranslation()
  const body = user ? (
    user.type === 'manager' ? <ManagerBody id={user.id} />
      : user.type === 'player' ? <PlayerBody id={user.id} />
        : user.type === 'owner' ? <OwnerBody id={user.id} />
          : user.type === 'committee' ? <CommitteeBody id={user.id} />
            : null
  ) : null

  return (
    <Modal open={Boolean(user)} onClose={onClose} title={user?.fallback?.name || t('profile.public.userTitle')}>
      {body}
    </Modal>
  )
}