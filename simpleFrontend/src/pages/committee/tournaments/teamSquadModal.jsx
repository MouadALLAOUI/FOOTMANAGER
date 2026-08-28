import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ShieldAlert, Star, Users } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Field, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward']

export default function TeamSquadModal({ team, tournamentId, open, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', number: '', position: '' })

  const { data: payload, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad`).then((r) => r.data ?? {}),
    [tournamentId, team?.id, open],
    { enabled: open && Boolean(tournamentId && team?.id), staleTime: 0 },
  )

  const players = payload?.players ?? []
  const max = payload?.max ?? null
  const squadCount = payload?.squad_count ?? 0
  const atMax = max !== null && squadCount >= max
  const isFree = Boolean(team?.is_free)

  const addPlayer = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name || adding) return
    setAdding(true)
    try {
      const { data } = await api.post(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad`, {
        name,
        number: form.number ? Number(form.number) : undefined,
        position: form.position || undefined,
      })
      if (data?.created) {
        toast.success(data.message || t('committee.detail.playerAdded'))
        setForm({ name: '', number: '', position: '' })
        refetch()
      } else {
        toast.error(data?.message || t('committee.detail.playerDuplicate'))
      }
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setAdding(false)
    }
  }

  const positionLabel = (position) =>
    position ? t(`auth.selects.positions.${position}`, { defaultValue: position }) : '—'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team?.name || t('committee.detail.squad')}
      subtitle={isFree ? t('committee.detail.freeTeamSquadHint') : t('committee.detail.squadDesc')}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <TeamAvatar team={team} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-slate-900">{team?.name || '—'}</p>
            {team?.city && <p className="text-[11px] font-semibold text-slate-400">{team.city}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isFree && <Badge variant="info">{t('committee.detail.freeBadge')}</Badge>}
            <Badge variant={squadCount > 0 ? 'warning' : 'neutral'}>
              {max != null
                ? t('committee.detail.squadCountLimited', { count: squadCount, max })
                : t('committee.detail.squadCount', { count: players.length })}
            </Badge>
          </div>
        </div>

        {atMax && (
          <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-3.5 py-2.5 text-[11px] font-bold text-sky-700">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            {t('committee.detail.squadFullReached', { max })}
          </p>
        )}

        {isFree && (
          <form onSubmit={addPlayer} className="rounded-2xl border border-green-200/70 bg-green-50/60 p-4">
            <p className="mb-3 text-xs font-extrabold text-green-800">{t('committee.detail.addPlayer')}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_80px_120px_auto]">
              <Field label={t('committee.detail.playerName')}>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                  placeholder={t('committee.detail.playerName')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label={t('committee.detail.playerNumber')}>
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                />
              </Field>
              <Field label={t('committee.detail.playerPosition')}>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                >
                  <option value="">{t('committee.detail.playerPosition')}</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {t(`auth.selects.positions.${p}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <Button type="submit" className="w-full sm:w-auto" loading={adding} disabled={atMax}>
                  <Plus className="size-4" />
                  {t('committee.detail.addPlayer')}
                </Button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : players.length === 0 ? (
          <Empty
            icon={Users}
            title={t('committee.detail.noSquadPlayers')}
            description={isFree ? t('committee.detail.freeTeamSquadHint') : undefined}
          />
        ) : (
          <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
            {players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                  p.in_squad ? 'border-amber-200/70 bg-amber-50/50' : 'border-slate-200/70 bg-white'
                }`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{p.name}</span>
                {p.in_squad && (
                  <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" />
                )}
                {p.number != null && <span className="shrink-0 text-[10px] font-black text-slate-400">#{p.number}</span>}
                <Badge variant="neutral">{positionLabel(p.position)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}