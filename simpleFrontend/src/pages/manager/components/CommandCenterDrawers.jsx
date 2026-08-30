import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Pencil,
  Repeat,
  Send,
  Star,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useStadiums } from '../../../api/queries'
import Drawer from '../../../components/dashboard/Drawer'
import { Button, Field, FieldRow, Toggle, inputClass, selectClass, StatusBadge } from '../../../components/dashboard/ui'
import TimeSlotPicker from '../../../components/TimeSlotPicker'
import useTerrainSlots from '../../../hooks/useTerrainSlots'
import { buildTimeSlots } from '../../../lib/timeSlots'
import { ManagerContact } from '../../../components/dashboard/cards'
import NeedPlayersField from '../../../components/NeedPlayersField'
import { useCommandCenter } from './CommandCenterContext'
import { bookingTypeLabels, formatDate, formatTime, initials, isHost, opponentOf } from './shared'
import { logoThumb, photoThumb, coverThumb } from '../../../lib/thumb'
import { toastApiError } from '../../../lib/errors'

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export function MatchDrawer() {
  const { t } = useTranslation()
  const { toast, reload, match, setMatch, myTeamId } = useCommandCenter()
  const [busy, setBusy] = useState(false)
  const m = match
  const opp = opponentOf(m, myTeamId)
  const mine = isHost(m, myTeamId)

  const cancel = async () => {
    if (!window.confirm(t('ov.drawers.cancelMatchConfirm'))) return
    setBusy(true)
    try {
      await api.delete(`/manager/match-requests/${m.id}`)
      toast.success(t('ov.drawers.matchCancelled'))
      reload()
      setMatch(null)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={Boolean(m)} onClose={() => setMatch(null)} title={t('ov.drawers.matchTitle')} subtitle={t('ov.drawers.matchSubtitle')} size="480">
      {m && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-2">
                {m.host_team?.logo_url ? (
                  <img loading="lazy" decoding="async" src={logoThumb(m.host_team)} alt="" className="size-14 rounded-2xl object-cover ring-2 ring-white/10" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-lg font-black">
                    {initials(m.host_team?.name)}
                  </span>
                )}
                <span className="max-w-[110px] truncate text-xs font-bold">{m.host_team?.name}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black">{m.host_score ?? '–'}</span>
                <span className="my-1 text-[10px] font-bold text-white/40">{t('ov.common.vs')}</span>
                <span className="text-2xl font-black">{m.opponent_score ?? '–'}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                {m.opponent_team?.logo_url ? (
                  <img loading="lazy" decoding="async" src={logoThumb(m.opponent_team)} alt="" className="size-14 rounded-2xl object-cover ring-2 ring-white/10" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-lg font-black">
                    {initials(m.opponent_team?.name)}
                  </span>
                )}
                <span className="max-w-[110px] truncate text-xs font-bold">{m.opponent_team?.name || t('ov.hero.potentialOpponent')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={m.status} />
            {m.match_datetime && <span className="text-xs font-semibold text-slate-400">{formatDate(m.match_datetime)}</span>}
          </div>

          <div className="space-y-2.5">
            <DetailRow icon={MapPin} label={t('ov.common.stadium')} value={m.stadium?.name || m.custom_terrain_name || t('ov.common.unspecified')} />
            {m.match_datetime && <DetailRow icon={Clock} label={t('ov.common.time')} value={formatTime(m.match_datetime)} />}
            <DetailRow
              icon={Trophy}
              label={t('ov.common.price')}
              value={m.price_per_player ? `${m.price_per_player} ${t('ov.common.perPlayer')}` : t('ov.common.free')}
            />
          </div>

          {m.notes && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <MessageSquare className="size-3" />
                {t('ov.common.notes')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{m.notes}</p>
            </div>
          )}

          {(opp || m.opponent_team || m.host_team) && (
            <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-green-600/70">{t('ov.drawers.contactOpponentManager')}</p>
                <p className="truncate text-sm font-extrabold text-slate-800">
                  {(opp || m.opponent_team || m.host_team)?.manager?.name || t('ov.common.notAvailable')}
                </p>
              </div>
              <ManagerContact manager={(opp || m.opponent_team || m.host_team)?.manager} />
            </div>
          )}

          {mine && m.status === 'open' && (
            <Button variant="dangerSoft" className="w-full" disabled={busy} onClick={cancel}>
              <XCircle className="size-4" />
              {t('ov.drawers.cancelRequest')}
            </Button>
          )}
        </div>
      )}
    </Drawer>
  )
}

export function BookingDrawer() {
  const { t } = useTranslation()
  const { toast, reload, booking, setBooking, setCreateOpen } = useCommandCenter()
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const b = booking
  const terrain = b?.terrain && typeof b.terrain === 'object' && !Array.isArray(b.terrain) ? b.terrain : {}
  const isWeekly = b?.reservation_type === 'weekly_subscription'

  const convert = async () => {
    setBusy(true)
    try {
      const res = await api.post(`/manager/match-requests/from-booking/${b.id}`)
      toast.success(res.data.message || t('ov.drawers.matchRequestCreated'))
      setBooking(null)
      setCreateOpen({ fromBooking: b })
      reload()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const requestCancel = async () => {
    setBusy(true)
    try {
      await api.post(`/manager/bookings/${b.id}/request-cancel`, { reason: reason || undefined })
      toast.success(t('ov.drawers.cancelSent'))
      setBooking(null)
      reload()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={Boolean(b)} onClose={() => setBooking(null)} title={t('ov.drawers.bookingTitle')} subtitle={t('ov.drawers.bookingSubtitle', { name: terrain.name || t('ov.common.terrain') })} size="460">
      {b && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
            {terrain.image_url ? (
              <img loading="lazy" decoding="async" src={terrain.thumbnail_url || terrain.image_url} alt="" className="mx-auto size-16 rounded-3xl object-cover ring-4 ring-white/10" />
            ) : (
              <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-white/10">
                <CalendarCheck className="size-8 text-green-400" />
              </span>
            )}
            <p className="mt-3 text-lg font-black">{typeof terrain.name === 'string' ? terrain.name : 'ملعب'}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-white/60">
              <MapPin className="size-3.5" />
              {typeof terrain.city === 'string' ? terrain.city : '—'} {typeof terrain.type === 'string' ? `• ${terrain.type}` : ''}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={b.status} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-600 ring-1 ring-violet-200">
              {isWeekly ? (
                <>
                  <Repeat className="size-3" />
                  {t('ov.drawers.weeklySubscription')}
                </>
              ) : (
                bookingTypeLabels[b.booking_type] && t('ov.bookingTypes.' + b.booking_type) || bookingTypeLabels[b.booking_type] || b.booking_type
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            <DetailRow icon={CalendarDays} label={t('ov.common.date')} value={isWeekly ? t('ov.drawers.weeklyDay', { day: b.day_of_week ?? '—' }) : formatDate(b.booking_date)} />
            <DetailRow icon={Clock} label={t('ov.common.time')} value={`${b.start_time} - ${b.end_time}`} />
            <DetailRow icon={Swords} label={t('ov.common.price')} value={typeof b.price === 'number' ? `${b.price} ${t('ov.common.currency')}` : '—'} />
          </div>

          {b.notes && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-[10px] font-bold text-slate-400">{t('ov.common.notes')}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{b.notes}</p>
            </div>
          )}

          {b.status === 'pending' && (
            <div className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-600">
              {t('ov.drawers.waitingOwnerConfirm')}
            </div>
          )}

          {b.status === 'approved' && (
            <>
              {cancelOpen ? (
                <div className="space-y-3">
                  <Field label={t('ov.drawers.cancelReason')}>
                    <textarea rows={3} className={`${inputClass} h-auto py-3`} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)} disabled={busy}>
                      {t('ov.drawers.goBack')}
                    </Button>
                    <Button variant="danger" className="flex-1" disabled={busy} onClick={requestCancel}>
                      {busy ? t('ov.common.sending') : t('ov.drawers.confirmCancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="dangerSoft" className="flex-1" onClick={() => setCancelOpen(true)}>
                    <XCircle className="size-4" />
                    {t('ov.drawers.requestCancel')}
                  </Button>
                  <Button className="flex-1" disabled={busy} onClick={convert}>
                    <Swords className="size-4" />
                    {t('ov.drawers.convertToMatch')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Drawer>
  )
}

export function PlayerDrawer() {
  const { t } = useTranslation()
  const { toast, reload, player, setPlayer } = useCommandCenter()
  const [busy, setBusy] = useState(false)
  const [number, setNumber] = useState('')
  const p = player
  if (!p) return null
  const name = p.player_profile?.full_name || p.full_name || t('ov.common.player')
  const phone = p.phone || p.player_profile?.phone

  const saveNumber = async () => {
    const n = number.trim()
    if (!n || !/^\d{1,2}$/.test(n)) return toast.error(t('ov.team.invalidNumber'))
    setBusy(true)
    try {
      await api.put(`/manager/players/${p.id}`, { number: parseInt(n, 10) })
      toast.success(t('ov.team.numberUpdated'))
      reload()
    } catch {
      toast.error(t('ov.team.numberUpdateFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={() => setPlayer(null)} title={t('ov.drawers.playerTitle')} subtitle={t('ov.drawers.playerSubtitle', { name })} size="440">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {p.player_profile?.avatar_url || p.player_profile?.photo_url ? (
            <img loading="lazy" decoding="async" src={photoThumb(p.player_profile)} alt="" className="size-16 rounded-3xl object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-green-100 to-emerald-200 text-2xl font-black text-green-700">
              {name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-black text-slate-900">{name}</p>
              {p.is_essential && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-200">
                  <Star className="size-3 fill-amber-400" />
                  أساسي
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400">{p.position || '—'}</p>
          </div>
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-900 text-base font-black text-white">
            {p.number ?? '–'}
          </span>
        </div>

        <div className="space-y-2.5">
          {phone && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
                <MessageSquare className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400">{t('ov.drawers.phone')}</p>
                <p className="truncate text-sm font-bold text-slate-800" dir="ltr">{phone}</p>
              </div>
              <ManagerContact manager={{ phone, is_whatsapp: true }} />
            </div>
          )}
          {p.player_profile?.age && (
            <DetailRow icon={CalendarDays} label={t('ov.drawers.age')} value={t('ov.team.yearsOld', { count: p.player_profile.age })} />
          )}
          {p.player_profile?.height && (
            <DetailRow icon={MapPin} label={t('ov.drawers.height')} value={t('ov.drawers.heightValue', { count: p.player_profile.height })} />
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <Pencil className="size-3" />
            {t('ov.drawers.shirtNumber')}
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="1-99"
              defaultValue={p.number ?? ''}
              onChange={(e) => setNumber(e.target.value)}
            />
            <Button disabled={busy} onClick={saveNumber}>
              {t('ov.common.save')}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Star className={`size-4 ${p.is_essential ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
            <div>
              <p className="text-sm font-bold text-slate-700">{t('ov.team.essentialPlayer')}</p>
              <p className="text-[11px] font-semibold text-slate-400">{t('ov.team.essentialDesc')}</p>
            </div>
          </div>
          <Toggle
            checked={p.is_essential || false}
            onChange={async () => {
              try {
                const res = await api.put(`/manager/team-members/${p.id}/essential`)
                setPlayer((prev) => prev ? { ...prev, is_essential: !prev.is_essential } : prev)
                toast.success(res.data.message)
                reload()
              } catch (e) {
                toastApiError(e, t)
              }
            }}
          />
        </div>
      </div>
    </Drawer>
  )
}

export function TeamRowDrawer() {
  const { t } = useTranslation()
  const { teamRow, setTeamRow } = useCommandCenter()
  const row = teamRow
  if (!row) return null
  const stats = [
    { label: t('ov.common.points'), value: row.points ?? row.wins ?? 0 },
    { label: t('ov.common.wins'), value: row.wins ?? 0 },
    { label: t('ov.common.draws'), value: row.draws ?? 0 },
    { label: t('ov.common.losses'), value: row.losses ?? 0 },
  ]
  return (
    <Drawer open onClose={() => setTeamRow(null)} title={t('ov.drawers.teamTitle')} subtitle={row.city || '—'} size="440">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {row.logo_url ? (
            <img loading="lazy" decoding="async" src={logoThumb(row)} alt="" className="size-16 rounded-3xl object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-2xl font-black text-white">
              {initials(row.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-slate-900">{row.name}</p>
            <p className="text-xs font-semibold text-slate-400">{t('ov.drawers.matchesCount', { count: row.matches_played ?? 0 })}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-2 py-3">
              <p className="text-base font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {row.goals_for != null && (
          <DetailRow
            icon={Trophy}
            label={t('ov.drawers.goals')}
            value={`${row.goals_for} - ${row.goals_against ?? 0}`}
          />
        )}

        {row.manager && (
          <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-green-600/70">{t('ov.drawers.teamManager')}</p>
              <p className="truncate text-sm font-extrabold text-slate-800">{row.manager.name || t('ov.common.notAvailable')}</p>
            </div>
            <ManagerContact manager={row.manager} />
          </div>
        )}
      </div>
    </Drawer>
  )
}

export function JoinMatchDrawer() {
  const { t } = useTranslation()
  const { toast, reload, joinMatch, setJoinMatch } = useCommandCenter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [playersNeeded, setPlayersNeeded] = useState('')
  const m = joinMatch
  if (!m) return null

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.post(`/manager/match-requests/${m.id}/accept`, {
        needs_players: needsPlayers,
        players_needed: needsPlayers ? Number(playersNeeded) : undefined,
      })
      toast.success(res.data.message || t('ov.drawers.matchAccepted'))
      reload()
      setJoinMatch(null)
    } catch (e) {
      setError(e.response?.data?.message || t('ov.drawers.acceptFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={() => setJoinMatch(null)} title={t('ov.drawers.joinTitle')} subtitle={t('ov.drawers.joinSubtitle', { name: m.host_team?.name || t('ov.common.team') })} size="440">
      <div className="space-y-5">
        <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-base font-black">
                {initials(m.host_team?.name)}
              </span>
              <span className="max-w-[110px] truncate text-xs font-bold">{m.host_team?.name}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-black">{t('ov.common.vs')}</span>
              <span className="my-1 text-[10px] font-bold text-white/40">{t('ov.drawers.yourTeam')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-12 place-items-center rounded-2xl bg-green-500/20 text-base font-black text-green-400">{t('ov.drawers.you')}</span>
              <span className="text-xs font-bold">{t('ov.drawers.awayTeam')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <DetailRow icon={MapPin} label={t('ov.common.stadium')} value={m.stadium?.name || m.custom_terrain_name || t('ov.common.unspecified')} />
          {m.match_datetime && <DetailRow icon={CalendarDays} label={t('ov.common.date')} value={formatDate(m.match_datetime)} />}
          {m.match_datetime && <DetailRow icon={Clock} label={t('ov.common.time')} value={formatTime(m.match_datetime)} />}
          <DetailRow
            icon={Trophy}
            label={t('ov.common.price')}
            value={m.price_per_player ? `${m.price_per_player} ${t('ov.common.perPlayer')}` : t('ov.common.free')}
          />
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <NeedPlayersField enabled={needsPlayers} count={playersNeeded} onEnabled={setNeedsPlayers} onCount={setPlayersNeeded} />

        <Button className="w-full" disabled={busy} onClick={accept}>
          <CheckCircle2 className="size-4" />
          {busy ? t('ov.drawers.confirming') : t('ov.drawers.confirmMatch')}
        </Button>
      </div>
    </Drawer>
  )
}

export function BookTerrainDrawer() {
  const { t } = useTranslation()
  const { toast, reload, bookTerrain, setBookTerrain } = useCommandCenter()
  const [type, setType] = useState('training')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const terrain = bookTerrain?.terrain

  useEffect(() => {
    if (bookTerrain) {
      setDate(bookTerrain.date || new Date().toISOString().slice(0, 10))
      setStart('')
      setEnd('')
      setNotes('')
      setError('')
    }
  }, [bookTerrain])

  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(terrain?.id, date)
  const endAvail = start ? availableStartTimes.filter((s) => s > start) : availableStartTimes
  const endDisabled = start ? disabledStartTimes.filter((s) => s > start) : disabledStartTimes

  if (!terrain) return null

  const submit = async () => {
    if (!date || !start || !end) return setError(t('ov.drawers.fillDateTime'))
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/manager/bookings/training', {
        terrain_id: Number(terrain.id),
        booking_type: type,
        reservation_type: 'single',
        booking_date: date,
        start_time: start,
        end_time: end,
        notes: notes || undefined,
      })
      toast.success(res.data.message || t('ov.drawers.bookingSent'))
      setBookTerrain(null)
      reload()
    } catch (e) {
      setError(
        e.response?.data?.errors ? Object.values(e.response.data.errors).flat()[0] : e.response?.data?.message || t('ov.drawers.bookingFailed'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={() => setBookTerrain(null)} title={t('ov.drawers.bookTerrainTitle')} subtitle={typeof terrain.name === 'string' ? terrain.name : undefined} size="440">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
          {terrain.image_url ? (
            <img loading="lazy" decoding="async" src={terrain.thumbnail_url || terrain.image_url} alt="" className="size-14 rounded-2xl object-cover" />
          ) : (
            <span className="grid size-14 place-items-center rounded-2xl bg-sky-100 text-sky-600">
              <CalendarCheck className="size-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">{typeof terrain.name === 'string' ? terrain.name : 'ملعب'}</p>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <MapPin className="size-3 text-green-500" />
              {typeof terrain.city === 'string' ? terrain.city : '—'} {typeof terrain.type === 'string' ? `• ${terrain.type}` : ''}
            </p>
            {typeof terrain.price_per_team === 'number' && terrain.price_per_team > 0 && (
              <p className="text-[11px] font-black text-slate-700">{terrain.price_per_team} {t('ov.common.perTeam')}</p>
            )}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('ov.drawers.bookingType')}</span>
          <div className="flex gap-2">
            {[
              { value: 'training', label: t('ov.drawers.trainingType') },
              { value: 'private', label: t('ov.drawers.privateType') },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setType(o.value)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                  type === o.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <Field label={t('ov.common.date')} required>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <FieldRow>
          <Field label={t('ov.drawers.startTime')} required>
            <TimeSlotPicker
              selectedTime={start}
              onChange={setStart}
              availableSlots={availableStartTimes}
              disabledSlots={disabledStartTimes}
              loading={loading}
              label={t('ov.drawers.startTime')}
              required
            />
          </Field>
          <Field label={t('ov.drawers.endTime')} required>
            <TimeSlotPicker
              selectedTime={end}
              onChange={setEnd}
              availableSlots={endAvail}
              disabledSlots={endDisabled}
              loading={loading}
              label={t('ov.drawers.endTime')}
              required
            />
          </Field>
        </FieldRow>
        <Field label={t('ov.common.notes')}>
          <textarea rows={2} className={`${inputClass} h-auto py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? t('ov.common.sending') : t('ov.drawers.sendBookingRequest')}
        </Button>
      </div>
    </Drawer>
  )
}

export function CreateMatchDrawer() {
  const { t } = useTranslation()
  const { toast, reload, createOpen, setCreateOpen } = useCommandCenter()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: Boolean(createOpen) })
  const [mode, setMode] = useState('stadium')
  const [form, setForm] = useState({})
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [playersNeeded, setPlayersNeeded] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stadiums = stadiumsData?.data || []

  const matchDate = form.match_datetime ? form.match_datetime.slice(0, 10) : null
  const hasStadium = mode === 'stadium' && form.stadium_id
  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(hasStadium ? form.stadium_id : null, matchDate)
  const avail = hasStadium && availableStartTimes.length ? availableStartTimes : buildTimeSlots('08:00', '23:00', 30)
  const dis = hasStadium ? disabledStartTimes : []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/manager/match-requests', {
        stadium_id: mode === 'stadium' && form.stadium_id ? form.stadium_id : undefined,
        custom_terrain_name: mode === 'custom' ? form.custom_terrain_name : undefined,
        match_datetime: form.match_datetime,
        start_time: form.start_time,
        notes: form.notes || undefined,
        needs_players: needsPlayers,
        players_needed: needsPlayers ? Number(playersNeeded) : undefined,
      })
      toast.success(t('ov.drawers.matchPublished'))
      setCreateOpen(false)
      reload()
    } catch (e) {
      setError(e.response?.data?.message || t('ov.drawers.createFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open={Boolean(createOpen)} onClose={() => setCreateOpen(false)} title={t('ov.hero.newMatch')} subtitle={t('ov.drawers.createSubtitle')} size="xl">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { key: 'stadium', label: t('ov.drawers.platformStadium') },
            { key: 'custom', label: t('ov.drawers.externalStadium') },
          ].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                mode === m.key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'stadium' ? (
          <Field label={t('ov.drawers.chooseStadium')} required>
            <select className={selectClass} value={form.stadium_id || ''} onChange={set('stadium_id')}>
              <option value="">{t('ov.drawers.chooseStadiumPlaceholder')}</option>
              {stadiums.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.city} {s.price_per_team ? `(${s.price_per_team} ${t('ov.common.currency')})` : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={t('ov.drawers.stadiumName')} required>
            <input className={inputClass} value={form.custom_terrain_name || ''} onChange={set('custom_terrain_name')} />
          </Field>
        )}

        <Field label={t('ov.drawers.matchDateTime')} required>
          <input type="datetime-local" className={inputClass} value={form.match_datetime || ''} onChange={set('match_datetime')} />
        </Field>

        <Field label={t('ov.drawers.startTime')} required>
          <TimeSlotPicker
            selectedTime={form.start_time || ''}
            onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
            availableSlots={avail}
            disabledSlots={dis}
            loading={loading}
            label={t('ov.drawers.startTime')}
            required
          />
        </Field>

        <Field label={t('ov.common.notes')}>
          <textarea rows={3} className={`${inputClass} h-auto py-3`} value={form.notes || ''} onChange={set('notes')} />
        </Field>

        <NeedPlayersField enabled={needsPlayers} count={playersNeeded} onEnabled={setNeedsPlayers} onCount={setPlayersNeeded} />

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? t('ov.drawers.publishing') : t('ov.drawers.publishRequest')}
        </Button>
      </div>
    </Drawer>
  )
}

export function InviteDrawer() {
  const { t } = useTranslation()
  const { toast, reload, invite, setInvite, hosted } = useCommandCenter()
  const [matchId, setMatchId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const p = invite
  if (!p) return null
  const name = p.user?.name || p.player_profile?.full_name || p.full_name || t('ov.common.player')
  const userId = p.user_id || p.user?.id

  const submit = async () => {
    if (!matchId) return setError(t('ov.drawers.chooseMatchForInvite'))
    setBusy(true)
    setError('')
    try {
      await api.post(`/manager/recruitment/${userId}/invite`, {
        match_request_id: Number(matchId),
        message: message || undefined,
      })
      toast.success(t('ov.drawers.inviteSent'))
      setInvite(null)
      reload()
    } catch (e) {
      setError(e.response?.data?.message || t('ov.drawers.inviteFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer open onClose={() => setInvite(null)} title={t('ov.drawers.inviteTitle')} subtitle={t('ov.drawers.inviteSubtitle', { name })} size="440">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
          {p.player_profile?.avatar_url || p.player_profile?.photo_url ? (
            <img loading="lazy" decoding="async" src={photoThumb(p.player_profile)} alt="" className="size-12 rounded-2xl object-cover" />
          ) : (
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-base font-black text-green-700">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-slate-900">{name}</p>
            <p className="text-[11px] font-semibold text-slate-400">{p.position || t('ov.common.player')}</p>
          </div>
          {p.rating != null && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-600 ring-1 ring-amber-200">
              {p.rating}
            </span>
          )}
        </div>

        <Field label={t('ov.drawers.chooseOpenMatch')} required>
          {hosted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold text-slate-600">{t('ov.drawers.noOpenMatches')}</p>
              <p className="mt-1 text-[11px] text-slate-400">{t('ov.drawers.noOpenMatchesDesc')}</p>
            </div>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {hosted.map((m) => {
                const dt = m.match_datetime ? new Date(m.match_datetime) : null
                const selected = Number(matchId) === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMatchId(String(m.id))}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start transition-all ${
                      selected ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition-all ${
                        selected ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {dt ? formatDate(m.match_datetime) : t('ov.drawers.noTime')}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-slate-400">
                        {m.stadium?.name || m.custom_terrain_name || t('ov.common.unspecifiedStadium')}
                      </p>
                    </div>
                    <StatusBadge status="open" />
                  </button>
                )
              })}
            </div>
          )}
        </Field>

        <Field label={t('ov.drawers.inviteMessage')}>
          <textarea rows={3} className={`${inputClass} h-auto py-3`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('ov.drawers.inviteMessagePlaceholder')} />
        </Field>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy || hosted.length === 0} onClick={submit}>
          <Send className="size-4" />
          {busy ? t('ov.common.sending') : t('ov.drawers.sendInvite')}
        </Button>
      </div>
    </Drawer>
  )
}
