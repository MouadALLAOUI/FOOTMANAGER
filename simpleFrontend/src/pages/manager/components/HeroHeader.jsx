import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin, Medal, Radar, Search, Swords, Trophy, UserPlus, Zap } from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { categoryLabels, formatDate, opponentOf } from '../components/shared'
import { logoThumb } from '../../../lib/thumb'

function countdown(target) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
  }
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function HeroHeader() {
  const { t } = useTranslation()
  const { user, team, myTeamId, nextMatch, upcoming, rank, openCreate, setSearchOpen } = useCommandCenter()
  const cd = nextMatch ? countdown(nextMatch.match_datetime) : null
  const opp = opponentOf(nextMatch, myTeamId)

  const actions = [
    { label: t('ov.hero.newMatch'), desc: t('ov.hero.newMatchDesc'), icon: Swords, tint: 'bg-green-500', onClick: openCreate },
    { label: t('ov.hero.bookTerrain'), desc: t('ov.hero.bookTerrainDesc'), icon: Zap, tint: 'bg-sky-500', onClick: () => scrollTo('quick-booking') },
    { label: t('ov.hero.findOpponent'), desc: t('ov.hero.findOpponentDesc'), icon: Radar, tint: 'bg-violet-500', onClick: () => scrollTo('market') },
    { label: t('ov.hero.recruitPlayer'), desc: t('ov.hero.recruitPlayerDesc'), icon: UserPlus, tint: 'bg-amber-500', onClick: () => scrollTo('recruitment') },
  ]

  const stats = [
    { label: t('ov.hero.statPoints'), value: team?.points ?? 0, icon: Trophy },
    { label: t('ov.hero.statWins'), value: team?.wins ?? 0, icon: Swords },
    { label: t('ov.hero.statUpcoming'), value: upcoming.length, icon: CalendarDays },
    { label: t('ov.hero.statRank'), value: rank ? `#${rank}` : '—', icon: Medal },
  ]

  const today = formatDate(new Date())

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0b1220] via-[#0f1a2e] to-[#12321f] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)] lg:p-8">
      <div className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-green-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 start-1/4 size-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {team?.logo_url ? (
            <img loading="lazy" decoding="async" src={logoThumb(team)} alt="" className="size-16 shrink-0 rounded-3xl object-cover ring-4 ring-white/10" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 text-2xl font-black text-white shadow-[0_10px_24px_rgba(34,197,94,0.4)]">
              {(team?.name || user?.name || '؟').slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-green-400">
              {t('ov.hero.greeting', { today })}
            </p>
            <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">{team?.name || user?.name || t('ov.hero.yourTeam')}</h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/50">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {team?.city || t('ov.hero.noCity')}
              </span>
              {team?.category && (
                <span className="rounded-full bg-white/10 px-2 py-0.5">
                  {categoryLabels[team.category] && t('ov.categories.' + team.category) || categoryLabels[team.category] || team.category}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold text-white/80 transition-colors hover:bg-white/20 sm:inline-flex"
          >
            <Search className="size-4" />
            {t('ov.hero.quickSearch')}
            <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">ESC</kbd>
          </button>
        </div>

        {cd && nextMatch ? (
          <div className="flex items-center gap-4 rounded-3xl bg-white/[0.06] px-5 py-4 backdrop-blur xl:min-w-[340px]">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-green-400">{t('ov.hero.nextMatch')}</p>
              <p className="mt-0.5 truncate text-sm font-black">{opp?.name || t('ov.hero.potentialOpponent')}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-white/50">
                {nextMatch.stadium?.name || nextMatch.custom_terrain_name || t('ov.common.unspecifiedStadium')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { v: cd.days, l: t('ov.hero.day') },
                { v: cd.hours, l: t('ov.hero.hour') },
                { v: cd.mins, l: t('ov.hero.minute') },
              ].map((x) => (
                <div key={x.l} className="w-14 rounded-2xl bg-white/10 px-2 py-2 text-center">
                  <p className="text-lg font-black tabular-nums">{x.v}</p>
                  <p className="text-[10px] font-bold text-white/50">{x.l}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white/[0.06] px-5 py-4 backdrop-blur xl:min-w-[300px]">
            <p className="text-[11px] font-bold text-green-400">{t('ov.hero.noUpcoming')}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">{t('ov.hero.noUpcomingDesc')}</p>
            <Button size="sm" className="mt-3" onClick={openCreate}>
              <Swords className="size-3.5" />
              {t('ov.hero.createMatch')}
            </Button>
          </div>
        )}
      </div>

      <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/[0.06] px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">{s.value}</p>
              <s.icon className="size-4 text-green-400" />
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-white/50">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="group flex items-center gap-3 rounded-2xl bg-white/[0.07] p-4 text-start transition-all hover:bg-white/[0.12]"
          >
            <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${a.tint} text-white shadow-lg`}>
              <a.icon className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{a.label}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/50">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
