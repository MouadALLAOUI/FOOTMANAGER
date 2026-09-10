import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCalendarDays,
  faCheck,
  faClock,
  faMapPin,
  faRadio,
  faShareNodes,
  faSpinner,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { toBlob } from 'html-to-image'
import api from '../../api/client'
import { matchDay, formatTime } from '../../lib/adapters'
import TeamLogo from '../../components/profile/TeamLogo'
import { useToast } from '../../components/ui/Toast'

const EVENT_META = {
  goal: '⚽',
  own_goal: '⚽',
  penalty_goal: '🥅',
  missed_penalty: '❌',
  yellow_card: '🟨',
  second_yellow: '🟨🟥',
  red_card: '🟥',
  substitution: '🔄',
  injury: '🩹',
  other: '📝',
}

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAEASTN7V4='

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
        let blob = null
        try {
          blob = await toBlob(cardRef.current, {
            cacheBust: false,
            skipFonts: true,
            imagePlaceholder: TRANSPARENT_PIXEL,
            pixelRatio: 2,
            filter: (node) => !node?.classList?.contains?.('no-share-capture'),
            onImageErrorHandler: () => TRANSPARENT_PIXEL,
          })
        } catch (e1) {
          console.warn('toBlob primary attempt failed, trying fallback:', e1)
          try {
            blob = await toBlob(cardRef.current, {
              cacheBust: true,
              skipFonts: true,
              imagePlaceholder: TRANSPARENT_PIXEL,
              pixelRatio: 1.5,
              filter: (node) => !node?.classList?.contains?.('no-share-capture'),
              onImageErrorHandler: () => TRANSPARENT_PIXEL,
            })
          } catch (e2) {
            console.error('toBlob fallback attempt failed:', e2)
          }
        }

        if (blob) {
          const cleanName = (title || 'match-card')
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, '-')
            .replace(/-+/g, '-')
          imageFile = new File([blob], `${cleanName}.png`, { type: 'image/png' })
        }
      }

      // Step 1: If we have an image file and browser supports Web Share API with files
      if (imageFile && typeof navigator !== 'undefined' && navigator.canShare) {
        // Many mobile browsers (Android Chrome, iOS Safari) only allow sharing files when NOT passing a separate `url` field
        // The standard best practice is to include the link directly in `text` alongside `files`.
        const shareDataWithFiles = {
          files: [imageFile],
          title: title || 'FootManager',
          text: text ? `${text}\n${shareUrl}` : shareUrl,
        }

        if (navigator.canShare(shareDataWithFiles)) {
          try {
            await navigator.share(shareDataWithFiles)
            toast?.success?.(t('landing.liveNext.shareSuccess'))
            return
          } catch (err) {
            if (err?.name === 'AbortError') return
            console.warn('Sharing file+text failed:', err)
          }
        }

        // Try file only
        const shareDataFileOnly = {
          files: [imageFile],
          title: title || 'FootManager',
        }
        if (navigator.canShare(shareDataFileOnly)) {
          try {
            await navigator.share(shareDataFileOnly)
            try {
              await navigator.clipboard.writeText(shareUrl)
            } catch {}
            toast?.success?.(t('landing.liveNext.shareSuccess'))
            return
          } catch (err) {
            if (err?.name === 'AbortError') return
            console.warn('Sharing file only failed:', err)
          }
        }
      }

      // Step 2: If we have the image file, but Web Share with files is not supported (e.g. desktop browsers),
      // download the card image directly and copy the link to clipboard
      if (imageFile) {
        const link = document.createElement('a')
        link.download = imageFile.name
        link.href = URL.createObjectURL(imageFile)
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 1000)

        try {
          await navigator.clipboard.writeText(shareUrl)
        } catch {}

        toast?.success?.(t('landing.liveNext.shareImageDownloaded'))
        return
      }

      // Step 3: Absolute fallback only if image file creation completely failed
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

      await navigator.clipboard.writeText(shareUrl)
      toast?.success?.(t('landing.liveNext.shareSuccess'))
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
      className="no-share-capture mx-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-7 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_22px_rgba(16,185,129,0.5)] ring-1 ring-emerald-300/30 transition-all duration-300 hover:scale-105 hover:from-emerald-400 hover:to-green-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] active:scale-95 disabled:opacity-75 cursor-pointer"
    >
      <FontAwesomeIcon icon={sharing ? faSpinner : faShareNodes} className={`size-3.5 ${sharing ? 'animate-spin' : ''}`} />
      <span>{sharing ? t('landing.liveNext.sharing') : t('landing.liveNext.share')}</span>
    </button>
  )
}

