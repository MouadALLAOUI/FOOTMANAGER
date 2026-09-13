import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faFutbol,
  faHandshake,
  faMapPin,
  faPhone,
  faShieldHalved,
  faTrophy,
  faUser,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import Carousel from '../../components/Carousel'
import TeamLogo from '../../components/profile/TeamLogo'
import { useProfileModal } from '../../components/profile/ProfileModalContext'
import MatchRequestModal from '../../components/public/MatchRequestModal'
import { usePublicActions } from '../../components/public/usePublicActions'
import { useAuth } from '../../context/AuthContext'

const levelColors = {
  beginner: 'bg-slate-100 text-slate-700 border-slate-200',
  intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  veryGood: 'bg-teal-50 text-teal-700 border-teal-200',
  excellent: 'bg-purple-50 text-purple-700 border-purple-200',
}

// API caps per_page at 100, so extra pages are fetched when there are more teams.
const LEADERBOARD_PER_PAGE = 100

async function fetchAllLeaderboard() {
  const first = await api.get('/v1/leaderboard', { params: { managed: 1, per_page: LEADERBOARD_PER_PAGE } })
  const lastPage = first.data?.meta?.last_page ?? 1
  if (lastPage <= 1) return first

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, i) =>
      api.get('/v1/leaderboard', { params: { managed: 1, per_page: LEADERBOARD_PER_PAGE, page: i + 2 } })
    )
  )

  return {
    data: {
      data: [
        ...(Array.isArray(first.data?.data) ? first.data.data : []),
        ...rest.flatMap((res) => (Array.isArray(res.data?.data) ? res.data.data : [])),
      ],
    },
  }
}

