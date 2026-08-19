import { useTranslation } from 'react-i18next'
import { CalendarDays, Loader2, Newspaper, X } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { matchDay } from '../../../lib/adapters'

export default function NewsDetailModal({ open, onClose, tournamentKey, newsId }) {
  const { t, i18n } = useTranslation()
  const enabled = open && Boolean(tournamentKey) && Boolean(newsId)

  const detailQuery = useApi(
    () => api.get(`/v1/tournaments/${tournamentKey}/news/${newsId}`).then((r) => r.data.data),
    [tournamentKey, newsId],
    { enabled, staleTime: 30 * 1000 },
  )

  if (!open) return null

  const m = detailQuery.data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-green-500 text-white">
              <Newspaper className="size-5" />
            </span>
            <p className="text-sm font-black text-slate-900">{t('public.news.detailTitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {detailQuery.loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="size-6 animate-spin text-slate-300" />
              <p className="text-xs font-semibold text-slate-400">{t('common.loading')}</p>
            </div>
          )}

          {detailQuery.error && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <p className="text-xs font-bold text-slate-500">{detailQuery.error}</p>
            </div>
          )}

          {m && (
            <article className="space-y-4">
              {m.cover_url && (
                <img src={m.cover_url} alt={m.title} className="h-56 w-full rounded-2xl object-cover" />
              )}
              <div>
                <h3 className="text-lg font-black leading-snug text-slate-900">{m.title}</h3>
                {m.published_at && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <CalendarDays className="size-3.5" />
                    {matchDay(m.published_at, i18n.language)}
                  </p>
                )}
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{m.content}</p>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
