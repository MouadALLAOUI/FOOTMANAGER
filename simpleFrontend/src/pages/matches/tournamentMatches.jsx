import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCalendarDays,
  faCheck,
  faClock,
  faMapPin,
  faShareNodes,
  faSpinner,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { toBlob } from 'html-to-image'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { matchDay, formatTime } from '../../lib/adapters'
import TeamLogo from '../../components/profile/TeamLogo'
import { useToast } from '../../components/ui/Toast'
import Carousel from '../../components/Carousel'
import Reveal from './reveal'

function ShareButton({ cardRef, title, text, t }) {
  const [sharing, setSharing] = useState(false)
  const { toast } = useToast()

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    const shareUrl = window.location.href

    try {
      let imageFile = null

      if (cardRef?.current) {
        try {
          const blob = await toBlob(cardRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            filter: (node) => !node?.classList?.contains?.('no-share-capture'),
          })
          if (blob) {
            const cleanName = (title || 'tournament-match')
              .toLowerCase()
              .replace(/[^a-z0-9]/gi, '-')
              .replace(/-+/g, '-')
            imageFile = new File([blob], `${cleanName}.png`, { type: 'image/png' })
          }
        } catch {
          // fallback to link sharing
        }
      }

      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            title: title || 'FootManager',
            text: `${text ? text + '\n' : ''}${shareUrl}`,
            url: shareUrl,
            files: [imageFile],
          })
          toast?.success?.(t('landing.liveNext.shareSuccess'))
          return
        } catch (err) {
          if (err?.name === 'AbortError') return
        }
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
        try {
          await navigator.share({
            title: title || 'FootManager',
            text: `${text ? text + '\n' : ''}${shareUrl}`,
            url: shareUrl,
          })
          toast?.success?.(t('landing.liveNext.shareSuccess'))
          return
        } catch (err) {
          if (err?.name === 'AbortError') return
        }
      }

      if (imageFile) {
        const link = document.createElement('a')
        link.download = imageFile.name
        link.href = URL.createObjectURL(imageFile)
        link.click()
        URL.revokeObjectURL(link.href)
      }

      await navigator.clipboard.writeText(shareUrl)
      if (imageFile) {
        toast?.success?.(t('landing.liveNext.shareImageDownloaded'))
      } else {
        toast?.success?.(t('landing.liveNext.shareSuccess'))
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast?.success?.(t('landing.liveNext.shareSuccess'))
      } catch {}
    } finally {
      setSharing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className="no-share-capture mx-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-1 ring-emerald-300/30 transition-all duration-300 hover:scale-105 hover:from-emerald-400 hover:to-green-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.75)] active:scale-95 disabled:opacity-75 cursor-pointer"
    >
      <FontAwesomeIcon
        icon={sharing ? faSpinner : faShareNodes}
        className={`size-3.5 ${sharing ? 'animate-spin' : ''}`}
      />
      <span>{sharing ? t('landing.liveNext.sharing') : t('landing.liveNext.share')}</span>
    </button>
  )
}

