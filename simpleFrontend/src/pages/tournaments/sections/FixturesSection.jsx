import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, Filter, Flag, MapPin, Swords, Trophy, Users } from 'lucide-react'
import { TeamAvatar } from '../shared'
import { formatTime, matchDay } from '../../../lib/adapters'
import { selectClass } from '../../../components/dashboard/ui'

const LIVE_STATUSES = ['warmup', 'kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties']

function matchStatus(f) {
  const raw = f.match?.status || f.status || 'scheduled'
  return LIVE_STATUSES.includes(raw) ? 'live' : raw
}

const STATUS_STYLE = {
  scheduled: 'bg-slate-100 text-slate-600',
  live: 'bg-rose-50 text-rose-600',
  finished: 'bg-emerald-50 text-emerald-700',
  postponed: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

function MatchRow({ f, onOpen }) {
  const { t, i18n } = useTranslation()
  const played = matchStatus(f) === 'finished'
  const winnerTeamId = played ? f.match?.winner_team_id : null
  const clickable = Boolean(onOpen) && Boolean(f.match?.id)
  const datePart = f.scheduled_at ? new Date(f.scheduled_at).toISOString().slice(0, 10) : null

  return (
    <button
      type="button"
      onClick={() => clickable && onOpen(f)}
      disabled={!clickable}
      className={`w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-start transition-colors ${
        clickable ? 'hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)]' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamAvatar team={f.home_team} className="size-8" />
          <span className="truncate text-xs font-bold text-slate-800">{f.home_team?.name || '—'}</span>
          {winnerTeamId === f.home_team?.id && <Trophy className="size-3.5 shrink-0 text-amber-500" />}
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <span className={`text-base font-black ${played ? 'text-slate-900' : 'text-slate-400'}`}>
            {played ? `${f.match.home_score} - ${f.match.away_score}` : 'VS'}
          </span>
          <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-black ${STATUS_STYLE[matchStatus(f)]}`}>
            {t(`public.tournamentPage.matchStatus.${matchStatus(f)}`)}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          {winnerTeamId === f.away_team?.id && <Trophy className="size-3.5 shrink-0 text-amber-500" />}
          <span className="truncate text-xs font-bold text-slate-800">{f.away_team?.name || '—'}</span>
          <TeamAvatar team={f.away_team} className="size-8" />
        </div>
        {clickable && <ChevronLeft className="size-4 shrink-0 text-slate-300 rtl:rotate-180" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-50 pt-2 text-[10px] font-semibold text-slate-400">
        {f.scheduled_at && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" />
            {matchDay(f.scheduled_at, i18n.language)} {formatTime(f.scheduled_at)}
          </span>
        )}
        {f.round?.name && <span>{f.round.name}</span>}
        {f.group?.name && <span>{f.group.name}</span>}
        {f.stadium?.name && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {f.stadium.name}
          </span>
        )}
        {datePart && <span className="ms-auto text-[9px] opacity-60">{datePart}</span>}
      </div>
    </button>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  const { t } = useTranslation()
  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-[11px] font-bold text-slate-500">{label}</span>
      <select className={`${selectClass} h-9 rounded-lg px-2.5 text-xs`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('public.tournamentPage.all')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

export default function FixturesSection({ fixtures, mode = 'upcoming', onOpen }) {
  const { t } = useTranslation()
  const [round, setRound] = useState('')
  const [group, setGroup] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')

  const list = useMemo(() => {
    const arr = (fixtures || []).filter((f) => f.home_team && f.away_team)
    return mode === 'upcoming'
      ? arr
          .filter((f) => matchStatus(f) !== 'finished')
          .slice()
          .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
      : arr
          .filter((f) => matchStatus(f) === 'finished')
          .slice()
          .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
  }, [fixtures, mode])

  const roundOptions = useMemo(() => {
    const seen = new Map()
    for (const f of list) if (f.round?.name && !seen.has(f.round.name)) seen.set(f.round.name, f.round.name)
    return [...seen.values()].map((name) => ({ value: name, label: name }))
  }, [list])

  const groupOptions = useMemo(() => {
    const seen = new Map()
    for (const f of list) if (f.group?.name && !seen.has(f.group.name)) seen.set(f.group.name, f.group.name)
    return [...seen.values()].map((name) => ({ value: name, label: name }))
  }, [list])

  const statusOptions = useMemo(() => {
    const seen = new Map()
    for (const f of list) {
      const s = matchStatus(f)
      if (!seen.has(s)) seen.set(s, s)
    }
    return [...seen.values()].map((s) => ({ value: s, label: t(`public.tournamentPage.matchStatus.${s}`) }))
  }, [list, t])

  const dateOptions = useMemo(() => {
    const seen = new Map()
    for (const f of list) {
      if (!f.scheduled_at) continue
      const d = new Date(f.scheduled_at).toISOString().slice(0, 10)
      if (!seen.has(d)) seen.set(d, d)
    }
    return [...seen.values()].map((d) => ({ value: d, label: d }))
  }, [list])

  const filtered = list.filter((f) => {
    if (round && f.round?.name !== round) return false
    if (group && f.group?.name !== group) return false
    if (status && matchStatus(f) !== status) return false
    if (date && f.scheduled_at && new Date(f.scheduled_at).toISOString().slice(0, 10) !== date) return false
    return true
  })

  const grouped = useMemo(() => {
    const sections = []
    const map = new Map()
    for (const f of filtered) {
      const key = f.round?.name || '—'
      if (!map.has(key)) {
        map.set(key, [])
        sections.push({ name: key, list: map.get(key) })
      }
      map.get(key).push(f)
    }
    return sections
  }, [filtered])

  const showFilters = mode === 'upcoming' && list.length > 1

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300">
          {mode === 'upcoming' ? <Swords className="size-6" /> : <Flag className="size-6" />}
        </span>
        <p className="text-sm font-bold text-slate-600">
          {mode === 'upcoming' ? t('public.tournamentPage.noMatches') : t('public.tournamentPage.noResults')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-400">
            <Filter className="size-3.5" />
            {t('public.tournamentPage.filters')}
          </span>
          <FilterSelect label={t('public.tournamentPage.filterRound')} value={round} onChange={setRound} options={roundOptions} />
          {groupOptions.length > 1 && (
            <FilterSelect label={t('public.tournamentPage.filterGroup')} value={group} onChange={setGroup} options={groupOptions} />
          )}
          {statusOptions.length > 1 && (
            <FilterSelect label={t('public.tournamentPage.filterStatus')} value={status} onChange={setStatus} options={statusOptions} />
          )}
          {dateOptions.length > 1 && (
            <FilterSelect label={t('public.tournamentPage.filterDate')} value={date} onChange={setDate} options={dateOptions} />
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-white text-slate-300"><Users className="size-5" /></span>
          <p className="text-sm font-bold text-slate-600">{t('public.tournamentPage.noMatches')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((section, i) => (
            <div key={i} className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-400">{section.name}</h4>
              <div className="space-y-2">
                {section.list.map((f) => (
                  <MatchRow key={f.id} f={f} onOpen={onOpen} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
