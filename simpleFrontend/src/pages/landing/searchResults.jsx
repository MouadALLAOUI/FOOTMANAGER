import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarCheck,
  faClock,
  faHeart,
  faMapPin,
  faStar,
  faTrophy,
  faFutbol,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useCitiesSelect } from '../../api/queries'
import {
  toStadiumCard,
  toMatchCard,
  formatCount,
  matchDay,
} from '../../lib/adapters'
import BookingModal from '../../components/public/BookingModal'
import MatchRequestModal from '../../components/public/MatchRequestModal'
import { usePublicActions } from '../../components/public/usePublicActions'

function hideBrokenImage(e) {
  e.currentTarget.style.opacity = '0'
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col gap-5 rounded-[20px] bg-white p-4 ring-1 ring-slate-100 md:flex-row md:items-center">
      <div className="h-[170px] w-full shrink-0 rounded-2xl bg-slate-200 md:w-[280px]" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-1/2 rounded-full bg-slate-200" />
        <div className="h-3 w-1/3 rounded-full bg-slate-200" />
        <div className="h-3 w-2/3 rounded-full bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-3 md:items-end">
        <div className="h-6 w-20 rounded-full bg-slate-200" />
        <div className="h-11 w-32 rounded-2xl bg-slate-200" />
      </div>
    </div>
  )
}