function LiveCard({ f, t, i18n }) {
  const cardRef = useRef(null)
  const m = f.match || {}
  const tournaments = f.tournament
  const home = f.home_team
  const away = f.away_team
  const events = m.events || []
  const minute = m.current_minute ?? 0

  return (
    <article
      ref={cardRef}
      className="group relative flex w-full flex-col overflow-hidden rounded-[28px] border border-emerald-500/30 bg-[#0c1815] p-5 sm:p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-emerald-500/20 transition-all duration-300"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-rose-400 ring-1 ring-rose-500/30">
          <span className="size-2 animate-pulse rounded-full bg-rose-500" />
          <span>{t('landing.liveNext.live')}</span>
          {minute > 0 && <span className="tabular-nums font-black">{minute}'</span>}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-end text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
          <FontAwesomeIcon icon={faTrophy} className="size-3 shrink-0 text-amber-400" />
          <span className="truncate bidi-plaintext">
            {t('landing.liveNext.tournament')}: {tournaments?.name || '—'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Teams Matchup Section */}
      <div className="relative grid grid-cols-2 items-center gap-4 py-2">
        {/* Vertical Divider in Middle */}
        <div className="pointer-events-none absolute inset-y-0 start-1/2 -translate-x-1/2 flex flex-col items-center justify-center">
          <div className="h-full w-px bg-white/10" />
          <div className="absolute z-10 flex flex-col items-center gap-0.5 rounded-xl bg-[#142320] px-2.5 py-1 shadow-xl ring-1 ring-white/15">
            <span className="text-base font-black tabular-nums tracking-tight text-rose-400">
              {m.home_score ?? 0} - {m.away_score ?? 0}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              {t('landing.liveNext.liveScore')}
            </span>
          </div>
        </div>

        {/* Home Team */}
        <div className="flex flex-col items-center gap-2.5 pe-6 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-lg ring-2 ring-emerald-500/40 transition-transform duration-300 group-hover:scale-105">
            <TeamLogo team={home} name={home?.name} className="size-16" rounded="rounded-full" fontSize="text-lg" />
          </div>
          <span className="bidi-plaintext max-w-[140px] truncate text-center text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white">
            {home?.name || '—'}
          </span>
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-2.5 ps-6 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-lg ring-2 ring-emerald-500/40 transition-transform duration-300 group-hover:scale-105">
            <TeamLogo team={away} name={away?.name} className="size-16" rounded="rounded-full" fontSize="text-lg" />
          </div>
          <span className="bidi-plaintext max-w-[140px] truncate text-center text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white">
            {away?.name || '—'}
          </span>
        </div>
      </div>

      {/* Glowing Share Button */}
      <div className="mt-4 flex justify-center">
        <ShareButton
          cardRef={cardRef}
          title={`${tournaments?.name || 'Match'}: ${home?.name || ''} vs ${away?.name || ''}`}
          text={`${home?.name || ''} vs ${away?.name || ''}`}
          t={t}
        />
      </div>

      {/* Bottom Container: Match Details & Recent Events */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-sm">
        <p className="mb-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {t('landing.liveNext.matchDetails')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-300">
          {f.stadium && (
            <span className="flex min-w-0 items-center gap-1.5">
              <FontAwesomeIcon icon={faMapPin} className="size-3 shrink-0 text-emerald-400" />
              <span className="bidi-plaintext truncate uppercase">
                {t('landing.liveNext.venue')}: {f.stadium.name}
              </span>
            </span>
          )}
          {minute > 0 && (
            <span className="flex items-center gap-1.5 text-rose-400">
              <FontAwesomeIcon icon={faClock} className="size-3" />
              <span>{minute}' {t('landing.liveNext.live')}</span>
            </span>
          )}
        </div>

        {events.length > 0 && (
          <div className="mt-2.5 border-t border-white/10 pt-2">
            <ol className="space-y-1">
              {events.slice(0, 2).map((e) => {
                const meta = EVENT_META[e.type] || { icon: '•' }
                const player = e.player_name || e.player?.name || ''
                return (
                  <li key={e.id} className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="w-6 shrink-0 text-end font-mono font-bold text-amber-400">{e.minute ?? 0}'</span>
                    <span className="shrink-0 text-xs">{meta.icon}</span>
                    {player && <span className="min-w-0 flex-1 truncate font-medium">{player}</span>}
                    {e.team_name && <span className="shrink-0 text-[10px] text-slate-400">{e.team_name}</span>}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      <Link
        to={`/tournaments/${tournaments?.slug || tournaments?.id || ''}`}
        className="no-share-capture mt-3 flex items-center justify-center gap-2 py-1 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300"
      >
        <FontAwesomeIcon icon={faRadio} className="size-3.5 animate-pulse text-rose-500" />
        <span>{t('landing.liveNext.watch')}</span>
        <FontAwesomeIcon icon={faArrowLeft} className="size-3 ltr:rotate-180" />
      </Link>
    </article>
  )
}

function NextCard({ f, t, i18n, index = 0, total = 1, onPrev, onNext }) {
  const cardRef = useRef(null)
  const tournaments = f.tournament
  const home = f.home_team
  const away = f.away_team

  return (
    <article
      ref={cardRef}
      className="group relative flex w-full flex-col overflow-hidden rounded-[28px] border border-emerald-500/30 bg-[#0c1815] p-5 sm:p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-emerald-500/20 transition-all duration-300"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-400 ring-1 ring-amber-400/25">
            <span>{t('landing.liveNext.upNext')}</span>
          </span>
          {total > 1 && (
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono font-bold text-slate-300">
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous match"
                className="size-4 grid place-items-center text-amber-400 hover:scale-125 transition cursor-pointer"
              >
                ‹
              </button>
              <span>{index + 1}/{total}</span>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next match"
                className="size-4 grid place-items-center text-amber-400 hover:scale-125 transition cursor-pointer"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-end text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
          <FontAwesomeIcon icon={faTrophy} className="size-3 shrink-0 text-amber-400" />
          <span className="truncate bidi-plaintext">
            {t('landing.liveNext.tournament')}: {tournaments?.name || '—'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

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
        <div className="flex flex-col items-center gap-2.5 pe-6 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-lg ring-2 ring-emerald-500/40 transition-transform duration-300 group-hover:scale-105">
            <TeamLogo team={home} name={home?.name} className="size-16" rounded="rounded-full" fontSize="text-lg" />
          </div>
          <span className="bidi-plaintext max-w-[140px] truncate text-center text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white">
            {home?.name || '—'}
          </span>
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-2.5 ps-6 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-white p-2 shadow-lg ring-2 ring-emerald-500/40 transition-transform duration-300 group-hover:scale-105">
            <TeamLogo team={away} name={away?.name} className="size-16" rounded="rounded-full" fontSize="text-lg" />
          </div>
          <span className="bidi-plaintext max-w-[140px] truncate text-center text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white">
            {away?.name || '—'}
          </span>
        </div>
      </div>

      {/* Glowing Share Button */}
      <div className="mt-4 flex justify-center">
        <ShareButton
          cardRef={cardRef}
          title={`${tournaments?.name || 'Match'}: ${home?.name || ''} vs ${away?.name || ''}`}
          text={`${home?.name || ''} vs ${away?.name || ''}`}
          t={t}
        />
      </div>

      {/* Match Details Box */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-sm">
        <p className="mb-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {t('landing.liveNext.matchDetails')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-300">
          {f.scheduled_at && (
            <>
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCalendarDays} className="size-3.5 text-slate-400" />
                <span className="uppercase">{matchDay(f.scheduled_at, i18n.language)}</span>
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <FontAwesomeIcon icon={faClock} className="size-3.5 text-slate-400" />
                <span>{formatTime(f.scheduled_at)}</span>
              </span>
            </>
          )}
          {f.stadium && (
            <span className="flex min-w-0 items-center gap-1.5">
              <FontAwesomeIcon icon={faMapPin} className="size-3.5 shrink-0 text-slate-400" />
              <span className="bidi-plaintext truncate uppercase">
                {t('landing.liveNext.venue')}: {f.stadium.name}
              </span>
            </span>
          )}
        </div>
      </div>

      <Link
        to={`/tournaments/${tournaments?.slug || tournaments?.id || ''}`}
        className="no-share-capture mt-3 flex items-center justify-center gap-2 py-1 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300"
      >
        <span>{t('landing.liveNext.viewTournament')}</span>
        <FontAwesomeIcon icon={faArrowLeft} className="size-3 ltr:rotate-180" />
      </Link>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="h-[380px] w-full animate-pulse rounded-[28px] border border-white/10 bg-[#0c1815]/60 shadow-lg" />
  )
}

export default function LiveAndNext() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upcomingIndex, setUpcomingIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    let cancelled = false
    const fetchNow = () => {
      api
        .get('/v1/live-tournament-matches')
        .then((r) => {
          if (!cancelled) setData(r.data?.data || { live: [], next: null, upcoming: [] })
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }
    fetchNow()
    const id = setInterval(fetchNow, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const live = data?.live || []
  const next = data?.next || null
  const upcoming = (data?.upcoming && data.upcoming.length > 0) ? data.upcoming : (next ? [next] : [])
  const currentUpcoming = upcoming[upcomingIndex] || upcoming[0] || null
  const hasContent = live.length > 0 || upcoming.length > 0
  const noLive = !loading && live.length === 0

  return (
    <section id="live-next" className="bg-[#f6f7fb] py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="text-start">
            <span className="mb-3 block h-1 w-10 rounded-full bg-green-500" aria-hidden="true" />
            <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">
              {t('landing.liveNext.title1')}{' '}
              <span className="inline-flex items-center gap-2 text-rose-600">
                <FontAwesomeIcon icon={faRadio} className="size-6 animate-pulse" />
                {t('landing.liveNext.title2')}
              </span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('landing.liveNext.subtitle')}
            </p>
          </div>

          <Link
            to="/matches#tournament-matches"
            className="group flex items-center gap-2 text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700 cursor-pointer"
          >
            <span>{t('landing.liveNext.seeAllUpcoming')}</span>
            <FontAwesomeIcon
              icon={faArrowLeft}
              className="size-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1"
            />
          </Link>
        </header>

        <div className="mt-12">
          {loading ? (
            <div className="grid items-start gap-8 lg:grid-cols-2">
              <Skeleton />
              <Skeleton />
            </div>
          ) : !hasContent ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-3xl bg-rose-50 text-rose-500">
                <FontAwesomeIcon icon={faRadio} className="size-7" />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-700">{t('landing.liveNext.empty')}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">{t('landing.liveNext.emptyDesc')}</p>
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-2">
              {/* Left Column: Live Matches */}
              <div className="space-y-4">
                {noLive && (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-xl">⏸</span>
                    <p className="text-sm font-bold text-slate-600">{t('landing.liveNext.noLive')}</p>
                  </div>
                )}
                {live.map((f) => (
                  <LiveCard key={f.id} f={f} t={t} i18n={i18n} />
                ))}
              </div>

              {/* Right Column: Upcoming Tournament Matches */}
              {currentUpcoming ? (
                <div className="flex flex-col items-center w-full">
                  <NextCard
                    key={currentUpcoming.id}
                    f={currentUpcoming}
                    t={t}
                    i18n={i18n}
                    index={upcomingIndex}
                    total={upcoming.length}
                    onPrev={() => setUpcomingIndex((p) => (p > 0 ? p - 1 : upcoming.length - 1))}
                    onNext={() => setUpcomingIndex((p) => (p < upcoming.length - 1 ? p + 1 : 0))}
                  />

                  {upcoming.length > 1 && (
                    <div className="mt-4 flex w-full items-center justify-between px-2">
                      <div className="flex items-center gap-1.5">
                        {upcoming.map((u, i) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setUpcomingIndex(i)}
                            aria-label={`Match ${i + 1}`}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              i === upcomingIndex ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>

                      <Link
                        to="/matches#tournament-matches"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-700"
                      >
                        <FontAwesomeIcon icon={faTrophy} className="size-3 text-amber-500" />
                        <span>{t('landing.liveNext.seeAllUpcoming')} ({upcoming.length})</span>
                        <FontAwesomeIcon icon={faArrowLeft} className="size-3 ltr:rotate-180" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden lg:block" />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
