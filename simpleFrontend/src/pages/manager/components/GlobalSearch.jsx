import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, MapPin, Search, ShieldCheck, Swords, UserPlus, Users, X } from 'lucide-react'
import api from '../../../api/client'
import { Skeleton } from '../../../components/dashboard/ui'
import { useCommandCenter } from './CommandCenterContext'
import { initials, positionLabels } from './shared'
import { logoThumb, coverThumb } from '../../../lib/thumb'

export default function GlobalSearch() {
  const { t } = useTranslation()
  const {
    searchOpen: open,
    setSearchOpen: setOpen,
    team,
    board,
    bookings,
    openTeam,
    openPlayer,
    openBook,
    openMatch,
    openBooking,
  } = useCommandCenter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ terrains: null, players: null, matches: null })
  const seq = useRef(0)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    const id = ++seq.current
    if (q.length < 2) {
      setResults({ terrains: null, players: null, matches: null })
      return
    }
    const enc = encodeURIComponent(q)
    Promise.all([
      api.get(`/v1/stadiums?search=${enc}&per_page=4`).then((r) => r.data?.data || []).catch(() => []),
      api.get(`/manager/recruitment/search?search=${enc}&per_page=4`).then((r) => r.data?.players || []).catch(() => []),
      api.get(`/manager/match-feed?search=${enc}&per_page=4`).then((r) => r.data?.matches || []).catch(() => []),
    ]).then(([terrains, players, matches]) => {
      if (id === seq.current) setResults({ terrains, players, matches })
    })
  }, [query, open])

  const teams = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const list = [...board]
    if (team && (team.name.toLowerCase().includes(q) || team.city?.toLowerCase().includes(q))) list.unshift(team)
    return list.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.city || '').toLowerCase().includes(q)).slice(0, 4)
  }, [board, team, query])

  const myBookings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return bookings
      .filter(
        (b) =>
          (b.terrain?.name || '').toLowerCase().includes(q) ||
          (b.terrain?.city || '').toLowerCase().includes(q) ||
          (b.booking_type || '').includes(q),
      )
      .slice(0, 4)
  }, [bookings, query])

  if (!open) return null

  const groups = [
    { key: 'teams', title: t('ov.search.groupTeams'), icon: Users, items: teams.map((tm) => ({ id: tm.id, title: tm.name, sub: tm.city || '', onClick: () => openTeam(tm), img: logoThumb(tm), logo: true })) },
    { key: 'players', title: t('ov.search.groupPlayers'), icon: UserPlus, items: (results.players || []).map((r) => ({ id: r.user_id, title: r.user?.name || r.full_name || t('ov.common.player'), sub: positionLabels[r.position] && t('ov.positions.' + r.position) || positionLabels[r.position] || t('ov.common.player'), onClick: () => openPlayer(r), img: r.player_profile?.avatar_url })) },
    { key: 'terrains', title: t('ov.search.groupTerrains'), icon: ShieldCheck, items: (results.terrains || []).map((tr) => ({ id: tr.id, title: tr.name, sub: tr.city, onClick: () => openBook({ terrain: tr, date: new Date().toISOString().slice(0, 10) }), img: coverThumb(tr) || tr.image_url })) },
    { key: 'matches', title: t('ov.search.groupMatches'), icon: Swords, items: (results.matches || []).map((m) => ({ id: m.id, title: m.host_team?.name || t('ov.common.match'), sub: m.stadium?.name || m.custom_terrain_name || '', onClick: () => openMatch(m) })) },
    { key: 'bookings', title: t('ov.search.groupBookings'), icon: CalendarCheck, items: myBookings.map((b) => ({ id: b.id, title: b.terrain?.name || t('ov.common.booking'), sub: `${b.booking_date} • ${b.start_time}`, onClick: () => openBooking(b) })) },
  ]

  return (
    <div className="fixed inset-0 z-[98]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute inset-x-4 top-20 mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Search className="size-5 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ov.search.placeholder')}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-3">
          {query.trim().length < 2 ? (
            <p className="py-10 text-center text-xs font-semibold text-slate-400">{t('ov.search.minChars')}</p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => {
                const loading = g.key === 'players' || g.key === 'terrains' || g.key === 'matches'
                const items = g.items
                return (
                  <div key={g.key}>
                    <p className="flex items-center gap-1.5 px-2 pb-1.5 text-[11px] font-black text-slate-400">
                      <g.icon className="size-3.5" />
                      {g.title}
                      {!loading && items.length > 0 && <span className="text-slate-300">({items.length})</span>}
                    </p>
                    {loading && results[g.key] === null ? (
                      <div className="space-y-1.5">
                        <Skeleton className="h-12 rounded-xl" />
                        <Skeleton className="h-12 rounded-xl" />
                      </div>
                    ) : items.length === 0 ? (
                      <p className="px-2 pb-1 text-[11px] font-semibold text-slate-300">{t('ov.search.noResults')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {items.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={it.onClick}
                            className="flex w-full items-center gap-3 rounded-xl p-2 text-start transition-colors hover:bg-slate-50"
                          >
                            {it.img ? (
                              <img loading="lazy" decoding="async" src={it.img} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
                            ) : (
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                                {it.logo ? initials(it.title) : <g.icon className="size-4 text-slate-400" />}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold text-slate-900">{it.title}</p>
                              {it.sub && (
                                <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-slate-400">
                                  {g.key === 'terrains' || g.key === 'matches' ? (
                                    <MapPin className="size-3 text-green-500" />
                                  ) : null}
                                  {it.sub}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
