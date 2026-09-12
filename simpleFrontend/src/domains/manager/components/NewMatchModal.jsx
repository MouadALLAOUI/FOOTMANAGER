import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { useStadiums } from '../../../api/queries'
import { Button, Field, Modal, inputClass, selectClass } from '../../../components/dashboard/ui'
import TimeSlotPicker from '../../../components/TimeSlotPicker'
import useTerrainSlots from '../../../hooks/useTerrainSlots'
import { buildTimeSlots } from '../../../lib/timeSlots'
import NeedPlayersField from '../../../components/NeedPlayersField'
import { CheckCircle2, MessageCircle, Copy, CalendarDays } from 'lucide-react'

export default function NewMatchModal({ open, onClose, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: open })

  const today = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const [mode, setMode] = useState('stadium')
  const [form, setForm] = useState({ date: today })
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [playersNeeded, setPlayersNeeded] = useState('')
  const [busy, setBusy] = useState(false)
  const [createdMatch, setCreatedMatch] = useState(null)

  useEffect(() => {
    if (open && !form.date) {
      setForm((f) => ({ ...f, date: today }))
    }
  }, [open, today])

  const stadiums = stadiumsData?.data || []

  const date = form.date || today
  const hasStadium = mode === 'stadium' && form.stadium_id
  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(hasStadium ? form.stadium_id : null, date)
  const avail = hasStadium && availableStartTimes.length ? availableStartTimes : buildTimeSlots('08:00', '23:00', 30)
  const dis = hasStadium ? disabledStartTimes : []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleClose = () => {
    setCreatedMatch(null)
    setForm({ date: today })
    setNeedsPlayers(false)
    setPlayersNeeded('')
    onClose()
  }

  const submit = async () => {
    if (mode === 'stadium' && !form.stadium_id) {
      toast.error(t('ov.newMatch.selectFieldRequired', 'يرجى اختيار الملعب'))
      return
    }
    if (mode === 'custom' && !form.custom_terrain_name?.trim()) {
      toast.error(t('ov.newMatch.fieldNameRequired', 'يرجى كتابة اسم الملعب'))
      return
    }
    const matchDate = form.date || date
    if (!matchDate) {
      toast.error(t('ov.newMatch.selectDateRequired', 'يرجى تحديد تاريخ المباراة'))
      return
    }
    if (!form.start_time) {
      toast.error(t('ov.newMatch.selectStartTimeRequired', 'يرجى تحديد وقت بداية المباراة'))
      return
    }

    setBusy(true)
    try {
      const match_datetime = `${matchDate}T${form.start_time}`
      const payload = {
        stadium_id: mode === 'stadium' && form.stadium_id ? form.stadium_id : undefined,
        custom_terrain_name: mode === 'custom' ? form.custom_terrain_name : undefined,
        match_datetime,
        start_time: form.start_time,
        notes: form.notes || undefined,
        needs_players: needsPlayers,
        players_needed: needsPlayers ? Number(playersNeeded) : undefined,
      }
      const res = await api.post('/manager/match-requests', payload)
      toast.success(t('ov.newMatch.successToast'))
      onSaved()
      if (res.data?.match_request?.invitation_token) {
        setCreatedMatch(res.data.match_request)
      } else {
        handleClose()
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const inviteUrl = createdMatch?.invitation_token
    ? `${window.location.origin}/matches/invite/${createdMatch.invitation_token}`
    : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    toast.success('تم نسخ رابط التحدي بنجاح!')
  }

  const handleWhatsAppShare = () => {
    const fieldName = createdMatch?.stadium?.name || createdMatch?.custom_terrain_name || 'الملعب'
    const matchDate = createdMatch?.match_datetime
      ? new Date(createdMatch.match_datetime).toLocaleString('ar-MA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''
    const msg = `⚽ *تحدي مباراة ودية!*\nفريقنا يبحث عن منافس لمباراة كرة قدم!\n📍 *الملعب:* ${fieldName}\n📅 *الموعد:* ${matchDate}\n⚔️ *هل تقبل التحدي؟ أرسل طلب التحدي هنا:*\n${inviteUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (createdMatch) {
    return (
      <Modal open={open} onClose={handleClose} title="تم نشر التحدي بنجاح! 🎉" subtitle="شارك الرابط لجلب المنافسين" size="md">
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">مباراتك أصبحت متاحة لاستقبال التحديات</h3>
            <p className="text-xs text-slate-500 mt-1">
              انشر الرابط على حالة واتساب أو مجموعات فيسبوك، وسيقوم أي فريق أو ضيف بإرسال طلب تحدٍ يمكنك مراجعته وقبوله.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-start">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="min-w-0 flex-1 bg-transparent px-2 text-xs font-mono text-slate-600 outline-none"
            />
            <Button size="sm" variant="outline" onClick={handleCopyLink}>
              <Copy className="size-3.5" />
              نسخ
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleWhatsAppShare}
            >
              <MessageCircle className="size-4" />
              مشاركة فورية على واتساب
            </Button>
            <Button variant="ghost" className="w-full text-slate-500" onClick={handleClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('ov.newMatch.title')}
      subtitle={t('ov.newMatch.subtitle')}
      size="lg"
      footer={
        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? t('ov.newMatch.posting') : t('ov.newMatch.submit')}
        </Button>
      }
    >
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
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                mode === m.key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
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
            <input
              className={inputClass}
              value={form.custom_terrain_name || ''}
              onChange={set('custom_terrain_name')}
              placeholder={t('ov.newMatch.fieldNamePlaceholder', 'مثال: ملعب القرب حي الأمل')}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('ov.newMatch.date', 'تاريخ المباراة')} required>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                min={today}
                className={`${inputClass} ps-10`}
                value={form.date || ''}
                onChange={set('date')}
                required
              />
            </div>
          </Field>

          <Field label={t('ov.newMatch.startTime')} required>
            <TimeSlotPicker
              compact
              selectedTime={form.start_time || ''}
              onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
              availableSlots={avail}
              disabledSlots={dis}
              loading={loading}
              placeholder={t('ov.newMatch.startTime')}
              required
            />
          </Field>
        </div>

        <Field label={t('ov.newMatch.notes')}>
          <textarea
            rows={3}
            className={`${inputClass} h-auto py-3`}
            value={form.notes || ''}
            onChange={set('notes')}
            placeholder={t('ov.newMatch.notesPlaceholder', 'أي تفاصيل إضافية عن المباراة...')}
          />
        </Field>

        <NeedPlayersField
          enabled={needsPlayers}
          count={playersNeeded}
          onEnabled={setNeedsPlayers}
          onCount={setPlayersNeeded}
        />
      </div>
    </Modal>
  )
}
