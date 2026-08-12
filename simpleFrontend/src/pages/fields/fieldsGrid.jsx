import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarCheck,
  faClock,
  faHeart,
  faMapPin,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { formatCount } from '../../lib/adapters'

function hideBrokenImage(e) {
  e.currentTarget.style.opacity = '0'
}

function FieldCard({ card, liked, onToggleLike, onBook, variant }) {
  const { t, i18n } = useTranslation()
  const horizontal = variant === 'list'

  return (
    <article
      className={`group overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.18)] ${
        horizontal ? 'flex flex-col sm:flex-row' : 'flex flex-col'
      }`}
    >
      <div className={`relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950 ${horizontal ? 'h-[220px] shrink-0 sm:w-[280px] sm:self-stretch' : 'h-[210px]'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
        <img
          src={card.image}
          alt={card.name}
          loading="lazy"
          decoding="async"
          onError={hideBrokenImage}
          className="relative size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
        />
        <span className="absolute top-3 end-3 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-md">
          {t('fieldsPage.card.available')}
        </span>
        <button
          type="button"
          aria-label="favorite"
          onClick={() => onToggleLike(card)}
          className="absolute top-3 start-3 grid size-9 place-items-center rounded-full bg-white/20 text-white shadow-sm ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 ease-out hover:scale-110 active:scale-90"
        >
          <FontAwesomeIcon
            icon={liked ? faHeart : faHeartRegular}
            className="size-4 transition-transform duration-300 ease-out group-hover:scale-110"
          />
        </button>
        <span className="absolute bottom-3 start-3 flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <FontAwesomeIcon icon={faMapPin} className="size-3" />
          {t(`fieldsPage.toolbar.covers.${card.cover}`)}
        </span>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col p-6`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faStar} className="size-4 text-amber-400" />
            <span className="text-sm font-bold text-slate-800">{card.rating}</span>
            <span className="text-xs text-slate-400">({formatCount(card.reviews, i18n.language)})</span>
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
            {t(`fieldsPage.search.types.${card.type}`)}
          </span>
        </div>

        <h3 className="mt-2 truncate text-lg font-extrabold text-slate-900">{card.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <FontAwesomeIcon icon={faMapPin} className="size-3.5 text-slate-400" />
          {card.city}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <FontAwesomeIcon icon={faClock} className="size-3.5 text-slate-400" />
          {card.isOpen ? t('fieldsPage.card.openNow') : t('fieldsPage.card.closed')}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:mt-5">
          <div>
            <p className="text-xl font-extrabold text-green-600">
              {formatCount(card.price, i18n.language)} <span className="text-sm font-semibold">{t('fieldsPage.card.currency')}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{t('fieldsPage.card.perHour')}</p>
          </div>
          <button
            type="button"
            onClick={() => onBook(card)}
            className="flex h-12 items-center gap-2 rounded-[14px] bg-green-500 px-5 text-sm font-bold text-white shadow-md shadow-green-500/25 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-700 active:scale-[0.97]"
          >
            <FontAwesomeIcon icon={faCalendarCheck} className="size-4" />
            {t('fieldsPage.card.book')}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function FieldsGrid({ fields, view, onBook }) {
  const [liked, setLiked] = useState({})

  const toggleLike = (card) => {
    setLiked((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
  }

  if (view === 'list') {
    return (
      <div className="mt-8 flex flex-col gap-6">
        {fields.map((card) => (
          <FieldCard
            key={card.id}
            card={card}
            variant="list"
            liked={!!liked[card.id]}
            onToggleLike={toggleLike}
            onBook={onBook}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {fields.map((card) => (
        <FieldCard key={card.id} card={card} liked={!!liked[card.id]} onToggleLike={toggleLike} onBook={onBook} />
      ))}
    </div>
  )
}
