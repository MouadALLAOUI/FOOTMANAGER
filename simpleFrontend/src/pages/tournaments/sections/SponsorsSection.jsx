import { useTranslation } from 'react-i18next'
import { Handshake } from 'lucide-react'
import { logoThumb } from '../../../lib/thumb'
import Collapsible from '../../../components/tournaments/Collapsible'

function normalizeLink(link) {
  if (!link) return null
  return /^https?:\/\//i.test(link) ? link : `https://${link}`
}

export default function SponsorsSection({ sponsors }) {
  const { t } = useTranslation()
  const list = sponsors || []

  if (list.length === 0) return null

  return (
    <Collapsible icon={Handshake} title={t('public.sponsors.title')} tone="bg-emerald-50 text-emerald-600">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {list.map((sp) => (
          <div
            key={sp.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 text-center"
          >
            {sp.logo_url ? (
              <img src={logoThumb(sp)} alt={sp.name} className="h-10 w-auto max-w-[120px] object-contain" loading="lazy" />
            ) : (
              <span className="text-sm font-black text-slate-600">{sp.name}</span>
            )}
            {sp.name && sp.logo_url && <span className="text-[10px] font-bold text-slate-400">{sp.name}</span>}
            {sp.level && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-600">
                {sp.level}
              </span>
            )}
            {normalizeLink(sp.link) && (
              <a
                href={normalizeLink(sp.link)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-bold text-sky-600 hover:underline"
              >
                {t('public.sponsors.visit')}
              </a>
            )}
          </div>
        ))}
      </div>
    </Collapsible>
  )
}