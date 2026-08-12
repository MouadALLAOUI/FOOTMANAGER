import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, Radar, Swords } from 'lucide-react'
import { Button, Empty, Skeleton } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section, initials } from '../components/shared'
import { logoThumb } from '../../../lib/thumb'

export default function MatchMarket() {
  const { t, i18n } = useTranslation()
  const { team, market, loadingBy, openJoin } = useCommandCenter()
  const loading = loadingBy?.market

  const cards = useMemo(() => {
    const mine = team?.city
    return [...market]
      .sort((a, b) => {
        const am = a.host_team?.city === mine ? 0 : 1
        const bm = b.host_team?.city === mine ? 0 : 1
        return am - bm
      })
      .slice(0, 6)
  }, [market, team])

  return (
    <Section
      id="market"
      icon={Radar}
      tint="violet"
      title={t('ov.market.title')}
      subtitle={t('ov.market.subtitle')}
      badge={<span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-600 ring-1 ring-violet-200">{cards.length}</span>}
    >
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Empty title={t('ov.market.emptyTitle')} description={t('ov.market.emptyDesc')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((m) => {
            const dt = m.match_datetime ? new Date(m.match_datetime) : null
            const near = m.host_team?.city && m.host_team?.city === team?.city
            return (
              <div
                key={m.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
              >
                <div className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-violet-500/[0.06] blur-2xl" />
                <div className="flex items-center gap-3">
                  {m.host_team?.logo_url ? (
                    <img loading="lazy" decoding="async" src={logoThumb(m.host_team)} alt="" className="size-11 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-sm font-black text-violet-600">
                      {initials(m.host_team?.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">{m.host_team?.name || t('ov.common.team')}</p>
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <MapPin className="size-3 text-green-500" />
                      {m.host_team?.city || '—'}
                      {near && (
                        <span className="ms-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-600">
                          {t('ov.market.near')}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-600">
                    <Swords className="size-4" />
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-400">
                  {dt && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3 text-green-500" />
                      {new Intl.DateTimeFormat(i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA', { day: 'numeric', month: 'short' }).format(dt)}
                    </span>
                  )}
                  {dt && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3 text-green-500" />
                      {new Intl.DateTimeFormat(i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA', { hour: '2-digit', minute: '2-digit' }).format(dt)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3 text-green-500" />
                    {m.stadium?.name || m.custom_terrain_name || t('ov.common.unspecifiedStadium')}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-black text-slate-700">
                    {m.price_per_player ? (
                      <>
                        {m.price_per_player}
                        <span className="ms-1 text-[10px] font-bold text-slate-400">{t('ov.common.perPlayer')}</span>
                      </>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">{t('ov.common.free')}</span>
                    )}
                  </span>
                  <Button size="sm" onClick={() => openJoin(m)}>
                    {t('ov.market.join')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}
