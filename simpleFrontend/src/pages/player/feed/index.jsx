import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, Users, Shield, Swords, Target, HandMetal, ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Button, Empty, Modal, SkeletonCards } from '../../../components/dashboard/ui'
import { toast } from '../../../components/ui/Toast'
import { logoThumb } from '../../../lib/thumb'

const POSITION_ICONS = {
  goalkeeper: HandMetal,
  defender: Shield,
  midfielder: Target,
  forward: Swords,
}
const POSITION_COLORS = {
  goalkeeper: 'text-yellow-500',
  defender: 'text-blue-500',
  midfielder: 'text-green-500',
  forward: 'text-red-500',
}
const POSITION_LABELS = {
  goalkeeper: 'حارس',
  defender: 'مدافع',
  midfielder: 'وسط',
  forward: 'مهاجم',
}

function PositionBadge({ positions_needed, position_availability }) {
  if (!positions_needed || Object.keys(positions_needed).length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(positions_needed).map(([pos, required]) => {
        const Icon = POSITION_ICONS[pos]
        const filled = position_availability?.[pos]?.filled ?? 0
        const available = position_availability?.[pos]?.available ?? 0
        const full = available <= 0
        if (!Icon) return null
        return (
          <span
            key={pos}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
              full
                ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                : `bg-background ${POSITION_COLORS[pos]} border-current/20`
            }`}
          >
            <Icon className="w-2.5 h-2.5" />
            {POSITION_LABELS[pos]} {filled}/{required}
          </span>
        )
      })}
    </div>
  )
}

export default function Feed() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/match-feed').then((r) => r.data))
  const [selected, setSelected] = useState(null)
  const [selectedPos, setSelectedPos] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [applyError, setApplyError] = useState(null)

  const matches = data?.matches || []

  const hasPositions = selected?.positions_needed && Object.keys(selected.positions_needed).length > 0

  const apply = async () => {
    setBusy(true)
    setApplyError(null)
    try {
      const payload = { message: message || undefined }
      if (hasPositions && selectedPos) payload.position = selectedPos
      const res = await api.post(`/player/matches/${selected.id}/apply`, payload)
      toast.success(res.data.message || t('player.feed.applied'))
      setSelected(null)
      setSelectedPos(null)
      setMessage('')
      refetch()
    } catch (e) {
      setApplyError(e.response?.data?.message || t('player.feed.applyFailed'))
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
            const hasPos = m.positions_needed && Object.keys(m.positions_needed).length > 0
            return (
              <Card key={m.id} className="group relative cursor-pointer hover:border-primary/40 transition" onClick={() => navigate(`/player/matches/${m.id}`)}>
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
                  <div className="flex items-center gap-2 shrink-0">
                    {m.player_format && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {m.player_format}
                      </span>
                    )}
                    <ChevronLeft className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition" />
                  </div>
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
                  {m.host_manager_name && (
                    <span className="flex items-center gap-1.5">
                      <Shield className="size-3.5 text-green-500" />
                      {m.host_manager_name}
                    </span>
                  )}
                </div>

                {hasPos && <PositionBadge positions_needed={m.positions_needed} position_availability={m.position_availability} />}

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
        <Modal open onClose={() => { setSelected(null); setSelectedPos(null); setApplyError(null) }} title={`${t('player.feed.apply')} — ${selected.host_team?.name || ''}`}>
          <div className="space-y-4">
            {hasPositions && selected.position_availability && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">اختر المركز</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.position_availability).map(([pos, data]) => {
                    const Icon = POSITION_ICONS[pos]
                    const full = data.available <= 0
                    if (!Icon) return null
                    return (
                      <button
                        key={pos}
                        onClick={() => setSelectedPos(pos)}
                        disabled={full}
                        className={`text-sm py-2 px-3 rounded-xl border transition disabled:opacity-40 ${
                          selectedPos === pos
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white border-slate-200 text-slate-900 hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 inline-block me-1 ${full ? 'text-gray-400' : POSITION_COLORS[pos]}`} />
                        {POSITION_LABELS[pos]} ({data.available} متاح)
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <textarea
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('player.feed.optionalMessage')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {applyError && <p className="text-xs text-red-400">{applyError}</p>}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setSelectedPos(null); setApplyError(null) }}>
                {t('player.feed.cancel')}
              </Button>
              <Button
                className="flex-1"
                disabled={busy || (hasPositions && !selectedPos)}
                onClick={apply}
              >
                {busy ? t('player.feed.sending') : t('player.feed.send')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
