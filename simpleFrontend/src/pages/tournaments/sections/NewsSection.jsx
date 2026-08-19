import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, Newspaper } from 'lucide-react'
import { matchDay } from '../../../lib/adapters'
import { coverThumb } from '../../../lib/thumb'
import NewsDetailModal from '../components/NewsDetailModal'

function NewsCard({ item, onOpen }) {
  const { t, i18n } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white text-start shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300"
    >
      {item.cover_url && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <img src={coverThumb(item, 'cover_url')} alt={item.title} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        </div>
      )}
      <div className="p-4">
        <h4 className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-900">{item.title}</h4>
        {item.published_at && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <CalendarDays className="size-3" />
            {matchDay(item.published_at, i18n.language)}
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.content}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-green-600">
          {t('public.news.readMore')}
          <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" />
        </span>
      </div>
    </button>
  )
}

export default function NewsSection({ news, tournamentKey }) {
  const { t } = useTranslation()
  const [openItem, setOpenItem] = useState(null)

  if (!(news || []).length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Newspaper className="size-6" /></span>
        <p className="text-sm font-bold text-slate-600">{t('public.news.empty')}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(news || []).map((item) => (
        <NewsCard key={item.id} item={item} onOpen={setOpenItem} />
      ))}

      <NewsDetailModal
        open={Boolean(openItem)}
        onClose={() => setOpenItem(null)}
        tournamentKey={tournamentKey}
        newsId={openItem?.id}
      />
    </div>
  )
}