function FieldCard({ card, liked, onToggleLike, onBook }) {
  const { t, i18n } = useTranslation()

  return (
    <article className="group flex flex-col gap-5 rounded-[20px] bg-white p-4 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(17,24,39,0.15)] md:flex-row md:items-center">
      <div className="relative h-[170px] w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950 md:w-[280px]">
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
          {t('landing.results.available')}
        </span>
        <button
          type="button"
          aria-label="favorite"
          onClick={() => onToggleLike(card)}
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

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-slate-900">{card.name}</h3>
          <span className="flex items-center gap-1 text-sm font-bold text-slate-700">
            <FontAwesomeIcon icon={faStar} className="size-4 text-amber-400" />
            {card.rating}
            <span className="font-medium text-slate-400">({formatCount(card.reviews, i18n.language)})</span>
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <FontAwesomeIcon icon={faMapPin} className="size-4 text-slate-400" />
          {card.location}
        </p>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <FontAwesomeIcon icon={faClock} className="size-4 text-slate-400" />
          {card.isOpen ? t('landing.fields.openNow') : t('landing.fields.closed')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(card.chips || []).map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {t(`landing.results.chips.${chip}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-4 md:flex-col md:items-end md:justify-center md:border-0 md:border-s md:pt-0 md:ps-6">
        <div className="text-end">
          <p className="text-xl font-extrabold text-green-600">
            {formatCount(card.price, i18n.language)} {t('fieldsPage.card.currency')}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{t('landing.results.perHour')}</p>
        </div>
        <button
          type="button"
          onClick={() => onBook(card)}
          className="flex h-11 items-center gap-2 rounded-[14px] bg-green-500 px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(22,163,74,0.35)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-[0_16px_35px_rgba(22,163,74,0.5)] active:translate-y-0"
        >
          <FontAwesomeIcon icon={faCalendarCheck} className="size-4" />
          {t('landing.results.book')}
        </button>
      </div>
    </article>
  )
}

function MatchCard({ card, accent, onChallenge }) {
  const { t, i18n } = useTranslation()

  return (
    <article
      style={{ '--accent': accent.color }}
      className="group flex flex-wrap items-center gap-5 rounded-[20px] bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(17,24,39,0.15)]"
    >
      <div
        className={`grid size-14 shrink-0 place-items-center rounded-full shadow-md ring-4 ring-slate-50 transition-transform duration-300 ease-out group-hover:scale-105 ${accent.soft}`}
      >
        <FontAwesomeIcon icon={faFutbol} className="size-8 text-[var(--accent)]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-slate-900">{card.team}</h3>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FontAwesomeIcon icon={faTrophy} className="size-3.5 text-slate-400" />
            {t(`landing.matches.levels.${card.level}`)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faMapPin} className="size-3.5 text-slate-400" />
            {card.city}
          </span>
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faClock} className="size-3.5 text-slate-400" />
            {[matchDay(card.day, i18n.language), card.time].filter(Boolean).join(' ')}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <p className="text-xs font-semibold text-slate-500">
          {t('landing.results.playersNeeded', { count: formatCount(card.players, i18n.language) })}
        </p>
        <button
          type="button"
          onClick={() => onChallenge(card)}
          className="flex h-11 items-center gap-2 rounded-[14px] border-2 border-[var(--accent)] px-5 text-sm font-bold text-[var(--accent)] transition-colors duration-300 ease-out hover:bg-[var(--accent)] hover:text-white"
        >
          <FontAwesomeIcon icon={faFutbol} className="size-5" />
          {t('landing.results.sendRequest')}
        </button>
      </div>
    </article>
  )
}

const matchAccents = [
  { color: '#059669', soft: 'bg-emerald-50 text-emerald-700' },
  { color: '#ea580c', soft: 'bg-orange-50 text-orange-700' },
  { color: '#2563eb', soft: 'bg-blue-50 text-blue-700' },
  { color: '#7c3aed', soft: 'bg-violet-50 text-violet-700' },
]

export default function SearchResultsSheet({ open, city, onClose }) {
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState(0)
  const [liked, setLiked] = useState({})
  const [dragging, setDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef(0)
  const [booking, setBooking] = useState(null)
  const [challenge, setChallenge] = useState(null)

  const { openBooking, openChallenge } = usePublicActions({ onBooking: setBooking, onChallenge: setChallenge })
  const { data: citiesData } = useCitiesSelect()
  const citiesMap = citiesData?.cities || []

  // Resolve city id from slug
  const cityId = city && citiesMap.length > 0
    ? (citiesMap.find((c) => c.slug === city)?.id || null)
    : null

  const params = { per_page: 5, ...(cityId ? { city_id: cityId } : {}) }

  const fieldsRes = useApi(
    () => (open ? api.get('/v1/stadiums', { params }).then((r) => r.data) : Promise.resolve(null)),
    [open, city],
  )
  const matchesRes = useApi(
    () => (open ? api.get('/v1/matches', { params }).then((r) => r.data) : Promise.resolve(null)),
    [open, city],
  )

  const isRtl = i18n.language.startsWith('ar')

  useEffect(() => {
    if (open) {
      setMounted(true)
      setTab(0)
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const timer = setTimeout(() => setMounted(false), 350)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  useEffect(() => {
    if (!mounted) return
    document.body.classList.add('sheet-open')
    return () => document.body.classList.remove('sheet-open')
  }, [mounted])

  if (!mounted) return null

  const toggleLike = (card) => {
    setLiked((prev) => ({ ...prev, [card.name]: !prev[card.name] }))
  }

  const onHandleDown = (e) => {
    startY.current = e.clientY
    setDragging(true)
    setDragY(0)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onHandleMove = (e) => {
    if (!dragging) return
    setDragY(Math.max(0, e.clientY - startY.current))
  }

  const onHandleUp = () => {
    if (!dragging) return
    if (dragY > 110) onClose()
    setDragging(false)
    setDragY(0)
  }

  const fields = (fieldsRes.data?.data || []).map(toStadiumCard)
  const matches = (matchesRes.data?.data || []).map(toMatchCard)
  const fieldsTotal = fieldsRes.data?.meta?.total ?? 0
  const matchesTotal = matchesRes.data?.meta?.total ?? 0
  const loading = fieldsRes.loading || matchesRes.loading

  const list = tab === 0 ? fields : matches
  const hasResults = list.length > 0

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-[350ms] ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-x-0 bottom-0 mx-auto flex h-[90vh] w-full max-w-[1100px] flex-col rounded-t-[32px] bg-white shadow-[0_-25px_70px_rgba(2,6,23,0.4)] transition-transform duration-[350ms] ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        } ${dragging ? '!transition-none' : ''}`}
        style={dragging ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          className="flex cursor-grab touch-none justify-center pt-4 pb-2 active:cursor-grabbing"
        >
          <div className="h-[6px] w-[70px] rounded-full bg-slate-200 transition-colors hover:bg-slate-300" />
        </div>

        <div className="relative px-8 pt-2 pb-4">
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="absolute end-5 top-1 grid size-10 place-items-center rounded-full bg-white text-slate-500 shadow-[0_6px_20px_rgba(17,24,39,0.15)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:rotate-90 hover:text-slate-900 active:scale-95"
          >
            <FontAwesomeIcon icon={faXmark} className="size-5" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900">{t('landing.results.title')}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatCount(fieldsTotal, i18n.language)} {t('landing.results.tabs.fields')} •{' '}
              {formatCount(matchesTotal, i18n.language)} {t('landing.results.tabs.matches')}
            </p>
          </div>
        </div>

        <div className="px-8">
          <div className="relative mx-auto max-w-[420px] rounded-2xl bg-slate-100 p-1">
            <div
              className="absolute inset-y-1 start-1 w-[calc(50%-4px)] rounded-xl bg-green-500 shadow-[0_6px_18px_rgba(22,163,74,0.4)] transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${tab * (isRtl ? -100 : 100)}%)` }}
            />
            <div className="relative grid grid-cols-2">
              <button
                type="button"
                onClick={() => setTab(0)}
                className={`z-10 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors duration-300 ${
                  tab === 0 ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faFutbol} className="size-5" />
                {t('landing.results.tabs.fields')}
              </button>
              <button
                type="button"
                onClick={() => setTab(1)}
                className={`z-10 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors duration-300 ${
                  tab === 1 ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faFutbol} className="size-5" />
                {t('landing.results.tabs.matches')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 pb-8 md:px-8">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : hasResults ? (
            tab === 0 ? (
              fields.map((card) => (
                <FieldCard
                  key={card.id}
                  card={card}
                  liked={!!liked[card.name]}
                  onToggleLike={toggleLike}
                  onBook={openBooking}
                />
              ))
            ) : (
              matches.map((card, i) => (
                <MatchCard
                  key={card.id}
                  card={card}
                  accent={matchAccents[i % matchAccents.length]}
                  onChallenge={openChallenge}
                />
              ))
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <FontAwesomeIcon icon={faFutbol} className="size-24 text-slate-200" />
              <h3 className="mt-6 text-xl font-extrabold text-slate-900">
                {t('landing.results.empty.title')}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                {t('landing.results.empty.description')}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-8 flex h-12 items-center rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700 active:translate-y-0"
              >
                {t('landing.results.empty.button')}
              </button>
            </div>
          )}
        </div>
      </div>

      <BookingModal open={Boolean(booking)} onClose={() => setBooking(null)} field={booking} />
      <MatchRequestModal open={Boolean(challenge)} onClose={() => setChallenge(null)} team={challenge} />
    </div>,
    document.body,
  )
}
