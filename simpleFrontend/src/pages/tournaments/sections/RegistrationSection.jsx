import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CalendarClock,
  CheckCheck,
  CircleSlash,
  Clock,
  Crown,
  Loader2,
  Lock,
  PlusCircle,
  Rocket,
  Shield,
  Users,
  Wallet,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { rememberAction } from '../../../lib/intent'
import { getApiErrorMessage } from '../../../lib/errors'
import { SectionError } from '../../../components/errors'
import { Skeleton } from '../../../components/dashboard/ui'
import RegisterModal from '../components/RegisterModal'

const REG_META = {
  open: { icon: Rocket, tone: 'emerald', titleKey: 'openTitle', descKey: 'openDesc' },
  not_started: { icon: CalendarClock, tone: 'sky', titleKey: 'notStarted', descKey: 'notStartedDesc' },
  closed: { icon: Lock, tone: 'amber', titleKey: 'closed', descKey: 'closedDesc' },
  full: { icon: CircleSlash, tone: 'rose', titleKey: 'full', descKey: 'fullDesc' },
  started: { icon: Crown, tone: 'slate', titleKey: 'started', descKey: 'startedDesc' },
}

const TONES = {
  emerald: {
    card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white',
    icon: 'bg-emerald-500 text-white shadow-[0_12px_30px_rgba(16,185,129,0.4)]',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_16px_40px_rgba(16,185,129,0.45)]',
    text: 'text-emerald-700',
  },
  sky: {
    card: 'border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-white',
    icon: 'bg-sky-500 text-white shadow-[0_12px_30px_rgba(14,165,233,0.4)]',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    btn: 'bg-sky-500 hover:bg-sky-600 shadow-[0_16px_40px_rgba(14,165,233,0.45)]',
    text: 'text-sky-700',
  },
  amber: {
    card: 'border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-white',
    icon: 'bg-amber-500 text-white shadow-[0_12px_30px_rgba(245,158,11,0.4)]',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    btn: 'bg-amber-500 hover:bg-amber-600 shadow-[0_16px_40px_rgba(245,158,11,0.45)]',
    text: 'text-amber-700',
  },
  rose: {
    card: 'border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-white',
    icon: 'bg-rose-500 text-white shadow-[0_12px_30px_rgba(244,63,94,0.4)]',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    btn: 'bg-rose-500 hover:bg-rose-600 shadow-[0_16px_40px_rgba(244,63,94,0.45)]',
    text: 'text-rose-700',
  },
  slate: {
    card: 'border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-white',
    icon: 'bg-slate-600 text-white shadow-[0_12px_30px_rgba(100,116,139,0.4)]',
    chip: 'bg-slate-100 text-slate-700 ring-slate-200',
    btn: 'bg-slate-700 hover:bg-slate-800 shadow-[0_16px_40px_rgba(51,65,85,0.45)]',
    text: 'text-slate-700',
  },
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-600 ring-1 ring-slate-200">
      <Icon className="size-3.5 text-slate-400" />
      {children}
    </span>
  )
}

