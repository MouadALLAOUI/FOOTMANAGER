import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, MapPin } from 'lucide-react'
import { Skeleton } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section, formatTime, initials } from '../components/shared'

export default function ActivityFeed() {
  const { t } = useTranslation()
  const { market, loadingBy, openMatch } = useCommandCenter()
  const loading = loadingBy?.market

  const list = useMemo(() => market.slice(0, 8), [market])

  const statusLabel = (s) =>
    ({
      completed: t('ov.activity.statusCompleted'),
      ongoing: t('ov.activity.statusOngoing'),
      upcoming: t('ov.activity.statusUpcoming'),
      open: t('ov.activity.statusOpen'),
      cancelled: t('ov.activity.statusCancelled'),
    })[s] || s

  const statusTint = (s) =>
    ({
      completed: 'bg-emerald-50 text-emerald-600',
      ongoing: 'bg-amber-50 text-amber-600',
      upcoming: 'bg-sky-50 text-sky-600',
      open: 'bg-violet-50 text-violet-600',
      cancelled: 'bg-rose-50 text-rose-500',
    })[s] || 'bg-slate-100 text-slate-500'

  return (
    <Section
      id="activity"
      icon={Activity}
      tint="slate"
      title={t('ov.activity.title')}
      subtitle={t('ov.activity.subtitle')}
    >
      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-52 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-xs font-semibold text-slate-400">
          {t('ov.activity.empty')}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {list.map((m) => {
            const home = m.host_team || {}
            const away = m.opponent_team || null
            return (
              <button
                key={m.id}
                onClick={() => openMatch(m)}
                className="w-52 shrink-0 rounded-2xl border border-slate-100 bg-white p-3 text-start transition-colors hover:border-green-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${statusTint(m.status)}`}>
                    {statusLabel(m.status)}
                  </span>
                  {m.match_datetime && (
                    <span className="text-[10px] font-bold text-slate-400">{formatTime(m.match_datetime)}</span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600">
                    {initials(home.name)}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-800">{home.name || t('ov.common.team')}</p>
                  {typeof m.home_score === 'number' && <span className="text-xs font-black text-slate-800">{m.home_score}</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {away ? (
                    <>
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose-50 text-[10px] font-black text-rose-500">
                        {initials(away.name)}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-800">{away.name || t('ov.common.opponent')}</p>
                      {typeof m.away_score === 'number' && (
                        <span className="text-xs font-black text-slate-800">{m.away_score}</span>
                      )}
                    </>
                  ) : (
                    <p className="flex-1 text-[11px] font-semibold text-slate-400">{t('ov.activity.waitingOpponent')}</p>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1 truncate text-[10px] font-semibold text-slate-400">
                  <MapPin className="size-3 text-green-500" />
                  {m.stadium?.name || m.custom_terrain_name || t('ov.common.unspecifiedStadium')}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </Section>
  )
}
