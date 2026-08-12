import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarCheck, Check, Hourglass, MapPin, Swords, UserPlus, X, Zap } from 'lucide-react'
import api from '../../../api/client'
import { Button } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section, formatTime, initials, opponentOf, positionLabels, timeAgo } from '../components/shared'

function MiniCard({ icon: Icon, tint, title, action, children }) {
  return (
    <div className="flex flex-col rounded-3xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`grid size-8 place-items-center rounded-xl ${tint}`}>
            <Icon className="size-4" />
          </span>
          <p className="text-xs font-extrabold text-slate-800">{title}</p>
        </div>
        {action}
      </div>
      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </div>
  )
}

function ChallengeRow({ c }) {
  const { t } = useTranslation()
  const { toast, reload } = useCommandCenter()
  const [busy, setBusy] = useState(false)
  const respond = async (action) => {
    setBusy(true)
    try {
      const res = await api.put(`/manager/challenges/${c.id}/respond`, { action })
      toast.success(action === 'accept' ? t('ov.today.challengeAccepted') : t('ov.today.challengeDeclined'))
      const wa = res.data?.host_manager
      if (action === 'accept' && wa?.is_whatsapp && wa?.phone) window.open(`https://wa.me/${wa.phone}`, '_blank')
      reload()
    } catch (e) {
      toast.error(e.response?.data?.message || t('ov.common.operationFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sm font-black text-sky-600">
        {initials(c.host_team?.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-slate-800">{c.host_team?.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          {formatTime(c.match_datetime)} • {c.stadium?.name || c.custom_terrain_name || t('ov.common.unspecifiedStadium')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => respond('decline')}
          className="grid size-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          title={t('ov.common.reject')}
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => respond('accept')}
          className="grid size-8 place-items-center rounded-xl bg-green-500 text-white hover:bg-green-600"
          title={t('ov.common.accept')}
        >
          <Check className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function AppRow({ app }) {
  const { t } = useTranslation()
  const { toast, reload } = useCommandCenter()
  const [busy, setBusy] = useState(false)
  const p = app.player
  const pf = p?.player_profile || {}
  const respond = async (action) => {
    setBusy(true)
    try {
      const res = await api.put(`/manager/recruitment/applications/${app.id}/respond`, { action })
      toast.success(res.data.message || (action === 'accept' ? t('ov.today.playerAccepted') : t('ov.today.appDeclined')))
      reload()
    } catch (e) {
      toast.error(e.response?.data?.message || t('ov.common.operationFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-green-50 text-sm font-black text-green-700">
        {initials(p?.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-slate-800">{p?.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          {positionLabels[pf.position] && t('ov.positions.' + pf.position) || positionLabels[pf.position] || pf.position || t('ov.common.player')}{' '}
          {pf.skill_level ? `• ${pf.skill_level}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => respond('decline')}
          className="grid size-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          title={t('ov.common.reject')}
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => respond('accept')}
          className="grid size-8 place-items-center rounded-xl bg-green-500 text-white hover:bg-green-600"
          title={t('ov.common.accept')}
        >
          <Check className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function TodayPanel() {
  const { t } = useTranslation()
  const {
    toast,
    reload,
    team,
    myTeamId,
    todayMatches,
    todayBookings,
    challenges,
    apps,
    hosted,
    notifs,
    setMatch,
    setBooking,
    setNotifOpen,
  } = useCommandCenter()

  const matchToday = todayMatches[0]
  const bookingToday = todayBookings[0]
  const opp = opponentOf(matchToday, myTeamId)

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      toast.success(t('ov.common.markAllReadToast'))
      reload()
    } catch {
      toast.error(t('ov.common.operationFailed'))
    }
  }

  return (
    <Section
      icon={Zap}
      tint="amber"
      title={t('ov.today.title')}
      subtitle={t('ov.today.subtitle')}
      badge={
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600 ring-1 ring-amber-200">
          {t('ov.today.awaiting', { count: challenges.length + apps.length + notifs.length })}
        </span>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MiniCard
          icon={Swords}
          tint="bg-green-50 text-green-600"
          title={t('ov.today.matchToday')}
          action={
            matchToday && (
              <Button size="sm" variant="ghost" onClick={() => setMatch(matchToday)}>
                {t('ov.common.details')}
              </Button>
            )
          }
        >
          {matchToday ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-slate-900 text-xs font-black text-white">
                  {initials(team?.name)}
                </span>
                <Swords className="size-3.5 shrink-0 text-slate-300" />
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-sky-50 text-xs font-black text-sky-600">
                  {initials(opp?.name)}
                </span>
                <div className="ms-auto text-end">
                  <p className="text-xs font-black text-slate-800">{opp?.name || t('ov.common.opponent')}</p>
                  <p className="text-[10px] font-semibold text-slate-400">{formatTime(matchToday.match_datetime)}</p>
                </div>
              </div>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <MapPin className="size-3 text-green-500" />
                {matchToday.stadium?.name || matchToday.custom_terrain_name || t('ov.common.unspecifiedStadium')}
              </p>
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] font-semibold text-slate-400">{t('ov.today.noMatchToday')}</p>
          )}
        </MiniCard>

        <MiniCard
          icon={CalendarCheck}
          tint="bg-sky-50 text-sky-600"
          title={t('ov.today.bookingToday')}
          action={
            bookingToday && (
              <Button size="sm" variant="ghost" onClick={() => setBooking(bookingToday)}>
                {t('ov.common.details')}
              </Button>
            )
          }
        >
          {bookingToday ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600">
                  <CalendarCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-slate-800">{bookingToday.terrain?.name || t('ov.common.terrain')}</p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {bookingToday.start_time} - {bookingToday.end_time}
                  </p>
                </div>
                {typeof bookingToday.price === 'number' && bookingToday.price > 0 && (
                  <span className="ms-auto shrink-0 text-xs font-black text-slate-800">
                    {bookingToday.price}
                    <span className="ms-0.5 text-[10px] font-bold text-slate-400">{t('ov.common.currency')}</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] font-semibold text-slate-400">{t('ov.today.noBookingToday')}</p>
          )}
        </MiniCard>

        <MiniCard
          icon={Bell}
          tint="bg-rose-50 text-rose-600"
          title={t('ov.today.unreadNotifs', { count: notifs.length })}
          action={
            <Button size="sm" variant="ghost" onClick={() => setNotifOpen(true)}>
              {t('ov.common.view')}
            </Button>
          }
        >
          {notifs.length > 0 ? (
            <div className="space-y-1.5">
              {notifs.slice(0, 3).map((n) => (
                <div key={n.id} className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                  <p className="truncate text-[11px] font-extrabold text-slate-800">{n.title}</p>
                  <p className="truncate text-[10px] font-semibold text-slate-400">{timeAgo(n.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] font-semibold text-slate-400">{t('ov.today.allRead')}</p>
          )}
          {notifs.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
            >
              {t('ov.common.markAllRead')}
            </button>
          )}
        </MiniCard>

        <MiniCard
          icon={Swords}
          tint="bg-violet-50 text-violet-600"
          title={t('ov.today.matchChallenges', { count: challenges.length })}
        >
          {challenges.length > 0 ? (
            <div className="space-y-2">
              {challenges.slice(0, 3).map((c) => (
                <ChallengeRow key={c.id} c={c} />
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] font-semibold text-slate-400">{t('ov.today.noChallenges')}</p>
          )}
        </MiniCard>

        <MiniCard icon={UserPlus} tint="bg-green-50 text-green-600" title={t('ov.today.playerRequests', { count: apps.length })}>
          {apps.length > 0 ? (
            <div className="space-y-2">
              {apps.slice(0, 3).map((a) => (
                <AppRow key={a.id} app={a} />
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] font-semibold text-slate-400">{t('ov.today.noRequests')}</p>
          )}
        </MiniCard>

        <MiniCard icon={Hourglass} tint="bg-amber-50 text-amber-600" title={t('ov.today.yourOpenMatches')}>
          {hosted.length > 0 ? (
              <div className="space-y-2">
                {hosted.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                      <Swords className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-slate-800">{formatTime(m.match_datetime)}</p>
                      <p className="truncate text-[11px] font-semibold text-slate-400">
                        {m.stadium?.name || m.custom_terrain_name || t('ov.common.unspecifiedStadium')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setMatch(m)}>
                      {t('ov.common.view')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-[11px] font-semibold text-slate-400">{t('ov.today.noOpenRequests')}</p>
            )}
        </MiniCard>
      </div>
    </Section>
  )
}