function TournamentMatchCard({ fixture }) {
  const { t, i18n } = useTranslation()
  const cardRef = useRef(null)
  const tournament = fixture.tournament
  const home = fixture.home_team
  const away = fixture.away_team

  return (
    <article
      ref={cardRef}
      className="group relative flex w-[88%] max-w-[360px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[32px] border border-emerald-500/30 bg-[#0c1815] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-emerald-500/20 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-400/50 hover:shadow-[0_30px_70px_rgba(16,185,129,0.22)]"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 ring-1 ring-amber-400/25">
            <span>{t('landing.liveNext.upNext')}</span>
          </span>
          <div className="flex min-w-0 items-center gap-1.5 text-end text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
            <FontAwesomeIcon icon={faTrophy} className="size-3 shrink-0 text-amber-400" />
            <span className="truncate bidi-plaintext">
              {t('landing.liveNext.tournament')}: {tournament?.name || '—'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Teams Matchup Section */}
        <div className="relative grid grid-cols-2 items-center gap-4 py-2">
          {/* Vertical Divider with VS Badge in Middle */}
          <div className="pointer-events-none absolute inset-y-0 start-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
            <div className="h-full w-px bg-white/10" />
            <span className="absolute z-10 rounded-xl bg-[#142320] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-400 shadow-xl ring-1 ring-white/15">
              VS
            </span>
          </div>

          {/* Home Team */}
          <div className="flex flex-col items-center gap-3 pe-5 text-center">
            <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-[0_10px_25px_rgba(0,0,0,0.3)] ring-2 ring-emerald-500/40 transition-transform duration-300 group-hover:scale-105">
              <TeamLogo team={home} name={home?.name} className="size-16" rounded="rounded-full" fontSize="text-lg" />
            </div>
            <span className="bidi-plaintext max-w-[130px] truncate text-center text-xs font-extrabold uppercase tracking-wide text-white">
              {home?.name || '—'}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-3 ps-5 text-center">
            <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-[0_10px_25px_rgba(0,0,0,0.3)] ring-2 ring-emerald-500/40 transition-transform duration-300 group-hover:scale-105">
              <TeamLogo team={away} name={away?.name} className="size-16" rounded="rounded-full" fontSize="text-lg" />
            </div>
            <span className="bidi-plaintext max-w-[130px] truncate text-center text-xs font-extrabold uppercase tracking-wide text-white">
              {away?.name || '—'}
            </span>
          </div>
        </div>

        {/* Glowing Share Button */}
        <div className="mt-5 flex justify-center">
          <ShareButton
            cardRef={cardRef}
            title={`${tournament?.name || 'Match'}: ${home?.name || ''} vs ${away?.name || ''}`}
            text={`${home?.name || ''} vs ${away?.name || ''}`}
            t={t}
          />
        </div>
      </div>

      {/* Match Details Box */}
      <div className="mt-5">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-sm">
          <p className="mb-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {t('landing.liveNext.matchDetails')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-300">
            {fixture.scheduled_at && (
              <>
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCalendarDays} className="size-3.5 text-slate-400" />
                  <span className="uppercase">{matchDay(fixture.scheduled_at, i18n.language)}</span>
                </span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <FontAwesomeIcon icon={faClock} className="size-3.5 text-slate-400" />
                  <span>{formatTime(fixture.scheduled_at)}</span>
                </span>
              </>
            )}
            {fixture.stadium && (
              <span className="flex min-w-0 items-center gap-1.5">
                <FontAwesomeIcon icon={faMapPin} className="size-3.5 shrink-0 text-slate-400" />
                <span className="bidi-plaintext truncate uppercase">
                  {t('landing.liveNext.venue')}: {fixture.stadium.name}
                </span>
              </span>
            )}
          </div>
        </div>

        <Link
          to={`/tournaments/${tournament?.slug || tournament?.id || ''}`}
          className="no-share-capture mt-3 flex items-center justify-center gap-2 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300"
        >
          <span>{t('landing.liveNext.viewTournament')}</span>
          <FontAwesomeIcon icon={faArrowLeft} className="size-3 ltr:rotate-180" />
        </Link>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="h-[380px] w-[88%] max-w-[360px] shrink-0 snap-start animate-pulse rounded-[32px] border border-white/10 bg-[#0c1815]/60 shadow-lg" />
  )
}

export default function TournamentMatches() {
  const { t } = useTranslation()
  const { data, loading } = useApi(() =>
    api.get('/v1/live-tournament-matches').then((r) => r.data?.data)
  )

  const upcomingMatches = data?.upcoming || (data?.next ? [data.next] : [])

  return (
    <section id="tournament-matches" className="scroll-mt-24 bg-[#0a1513] py-[100px] lg:py-[120px] text-white">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              <FontAwesomeIcon icon={faTrophy} className="size-3.5 text-amber-400" />
              {t('matchesPage.tournamentMatches.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-black text-white lg:text-4xl">
              {t('matchesPage.tournamentMatches.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 lg:text-base">
              {t('matchesPage.tournamentMatches.subtitle')}
            </p>
          </header>
        </Reveal>

        <Reveal className="mt-12">
          {loading ? (
            <Carousel showDots>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </Carousel>
          ) : upcomingMatches.length > 0 ? (
            <Carousel showDots>
              {upcomingMatches.map((fixture) => (
                <TournamentMatchCard key={fixture.id} fixture={fixture} />
              ))}
            </Carousel>
          ) : (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/10 bg-black/30 px-6 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <FontAwesomeIcon icon={faTrophy} className="size-7 text-amber-400" />
              </span>
              <p className="mt-4 text-base font-bold text-slate-200">
                {t('matchesPage.tournamentMatches.emptyTitle')}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                {t('matchesPage.tournamentMatches.emptyDescription')}
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
