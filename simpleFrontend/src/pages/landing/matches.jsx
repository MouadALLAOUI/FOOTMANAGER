import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faBullseye,
  faCalendarDays,
  faClock,
  faLandmark,
  faMapPin,
  faTrophy,
  faFutbol,
} from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { toMatchCard, matchDay, relativeTime } from '../../lib/adapters'
import Carousel from '../../components/Carousel'
import MatchRequestModal from '../../components/public/MatchRequestModal'
import { usePublicActions } from '../../components/public/usePublicActions'

const statusStyles = {
  looking: 'bg-green-100 text-green-700',
  tonight: 'bg-orange-100 text-orange-700',
  tomorrow: 'bg-blue-100 text-blue-700',
}

const levelDots = {
  beginner: 'bg-slate-400',
  intermediate: 'bg-blue-500',
  good: 'bg-green-500',
  veryGood: 'bg-teal-500',
  excellent: 'bg-purple-500',
}

const accents = [
  { color: '#059669', soft: 'bg-emerald-50 text-emerald-700' },
  { color: '#ea580c', soft: 'bg-orange-50 text-orange-700' },
  { color: '#2563eb', soft: 'bg-blue-50 text-blue-700' },
  { color: '#7c3aed', soft: 'bg-violet-50 text-violet-700' },
]

function MatchCard({ card, accent, onChallenge }) {
  const { t, i18n } = useTranslation()

  return (
    <article
      style={{ '--accent': accent.color }}
      className="group w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.18)]"
    >
      <div className="relative text-center">
        <span
          className={`absolute top-0 end-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[card.status]}`}
        >
          {t(`landing.matches.status.${card.status}`)}
        </span>

        <div
          className={`mx-auto grid size-[96px] place-items-center rounded-full shadow-md ring-4 ring-slate-50 transition-transform duration-300 ease-out group-hover:scale-105 ${accent.soft}`}
        >
          <FontAwesomeIcon icon={faFutbol} className="size-12 text-[var(--accent)]" />
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-slate-900">{card.team}</h3>

        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          <FontAwesomeIcon icon={faTrophy} className="size-3.5 text-slate-400" />
          <span className={`size-1.5 rounded-full ${levelDots[card.level]}`} />
          <span className="text-xs font-semibold text-slate-500">
            {t(`landing.matches.levels.${card.level}`)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <FontAwesomeIcon icon={faCalendarDays} className="size-3.5 text-slate-400" />
            {matchDay(card.day, i18n.language)}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <FontAwesomeIcon icon={faClock} className="size-3.5 text-slate-400" />
            {card.time}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
          <FontAwesomeIcon icon={faMapPin} className="size-3.5 text-slate-400" />
          {card.city}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600"
        >
          <FontAwesomeIcon icon={faFutbol} className="size-3.5 text-slate-400" />
          {card.format}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          <FontAwesomeIcon icon={faLandmark} className="size-3.5 text-slate-400" />
          {card.stadium}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          <FontAwesomeIcon icon={faBullseye} className="size-3.5 text-slate-400" />
          {t('landing.matches.chips.friendly')}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChallenge(card)}
        className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--accent)] text-sm font-bold text-[var(--accent)] transition-colors duration-300 ease-out hover:bg-[var(--accent)] hover:text-white"
      >
        <FontAwesomeIcon icon={faFutbol} className="size-5" />
        {t('landing.matches.sendRequest')}
      </button>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        {t('landing.matches.publishedAgo', { time: relativeTime(card.published, i18n.language) })}
      </p>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="w-[320px] shrink-0 snap-start animate-pulse overflow-hidden rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.08)]">
      <div className="mx-auto size-[96px] rounded-full bg-slate-200" />
      <div className="mx-auto mt-4 h-5 w-1/2 rounded-full bg-slate-200" />
      <div className="mt-4 h-4 w-2/3 rounded-full bg-slate-200" />
      <div className="mt-4 h-[50px] rounded-2xl bg-slate-200" />
    </div>
  )
}

export default function Matches() {
  const { t } = useTranslation()
  const { data, loading } = useApi(() => api.get('/v1/home').then((r) => r.data.data))
  const [challenge, setChallenge] = useState(null)

  const { openChallenge } = usePublicActions({ onChallenge: setChallenge })

  const cards = (data?.latest_matches || []).map((m) => ({ ...toMatchCard(m), status: 'looking' }))

  return (
    <section id="matches" className="scroll-mt-[110px] bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="text-start">
            <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">
              {t('landing.matches.title1')}{' '}
              <span className="text-green-600">{t('landing.matches.title2')}</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('landing.matches.subtitle')}
            </p>
          </div>
          <Link
            to="/matches"
            className="group flex items-center gap-2 text-sm font-bold text-green-600 transition-colors hover:text-green-700"
          >
            <span>{t('landing.matches.viewAll')}</span>
            <FontAwesomeIcon icon={faArrowLeft} className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </header>

        <div className="mt-12">
          <Carousel>
            {loading
              ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
              : cards.map((card, i) => (
                  <MatchCard
                    key={card.id}
                    card={card}
                    accent={accents[i % accents.length]}
                    onChallenge={openChallenge}
                  />
                ))}
          </Carousel>
        </div>
      </div>

      <MatchRequestModal open={Boolean(challenge)} onClose={() => setChallenge(null)} team={challenge} />
    </section>
  )
}