function ContactModal({ team, open, onClose, onOpenProfile }) {
  const { t } = useTranslation()
  if (!open || !team) return null

  const manager = team.manager || {}
  const phone = team.manager_phone || manager.phone || team.phone || ''
  const cleanPhone = phone.replace(/[^0-9+]/g, '')
  const hasPhone = Boolean(cleanPhone)
  const whatsappUrl = hasPhone ? `https://wa.me/${cleanPhone.replace('+', '')}` : '#'

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-100 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 end-4 grid size-8 place-items-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
        >
          <FontAwesomeIcon icon={faXmark} className="size-4" />
        </button>

        {/* Team Identity */}
        <div className="flex flex-col items-center text-center">
          <div className="grid size-20 place-items-center rounded-full bg-emerald-50 p-2 ring-4 ring-emerald-100 shadow-md">
            <TeamLogo team={team} name={team.name} className="size-16" rounded="rounded-full" fontSize="text-xl" />
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-900">{team.name}</h3>
          {team.city && (
            <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <FontAwesomeIcon icon={faMapPin} className="size-3 text-slate-400" />
              {team.city}
            </span>
          )}
        </div>

        {/* Manager Details */}
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm">
              <FontAwesomeIcon icon={faUser} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('landing.teams.manager')}
              </p>
              <p className="truncate text-sm font-extrabold text-slate-800">
                {manager.name || team.manager_name || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="mt-5 space-y-2.5">
          {hasPhone ? (
            <>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-[#20bd5a] active:scale-[0.98]"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="size-5" />
                <span>{t('landing.teams.whatsapp')}</span>
              </a>
              <a
                href={`tel:${cleanPhone}`}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                <FontAwesomeIcon icon={faPhone} className="size-4 text-emerald-600" />
                <span>{t('landing.teams.call')} ({cleanPhone})</span>
              </a>
            </>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700">
              {t('landing.teams.whatsapp')} / {t('landing.teams.call')}: {t('landing.teams.viewProfile')}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenProfile?.(team)
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <FontAwesomeIcon icon={faShieldHalved} className="size-3.5" />
            <span>{t('landing.teams.viewProfile')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamLandingCard({ team, onChallenge, onContact, onOpenProfile, isOwnTeam }) {
  const { t } = useTranslation()
  const levelKey = team.level || 'intermediate'
  const levelStyle = levelColors[levelKey] || levelColors.intermediate

  return (
    <article className="group flex w-[85%] max-w-[320px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgba(17,24,39,0.06)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-emerald-200 hover:shadow-[0_24px_50px_rgba(16,185,129,0.12)]">
      <div>
        {/* Card Header: Level badge & City */}
        <div className="flex items-center justify-between gap-2">
          {team.city ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <FontAwesomeIcon icon={faMapPin} className="size-3 text-emerald-500" />
              <span className="truncate">{team.city}</span>
            </span>
          ) : (
            <span />
          )}

          {team.level && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${levelStyle}`}
            >
              {t(`matchesPage.teams.levels.${team.level}`)}
            </span>
          )}
        </div>

        {/* Team Logo Disc */}
        <div className="mt-5 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => onOpenProfile(team)}
            aria-label={team.name}
            className="group/logo relative grid size-24 place-items-center rounded-full bg-slate-50 p-2 shadow-md ring-4 ring-slate-100 transition-all duration-300 hover:scale-105 hover:ring-emerald-200 cursor-pointer"
          >
            <TeamLogo
              team={team}
              name={team.name}
              className="size-20"
              rounded="rounded-full"
              fontSize="text-2xl"
            />
          </button>

          <button
            type="button"
            onClick={() => onOpenProfile(team)}
            className="mt-4 block w-full truncate text-center text-lg font-black text-slate-900 transition hover:text-emerald-600 cursor-pointer"
          >
            {team.name}
          </button>

          {team.manager?.name && (
            <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <FontAwesomeIcon icon={faUser} className="size-3 text-slate-400" />
              <span className="truncate">{team.manager.name}</span>
            </span>
          )}
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5 text-center">
          <div>
            <p className="text-sm font-black text-emerald-600 tabular-nums">{team.points ?? 0}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('landing.teams.points')}</p>
          </div>
          <div className="border-x border-slate-200/70">
            <p className="text-sm font-black text-slate-800 tabular-nums">{team.matches_played ?? 0}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('landing.teams.matches')}</p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 tabular-nums">{team.wins ?? 0}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('landing.teams.wins')}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-2.5">
        {isOwnTeam ? (
          <button
            type="button"
            onClick={() => onOpenProfile(team)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-xs font-black uppercase tracking-wider text-slate-700 transition hover:bg-slate-200 cursor-pointer"
          >
            <FontAwesomeIcon icon={faShieldHalved} className="size-4 text-emerald-600" />
            <span>{t('landing.teams.yourTeam') || 'فريقك'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChallenge(team)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/25 transition-all duration-300 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/35 active:scale-[0.98] cursor-pointer"
          >
            <FontAwesomeIcon icon={faHandshake} className="size-4" />
            <span>{t('landing.teams.challenge')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onContact(team)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 active:scale-[0.98] cursor-pointer"
        >
          <FontAwesomeIcon icon={faWhatsapp} className="size-4 text-emerald-600" />
          <span>{t('landing.teams.contact')}</span>
        </button>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="w-[85%] max-w-[320px] shrink-0 snap-start animate-pulse rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex justify-between">
        <div className="h-4 w-16 rounded-full bg-slate-200" />
        <div className="h-4 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="mx-auto mt-6 size-24 rounded-full bg-slate-200" />
      <div className="mx-auto mt-4 h-5 w-3/4 rounded-full bg-slate-200" />
      <div className="mx-auto mt-2 h-3 w-1/2 rounded-full bg-slate-200" />
      <div className="mt-5 h-12 rounded-2xl bg-slate-100" />
      <div className="mt-6 space-y-2">
        <div className="h-11 rounded-2xl bg-slate-200" />
        <div className="h-10 rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

export default function Teams() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openTeam } = useProfileModal()
  const [challengeTarget, setChallengeTarget] = useState(null)
  const [contactTeam, setContactTeam] = useState(null)

  // Only logged-in users have a team of their own; a stale active_team_id
  // left in storage must not mark a team as theirs for guests.
  const activeHeaderId =
    user && typeof localStorage !== 'undefined'
      ? Number(localStorage.getItem('active_team_id'))
      : null
  const ownTeamId = user?.team?.id ?? user?.team_id ?? activeHeaderId

  // A manager may own several teams; every team they manage counts as their own.
  const isOwnTeam = (team) =>
    (ownTeamId != null && Number(ownTeamId) === Number(team.id)) ||
    (user?.id != null && team.manager?.id != null && Number(team.manager.id) === Number(user.id))

  const { openChallenge } = usePublicActions({
    onChallenge: (target) => setChallengeTarget(target),
  })

  const { data, loading } = useApi(async () => {
    const [lbRes, matchRes, homeRes] = await Promise.allSettled([
      fetchAllLeaderboard(),
      api.get('/v1/matches', { params: { per_page: 12 } }),
      api.get('/v1/home'),
    ])

    const teamsMap = new Map()

    const addTeam = (t) => {
      if (!t || !t.id) return
      const existing = teamsMap.get(t.id)
      if (!existing) {
        teamsMap.set(t.id, {
          ...t,
          points: t.points ?? 0,
          matches_played: t.matches_played ?? 0,
          wins: t.wins ?? 0,
        })
      } else {
        teamsMap.set(t.id, {
          ...t,
          ...existing,
          points: existing.points ?? t.points ?? 0,
          matches_played: existing.matches_played ?? t.matches_played ?? 0,
          wins: existing.wins ?? t.wins ?? 0,
          city: existing.city || t.city || '',
          level: existing.level || t.level || 'intermediate',
          manager: existing.manager || t.manager,
          logo_url: existing.logo_url || t.logo_url,
        })
      }
    }

    if (lbRes.status === 'fulfilled' && lbRes.value?.data?.data) {
      const list = Array.isArray(lbRes.value.data.data) ? lbRes.value.data.data : []
      list.forEach(addTeam)
    }

    if (matchRes.status === 'fulfilled' && matchRes.value?.data?.data) {
      const list = Array.isArray(matchRes.value.data.data) ? matchRes.value.data.data : []
      list.forEach((m) => {
        if (m.host_team) addTeam(m.host_team)
        if (m.opponent_team) addTeam(m.opponent_team)
      })
    }

    if (homeRes.status === 'fulfilled' && homeRes.value?.data?.data?.latest_matches) {
      const list = homeRes.value.data.data.latest_matches
      if (Array.isArray(list)) {
        list.forEach((m) => {
          if (m.host_team) addTeam(m.host_team)
          if (m.opponent_team) addTeam(m.opponent_team)
        })
      }
    }

    return Array.from(teamsMap.values())
  })

  const teams = Array.isArray(data) ? data : (data?.data || [])

  return (
    <section id="teams" className="bg-[#f8fafc] py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="text-start">
            <span className="mb-3 block h-1 w-10 rounded-full bg-green-500" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/60">
              <FontAwesomeIcon icon={faFutbol} className="size-3 text-emerald-600" />
              {t('landing.teams.badge')}
            </span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 lg:text-4xl">
              {t('landing.teams.title1')}{' '}
              <span className="text-emerald-600">{t('landing.teams.title2')}</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('landing.teams.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/matches')}
            className="group flex items-center gap-2 text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700 cursor-pointer"
          >
            <span>{t('landing.fields.viewAll')}</span>
            <FontAwesomeIcon
              icon={faArrowLeft}
              className="size-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1"
            />
          </button>
        </header>

        <div className="mt-12">
          {loading ? (
            <Carousel showDots>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </Carousel>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <FontAwesomeIcon icon={faShieldHalved} className="size-9 text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-600">{t('landing.teams.empty')}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                {t('landing.teams.emptyDesc')}
              </p>
            </div>
          ) : (
            <Carousel showDots>
              {teams.map((team) => (
                <TeamLandingCard
                  key={team.id}
                  team={team}
                  isOwnTeam={isOwnTeam(team)}
                  onChallenge={(tm) => openChallenge({ teamId: tm.id, teamName: tm.name })}
                  onContact={(tm) => setContactTeam(tm)}
                  onOpenProfile={(tm) =>
                    openTeam({ id: tm.id, name: tm.name, city: tm.city, level: tm.level })
                  }
                />
              ))}
            </Carousel>
          )}
        </div>
      </div>

      {/* Match Request Modal for Challenges */}
      <MatchRequestModal
        open={Boolean(challengeTarget)}
        onClose={() => setChallengeTarget(null)}
        team={challengeTarget}
        prefillTeam={challengeTarget?.teamName || challengeTarget?.name}
        prefillTeamId={challengeTarget?.teamId || challengeTarget?.id}
      />

      {/* Quick Contact Team Modal */}
      <ContactModal
        open={Boolean(contactTeam)}
        team={contactTeam}
        onClose={() => setContactTeam(null)}
        onOpenProfile={(tm) =>
          openTeam({ id: tm.id, name: tm.name, city: tm.city, level: tm.level })
        }
      />
    </section>
  )
}
