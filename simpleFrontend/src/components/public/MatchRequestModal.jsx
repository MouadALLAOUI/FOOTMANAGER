import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useStadiums } from '../../api/queries'
import { useToast } from '../ui/Toast'
import { Modal, Field, Button, inputClass, selectClass } from '../dashboard/ui'
import { getApiErrorMessage } from '../../lib/errors'

export default function MatchRequestModal({ open, onClose, team }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: open })

  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stadiums = stadiumsData?.data || []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (open) {
      setForm({})
      setError('')
    }
  }, [open])

  const submit = async () => {
    if (!form.match_datetime) {
      setError(t('publicActions.matchDateRequired'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.post('/manager/challenges', {
        target_team_id: team?.teamId,
        stadium_id: form.stadium_id || undefined,
        match_datetime: form.match_datetime,
        notes: form.notes || undefined,
      })
      toast.success(t('publicActions.challengeSuccess'))
      onClose()
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('publicActions.challengeError')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('publicActions.challengeTitle')}
      subtitle={team?.teamName}
      size="lg"
    >
      <div className="space-y-4">
        <Field label={t('publicActions.matchDatetime')} required>
          <input
            type="datetime-local"
            className={inputClass}
            value={form.match_datetime || ''}
            onChange={set('match_datetime')}
          />
        </Field>

        <Field label={t('publicActions.stadiumOptional')}>
          <select className={selectClass} value={form.stadium_id || ''} onChange={set('stadium_id')}>
            <option value="">{t('publicActions.noStadium')}</option>
            {stadiums.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('publicActions.notes')}>
          <textarea
            rows={3}
            className={`${inputClass} h-auto py-3`}
            value={form.notes || ''}
            onChange={set('notes')}
          />
        </Field>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy || !form.match_datetime} loading={busy} onClick={submit}>
          {t('publicActions.confirmChallenge')}
        </Button>
      </div>
    </Modal>
  )
}
