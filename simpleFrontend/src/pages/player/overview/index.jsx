import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck,
  MapPin,
  Search,
  ShieldPlus,
  Swords,
  UserPlus,
  UserRound,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, Stat, SectionTitle, Empty, StatusBadge, Toggle, Button, Modal, SkeletonCards } from '../../../components/dashboard/ui'
import { faStar, faFutbol, faMedal, faPercent } from '@fortawesome/free-solid-svg-icons'
import { toast } from '../../../components/ui/Toast'
import { photoThumb, logoThumb } from '../../../lib/thumb'

const quickLinks = [
  { to: '/player/feed', label: 'player.overview.quick.findMatch', icon: Search },
  { to: '/player/applications', label: 'player.overview.quick.applications', icon: FileCheck },
  { to: '/player/matches', label: 'player.overview.quick.matches', icon: Swords },
  { to: '/player/profile', label: 'player.overview.quick.profile', icon: UserRound },
]

const notifMeta = {
  player_invite_received: { icon: UserPlus, color: 'text-violet-600 bg-violet-50' },
  player_application_accepted: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  player_application_declined: { icon: XCircle, color: 'text-rose-600 bg-rose-50' },
}

export default function Overview() {
  const { t, i18n } = useTranslation()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/overview').then((r) => r.data))

  const [busyAvailability, setBusyAvailability] = useState(false)
  const [applyTarget, setApplyTarget] = useState(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [busyApply, setBusyApply] = useState(false)
  const [teamReqOpen, setTeamReqOpen] = useState(false)
  const [teamReq, setTeamReq] = useState({ team_name: '', message: '' })
  const [busyTeamReq, setBusyTeamReq] = useState(false)

  const stats = data?.stats || {}
  const profile = data?.profile
  const upcoming = data?.upcoming_match || null
  const upcomingMatches = data?.upcoming_matches || []
  const feed = data?.feed || []
  const team = data?.team || null
  const teamRequest = data?.team_request || null
  const notifications = data?.notifications || []
  const unreadCount = data?.unread_count || 0

  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'

  const positions = {
    goalkeeper: t('player.overview.positions.goalkeeper'),
    defender: t('player.overview.positions.defender'),
    midfielder: t('player.overview.positions.midfielder'),
    forward: t('player.overview.positions.forward'),
  }

  const fmtDate = (dt) => (dt ? new Date(dt).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : '—')
  const fmtTime = (dt) => (dt ? new Date(dt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—')
  const fmtShort = (dt) =>
    dt ? new Date(dt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('common.now')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    const hours = Math.floor(mins / 60)
    if (hours < 24) return t('common.hoursAgo', { count: hours })
    const days = Math.floor(hours / 24)
    if (days < 7) return t('common.daysAgo', { count: days })
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  }

  const toggleAvailability = async (v) => {
    setBusyAvailability(true)
    try {
      await api.put('/player/profile', { is_available: v })
      refetch()
      toast.success(v ? t('player.overview.available') : t('player.overview.unavailable'))
    } catch (e) {
      toast.error(e.response?.data?.message || t('player.profile.failed'))
    } finally {
      setBusyAvailability(false)
    }
  }

  const apply = async () => {
    setBusyApply(true)
    try {
      const res = await api.post(`/player/matches/${applyTarget.id}/apply`, { message: applyMessage || undefined })
      toast.success(res.data.message || t('player.overview.discovery.applied'))
      setApplyTarget(null)
      setApplyMessage('')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('player.overview.discovery.applyFailed'))
    } finally {
      setBusyApply(false)
    }
  }

  const sendTeamRequest = async () => {
    setBusyTeamReq(true)
    try {
      const res = await api.post('/player/team-requests', {
        team_name: teamReq.team_name || undefined,
        message: teamReq.message || undefined,
      })
      toast.success(res.data.message || t('player.teamRequest.sent'))
      setTeamReqOpen(false)
      setTeamReq({ team_name: '', message: '' })
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('player.teamRequest.failed'))
    } finally {
      setBusyTeamReq(false)
    }
  }

  if (errorState) {
    return (
      <Card>
        <SectionError state={errorState} onRetry={refetch} />
      </Card>
    )
  }

  if (loading) return <SkeletonCards count={4} className="space-y-4" />

  return (
    <div>
      <SectionTitle title={t('player.overview.title')} subtitle={t('player.overview.subtitle')} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {photoThumb(profile) ? (
              <img loading="lazy" decoding="async" src={photoThumb(profile)} alt="" className="size-14 rounded-full object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-100 to-emerald-200 text-lg font-black text-green-700">
                {(data?.user?.name || '?').slice(0, 1)}
              </span>
            )}
            <div>
              <p className="text-base font-extrabold text-slate-900">{data?.user?.name || '—'}</p>
              <p className="text-xs text-slate-500">
                {positions[profile?.position] || t('player.overview.noPosition')} • {profile?.city || t('player.overview.noCity')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">{t('player.overview.availability')}</span>
            <Toggle checked={Boolean(profile?.is_available)} disabled={busyAvailability} onChange={toggleAvailability} />
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-600 transition-colors group-hover:bg-green-500 group-hover:text-white">
              <q.icon className="size-5" strokeWidth={2.2} />
            </span>
            <span className="text-sm font-extrabold text-slate-800">{t(q.label)}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {upcoming ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-green-600 to-emerald-700 p-6 text-white shadow-[0_16px_40px_rgba(16,185,129,0.28)] sm:p-8">
            <div className="pointer-events-none absolute -end-10 -top-10 size-48 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-16 -end-24 size-56 rounded-full bg-white/5" />
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-green-50">
                  <Swords className="size-4" />
                  {t('player.overview.upcoming.label')}
                </span>
                <div>
                  <p className="text-xs font-bold text-green-100">{t('player.overview.upcoming.opponent')}</p>
                  <p className="mt-1 text-2xl font-black sm:text-3xl">
                    {upcoming.opponent_team?.name || upcoming.host_team?.name || t('player.overview.upcoming.noOpponent')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                    <CalendarDays className="size-3.5" /> {fmtDate(upcoming.match_datetime)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                    <Clock className="size-3.5" /> {fmtTime(upcoming.match_datetime)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                    <MapPin className="size-3.5" /> {upcoming.stadium?.name || upcoming.custom_terrain_name || t('player.overview.upcoming.terrain')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                  <span className="text-green-100">
                    {t('player.overview.upcoming.team')}: <span className="text-white">{upcoming.host_team?.name || '—'}</span>
                  </span>
                  <StatusBadge status={upcoming.status} />
                </div>
              </div>
              <div className="shrink-0">
                <Link
                  to="/player/matches"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-green-700 shadow-lg transition hover:bg-green-50"
                >
                  {t('player.overview.upcoming.details')}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <Empty
              icon={CalendarDays}
              title={t('player.overview.upcoming.noUpcoming')}
              description={t('player.overview.upcoming.noUpcomingDesc')}
              action={
                <Link to="/player/feed">
                  <Button>{t('player.overview.quick.findMatch')}</Button>
                </Link>
              }
            />
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={faStar} label={t('player.overview.stat.rating')} value={stats.rating ?? 0} />
        <Stat icon={faMedal} label={t('player.overview.stat.points')} value={stats.points ?? 0} />
        <Stat icon={faFutbol} label={t('player.overview.stat.matchesPlayed')} value={stats.matches_played ?? 0} />
        <Stat icon={faPercent} label={t('player.overview.stat.winRate')} value={`${stats.win_rate ?? 0}%`} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card
          title={t('player.overview.discovery.title')}
          subtitle={t('player.overview.discovery.subtitle')}
          action={
            <Link to="/player/feed" className="text-xs font-bold text-green-600 hover:text-green-700">
              {t('player.overview.discovery.seeAll')}
            </Link>
          }
        >
          {feed.length === 0 ? (
            <Empty title={t('player.overview.discovery.empty')} description={t('player.overview.discovery.emptyDesc')} />
          ) : (
            <div className="space-y-3">
              {feed.map((m) => {
                const full = (m.players_remaining ?? 0) === 0
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{m.host_team?.name || t('player.feed.team')}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                        <MapPin className="size-3 shrink-0 text-green-500" />
                        {m.stadium?.name || m.custom_terrain_name || t('player.feed.stadium')}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{fmtShort(m.match_datetime)}</p>
                    </div>
                    <div className="shrink-0">
                      {m.needs_players && (
                        <p className="mb-1 text-end text-[10px] font-bold text-slate-500">
                          {t('player.overview.discovery.playersNeeded', { count: m.players_remaining ?? 0 })}
                        </p>
                      )}
                      <Button size="sm" variant="outline" disabled={full} onClick={() => setApplyTarget(m)}>
                        {full ? t('player.overview.discovery.full') : t('player.overview.discovery.apply')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title={t('player.overview.teamState.hasTeam')}>
          {team ? (
            <div className="flex items-center gap-4">
              {logoThumb(team) ? (
                <img loading="lazy" decoding="async" src={logoThumb(team)} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-lg font-black text-slate-500">
                  {team.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold text-slate-900">{team.name}</p>
                <p className="text-xs text-slate-500">{[team.city, team.category, team.level].filter(Boolean).join(' • ') || '—'}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t('player.overview.teamState.stadium')}: {team.primary_stadium || '—'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t('player.overview.teamState.manager')}: {team.manager || '—'}
                </p>
              </div>
              <Link to="/player/matches" className="shrink-0 text-xs font-bold text-green-600 hover:text-green-700">
                {t('player.overview.teamState.viewTeam')}
              </Link>
            </div>
          ) : teamRequest && teamRequest.status === 'pending' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                <ShieldPlus className="size-6" />
              </span>
              <p className="mt-3 text-sm font-extrabold text-amber-800">{t('player.overview.teamState.pendingRequest')}</p>
              <p className="mt-1 text-xs text-amber-600">{t('player.overview.teamState.pendingRequestDesc')}</p>
            </div>
          ) : (
            <div>
              <Empty icon={ShieldPlus} title={t('player.overview.teamState.noTeam')} description={t('player.overview.teamState.noTeamDesc')} />
              <Button className="mt-4 w-full" onClick={() => setTeamReqOpen(true)}>
                <ShieldPlus className="size-4" />
                {t('player.overview.teamState.requestFormation')}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title={t('player.overview.bookings.title')} subtitle={t('player.overview.bookings.subtitle')}>
          {upcomingMatches.length === 0 ? (
            <Empty title={t('player.overview.bookings.empty')} description={t('player.overview.bookings.emptyDesc')} />
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-50 text-green-600">
                      <MapPin className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {m.stadium?.name || m.custom_terrain_name || t('player.overview.bookings.title')}
                      </p>
                      <p className="text-[11px] text-slate-500">{fmtShort(m.match_datetime)}</p>
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t('player.overview.notifs.title')}
          subtitle={unreadCount > 0 ? t('player.overview.notifs.unread', { count: unreadCount }) : ''}
          action={
            <Link to="/player/notifications" className="text-xs font-bold text-green-600 hover:text-green-700">
              {t('player.overview.notifs.seeAll')}
            </Link>
          }
        >
          {notifications.length === 0 ? (
            <Empty title={t('player.overview.notifs.empty')} />
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const meta = notifMeta[n.type] || { icon: Bell, color: 'text-slate-500 bg-slate-100' }
                const Icon = meta.icon
                return (
                  <Link
                    key={n.id}
                    to="/player/notifications"
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-green-200"
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${meta.color}`}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{n.title}</p>
                      <p className="truncate text-[11px] text-slate-500">{n.body}</p>
                      <p className="text-[10px] font-bold text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-green-500" />}
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {applyTarget && (
        <Modal open onClose={() => setApplyTarget(null)} title={`${t('player.overview.discovery.apply')} — ${applyTarget.host_team?.name || ''}`}>
          <div className="space-y-4">
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('player.overview.discovery.optionalMessage')}
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setApplyTarget(null)}>
                {t('player.overview.discovery.cancel')}
              </Button>
              <Button className="flex-1" disabled={busyApply} onClick={apply}>
                {busyApply ? t('player.overview.discovery.sending') : t('player.overview.discovery.send')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={teamReqOpen} onClose={() => setTeamReqOpen(false)} title={t('player.teamRequest.title')} subtitle={t('player.teamRequest.subtitle')}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('player.teamRequest.teamName')}</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('player.teamRequest.teamNamePlaceholder')}
              value={teamReq.team_name}
              onChange={(e) => setTeamReq((p) => ({ ...p, team_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('player.teamRequest.message')}</label>
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('player.teamRequest.messagePlaceholder')}
              value={teamReq.message}
              onChange={(e) => setTeamReq((p) => ({ ...p, message: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setTeamReqOpen(false)}>
              {t('player.teamRequest.cancel')}
            </Button>
            <Button className="flex-1" disabled={busyTeamReq} onClick={sendTeamRequest}>
              {busyTeamReq ? t('player.teamRequest.sending') : t('player.teamRequest.send')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
