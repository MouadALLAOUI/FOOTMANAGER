import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

function pageList(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = [1, pageCount]
  for (let p = page - 1; p <= page + 1; p++) {
    if (p > 1 && p < pageCount) pages.push(p)
  }
  return [...new Set(pages)].sort((a, b) => a - b)
}

export default function Pagination({ page, pageCount, onChange }) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('ar')
  const backIcon = isRtl ? faChevronRight : faChevronLeft
  const nextIcon = isRtl ? faChevronLeft : faChevronRight
  const pages = pageList(page, pageCount)

  const navClass = (disabled) =>
    `flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-bold transition-all duration-300 ${
      disabled
        ? 'cursor-not-allowed text-slate-300'
        : 'text-slate-600 hover:-translate-y-0.5 hover:text-green-600 hover:shadow-[0_10px_25px_rgba(22,163,74,0.25)]'
    }`

  return (
    <nav className="mt-14 flex items-center justify-center gap-2.5">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className={navClass(page === 1)}>
        <FontAwesomeIcon icon={backIcon} className="size-4" />
        {t('fieldsPage.pagination.prev')}
      </button>

      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && pages[i - 1] !== p - 1 && (
            <span className="px-1 text-sm text-slate-400">…</span>
          )}
          <button
            type="button"
            onClick={() => onChange(p)}
            className={`grid size-12 place-items-center rounded-2xl text-sm font-bold transition-all duration-300 ${
              page === p
                ? 'bg-green-500 text-white shadow-[0_10px_25px_rgba(22,163,74,0.4)]'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:text-green-600 hover:ring-green-300'
            }`}
          >
            {p}
          </button>
        </span>
      ))}

      <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)} className={navClass(page === pageCount)}>
        {t('fieldsPage.pagination.next')}
        <FontAwesomeIcon icon={nextIcon} className="size-4" />
      </button>
    </nav>
  )
}
