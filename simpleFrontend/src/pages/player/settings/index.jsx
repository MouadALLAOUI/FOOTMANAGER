import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { SectionTitle } from '../../../components/dashboard/ui'
import NotificationPreferences from '../../../components/notifications/NotificationPreferences'
import { useAuth } from '../../../context/AuthContext'

const PLAYER_TYPES = [
  'match_invitation',
  'match_started',
  'match_finished',
  'goal_scored',
  'player_review',
  'player_awarded_mvp',
  'booking_confirmation',
  'booking_cancellation',
  'announcement',
  'report',
  'system',
]

export default function Settings() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        title={t('player.settings.title')}
        subtitle={t('player.settings.subtitle')}
      />

      <NotificationPreferences types={PLAYER_TYPES} />

      <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <UserRound className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('player.settings.account')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('player.settings.accountDesc')}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: t('player.settings.name'), value: user?.name || '—' },
            { label: t('player.settings.email'), value: user?.email || '—' },
            { label: t('player.settings.phone'), value: user?.phone || '—' },
            {
              label: t('player.settings.status'),
              value: user?.status === 'approved' ? t('player.settings.accountActive') : user?.status || '—',
            },
          ].map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400">{f.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
