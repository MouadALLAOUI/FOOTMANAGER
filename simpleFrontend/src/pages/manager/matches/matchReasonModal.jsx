import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudRain, Flag, Landmark, PenLine, XCircle } from 'lucide-react'
import { Button, Modal, inputClass } from '../../../components/dashboard/ui'

const REASONS = [
  { key: 'rain', icon: CloudRain },
  { key: 'opponent_gave_up', icon: Flag },
  { key: 'field_issue', icon: Landmark },
  { key: 'other', icon: PenLine },
]

/**
 * Ask the manager why they are cancelling a confirmed match or releasing its
 * opponent (rain, opponent gave up, ...). The chosen reason is sent to the
 * other side as a notification.
 */
export default function MatchReasonModal({ open, mode = 'cancel', onClose, onSubmit }) {
  const { t } = useTranslation()
  const [reasonKey, setReasonKey] = useState(null)
  const [customReason, setCustomReason] = useState('')
  const [busy, setBusy] = useState(false)

  const isReopen = mode === 'reopen'

  const close = () => {
    setReasonKey(null)
    setCustomReason('')
    setBusy(false)
    onClose?.()
  }

  const confirmReason = (key) => {
    setReasonKey(key)
    if (key !== 'other') setCustomReason('')
  }

  const submit = async () => {
    const reason =
      reasonKey === 'other' ? customReason.trim() : t(`dash.reason_${reasonKey}`)

    if (!reason) return

    setBusy(true)
    try {
      await onSubmit?.(reason)
      close()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isReopen ? t('dash.changeOpponent') : t('dash.cancelConfirmedMatch')}
      subtitle={isReopen ? t('dash.changeOpponentReasonTitle') : t('dash.cancelMatchReasonTitle')}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {REASONS.map(({ key, icon: Icon }) => {
            const active = reasonKey === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => confirmReason(key)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{t(`dash.reason_${key}`)}</span>
              </button>
            )
          })}
        </div>

        {reasonKey === 'other' && (
          <textarea
            className={`${inputClass} min-h-20 resize-none`}
            placeholder={t('dash.reasonPlaceholder')}
            value={customReason}
            maxLength={500}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}

        <Button
          className="w-full"
          variant={isReopen ? 'default' : 'danger'}
          disabled={busy || !reasonKey || (reasonKey === 'other' && customReason.trim().length < 3)}
          onClick={submit}
        >
          <XCircle className="size-4" />
          {busy
            ? t('dash.sending')
            : isReopen
              ? t('dash.submitReopen')
              : t('dash.submitCancel')}
        </Button>
      </div>
    </Modal>
  )
}
