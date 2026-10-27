import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Clock, Heart, MapPin, Star, Users } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { toStadiumCard, formatCount } from '../../lib/adapters'
import { hideBrokenImage } from '../../lib/imageErrors'
import BookingModal from '../../components/public/BookingModal'
import { usePublicActions } from '../../components/public/usePublicActions'

function FieldCard({ card, liked, onToggleLike, onBook, isDark }) {
  const { t, i18n } = useTranslation()

  return (
    <article
      className={`group w-[260px] sm:w-[290px] shrink-0 snap-start flex flex-col justify-between overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] ${
        isDark
          ? 'bg-[#121E33]/90 border-slate-700/60 shadow-md'
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}
    >
      {/* Thumbnail Banner */}
      <div className="relative h-[140px] overflow-hidden bg-slate-800">
        <img
          src={card.image}
          alt={card.name}
          loading="lazy"
          decoding="async"
          onError={hideBrokenImage}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Available Pill */}
        <span className="absolute top-2.5 end-2.5 rounded-full bg-emerald-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
          {card.isOpen ? 'متاح الآن' : 'متاح للحجز'}
        </span>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={() => onToggleLike(card)}
          aria-label="إضافة للمفضلة"
          className="absolute top-2.5 start-2.5 grid size-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:scale-110 active:scale-95"
        >
          <Heart className={`size-3.5 ${liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>

        {/* Stadium format badge */}
        <span className="absolute bottom-2 start-2.5 flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
          <Users className="size-3 text-emerald-400" />
          <span>{card.format || 'عشب اصطناعي'}</span>
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3 className={`text-xs sm:text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {card.name}
            </h3>
            {card.rating != null && (
              <span className="flex items-center gap-0.5 text-[11px] font-black text-amber-400 shrink-0">
                <Star className="size-3 fill-amber-400" />
                <span>{card.rating}</span>
              </span>
            )}
          </div>

          <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 truncate mb-3">
            <MapPin className="size-3 text-emerald-500 shrink-0" />
            <span className="truncate">{card.location}</span>
          </p>
        </div>

        {/* Price & Book Action */}
        <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between gap-2">
          <div>
            {!card.price || Number(card.price) === 0 ? (
              <p className="text-xs sm:text-sm font-bold text-slate-300">
                السعر عند التواصل
              </p>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-black text-emerald-400">
                  {Math.round(Number(card.price))} درهم
                </p>
                <p className="text-[9px] text-slate-400">لكل ساعة</p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onBook(card)}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <span>احجز الآن</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default function AvailableFields({ theme = 'dark' }) {
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

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  if (!loading && cards.length === 0) {
    return null
  }

  return (
    <section id="fields" aria-labelledby="fields-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-6 sm:my-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-[#0F172A] p-5 sm:p-7 text-white shadow-2xl">
        {/* Section Header */}
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div>
            <h2 id="fields-heading" className="text-xl sm:text-2xl font-black text-white">
              ملاعب القرب المتاحة للحجز
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-300">
              اختر الملعب الأنسب لفريقك واحجز توقيتك المفضل بسهولة وسرعة
            </p>
          </div>

          <Link
            to="/stadiums"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>عرض كافة الملاعب</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </header>

        {/* Fields Carousel Row */}
        <div className="flex items-stretch gap-4 overflow-x-auto no-scrollbar snap-x scroll-smooth pb-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[260px] sm:w-[290px] shrink-0 h-[240px] rounded-2xl bg-slate-800/40 animate-pulse border border-slate-700/30"
              />
            ))
          ) : (
            cards.map((card) => (
              <FieldCard
                key={card.name}
                card={card}
                liked={Boolean(liked[card.name])}
                onToggleLike={toggleLike}
                onBook={openBooking}
                isDark={isDark}
              />
            ))
          )}
        </div>
      </div>

      {booking && (
        <BookingModal stadium={booking} onClose={() => setBooking(null)} />
      )}
    </section>
  )
}
