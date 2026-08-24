import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle, Swords } from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { Button, Modal, inputClass } from '../../../components/dashboard/ui'

export default function ScoreModal({ match, onClose, onSaved, mode = 'submit' }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [host, setHost] = useState('')
  const [opp, setOpp] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await api.post(`/manager/matches/${match.id}/submit-score`, {
        host_score: Number(host),
        opponent_score: Number(opp),
      })
      toast.success('تم تسجيل النتيجة، بانتظار تأكيد الفريق المنافس')
      onSaved()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (action) => {
    setBusy(true)
    try {
      await api.post(`/manager/matches/${match.id}/${action}-score`)
      toast.success(action === 'confirm' ? 'تم تأكيد النتيجة وتحديث الترتيب' : 'تم الاعتراض على النتيجة')
      onSaved()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'submit' ? 'تسجيل نتيجة المباراة' : 'النتيجة المسجلة'}
      subtitle={`${match.host_team?.name} ضد ${match.opponent_team?.name}`}
    >
      {mode === 'submit' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">{match.host_team?.name || 'الفريق المضيف'}</label>
              <input type="number" min="0" className={inputClass} value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">{match.opponent_team?.name || 'الفريق الضيف'}</label>
              <input type="number" min="0" className={inputClass} value={opp} onChange={(e) => setOpp(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={submit}>
            {busy ? 'جارٍ الإرسال…' : 'إرسال النتيجة'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 rounded-2xl bg-slate-50 py-6">
            <span className="text-3xl font-black text-slate-900">{match.host_score ?? '–'}</span>
            <span className="grid size-9 place-items-center rounded-full bg-slate-200 text-slate-500">
              <Swords className="size-4" />
            </span>
            <span className="text-3xl font-black text-slate-900">{match.opponent_score ?? '–'}</span>
          </div>
          <p className="text-center text-xs font-semibold text-slate-400">
            سجلها الفريق المنافس — أؤكد النتيجة أم أعترض عليها؟
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="danger" disabled={busy} onClick={() => confirm('dispute')}>
              <XCircle className="size-4" />
              اعتراض
            </Button>
            <Button disabled={busy} onClick={() => confirm('confirm')}>
              <CheckCircle2 className="size-4" />
              تأكيد النتيجة
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
