import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCalendarDays,
  faClock,
  faLandmark,
  faRadio,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { matchDay, formatTime } from '../../lib/adapters'

const EVENT_META = {
  goal: '⚽',
  own_goal: '⚽',
  penalty_goal: '🥅',
  missed_penalty: '❌',
  yellow_card: '🟨',
  second_yellow: '🟨🟥',
  red_card: '🟥',
  substitution: '🔄',
  injury: '🩹',
  other: '📝',
}

function Logo({ team, name }) {
  if (team?.logo_url) {
    return (
      <img src={team.logo_url} alt="" className="size-12 shrink-0 rounded-2xl bg-slate-100 object-contain" />
    )
  }
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-green-600/10 text-base font-black text-green-700">
      {(name || '—').charAt(0)}
    </span>
  )
}

function LiveCard({ f, t }) {
  const m = f.match || {}
  const tournaments = f.tournament
  const home = f.home_team
  const away = f.away_team
  const events = m.events || []
  const minute = m.current_minute ?? 0

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-rose-100 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(225,29,72,0.14)]">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
          <FontAwesomeIcon icon={faTrophy} className="size-3 text-slate-400" />
          <span className="max-w-[140px] truncate">{tournaments?.name || '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-600 ring-1 ring-rose-200">
          <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />
          <span className="hidden sm:inline">{t('landing.liveNext.live')}</span>
          {minute > 0 && <span className="tabular-nums">{minute}'</span>}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <Logo team={home} name={home?.name} />
          <span className="w-full truncate text-center text-xs font-bold text-slate-800">{home?.name || '—'}</span>
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <span className="text-2xl font-black tabular-nums tracking-tight text-rose-600">
            {m.home_score ?? 0} - {m.away_score ?? 0}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('landing.liveNext.liveScore')}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <Logo team={away} name={away?.name} />
          <span className="w-full truncate text-center text-xs font-bold text-slate-800">{away?.name || '—'}</span>
        </div>
      </div>

      {f.stadium && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <FontAwesomeIcon icon={faLandmark} className="size-3 text-slate-400" />
          {f.stadium.name}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <FontAwesomeIcon icon={faRadio} className="size-3 text-rose-400" />
            {t('landing.liveNext.recent')}
          </p>
          <ol className="space-y-1">
            {events.slice(0, 4).map((e) => {
              const meta = EVENT_META[e.type] || { icon: '•' }
              const player = e.player_name || e.player?.name || ''
              return (
                <li key={e.id} className="flex items-center gap-2 text-[11px]">
                  <span className="w-6 shrink-0 text-end tabular-nums font-black text-slate-400">{e.minute ?? 0}'</span>
                  <span className="shrink-0 text-sm leading-none">{meta.icon}</span>
                  {player && <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{player}</span>}
                  {e.team_name && <span className="shrink-0 text-[10px] text-slate-400">{e.team_name}</span>}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Link
          to={`/tournaments/${tournaments?.slug || tournaments?.id || ''}`}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 text-sm font-bold text-white shadow-[0_10px_20px_rgba(225,29,72,0.25)] transition-colors hover:bg-rose-700"
        >
          <FontAwesomeIcon icon={faRadio} className="size-4 animate-pulse" />
          {t('landing.liveNext.watch')}
        </Link>
      </div>
    </article>
  )
}

function NextCard({ f, t, i18n }) {
  const tournaments = f.tournament
  const home = f.home_team
  const away = f.away_team

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-[0_24px_60px_rgba(15,23,42,0.35)] ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
          <FontAwesomeIcon icon={faClock} className="size-3 text-amber-400" />
          {t('landing.liveNext.upNext')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
          <FontAwesomeIcon icon={faTrophy} className="size-3" />
          <span className="max-w-[130px] truncate">{tournaments?.name || '—'}</span>
        </span>
      </div>

      <div className="flex items-center gap-4 px-5 py-5">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <Logo team={home} name={home?.name} />
          <span className="w-full truncate text-center text-sm font-extrabold">{home?.name || '—'}</span>
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <span className="text-lg font-black tracking-tight text-amber-400">VS</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <Logo team={away} name={away?.name} />
          <span className="w-full truncate text-center text-sm font-extrabold">{away?.name || '—'}</span>
        </div>
      </div>

      {f.scheduled_at && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/10 px-5 py-3 text-[11px] font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faCalendarDays} className="size-3 text-slate-400" />
            {matchDay(f.scheduled_at, i18n.language)}
          </span>
          <span className="flex items-center gap-1.5 tabular-nums">
            <FontAwesomeIcon icon={faClock} className="size-3 text-slate-400" />
            {formatTime(f.scheduled_at)}
          </span>
          {f.stadium && (
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLandmark} className="size-3 text-slate-400" />
              {f.stadium.name}
            </span>
          )}
        </div>
      )}

      <Link
        to={`/tournaments/${tournaments?.slug || tournaments?.id || ''}`}
        className="flex items-center justify-center gap-2 border-t border-white/10 py-3.5 text-sm font-bold text-emerald-300 transition-colors hover:bg-white/5 hover:text-emerald-200"
      >
        <span>{t('landing.liveNext.viewTournament')}</span>
        <FontAwesomeIcon icon={faArrowLeft} className="size-3.5 ltr:rotate-180" />
      </Link>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="h-[320px] animate-pulse rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.06)]" />
  )
}

export default function LiveAndNext() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let cancelled = false
    const fetchNow = () => {
      api
        .get('/v1/live-tournament-matches')
        .then((r) => {
          if (!cancelled) setData(r.data?.data || { live: [], next: null })
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    fetchNow()
    const id = setInterval(fetchNow, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const live = data?.live || []
  const next = data?.next || null
  const hasContent = live.length > 0 || Boolean(next)
  const noLive = !loading && live.length === 0

  return (
    <section id="live-next" className="bg-[#f6f7fb] py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="text-start">
            <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">
              {t('landing.liveNext.title1')}{' '}
              <span className="inline-flex items-center gap-2 text-rose-600">
                <FontAwesomeIcon icon={faRadio} className="size-6 animate-pulse" />
                {t('landing.liveNext.title2')}
              </span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('landing.liveNext.subtitle')}
            </p>
          </div>
        </header>

        <div className="mt-12">
          {loading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton />
              <Skeleton />
            </div>
          ) : !hasContent ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-3xl bg-rose-50 text-rose-500">
                <FontAwesomeIcon icon={faRadio} className="size-7" />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-700">{t('landing.liveNext.empty')}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">{t('landing.liveNext.emptyDesc')}</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {noLive && (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
                    <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-xl">⏸</span>
                    <p className="text-sm font-bold text-slate-600">{t('landing.liveNext.noLive')}</p>
                  </div>
                )}
                {live.map((f) => (
                  <LiveCard key={f.id} f={f} t={t} />
                ))}
              </div>
              {next ? <NextCard f={next} t={t} i18n={i18n} /> : <div className="hidden lg:block" />}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
