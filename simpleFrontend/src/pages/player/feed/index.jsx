import { useState } from 'react'
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Button, Empty, Modal, SkeletonCards } from '../../../components/dashboard/ui'
import { toast } from '../../../components/ui/Toast'
import { logoThumb } from '../../../lib/thumb'

export default function Feed() {
  const { t } = useTranslation()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/match-feed').then((r) => r.data))
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const matches = data?.matches || []

  const apply = async () => {
    setBusy(true)
    try {
      const res = await api.post(`/player/matches/${selected.id}/apply`, { message: message || undefined })
      toast.success(res.data.message || t('player.feed.applied'))
      setSelected(null)
      setMessage('')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('player.feed.applyFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <SectionTitle title={t('player.feed.title')} subtitle={t('player.feed.subtitle')} />

      {errorState ? (
        <Card>
          <SectionError state={errorState} onRetry={refetch} />
        </Card>
      ) : loading ? (
        <SkeletonCards count={4} className="grid gap-4 lg:grid-cols-2" />
      ) : matches.length === 0 ? (
        <Card>
          <Empty title={t('player.feed.empty')} description={t('player.feed.emptyDesc')} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((m) => {
            const full = (m.players_remaining ?? 0) === 0
            const team = m.host_team
            return (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {team?.logo_url ? (
                        <img loading="lazy" decoding="async" src={logoThumb(team)} alt="" className="size-11 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-black text-slate-500">
                          {(team?.name || t('player.feed.team')).slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-slate-900">{team?.name || t('player.feed.team')}</p>
                        <p className="text-xs text-slate-500">
                          {team?.city || t('player.feed.noCity')} • {team?.category || t('player.feed.noCategory')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled={full} onClick={() => setSelected(m)}>
                    {full ? t('player.feed.full') : t('player.feed.apply')}
                  </Button>
                </div>

                <div className="mt-4 space-y-2 text-[12px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-green-500" />
                    {m.match_datetime
                      ? new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(m.match_datetime))
                      : '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-green-500" />
                    {m.stadium?.name || m.custom_terrain_name || t('player.feed.stadium')}
                  </span>
                  {m.price_per_player ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-green-500" />
                      {t('player.feed.perPlayer', { price: m.price_per_player })}
                    </span>
                  ) : null}
                </div>

                {m.needs_players && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Users className="size-3.5 text-green-500" />
                        {t('player.feed.playersNeeded')}
                      </span>
                      <span className={full ? 'text-rose-600' : 'text-slate-700'}>
                        {m.players_joined ?? 0} / {m.players_needed}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${full ? 'bg-rose-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(((m.players_joined ?? 0) / Math.max(m.players_needed, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`${t('player.feed.apply')} — ${selected.host_team?.name || ''}`}>
          <div className="space-y-4">
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('player.feed.optionalMessage')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                {t('player.feed.cancel')}
              </Button>
              <Button className="flex-1" disabled={busy} onClick={apply}>
                {busy ? t('player.feed.sending') : t('player.feed.send')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
