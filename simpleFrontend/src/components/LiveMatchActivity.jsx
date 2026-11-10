import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, MapPin, Radio, Sparkles } from 'lucide-react'
import { Badge } from './dashboard/ui'
import TeamLogo from './profile/TeamLogo'
import { LIVE_STATUSES } from '../data/fixtures'

const EVENT_COLORS = {
  goal: 'bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]',
  yellow_card: 'bg-[#D9822B]/15 text-[#D9822B] dark:bg-[#FFC857]/20 dark:text-[#FFC857]',
  red_card: 'bg-[#D93636]/15 text-[#D93636] dark:bg-[#FF6868]/20 dark:text-[#FF6868]',
  substitution: 'bg-[#0284C7]/15 text-[#0284C7] dark:bg-[#38BDF8]/20 dark:text-[#38BDF8]',
  penalty_scored: 'bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]',
  penalty_missed: 'bg-[#F7F8F5] text-[#65706A] dark:bg-[#252B27] dark:text-[#B2B9B3]',
}

function EventChip({ event, t }) {
  const cls = EVENT_COLORS[event.event_type] || 'bg-[#F7F8F5] text-[#65706A] dark:bg-[#252B27] dark:text-[#B2B9B3]'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {event.minute != null && <span className="font-black tabular-nums">{event.minute}'</span>}
      <span>{t(`committee.detail.events.${event.event_type}`, { defaultValue: event.event_type })}</span>
      {event.player?.name && <span className="truncate max-w-[8rem]">· {event.player.name}</span>}
    </span>
  )
}

export default function LiveMatchActivity({ load, deps = [], pollMs = 15000, enabled = true }) {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    const tick = async () => {
      try {
        const res = await load()
        if (!cancelled) setItems(Array.isArray(res) ? res : [])
      } catch {
        // silent: live feed is non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    tick()
    const id = setInterval(tick, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, pollMs, ...deps])

  const live = items.filter((f) => LIVE_STATUSES.has(f.match?.status))
  const recentWithEvents = items.filter((f) => !LIVE_STATUSES.has(f.match?.status) && (f.events?.length ?? 0) > 0)

  if (loading && items.length === 0) return null
  if (live.length === 0 && recentWithEvents.length === 0) return null

  return (
    <div id="live-matches-section" className="space-y-3 scroll-mt-28">
      {live.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#E11D48]/35 bg-white dark:bg-[#1B201D] p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E11D48] px-3 py-1 text-xs font-black text-white shadow-2xs">
                <Radio className="size-3.5 animate-pulse" />
                <span>{t('committee.detail.live.badge', 'مباريات مباشرة')}</span>
              </span>
              <span className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                {t('committee.detail.live.subtitle', { count: live.length })}
              </span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {live.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5"
              >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  {f.home_team?.id != null ? (
                    <Link
                      to={`/teams/${f.home_team.id}`}
                      className="group flex min-w-0 items-center gap-2 hover:opacity-85 transition-opacity"
                    >
                      <TeamLogo team={f.home_team} className="size-8 shrink-0" />
                      <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover:underline">
                        {f.home_team?.name}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamLogo team={f.home_team} className="size-8 shrink-0" />
                      <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                        {f.home_team?.name}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-center px-2">
                    <span
                      dir="ltr"
                      className="inline-flex items-center rounded-xl bg-[#111313] dark:bg-[#D0FF38] px-2.5 py-1 text-sm font-black text-white dark:text-[#111313] tabular-nums"
                    >
                      {f.match?.home_score ?? 0} - {f.match?.away_score ?? 0}
                    </span>
                    <Badge variant="danger">
                      {f.match?.current_minute != null
                        ? `${f.match.current_minute}'`
                        : t(`status.${f.match?.status}`)}
                    </Badge>
                  </div>
                  {f.away_team?.id != null ? (
                    <Link
                      to={`/teams/${f.away_team.id}`}
                      className="group flex min-w-0 items-center justify-end gap-2 hover:opacity-85 transition-opacity"
                    >
                      <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover:underline">
                        {f.away_team?.name}
                      </span>
                      <TeamLogo team={f.away_team} className="size-8 shrink-0" />
                    </Link>
                  ) : (
                    <div className="flex min-w-0 items-center justify-end gap-2">
                      <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                        {f.away_team?.name}
                      </span>
                      <TeamLogo team={f.away_team} className="size-8 shrink-0" />
                    </div>
                  )}
                </div>
                {f.stadium && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                    <MapPin className="size-3" /> {f.stadium.name}
                  </p>
                )}
                {(f.events?.length ?? 0) > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#E1E5DF] dark:border-[#303832] pt-2">
                    {f.events.slice(-6).map((ev) => (
                      <EventChip key={ev.id} event={ev} t={t} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentWithEvents.length > 0 && (
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-2xs">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-extrabold text-[#111313] dark:text-[#F5F7F2]">
            <Sparkles className="size-4 text-[#179955] dark:text-[#D0FF38]" />
            <span>{t('committee.detail.live.recentEvents')}</span>
          </div>
          <div className="space-y-2">
            {recentWithEvents.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
                  {f.home_team?.id != null ? (
                    <Link
                      to={`/teams/${f.home_team.id}`}
                      className="inline-flex items-center gap-1.5 hover:text-[#179955] dark:hover:text-[#D0FF38] hover:underline"
                    >
                      <TeamLogo team={f.home_team} className="size-4.5 shrink-0" />
                      <span>{f.home_team?.name}</span>
                    </Link>
                  ) : (
                    <span>{f.home_team?.name}</span>
                  )}
                  <span className="font-black text-[#179955] dark:text-[#D0FF38] tabular-nums">
                    {f.match?.home_score ?? 0} - {f.match?.away_score ?? 0}
                  </span>
                  {f.away_team?.id != null ? (
                    <Link
                      to={`/teams/${f.away_team.id}`}
                      className="inline-flex items-center gap-1.5 hover:text-[#179955] dark:hover:text-[#D0FF38] hover:underline"
                    >
                      <span>{f.away_team?.name}</span>
                      <TeamLogo team={f.away_team} className="size-4.5 shrink-0" />
                    </Link>
                  ) : (
                    <span>{f.away_team?.name}</span>
                  )}
                  {f.mvp?.player && (
                    <span className="ms-1 inline-flex items-center gap-1 rounded-full bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 px-2 py-0.5 text-[10px] font-bold text-[#111313] dark:text-[#D0FF38]">
                      <Flame className="size-3" /> MVP:{' '}
                      {f.mvp.player.id ? (
                        <Link to={`/players/${f.mvp.player.id}`} className="hover:underline">
                          {f.mvp.player.name}
                        </Link>
                      ) : (
                        f.mvp.player.name
                      )}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {f.events.slice(-4).map((ev) => (
                    <EventChip key={ev.id} event={ev} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
