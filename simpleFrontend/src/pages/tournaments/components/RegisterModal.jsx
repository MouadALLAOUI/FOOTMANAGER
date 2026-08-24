import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle2, Loader2, ScrollText, Trophy, Users, Wallet, X } from 'lucide-react'
import api from '../../../api/client'
import { TeamAvatar } from '../shared'
import { getApiErrorMessage, toastApiError } from '../../../lib/errors'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-green-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

const fmtPeriod = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

export default function RegisterModal({ open, onClose, tour, availability, team, onSuccess }) {
  const { t } = useTranslation()
  const [step, setStep] = useState('confirm')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const close = () => {
    if (busy) return
    setStep('confirm')
    setError('')
    onClose()
  }

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      const key = tour.slug || tour.id
      await api.post(`/v1/tournaments/${key}/registration`, { team_id: team.id })
      setStep('done')
      onSuccess?.()
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('public.registration.failed')))
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const feeLabel = availability?.requires_registration_fee
    ? `${availability.registration_fee ?? tour.registration_fee ?? 0} DH`
    : t('public.registration.free')

  const period = `${fmtPeriod(tour.registration_start_at || availability?.registration_start_at)} → ${fmtPeriod(tour.registration_end_at || availability?.registration_end_at)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-green-500 text-white shadow-[0_10px_24px_rgba(22,163,74,0.4)]">
              {step === 'done' ? <CheckCircle2 className="size-6" /> : <Trophy className="size-6" />}
            </span>
            <div>
              <p className="text-sm font-black text-slate-900">
                {step === 'done' ? t('public.registration.successTitle') : t('public.registration.confirmTitle')}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">
                {step === 'done' ? t('public.registration.successDesc') : t('public.registration.confirmDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="px-6 pb-6 pt-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
              <p className="text-sm font-extrabold text-emerald-800">{t('public.registration.pending')}</p>
              {availability?.requires_registration_fee && (
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">{t('public.registration.paymentInfo')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="mt-4 h-12 w-full rounded-2xl bg-slate-900 text-sm font-extrabold text-white transition-colors hover:bg-slate-800"
            >
              {t('public.registration.close')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 px-6 pb-6 pt-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <TeamAvatar team={team} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{team?.name || '—'}</p>
                {team?.category && <p className="text-[11px] font-semibold text-slate-400">{team.category}</p>}
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700 ring-1 ring-green-200">
                {t('public.registration.myTeam')}
              </span>
            </div>

            <div className="grid gap-2">
              <InfoRow icon={Trophy} label={t('public.registration.tournament')} value={tour.name} />
              <InfoRow icon={CalendarDays} label={t('public.registration.period')} value={period} />
              <InfoRow icon={Wallet} label={t('public.registration.fee')} value={feeLabel} />
              <InfoRow
                icon={Users}
                label={t('public.registration.slots')}
                value={`${availability?.registered_teams ?? tour.stats?.registered_teams ?? 0} / ${availability?.teams_count ?? tour.teams_count ?? '—'}`}
              />
            </div>

            {(tour.rules || tour.description) && (
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500">
                  <ScrollText className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('public.registration.rules')}</p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">{tour.rules || tour.description}</p>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="btn-ripple flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-green-500 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all hover:-translate-y-0.5 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {busy ? t('public.registration.submitting') : t('public.registration.submit')}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="h-12 rounded-2xl bg-slate-100 px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
