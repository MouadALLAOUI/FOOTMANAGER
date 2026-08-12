import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faClock,
  faFutbol,
  faMapPin,
  faStar,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { toMatchCard, toStadiumCard, formatCount, matchDay } from '../../lib/adapters'
import Carousel from '../../components/Carousel'

function ManagerCard({ card }) {
  const { t, i18n } = useTranslation()

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-7 text-white shadow-[0_18px_45px_rgba(99,102,241,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
            {t('landing.my.seeking')}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <FontAwesomeIcon icon={faTrophy} className="size-3" />
            {t(`landing.matches.levels.${card.level}`)}
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-black">{card.team}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-white/90">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faCalendarDays} className="size-4 text-white/60" />
            {[matchDay(card.day, i18n.language), card.time].filter(Boolean).join(' • ')}
          </span>
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faMapPin} className="size-4 text-white/60" />
            {card.city}
          </span>
          {card.stadium && (
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faFutbol} className="size-4 text-white/60" />
              {card.stadium}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function OwnerCard({ card, terrain }) {
  const { t, i18n } = useTranslation()

  const images = terrain?.images || []
  const thumb =
    images.find((img) => img.is_thumbnail)?.thumbnail_url ||
    images[0]?.thumbnail_url ||
    images.find((img) => img.is_thumbnail)?.image_url ||
    images[0]?.image_url ||
    images[0]?.url ||
    ''

  return (
    <div className="relative w-[320px] shrink-0 snap-start overflow-hidden rounded-[28px] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-7 text-white shadow-[0_18px_45px_rgba(245,158,11,0.35)]">
      {thumb ? (
        <>
          <img
            src={thumb}
            alt={card.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/70 to-slate-900/35" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
      )}
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
            {card.isOpen ? t('landing.fields.openNow') : t('landing.fields.closed')}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <FontAwesomeIcon icon={faStar} className="size-3 text-amber-200" />
            {card.rating}
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-black">{card.name}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-white/90">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faMapPin} className="size-4 text-white/60" />
            {card.city}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <FontAwesomeIcon icon={faClock} className="size-3 text-white/70" />
            {t(`fieldsPage.search.types.${card.type}`)}
          </span>
        </div>

        <p className="mt-4 text-xl font-extrabold">
          {formatCount(card.price, i18n.language)}{' '}
          <span className="text-sm font-semibold text-white/70">{t('fieldsPage.card.currency')}</span>
          <span className="ms-1 text-xs font-medium text-white/60">{t('landing.fields.perHour')}</span>
        </p>
      </div>
    </div>
  )
}

export default function MySection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const role = user?.status === 'approved' ? user.role : null

  const isManager = role === 'manager'
  const isOwner = role === 'terrain_owner'

  const { data, loading } = useApi(
    () => {
      if (isManager) {
        return api.get('/manager/my-match-requests', { params: { status: 'open' } }).then((r) => r.data)
      }
      if (isOwner) {
        return api.get('/owner/terrains').then((r) => r.data)
      }
      return Promise.resolve(null)
    },
    [isManager, isOwner],
    { enabled: isManager || isOwner },
  )

  const match = (data?.match_requests || [])[0]
  const terrains = data?.terrains || []

  if (!isManager && !isOwner) return null

  return (
    <section className="bg-[#f6f7fb] py-[80px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="text-start">
          <h2 className="text-2xl font-black text-slate-900 lg:text-3xl">
            {isManager ? t('landing.my.managerTitle') : t('landing.my.ownerTitle')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            {isManager ? t('landing.my.managerSubtitle') : t('landing.my.ownerSubtitle')}
          </p>
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="h-[170px] animate-pulse rounded-[28px] bg-slate-200/80" />
          ) : isManager && match ? (
            <ManagerCard card={toMatchCard(match)} />
          ) : isOwner && terrains.length > 0 ? (
            <Carousel>
              {terrains.map((terrain) => (
                <OwnerCard key={terrain.id} card={toStadiumCard(terrain)} terrain={terrain} />
              ))}
            </Carousel>
          ) : (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm font-semibold text-slate-400">
              {isManager ? t('landing.my.noMatch') : t('landing.my.noTerrain')}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
