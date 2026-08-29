import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { logoThumb } from '../../../lib/thumb'
import Collapsible from '../../../components/tournaments/Collapsible'

function normalizeLink(link) {
  if (!link) return null
  return /^https?:\/\//i.test(link) ? link : `https://${link}`
}

export default function PartnersSection({ partners }) {
  const { t } = useTranslation()
  const list = partners || []

  if (list.length === 0) return null

  return (
    <Collapsible icon={Users} title={t('public.partners.title')} tone="bg-sky-50 text-sky-600">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {list.map((p) => {
          const link = normalizeLink(p.link)
          const inner = (
            <>
              {p.logo_url ? (
                <img src={logoThumb(p)} alt={p.name} className="h-8 w-auto max-w-[110px] object-contain" loading="lazy" />
              ) : (
                <span className="text-sm font-black text-slate-600">{p.name}</span>
              )}
              {p.name && p.logo_url && <span className="text-[10px] font-bold text-slate-400">{p.name}</span>}
            </>
          )
          const cls =
            'flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 text-center transition-colors'
          return link ? (
            <a key={p.id} href={link} target="_blank" rel="noreferrer" className={`${cls} hover:border-sky-200`}>
              {inner}
            </a>
          ) : (
            <div key={p.id} className={cls}>
              {inner}
            </div>
          )
        })}
      </div>
    </Collapsible>
  )
}