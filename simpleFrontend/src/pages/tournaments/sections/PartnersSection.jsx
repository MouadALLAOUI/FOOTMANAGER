import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { logoThumb } from '../../../lib/thumb'

function normalizeLink(link) {
  if (!link) return null
  return /^https?:\/\//i.test(link) ? link : `https://${link}`
}

export default function PartnersSection({ partners }) {
  const { t } = useTranslation()
  const list = partners || []

  if (list.length === 0) return null

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600"><Users className="size-4" /></span>
        <h4 className="text-sm font-black text-slate-900">{t('public.partners.title')}</h4>
      </div>
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
    </div>
  )
}
