import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Save, ShieldAlert, Star, Users, X } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'

export default function TeamSquadModal({ team, tournamentId, open, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [bulkRows, setBulkRows] = useState([{ name: '', number: '' }])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkErrors, setBulkErrors] = useState({})
  const [bulkTopError, setBulkTopError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ name: '', number: '' })
  const [editErrors, setEditErrors] = useState({})
  const [editingSaving, setEditingSaving] = useState(false)

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

  useEffect(() => {
    if (open) {
      setBulkRows([{ name: '', number: '' }])
      setBulkErrors({})
      setBulkTopError('')
      setEditingId(null)
      setEditErrors({})
    }
  }, [open, team?.id])

  const rowError = (i, field) => {
    const messages = bulkErrors[`players.${i}.${field}`]
    return Array.isArray(messages) ? messages[0] : messages || ''
  }

  const updateRow = (i, field, value) =>
    setBulkRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))

  const addRow = () => setBulkRows((rows) => (rows.length < 30 ? [...rows, { name: '', number: '' }] : rows))

  const removeRow = (i) => setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  const saveBulk = async () => {
    if (bulkSaving) return
    const rows = bulkRows
      .map((row) => ({
        name: (row.name || '').trim(),
        number: row.number !== '' && row.number != null ? Number(row.number) : undefined,
      }))
      .filter((row) => row.name !== '')
    if (rows.length === 0) return

    setBulkSaving(true)
    setBulkErrors({})
    setBulkTopError('')
    try {
      const { data } = await api.post(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/bulk`, {
        players: rows,
      })
      const count = data?.created_count
      const msg = count == null
        ? t('committee.detail.playersAdded')
        : count === 1
          ? t('committee.detail.playerAdded')
          : t('committee.detail.playersAdded', { count })
      toast.success(msg)
      setBulkRows([{ name: '', number: '' }])
      refetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
        setBulkErrors(errors)
        const top = errors.players
        setBulkTopError(Array.isArray(top) ? top[0] : typeof top === 'string' ? top : '')
        if (!errors.players) toastApiError(err, t)
      } else {
        toastApiError(err, t)
      }
    } finally {
      setBulkSaving(false)
    }
  }

  const startEdit = (player) => {
    setEditingId(player.id)
    setEditDraft({ name: player.name, number: player.number != null ? String(player.number) : '' })
    setEditErrors({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({ name: '', number: '' })
    setEditErrors({})
  }

  const saveEdit = async (player) => {
    if (editingSaving) return
    const name = editDraft.name.trim()
    if (!name) {
      setEditErrors({ name: [t('committee.detail.nameRequired')] })
      return
    }
    setEditingSaving(true)
    setEditErrors({})
    try {
      await api.patch(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${player.id}`, {
        name,
        number: editDraft.number === '' ? null : Number(editDraft.number),
      })
      toast.success(t('committee.detail.playerUpdated'))
      cancelEdit()
      refetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      setEditErrors(errors && typeof errors === 'object' ? errors : {})
      if (!errors || Object.keys(errors).length === 0) toastApiError(err, t)
    } finally {
      setEditingSaving(false)
    }
  }

  const fieldError = (messages) => (Array.isArray(messages) ? messages[0] : typeof messages === 'string' ? messages : '')

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
          <div className="rounded-2xl border border-green-200/70 bg-green-50/60 p-4">
            <p className="mb-1 text-xs font-extrabold text-green-800">{t('committee.detail.bulkAddPlayers')}</p>
            <p className="mb-3 text-[10px] font-semibold text-green-700/70">{t('committee.detail.bulkAddHint')}</p>

            <div className="space-y-2">
              {bulkRows.map((row, i) => {
                const nameError = rowError(i, 'name')
                const numberError = rowError(i, 'number')
                return (
                  <div key={i} className="rounded-xl border border-green-100 bg-white p-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-green-100 text-[10px] font-black text-green-700">
                        {i + 1}
                      </span>
                      <input
                        autoFocus={i === 0}
                        className={`${inputClass} border-green-200 focus:border-green-500 ${nameError ? 'border-red-300 bg-red-50/40' : ''}`}
                        placeholder={t('committee.detail.playerName')}
                        value={row.name}
                        onChange={(e) => updateRow(i, 'name', e.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className={`${inputClass} w-16 border-green-200 focus:border-green-500 ${numberError ? 'border-red-300 bg-red-50/40' : ''}`}
                        placeholder="#"
                        value={row.number}
                        onChange={(e) => updateRow(i, 'number', e.target.value)}
                      />
                      {bulkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label={t('committee.detail.removeRow')}
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                    {(nameError || numberError) && (
                      <p className="mt-1.5 px-1 text-[10px] font-bold text-red-600">{nameError || numberError}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {bulkTopError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600">{bulkTopError}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={addRow}
                disabled={bulkRows.length >= 30 || bulkSaving}
                className="!text-green-700"
              >
                <Plus className="size-3.5" />
                {t('committee.detail.addRow')}
              </Button>
              <Button size="sm" onClick={saveBulk} loading={bulkSaving} disabled={atMax || bulkRows.length === 0}>
                <Save className="size-3.5" />
                {t('committee.detail.savePlayers')}
              </Button>
            </div>
          </div>
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

                {editingId === p.id ? (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className={`${inputClass} py-2 text-sm ${fieldError(editErrors.name) ? 'border-red-300 bg-red-50/40' : ''}`}
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className={`${inputClass} w-16 px-2 py-2 text-sm ${fieldError(editErrors.number) ? 'border-red-300 bg-red-50/40' : ''}`}
                        placeholder="#"
                        value={editDraft.number}
                        onChange={(e) => setEditDraft((d) => ({ ...d, number: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(p)}
                        disabled={editingSaving}
                        className="grid size-8 shrink-0 place-items-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        aria-label={t('committee.detail.save')}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={editingSaving}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                        aria-label={t('committee.detail.cancel')}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    {(fieldError(editErrors.name) || fieldError(editErrors.number)) && (
                      <p className="mt-1 px-1 text-[10px] font-bold text-red-600">
                        {fieldError(editErrors.name) || fieldError(editErrors.number)}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{p.name}</span>
                    {p.in_squad && <Star className="size-3.5 shrink-0 fill-amber-500 text-amber-500" />}
                    {p.number != null && (
                      <span className="shrink-0 text-[10px] font-black text-slate-400">#{p.number}</span>
                    )}
                    <Badge variant="neutral">{positionLabel(p.position)}</Badge>
                    {isFree && (
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                        aria-label={t('committee.detail.editPlayer')}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}