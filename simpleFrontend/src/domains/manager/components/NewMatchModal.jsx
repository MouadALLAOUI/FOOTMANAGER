import React, { useState } from 'react'
import api from '../../../api/client';
import { useToast } from '../../../components/ui/Toast';
import { useStadiums } from '../../../api/queries';
import { Button, Field, Modal, inputClass, selectClass } from '../../../components/dashboard/ui';
import TimePicker from '../../../components/TimePicker';
import NeedPlayersField from '../../../components/NeedPlayersField';

export default function NewMatchModal({ open, onClose, onSaved }) {
  const { toast } = useToast()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: open })
  const [mode, setMode] = useState('stadium')
  const [form, setForm] = useState({})
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [playersNeeded, setPlayersNeeded] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stadiums = stadiumsData?.data || []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setBusy(true)
    setError('')
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
      toast.success('تم نشر طلب المباراة بنجاح')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'تعذر إنشاء طلب المباراة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="مباراة جديدة" subtitle="انشر طلب مباراة ودية يبحث عن خصم" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
          {[
            { key: 'stadium', label: 'ملعب من المنصة' },
            { key: 'custom', label: 'ملعب خارجي' },
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
          <Field label="اختر الملعب" required>
            <select className={selectClass} value={form.stadium_id || ''} onChange={set('stadium_id')}>
              <option value="">اختر ملعبًا…</option>
              {stadiums.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.city} {s.price_per_team ? `(${s.price_per_team} د.م)` : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="اسم الملعب" required>
            <input className={inputClass} value={form.custom_terrain_name || ''} onChange={set('custom_terrain_name')} />
          </Field>
        )}

        <Field label="تاريخ ووقت المباراة" required>
          <input type="datetime-local" className={inputClass} value={form.match_datetime || ''} onChange={set('match_datetime')} />
        </Field>

        <Field label="وقت البداية" required>
          <TimePicker
            value={form.start_time || ''}
            onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
            labels={{ ok: 'موافق', cancel: 'إلغاء' }}
            className="h-11 rounded-xl border border-slate-200 bg-white"
          />
        </Field>

        <Field label="ملاحظات">
          <textarea rows={3} className={`${inputClass} h-auto py-3`} value={form.notes || ''} onChange={set('notes')} />
        </Field>

        <NeedPlayersField enabled={needsPlayers} count={playersNeeded} onEnabled={setNeedsPlayers} onCount={setPlayersNeeded} />

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? 'جارٍ النشر…' : 'نشر الطلب'}
        </Button>
      </div>
    </Modal>
  )
}