export default function RegistrationSection({ tour }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const autoOpen = useRef(false)

  const key = tour.slug || String(tour.id)

  const availQuery = useApi(() => api.get(`/v1/tournaments/${key}/registration`).then((r) => r.data.data), [key], {
    staleTime: 30 * 1000,
  })
  const meQuery = useApi(() => api.get(`/v1/tournaments/${key}/registration/me`).then((r) => r.data.data), [key], {
    enabled: Boolean(user),
    staleTime: 15 * 1000,
  })

  const avail = availQuery.data
  const me = meQuery.data

  const registerAction = useCallback(() => {
    if (!user) {
      rememberAction({ type: 'register_tournament', slug: key })
      toast.info(t('publicActions.loginRequired'))
      navigate('/login')
      return
    }
    if (user.role !== 'manager') {
      toast.error(t('publicActions.managersOnly'))
      return
    }
    if (user.status !== 'approved') {
      toast.error(t('publicActions.notApproved'))
      return
    }
    setModalOpen(true)
  }, [user, key, navigate, toast, t])

  useEffect(() => {
    if (autoOpen.current) return
    if (params.get('register') !== '1') return
    if (!avail || !avail.can_register) return
    if (user && (meQuery.loading || me?.eligible === false)) return
    const reg = me?.registration
    if (reg && ['pending', 'registered', 'rejected'].includes(reg.status)) return
    autoOpen.current = true
    registerAction()
  }, [params, avail, user, me, meQuery.loading, registerAction])

  const cancel = async () => {
    if (!window.confirm(t('public.registration.cancelConfirm'))) return
    setCancelBusy(true)
    try {
      await api.delete(`/v1/tournaments/${key}/registration`)
      toast.success(t('public.registration.cancelSuccess'))
      meQuery.refetch()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t, t('public.registration.cancelFailed')))
    } finally {
      setCancelBusy(false)
    }
  }

  const meta = REG_META[avail?.availability] || REG_META.started
  const tone = TONES[meta.tone]

  const feeLabel = avail?.requires_registration_fee
    ? `${avail.registration_fee ?? tour.registration_fee ?? 0} DH`
    : t('public.registration.free')
  const slotsLabel = `${avail?.registered_teams ?? 0} / ${avail?.teams_count ?? tour.teams_count ?? '—'}`
  const period = [avail?.registration_start_at, avail?.registration_end_at]
    .filter(Boolean)
    .map((v) => new Date(v).toLocaleDateString())
    .join(' → ')

  const myReg = me?.registration
  const hasActiveReg = myReg && ['pending', 'registered'].includes(myReg.status)
  const showCTA = avail?.can_register && !hasActiveReg && myReg?.status !== 'rejected'
  const regActionable = !myReg || myReg.status === 'cancelled'

  if (availQuery.error && !avail) {
    return (
      <section
        className={`rounded-[1.75rem] border p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7 ${tone.card}`}
        aria-label={t('public.registration.title')}
      >
        <SectionError state={availQuery.errorState} onRetry={availQuery.refetch} />
      </section>
    )
  }

  return (
    <section
      className={`rounded-[1.75rem] border p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7 ${tone.card}`}
      aria-label={t('public.registration.title')}
    >
      {availQuery.loading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${tone.icon}`}>
                <meta.icon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className={`text-base font-black ${tone.text}`}>{t(`public.registration.${meta.titleKey}`)}</p>
                <p className="text-xs font-semibold text-slate-500">{t(`public.registration.${meta.descKey}`)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip icon={Wallet}>{feeLabel}</Chip>
                  <Chip icon={Users}>{slotsLabel}</Chip>
                  {period && <Chip icon={CalendarClock}>{period}</Chip>}
                </div>
              </div>
            </div>

            {showCTA && (
              <div className="shrink-0">
                {me?.eligible === false ? (
                  <p className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    <Shield className="size-4 shrink-0 text-amber-500" />
                    {t('public.registration.needTeam')}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!regActionable}
                    onClick={registerAction}
                    className={`btn-ripple inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${tone.btn}`}
                  >
                    {myReg?.status === 'cancelled' ? <PlusCircle className="size-4" /> : <Rocket className="size-4" />}
                    {myReg?.status === 'cancelled' ? t('public.registration.registerAgain') : t('public.registration.registerCta')}
                  </button>
                )}
              </div>
            )}
          </div>

          {user && myReg && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
              {myReg.status === 'pending' && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
                    <Clock className="size-3.5" />
                    {t('public.registration.pending')}
                  </span>
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={cancel}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 text-[11px] font-extrabold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
                  >
                    {cancelBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                    {t('public.registration.cancelRequest')}
                  </button>
                </>
              )}
              {myReg.status === 'rejected' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-200">
                  <CircleSlash className="size-3.5" />
                  {t('public.registration.rejected')}
                </span>
              )}
              {myReg.status === 'registered' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-black text-green-700 ring-1 ring-green-200">
                  <CheckCheck className="size-3.5" />
                  {t('public.registration.registered')}
                </span>
              )}
              {myReg.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                  <Ban className="size-3.5" />
                  {t('public.registration.cancelled')}
                </span>
              )}
              <span className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <Wallet className="size-3.5" />
                {myReg.payment_status === 'pending'
                  ? t('public.registration.paymentPending')
                  : myReg.payment_status === 'completed'
                    ? t('public.registration.paymentPaid')
                    : t('public.registration.paymentNotRequired')}
              </span>
            </div>
          )}
        </>
      )}

      <RegisterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tour={tour}
        availability={avail}
        team={me?.team}
        onSuccess={() => meQuery.refetch()}
      />
    </section>
  )
}
