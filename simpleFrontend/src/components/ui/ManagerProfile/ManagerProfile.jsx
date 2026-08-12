import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, UserRound, Users } from 'lucide-react'

export default function ManagerProfile({ manager, team, className = '' }) {
  const { t } = useTranslation()
  const m = manager || {}
  const hasProfile = !!(m.name || m.phone || m.email || m.profile_image)
  const [imgFailed, setImgFailed] = useState(false)
  const name = m.name?.trim()
  const initial = name ? name.slice(0, 1) : '؟'
  const image = !imgFailed && m.profile_image ? m.profile_image : null

  useEffect(() => {
    setImgFailed(false)
  }, [m.id, m.profile_image])

  return (
    <div className={className}>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
        <UserRound className="size-3.5 text-slate-400" />
        {t('terrain.calendar.bookerSectionTitle')}
      </p>

      {hasProfile ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {image ? (
              <img
                src={image}
                alt={name || ''}
                loading="lazy"
                onError={() => setImgFailed(true)}
                className="size-11 shrink-0 rounded-2xl object-cover ring-1 ring-black/5"
              />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-sm font-black text-green-700">
                {initial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-900">{name || t('terrain.calendar.unknownManager')}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Users className="size-3 shrink-0" />
                <span className="truncate">
                  {team?.name ? `${team.name} • ${t('terrain.calendar.bookerRole')}` : t('terrain.calendar.bookerRole')}
                </span>
              </p>
            </div>
          </div>

          {(m.phone || m.email) && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {m.phone && (
                <a
                  href={`tel:${m.phone}`}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                >
                  <Phone className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 truncate" dir="ltr">
                    {m.phone}
                  </span>
                </a>
              )}
              {m.email && (
                <a
                  href={`mailto:${m.email}`}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                >
                  <Mail className="size-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 truncate" dir="ltr">
                    {m.email}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-center text-xs font-bold text-slate-400">
          {t('terrain.calendar.bookerUnavailable')}
        </p>
      )}
    </div>
  )
}
