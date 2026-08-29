import { useTranslation } from 'react-i18next'
import { Network, Layers } from 'lucide-react'
import { Modal } from '../../../components/dashboard/ui'

const OPTIONS = [
  {
    id: 'standard_byes',
    icon: Network,
    titleKey: 'committee.detail.knockout6.options.byes.title',
    descKey: 'committee.detail.knockout6.options.byes.desc',
    cls: 'from-emerald-500/10 to-emerald-500/5 ring-emerald-200',
    recommended: true,
  },
  {
    id: 'groups6',
    icon: Layers,
    titleKey: 'committee.detail.knockout6.options.groups.title',
    descKey: 'committee.detail.knockout6.options.groups.desc',
    cls: 'from-green-500/10 to-green-500/5 ring-green-200',
    recommended: false,
  },
]

export default function KnockoutOptionModal({ open, onClose, onConfirm, busy }) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('committee.detail.knockout6.modalTitle')}
      subtitle={t('committee.detail.knockout6.modalDesc')}
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ id, icon: Icon, titleKey, descKey, cls, recommended }) => (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => onConfirm(id)}
            className={`group relative flex flex-col gap-2 rounded-2xl bg-gradient-to-br p-4 text-start ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lg ${cls}`}
          >
            {recommended && (
              <span className="absolute end-3 top-3 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-white">
                {t('committee.detail.knockout6.recommended')}
              </span>
            )}
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-black text-slate-900">{t(titleKey)}</span>
            <span className="text-xs leading-relaxed text-slate-500">{t(descKey)}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}