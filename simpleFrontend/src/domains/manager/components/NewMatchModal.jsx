import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import { toastApiError } from '../../../lib/errors';
import { useStadiums } from '../../../api/queries';
import { Button, Field, Modal, inputClass, selectClass } from '../../../components/dashboard/ui';
import TimeSlotPicker from '../../../components/TimeSlotPicker';
import useTerrainSlots from '../../../hooks/useTerrainSlots';
import { buildTimeSlots } from '../../../lib/timeSlots';
import NeedPlayersField from '../../../components/NeedPlayersField';

export default function NewMatchModal({ open, onClose, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: open })
  const [mode, setMode] = useState('stadium')
  const [form, setForm] = useState({})
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [playersNeeded, setPlayersNeeded] = useState('')
  const [busy, setBusy] = useState(false)

  const stadiums = stadiumsData?.data || []

  const date = form.match_datetime ? form.match_datetime.slice(0, 10) : null
  const hasStadium = mode === 'stadium' && form.stadium_id
  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(hasStadium ? form.stadium_id : null, date)
  const avail = hasStadium && availableStartTimes.length ? availableStartTimes : buildTimeSlots('08:00', '23:00', 30)
  const dis = hasStadium ? disabledStartTimes : []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setBusy(true)
    try {
      const payload = {
        stadium_id: mode === 'stadium' && form.stadium_id ? form.stadium_id : undefined,
        custom_terrain_name: mode === 'custom' ? form.custom_terrain_name : undefined,
        match_datetime: form.match_datetime,
        start_time: form.start_time,
        notes: form.notes || undefined,
        needs_players: needsPlayers,
        players_needed: needsPlayers ? Number(playersNeeded) : undefined,
      }
      await api.post('/manager/match-requests', payload)
      toast.success(t('ov.newMatch.successToast'))
      onSaved()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('ov.newMatch.title')} subtitle={t('ov.newMatch.subtitle')} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { key: 'stadium', label: t('ov.newMatch.fromPlatform') },
            { key: 'custom', label: t('ov.newMatch.externalField') },
          ].map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${mode === m.key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'stadium' ? (
          <Field label={t('ov.newMatch.selectField')} required>
            <select className={selectClass} value={form.stadium_id || ''} onChange={set('stadium_id')}>
              <option value="">{t('ov.newMatch.fieldPlaceholder')}</option>
              {stadiums.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.city} {s.price_per_team ? `(${s.price_per_team} ${t('ov.common.currency')})` : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={t('ov.newMatch.fieldName')} required>
            <input className={inputClass} value={form.custom_terrain_name || ''} onChange={set('custom_terrain_name')} />
          </Field>
        )}

        <Field label={t('ov.newMatch.datetime')} required>
          <input type="datetime-local" className={inputClass} value={form.match_datetime || ''} onChange={set('match_datetime')} />
        </Field>

        <Field label={t('ov.newMatch.startTime')} required>
          <TimeSlotPicker
            selectedTime={form.start_time || ''}
            onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
            availableSlots={avail}
            disabledSlots={dis}
            loading={loading}
            label={t('ov.newMatch.startTime')}
            required
          />
        </Field>

        <Field label={t('ov.newMatch.notes')}>
          <textarea rows={3} className={`${inputClass} h-auto py-3`} value={form.notes || ''} onChange={set('notes')} />
        </Field>

        <NeedPlayersField enabled={needsPlayers} count={playersNeeded} onEnabled={setNeedsPlayers} onCount={setPlayersNeeded} />

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? t('ov.newMatch.posting') : t('ov.newMatch.submit')}
        </Button>
      </div>
    </Modal>
  )
}
