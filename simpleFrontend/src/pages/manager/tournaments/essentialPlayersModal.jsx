import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, Star, Users } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward']

export default function EssentialPlayersModal({ tournament, open, onClose, onRegistered, hasTeam }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [players, setPlayers] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [registering, setRegistering] = useState(false)

  const { loading } = useApi(
    () => api.get(`/manager/tournaments/${tournament?.id}/squad`).then((r) => {
      const payload = r.data ?? {}
      setPlayers(payload.players ?? [])
      return payload
    }),
    [tournament?.id, open],
    { enabled: open && Boolean(tournament?.id) },
  )

  const list = players ?? []
  const max = tournament?.max_players_per_team ?? null
  const squadCount = list.filter((p) => p.in_squad).length
  const atMax = max !== null && squadCount >= max
  const canRegister = tournament?.status === 'open_for_registration' && tournament?.my_registration !== 'pending' && tournament?.my_registration !== 'registered'

  const toggle = async (p) => {
    setBusyId(p.id)
    try {
      const { data } = await api.put(`/manager/tournaments/${tournament.id}/squad/${p.id}`)
      setPlayers(data?.players ?? list)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyId(null)
    }
  }

  const doRegister = async () => {
    setRegistering(true)
    try {
      await api.post(`/manager/tournaments/${tournament.id}/register`)
      toast.success(t('manager.tournaments.registerSuccess'))
      onRegistered()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setRegistering(false)
    }
  }

  const positionLabel = (position) => {
    if (!position) return '—'
    if (POSITIONS.includes(position)) return t(`auth.selects.positions.${position}`)
    return position
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('manager.tournaments.essentialPlayers')}
      subtitle={tournament ? `${tournament.name} — ${t('manager.tournaments.essentialsDesc')}` : undefined}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          {canRegister && (
            <Button loading={registering} disabled={!hasTeam || list.length === 0} onClick={doRegister}>
              <Star className="size-4" />
              {t('manager.tournaments.registerAndConfirm')}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-500">{t('manager.tournaments.essentialsDesc')}</p>
          <Badge variant={squadCount > 0 ? 'warning' : 'neutral'}>
            {max != null
              ? t('manager.tournaments.squadCountLimited', { count: squadCount, max })
              : t('manager.tournaments.essentialStarred', { count: squadCount })}
          </Badge>
        </div>

        {squadCount === 0 && list.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-bold text-amber-700">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            {t('manager.tournaments.essentialsHint')}
          </p>
        )}

        {atMax && (
          <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-3.5 py-2.5 text-[11px] font-bold text-sky-700">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            {t('manager.tournaments.squadFullHint', { max })}
          </p>
        )}

        {!hasTeam ? (
          <Empty icon={Users} title={t('manager.tournaments.needTeam')} />
        ) : loading || players === null ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : list.length === 0 ? (
          <Empty icon={Users} title={t('manager.tournaments.noPlayersForEssentials')} />
        ) : (
          <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
            {list.map((p, i) => {
              const inSquad = p.in_squad
              const disabled = !inSquad && atMax
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                    inSquad ? 'border-amber-200/70 bg-amber-50/50' : 'border-slate-200/70 bg-white'
                  }`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {positionLabel(p.position)} {p.number != null ? `· #${p.number}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    disabled={busyId === p.id || disabled}
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 transition-colors ${
                      inSquad
                        ? 'bg-amber-50 text-amber-500 ring-amber-200 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-400 ring-slate-200 hover:bg-amber-50 hover:text-amber-500'
                    } ${busyId === p.id ? 'animate-pulse opacity-60' : ''} ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-slate-50 hover:text-slate-400' : ''}`}
                    aria-label={t('manager.tournaments.essentialPlayers')}
                  >
                    {busyId === p.id ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-slate-200 border-t-current" />
                    ) : (
                      <Star className={`size-4 ${inSquad ? 'fill-current' : ''}`} />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}