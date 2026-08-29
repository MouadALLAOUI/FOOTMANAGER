import { useTranslation } from 'react-i18next'
import { Network, Layers } from 'lucide-react'
import { Modal } from '../../../components/dashboard/ui'

const DEFAULT_OPTIONS = [
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

export default function KnockoutOptionModal({
  open,
  onClose,
  onConfirm,
  busy,
  options = DEFAULT_OPTIONS,
  titleKey = 'committee.detail.knockout6.modalTitle',
  descKey = 'committee.detail.knockout6.modalDesc',
  recommendedKey = 'committee.detail.knockout6.recommended',
  trail,
}) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(titleKey)}
      subtitle={t(descKey)}
      size="lg"
    >
      {trail && trail.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
          <span>{t('committee.detail.oddKo.trailLabel')}</span>
          <span className="flex flex-wrap items-center gap-1 font-black text-slate-900">
            {trail.map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-400">←</span>}
                <span className="rounded-lg bg-white px-2 py-0.5 ring-1 ring-slate-200">
                  {step}
                </span>
              </span>
            ))}
          </span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ id, icon: Icon, titleKey: itemTitle, descKey: itemDesc, cls, recommended }) => (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => onConfirm(id)}
            className={`group relative flex flex-col gap-2 rounded-2xl bg-gradient-to-br p-4 text-start ring-1 transition-all hover:-translate-y-0.5 hover:shadow-lg ${cls}`}
          >
            {recommended && (
              <span className="absolute end-3 top-3 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-white">
                {t(recommendedKey)}
              </span>
            )}
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-black text-slate-900">{t(itemTitle)}</span>
            <span className="text-xs leading-relaxed text-slate-500">{t(itemDesc)}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}