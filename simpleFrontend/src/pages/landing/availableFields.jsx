import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCalendarCheck,
  faClock,
  faHeart,
  faMapPin,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { toStadiumCard, formatCount } from '../../lib/adapters'
import Carousel from '../../components/Carousel'
import BookingModal from '../../components/public/BookingModal'
import { usePublicActions } from '../../components/public/usePublicActions'

function hideBrokenImage(e) {
  e.currentTarget.style.opacity = '0'
}

function FieldCard({ card, liked, onToggleLike, onBook }) {
  const { t, i18n } = useTranslation()

  return (
    <article className="group w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.08)] transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.18)]">
      <div className="relative h-[220px] overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
        <img
          src={card.image}
          alt={card.name}
          loading="lazy"
          decoding="async"
          onError={hideBrokenImage}
          className="relative size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
        />
        <span className="absolute top-3 end-3 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-md">
          {t('landing.fields.available')}
        </span>
        <button
          type="button"
          onClick={() => onToggleLike(card)}
          aria-label="favorite"
          className="absolute top-3 start-3 grid size-9 place-items-center rounded-full bg-white/20 text-white shadow-sm ring-1 ring-white/30 backdrop-blur-md transition hover:scale-110 active:scale-95"
        >
          <FontAwesomeIcon
            icon={liked ? faHeart : faHeartRegular}
            className="size-4 transition group-hover:scale-110"
          />
        </button>
        <span className="absolute bottom-3 start-3 flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <FontAwesomeIcon icon={faMapPin} className="size-3" />
          {card.format}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faStar} className="size-4 text-amber-400" />
          <span className="text-sm font-bold text-slate-800">{card.rating}</span>
        </div>
        <h3 className="mt-2 text-lg font-extrabold text-slate-900">{card.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{card.location}</p>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <FontAwesomeIcon icon={faClock} className="size-4 text-slate-400" />
          {card.isOpen ? t('landing.fields.openNow') : t('landing.fields.closed')}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-xl font-extrabold text-green-600">
              {formatCount(card.price, i18n.language)} {t('fieldsPage.card.currency')}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {t('landing.fields.perHour')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onBook(card)}
            className="flex h-12 items-center gap-2 rounded-[14px] bg-green-500 px-5 text-sm font-bold text-white shadow-md shadow-green-500/25 transition-colors duration-300 hover:bg-green-700 active:scale-[0.98]"
          >
            <FontAwesomeIcon icon={faCalendarCheck} className="size-4" />
            {t('landing.fields.book')}
          </button>
        </div>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="w-[320px] shrink-0 snap-start animate-pulse overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.08)]">
      <div className="h-[220px] bg-slate-200" />
      <div className="space-y-3 p-6">
        <div className="h-4 w-16 rounded-full bg-slate-200" />
        <div className="h-5 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3 w-1/2 rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

export default function AvailableFields() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [liked, setLiked] = useState({})
  const [booking, setBooking] = useState(null)
  const { data, loading } = useApi(() => api.get('/v1/home').then((r) => r.data.data))

  const { openBooking } = usePublicActions({ onBooking: setBooking })

  const cards = (data?.top_stadiums || []).map(toStadiumCard)

  const toggleLike = (card) => {
    setLiked((prev) => ({ ...prev, [card.name]: !prev[card.name] }))
  }

  return (
    <section id="fields" className="scroll-mt-[110px] bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="text-start">
            <h2 className="text-3xl font-black text-green-800 lg:text-4xl">
              {t('landing.fields.title')}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('landing.fields.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/fields')}
            className="group flex items-center gap-2 text-sm font-bold text-green-600 transition-colors hover:text-green-700"
          >
            <span>{t('landing.fields.viewAll')}</span>
            <FontAwesomeIcon icon={faArrowLeft} className="size-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" />
          </button>
        </header>

        <div className="mt-12">
          {loading ? (
            <Carousel>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </Carousel>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <FontAwesomeIcon icon={faCalendarCheck} className="size-9 text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-600">{t('landing.fields.empty')}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">{t('landing.fields.emptyDesc')}</p>
            </div>
          ) : (
            <Carousel>
              {cards.map((card) => (
                <FieldCard
                  key={card.id}
                  card={card}
                  liked={!!liked[card.name]}
                  onToggleLike={toggleLike}
                  onBook={openBooking}
                />
              ))}
            </Carousel>
          )}
        </div>
      </div>

      <BookingModal open={Boolean(booking)} onClose={() => setBooking(null)} field={booking} />
    </section>
  )
}
