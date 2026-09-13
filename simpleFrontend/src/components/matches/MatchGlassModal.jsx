import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileText,
  Loader2,
  MapPin,
  Share2,
  Trophy,
  X,
} from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { toBlob } from 'html-to-image'
import TeamLogo from '../profile/TeamLogo'
import { logoThumb } from '../../lib/thumb'

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAEASTN7V4='

/**
 * Detects the specific foul sub-type (penalty kick, free kick, card, handball, tackle, simple foul).
 */
export function detectFoulDetails(rawPunishment = '', descText = '', rawType = '', rawFoulType = '') {
  // 1. Explicit foul_type or punishment: Penalty Kick (kick)
  if (
    rawFoulType === 'penalty' ||
    rawPunishment === 'penalty' ||
    rawType === 'foul_penalty' ||
    descText.includes('penalty') ||
    descText.includes('جزاء')
  ) {
    return {
      foulKey: 'foulPenalty',
      icon: '⚽',
      defaultAr: 'ركلة جزاء',
      defaultEn: 'Penalty Kick',
    }
  }

  // 2. Direct Free Kick (kick)
  if (descText.includes('direct') || descText.includes('مباشرة')) {
    return {
      foulKey: 'foulDirectKick',
      icon: '🎯',
      defaultAr: 'ركلة حرة مباشرة',
      defaultEn: 'Direct Free Kick',
    }
  }

  // 3. Indirect Free Kick (kick)
  if (descText.includes('indirect') || descText.includes('غير مباشرة')) {
    return {
      foulKey: 'foulIndirectKick',
      icon: '🎯',
      defaultAr: 'ركلة حرة غير مباشرة',
      defaultEn: 'Indirect Free Kick',
    }
  }

  // 4. Free Kick / General Kick (kick)
  if (
    rawFoulType === 'kick' ||
    rawFoulType === 'free_kick' ||
    rawPunishment === 'free_kick' ||
    descText.includes('free') ||
    descText.includes('حرة') ||
    descText.includes('kick') ||
    descText.includes('ركلة') ||
    descText.includes('ضربة')
  ) {
    return {
      foulKey: 'foulFreeKick',
      icon: '🎯',
      defaultAr: 'ضربة حرة',
      defaultEn: 'Free Kick',
    }
  }

  // 5. Card fouls
  if (rawFoulType === 'second_yellow' || rawPunishment === 'second_yellow' || descText.includes('second') || descText.includes('صفراء ثانية')) {
    return {
      foulKey: 'foulSecondYellow',
      icon: '🟨🟥',
      defaultAr: 'صفراء ثانية',
      defaultEn: 'Second Yellow',
    }
  }
  if (rawFoulType === 'red' || rawPunishment === 'red' || descText.includes('red') || descText.includes('حمراء') || descText.includes('طرد')) {
    return {
      foulKey: 'foulRed',
      icon: '🟥',
      defaultAr: 'بطاقة حمراء',
      defaultEn: 'Red Card',
    }
  }
  if (rawFoulType === 'yellow' || rawFoulType === 'card' || rawPunishment === 'yellow' || descText.includes('yellow') || descText.includes('صفراء') || descText.includes('إنذار') || descText.includes('card') || descText.includes('بطاقة')) {
    return {
      foulKey: 'foulYellow',
      icon: '🟨',
      defaultAr: 'بطاقة صفراء',
      defaultEn: 'Yellow Card',
    }
  }

  // 6. Handball
  if (rawFoulType === 'handball' || descText.includes('hand') || descText.includes('لمسة يد') || descText.includes('يد')) {
    return {
      foulKey: 'foulHandball',
      icon: '✋',
      defaultAr: 'لمسة يد',
      defaultEn: 'Handball',
    }
  }

  // 7. Tackle / Rough play
  if (rawFoulType === 'tackle' || descText.includes('tackle') || descText.includes('عرقلة') || descText.includes('تدخل')) {
    return {
      foulKey: 'foulTackle',
      icon: '🛑',
      defaultAr: 'عرقلة',
      defaultEn: 'Tackle',
    }
  }

  // 8. Simple Foul (default)
  return {
    foulKey: 'foulSimple',
    icon: '⚠️',
    defaultAr: 'خطأ بسيط',
    defaultEn: 'Simple Foul',
  }
}

/**
 * Groups events by team and category (Goals, Cards, Substitutions)
 * exactly as styled in professional match presentation graphics.
 */
export function groupCategorizedEvents(events = [], homeId, awayId) {
  const home = { goals: [], cards: [], subs: [], others: [] }
  const away = { goals: [], cards: [], subs: [], others: [] }

  const sorted = [...events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))

  for (const e of sorted) {
    const eid = Number(e.team_id ?? e.team?.id ?? (typeof e.team === 'number' ? e.team : null))
    const isHome = (eid != null && Number(homeId) != null && eid === Number(homeId)) || e.side === 'home'
    const isAway = (eid != null && Number(awayId) != null && eid === Number(awayId)) || e.side === 'away'
    if (!isHome && !isAway) continue

    const target = isHome ? home : away
    const minute = e.minute != null ? `'${e.minute}${e.added_time ? `+${e.added_time}` : ''}` : ''
    const playerName =
      e.player?.name ||
      e.player_name ||
      e.player?.full_name ||
      (typeof e.player === 'string' && e.player.trim() ? e.player : null) ||
      e.description ||
      'لاعب'

    const rawType = String(
      (e.type && typeof e.type === 'object' ? e.type.value : e.type) || ''
    ).toLowerCase()

    const rawIcon = String(e.icon || '').toLowerCase()

    const rawPunishment = String(
      (e.punishment && typeof e.punishment === 'object'
        ? e.punishment.value
        : e.punishment || e.metadata?.punishment) || ''
    ).toLowerCase()

    const rawFoulType = String(e.foul_type || e.metadata?.foul_type || '').toLowerCase()

    // 1. Goals
    const isGoalType =
      ['goal', 'penalty_goal', 'own_goal'].includes(rawType) ||
      ['goal', 'penalty-goal', 'own-goal'].includes(rawIcon)

    if (isGoalType) {
      const isOwn = rawType === 'own_goal' || rawIcon === 'own-goal' || e.metadata?.is_own_goal
      const isPen = rawType === 'penalty_goal' || rawIcon === 'penalty-goal' || e.metadata?.is_penalty
      const existing = target.goals.find((g) => g.name === playerName && g.isOwn === isOwn)
      if (existing) {
        if (minute) existing.minutes.push(minute)
      } else {
        target.goals.push({
          name: playerName,
          minutes: minute ? [minute] : [],
          isOwn,
          isPen,
        })
      }
      continue
    }

    const descText = String(e.description || e.reason || e.note || e.metadata?.reason || '').toLowerCase()

    // 2. Disciplinary Cards (Yellow, Red, Second Yellow)
    const isCardType =
      ['yellow_card', 'red_card', 'second_yellow', 'card', 'yellow', 'red', 'foul_yellow', 'foul_red', 'foul_second_yellow'].includes(rawType) ||
      ['yellow', 'yellow_card', 'second_yellow', 'red', 'red_card'].includes(rawPunishment) ||
      ['yellow-card', 'yellow_card', 'red-card', 'red_card', 'second-yellow', 'second_yellow'].includes(rawIcon) ||
      (rawType === 'foul' && ['yellow', 'second_yellow', 'red', 'yellow_card', 'red_card'].includes(rawPunishment)) ||
      (rawType === 'foul' && (rawIcon.includes('yellow') || rawIcon.includes('red'))) ||
      descText.includes('yellow') || descText.includes('صفراء') || descText.includes('إنذار') ||
      descText.includes('red') || descText.includes('حمراء') || descText.includes('طرد')

    if (isCardType) {
      let cardType = 'yellow_card'
      if (
        rawType === 'red_card' ||
        rawType === 'red' ||
        rawType === 'foul_red' ||
        rawPunishment === 'red' ||
        rawPunishment === 'red_card' ||
        rawIcon === 'red-card' ||
        rawIcon === 'red_card' ||
        descText.includes('red') ||
        descText.includes('حمراء') ||
        descText.includes('طرد')
      ) {
        cardType = 'red_card'
      } else if (
        rawType === 'second_yellow' ||
        rawType === 'foul_second_yellow' ||
        rawPunishment === 'second_yellow' ||
        rawIcon === 'second-yellow' ||
        rawIcon === 'second_yellow' ||
        descText.includes('second') ||
        descText.includes('صفراء ثانية')
      ) {
        cardType = 'second_yellow'
      }
      target.cards.push({
        name: playerName,
        minute,
        cardType,
        reason: e.reason || e.metadata?.reason || e.description || '',
      })
      continue
    }

    // 3. Substitutions
    const isSubType =
      ['substitution', 'sub'].includes(rawType) ||
      rawIcon === 'substitution'

    if (isSubType) {
      const inPlayer =
        e.assist_player?.name ||
        e.assist_player_name ||
        e.assist_player?.full_name ||
        (typeof e.assist_player === 'string' && e.assist_player.trim() ? e.assist_player : null) ||
        e.metadata?.in ||
        e.assist_name ||
        ''
      const outPlayer =
        playerName ||
        e.metadata?.out ||
        ''
      target.subs.push({
        inName: inPlayer,
        outName: outPlayer,
        minute,
      })
      continue
    }

    // 4. Other Match Events (Fouls with subtypes, Injuries, Missed Penalties, Timeouts, VAR, etc.)
    if (['half_time', 'second_half', 'kickoff', 'match_end', 'ended', 'warmup'].includes(rawType)) {
      continue
    }

    let eventKind = 'other'
    let otherIcon = '📌'
    let foulKey = null
    let defaultAr = ''
    let defaultEn = ''
    const detailText = e.description || e.reason || e.note || e.metadata?.reason || ''

    if (rawType === 'missed_penalty' || rawIcon === 'missed-penalty' || descText.includes('ضائعة') || descText.includes('missed')) {
      eventKind = 'missedPenalty'
      otherIcon = '❌'
    } else if (rawType === 'assist' || rawIcon === 'assist') {
      eventKind = 'assist'
      otherIcon = '🎯'
    } else if (rawType === 'injury' || rawIcon === 'injury' || descText.includes('إصابة') || descText.includes('injury')) {
      eventKind = 'injury'
      otherIcon = '🩹'
    } else if (rawType === 'timeout' || rawIcon === 'timeout') {
      eventKind = 'timeout'
      otherIcon = '⏱️'
    } else if (rawType === 'var' || rawIcon === 'var') {
      eventKind = 'var'
      otherIcon = '📺'
    } else if (rawType === 'foul') {
      eventKind = 'foul'
      const fDetails = detectFoulDetails(rawPunishment, descText, rawType, rawFoulType)
      otherIcon = fDetails.icon
      foulKey = fDetails.foulKey
      defaultAr = fDetails.defaultAr
      defaultEn = fDetails.defaultEn
    }

    target.others.push({
      name: playerName !== 'لاعب' ? playerName : '',
      eventKind,
      foulKey,
      defaultAr,
      defaultEn,
      icon: otherIcon,
      minute,
      detail: detailText,
    })
  }

  return { home, away }
}

export default function MatchGlassModal({
  open,
  onClose,
  match,
  loading = false,
  error = null,
  onPdf = null,
  pdfBusy = false,
  previewUrl = null,
  onClosePreview = null,
  onDownloadPdf = null,
  onTeamClick = null,
  managerActions = null,
}) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('ar')

  const cardRef = useRef(null)
  const [sharingStory, setSharingStory] = useState(false)

  // Normalize match data whether from a tournament fixture or friendly match
  const homeTeam = match?.home_team || match?.host_team
  // Guest challenges have no team account: the opponent is only the guest
  // name stored on the request (is_guest), so synthesize a display-only team.
  const awayTeam =
    match?.away_team ||
    match?.opponent_team ||
    (match?.is_guest ? { name: match?.guest_team_name, is_guest: true } : null)
  const homeId = homeTeam?.id ?? match?.home_team_id ?? match?.host_team_id
  const awayId = awayTeam?.id ?? match?.away_team_id ?? match?.opponent_team_id

  const homeLogoUrl = logoThumb(homeTeam)
  const awayLogoUrl = logoThumb(awayTeam)
  const hasHomeLogo = Boolean(homeLogoUrl)
  const hasAwayLogo = Boolean(awayLogoUrl)

  const [homeDataUrl, setHomeDataUrl] = useState(null)
  const [awayDataUrl, setAwayDataUrl] = useState(null)
  const [appLogoDataUrl, setAppLogoDataUrl] = useState(null)

  useEffect(() => {
    let mounted = true
    const toDataUrl = async (url) => {
      if (!url) return null
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const blob = await res.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })
      } catch {
        return null
      }
    }

    if (homeLogoUrl) {
      toDataUrl(homeLogoUrl).then((d) => mounted && setHomeDataUrl(d))
    } else {
      setHomeDataUrl(null)
    }

    if (awayLogoUrl) {
      toDataUrl(awayLogoUrl).then((d) => mounted && setAwayDataUrl(d))
    } else {
      setAwayDataUrl(null)
    }

    toDataUrl('/logo.jpeg').then((d) => mounted && setAppLogoDataUrl(d))

    return () => {
      mounted = false
    }
  }, [homeLogoUrl, awayLogoUrl])

  const homeScore = match?.home_score ?? match?.host_score
  const awayScore = match?.away_score ?? match?.opponent_score
  const isFinished = Boolean(match?.is_finished || match?.status === 'finished' || match?.status === 'completed')
  const isLive = Boolean(match?.is_live || match?.status === 'live' || match?.status === 'in_progress')
  const showScore = isFinished || isLive || (homeScore != null && awayScore != null)

  const homeWinner = isFinished && match?.winner_team_id != null && Number(match.winner_team_id) === Number(homeId)
  const awayWinner = isFinished && match?.winner_team_id != null && Number(match.winner_team_id) === Number(awayId)
  const hasPenalties = isFinished && match?.home_penalties != null && match?.away_penalties != null

  const scheduledAt = match?.scheduled_at || match?.match_datetime
  const dateObj = scheduledAt ? new Date(scheduledAt) : null

  const formattedTime = dateObj
    ? dateObj.toLocaleTimeString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '20:30'

  const formattedDate = dateObj
    ? dateObj.toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const stadiumName = match?.stadium?.name || match?.custom_terrain_name
  const stageOrRoundText =
    match?.round?.name ||
    match?.group?.name ||
    (match?.tournament?.name ? match.tournament.name : null) ||
    (match?.stage ? t(`tournament.stages.${match.stage}`, { defaultValue: match.stage }) : null)

  const homeSubtitle = homeTeam?.rank ? `المركز ${homeTeam.rank}` : homeTeam?.city || ''
  const awaySubtitle = awayTeam?.rank
    ? `المركز ${awayTeam.rank}`
    : awayTeam?.city || (awayTeam?.is_guest ? 'فريق ضيف (مباراة ودية)' : '')

  const rawEvents = match?.events || match?.football_match?.events || match?.footballMatch?.events || []
  const { home: homeEvents, away: awayEvents } = useMemo(
    () => groupCategorizedEvents(rawEvents, homeId, awayId),
    [rawEvents, homeId, awayId],
  )

  const hasEvents =
    homeEvents.goals.length > 0 ||
    homeEvents.cards.length > 0 ||
    homeEvents.subs.length > 0 ||
    homeEvents.others.length > 0 ||
    awayEvents.goals.length > 0 ||
    awayEvents.cards.length > 0 ||
    awayEvents.subs.length > 0 ||
    awayEvents.others.length > 0

  // Status Capsule text
  const statusText = useMemo(() => {
    if (isLive) return `● ${t('public.matchDetail.live', 'مباشر')}`
    if (isFinished) return t('public.matchDetail.type.matchEnd', 'نهاية المباراة')
    if (match?.status === 'cancelled') return t('committee.detail.status.cancelled', 'ملغاة')
    if (match?.status === 'postponed') return t('committee.detail.status.postponed', 'مؤجلة')
    return t('committee.detail.status.upcoming', 'موعد المباراة')
  }, [isLive, isFinished, match?.status, t])

  const handleShareStory = async () => {
    if (sharingStory) return
    setSharingStory(true)

    const scoreStr = showScore ? ` (${homeScore} - ${awayScore})` : ''
    const statusHeader = isFinished ? '🏆 نهاية المباراة' : isLive ? '🔴 مباشر الآن' : '⚽ موعد المباراة'
    const shareUrl = window.location.href
    const shareText = `${statusHeader}\n${homeTeam?.name || 'الفريق 1'} ${scoreStr} ${awayTeam?.name || 'الفريق 2'}\n${stadiumName ? `📍 ${stadiumName}\n` : ''}${shareUrl}`
    const shareTitle = `${homeTeam?.name || 'فريق'} vs ${awayTeam?.name || 'فريق'}`

    try {
      let imageFile = null
      if (cardRef.current) {
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
        } catch (captureErr1) {
          console.warn('toBlob primary attempt failed, trying fallback:', captureErr1)
          try {
            blob = await toBlob(cardRef.current, {
              cacheBust: true,
              skipFonts: true,
              imagePlaceholder: TRANSPARENT_PIXEL,
              pixelRatio: 1.5,
              filter: (node) => !node?.classList?.contains?.('no-share-capture'),
              onImageErrorHandler: () => TRANSPARENT_PIXEL,
            })
          } catch (captureErr2) {
            console.warn('toBlob fallback attempt failed:', captureErr2)
          }
        }
        if (blob) {
          const cleanName = `match-${homeTeam?.name || 'team1'}-vs-${awayTeam?.name || 'team2'}`
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, '-')
            .replace(/-+/g, '-')
          imageFile = new File([blob], `${cleanName}.png`, { type: 'image/png' })
        }
      }

      // 1. Mobile / Web Share API with file support
      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({
            title: shareTitle,
            text: `${shareText}\n${shareUrl}`,
            url: shareUrl,
            files: [imageFile],
          })
          return
        } catch (err) {
          if (err?.name === 'AbortError') return
        }
      }

      // 2. Web Share API without file support
      if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
        if (imageFile) {
          const link = document.createElement('a')
          link.download = imageFile.name
          link.href = URL.createObjectURL(imageFile)
          link.click()
          URL.revokeObjectURL(link.href)
        }
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          })
          return
        } catch (err) {
          if (err?.name === 'AbortError') return
        }
      }

      // 3. Fallback: Download the story image & open WhatsApp share with text and link
      if (imageFile) {
        const link = document.createElement('a')
        link.download = imageFile.name
        link.href = URL.createObjectURL(imageFile)
        link.click()
        URL.revokeObjectURL(link.href)
      }

      try {
        await navigator.clipboard.writeText(shareUrl)
      } catch {}

      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
      window.open(waUrl, '_blank')
    } catch (err) {
      console.error('Share story error:', err)
    } finally {
      setSharingStory(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Dark blur backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Glassmorphism Card */}
      <div
        ref={cardRef}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="relative my-auto w-full max-w-[440px] sm:max-w-[540px] md:max-w-[640px] lg:max-w-[720px] xl:max-w-[780px] overflow-hidden rounded-[2.2rem] sm:rounded-[2.5rem] border border-emerald-500/35 bg-gradient-to-b from-[#082618]/95 via-[#04170f]/95 to-[#020b07]/95 p-5 sm:p-7 md:p-8 lg:p-9 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.22)] backdrop-blur-2xl transition-all"
      >
        {/* Ambient stadium lighting and curved neon arcs */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <svg
          className="pointer-events-none absolute inset-0 size-full opacity-30"
          viewBox="0 0 400 700"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M-40,80 Q200,20 450,140" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M-60,160 Q170,100 480,220" stroke="#34d399" strokeWidth="1.2" strokeOpacity="0.5" />
          <path d="M-30,530 Q220,590 450,470" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.6" />
          <path d="M-50,600 Q190,660 480,540" stroke="#34d399" strokeWidth="1.2" strokeOpacity="0.4" />
        </svg>

        {/* Top Header Branding & Close Button */}
        <div className="relative flex flex-col items-center pt-1 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="no-share-capture absolute top-0 start-0 grid size-8 sm:size-9 place-items-center rounded-full bg-white/10 text-white/75 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white focus:outline-none"
            aria-label={t('common.close', 'إغلاق')}
          >
            <X className="size-4 sm:size-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="size-11 sm:size-12 rounded-2xl border border-emerald-400/40 bg-emerald-950/80 p-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-md">
              <img src={appLogoDataUrl || '/logo.jpeg'} alt="Logo" className="size-full rounded-xl object-cover" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              أجي نقصرو
            </h2>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="size-8 animate-spin text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-200/70">{t('common.loading', 'جاري التحميل…')}</p>
          </div>
        )}

        {error && (
          <div className="my-6 rounded-2xl border border-dashed border-rose-500/30 bg-rose-950/20 py-8 text-center">
            <p className="text-xs font-bold text-rose-300">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="relative z-10">
            {/* Status Capsule */}
            <div className="relative mx-auto mt-2 w-fit min-w-[200px] max-w-[340px]">
              <div className="flex items-center justify-center rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-950/90 via-emerald-900/90 to-emerald-950/90 py-2 px-6 shadow-[0_0_30px_rgba(16,185,129,0.35),inset_0_1px_2px_rgba(255,255,255,0.25)] backdrop-blur-md">
                <span className="whitespace-nowrap text-sm sm:text-base md:text-lg font-black tracking-wide text-white drop-shadow">
                  {statusText}
                </span>
              </div>
              <div className="mx-auto mt-1 h-px w-3/4 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]" />
            </div>

            {/* Match Kickoff Time & Timezone */}
            <div className="mt-3 text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] font-mono">
                {formattedTime}
              </p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-300/70">
                GMT+1
              </p>
            </div>

            {/* Teams & Scoreboard */}
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 md:gap-6">
              {/* Home Team */}
              <div className="flex flex-col items-center text-center">
                <div
                  className={`relative flex items-center justify-center ${onTeamClick && homeTeam ? 'cursor-pointer transition-transform hover:scale-105' : ''}`}
                  onClick={() => onTeamClick?.(homeTeam)}
                  title={homeTeam?.name ? `عرض ملف ${homeTeam.name}` : undefined}
                >
                  {hasHomeLogo ? (
                    <div className="flex size-20 sm:size-24 md:size-28 lg:size-32 items-center justify-center p-1">
                      <TeamLogo
                        team={homeTeam}
                        src={homeDataUrl || homeLogoUrl}
                        className="max-h-full max-w-full object-contain filter drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
                        rounded="rounded-none"
                        bg="bg-transparent"
                      />
                    </div>
                  ) : (
                    <div className="grid size-20 sm:size-24 md:size-28 lg:size-32 place-items-center rounded-full bg-gradient-to-b from-emerald-950 to-slate-950 p-1 ring-2 ring-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <TeamLogo team={homeTeam} className="size-full" rounded="rounded-full" fontSize="text-2xl sm:text-3xl" />
                    </div>
                  )}
                  {homeWinner && (
                    <span className="absolute -top-1.5 end-0 grid size-6 sm:size-7 place-items-center rounded-full bg-amber-400 text-amber-950 shadow ring-1 ring-white/50">
                      <Trophy className="size-3.5 sm:size-4" />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 max-w-[150px] sm:max-w-[190px] md:max-w-[240px] text-sm sm:text-base md:text-lg font-extrabold text-white drop-shadow leading-tight line-clamp-2">
                  {homeTeam?.name || '—'}
                </p>
                {homeSubtitle && (
                  <p className="text-[11px] sm:text-xs font-semibold text-emerald-200/60">
                    {homeSubtitle}
                  </p>
                )}
              </div>

              {/* Center Score & Details */}
              <div className="flex flex-col items-center text-center px-1">
                <span className="text-4xl sm:text-5xl md:text-6xl font-black tracking-wider text-amber-100 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-mono">
                  {showScore ? `${homeScore ?? 0} - ${awayScore ?? 0}` : 'VS'}
                </span>
                {hasPenalties && (
                  <p className="mt-1 whitespace-nowrap text-[11px] sm:text-xs font-black text-amber-300 drop-shadow">
                    ({match.home_penalties} - {match.away_penalties} {isRtl ? 'ر.ت' : 'PEN'})
                  </p>
                )}
                {stageOrRoundText && (
                  <p className="mt-1.5 text-xs sm:text-sm font-black text-emerald-300 drop-shadow">
                    {stageOrRoundText}
                  </p>
                )}
                {formattedDate && (
                  <p className="text-[11px] sm:text-xs font-semibold text-white/60">
                    {formattedDate}
                  </p>
                )}
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center text-center">
                <div
                  className={`relative flex items-center justify-center ${onTeamClick && awayTeam ? 'cursor-pointer transition-transform hover:scale-105' : ''}`}
                  onClick={() => onTeamClick?.(awayTeam)}
                  title={awayTeam?.name ? `عرض ملف ${awayTeam.name}` : undefined}
                >
                  {hasAwayLogo ? (
                    <div className="flex size-20 sm:size-24 md:size-28 lg:size-32 items-center justify-center p-1">
                      <TeamLogo
                        team={awayTeam}
                        src={awayDataUrl || awayLogoUrl}
                        className="max-h-full max-w-full object-contain filter drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
                        rounded="rounded-none"
                        bg="bg-transparent"
                      />
                    </div>
                  ) : (
                    <div className="grid size-20 sm:size-24 md:size-28 lg:size-32 place-items-center rounded-full bg-gradient-to-b from-emerald-950 to-slate-950 p-1 ring-2 ring-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <TeamLogo team={awayTeam} className="size-full" rounded="rounded-full" fontSize="text-2xl sm:text-3xl" />
                    </div>
                  )}
                  {awayWinner && (
                    <span className="absolute -top-1.5 end-0 grid size-6 sm:size-7 place-items-center rounded-full bg-amber-400 text-amber-950 shadow ring-1 ring-white/50">
                      <Trophy className="size-3.5 sm:size-4" />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 max-w-[150px] sm:max-w-[190px] md:max-w-[240px] text-sm sm:text-base md:text-lg font-extrabold text-white drop-shadow leading-tight line-clamp-2">
                  {awayTeam?.name || '—'}
                </p>
                {awaySubtitle && (
                  <p className="text-[11px] sm:text-xs font-semibold text-emerald-200/60">
                    {awaySubtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Stadium Badge */}
            {stadiumName && (
              <div className="mt-3 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-bold text-emerald-200/80 backdrop-blur-sm">
                  <MapPin className="size-3 text-emerald-400" />
                  {stadiumName}
                </span>
              </div>
            )}

            {/* Categorized Match Events (Side-by-Side as in Image 2) */}
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 backdrop-blur-md">
              {hasEvents ? (
                <div className="grid grid-cols-2 gap-3 divide-x divide-x-reverse divide-emerald-500/20">
                  {/* Home Team Events */}
                  <div className="space-y-3 px-1 text-start">
                    {homeEvents.goals.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-amber-300">
                          <span className="text-xs">⚽</span>
                          <span>{t('public.matchDetail.goals', isRtl ? 'أهداف' : 'Goals')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {homeEvents.goals.map((g, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-xs leading-tight font-bold"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="shrink-0 text-xs">⚽</span>
                                <span className="shrink-0 font-bold text-white text-xs">{g.name}</span>
                                {g.isOwn && (
                                  <span className="shrink-0 text-[10px] text-rose-400 font-normal">
                                    ({isRtl ? 'عكسي' : 'OG'})
                                  </span>
                                )}
                                {g.isPen && (
                                  <span className="shrink-0 text-[10px] text-amber-300 font-normal">
                                    ({isRtl ? 'ضربة جزاء' : 'Pen'})
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 ms-auto font-mono text-emerald-300 text-xs font-black">
                                {g.minutes.join(', ')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {homeEvents.cards.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-yellow-300">
                          <span className="text-xs">🟨</span>
                          <span>{t('public.matchDetail.cards', isRtl ? 'بطاقات' : 'Cards')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {homeEvents.cards.map((c, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-xs leading-tight font-semibold"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="shrink-0 text-xs">
                                  {c.cardType === 'red_card' ? '🟥' : c.cardType === 'second_yellow' ? '🟨🟥' : '🟨'}
                                </span>
                                <span className="shrink-0 font-bold text-white text-xs">{c.name}</span>
                                {c.reason && c.reason !== c.name && (
                                  <span className="truncate text-[10px] text-white/60">({c.reason})</span>
                                )}
                              </div>
                              <span className="shrink-0 ms-auto font-mono text-white/70 text-xs font-semibold">
                                {c.minute}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {homeEvents.subs.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-sky-300">
                          <span className="text-xs">🔄</span>
                          <span>{t('public.matchDetail.subs', isRtl ? 'تبديلات' : 'Substitutions')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {homeEvents.subs.map((s, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-[11px] leading-tight font-semibold"
                            >
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="shrink-0 text-xs">🔄</span>
                                <span className="shrink-0 font-bold text-emerald-300 text-[11px]">
                                  {s.inName || (isRtl ? 'بديل' : 'Sub')}
                                </span>
                                <span className="shrink-0 text-white/40 text-[10px]">➔</span>
                                <span className="shrink-0 font-semibold text-rose-300/80 text-[11px]">
                                  {s.outName}
                                </span>
                              </div>
                              <span className="shrink-0 ms-auto font-mono text-white/60 text-[10px]">
                                {s.minute}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {homeEvents.others.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-violet-300">
                          <span className="text-xs">📋</span>
                          <span>{t('public.matchDetail.otherEvents', isRtl ? 'أحداث أخرى' : 'Other Events')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {homeEvents.others.map((o, idx) => {
                            const kindLabel = o.eventKind === 'foul' && o.foulKey
                              ? t(`public.matchDetail.events.${o.foulKey}`, isRtl ? (o.defaultAr || 'خطأ بسيط') : (o.defaultEn || 'Simple Foul'))
                              : t(`public.matchDetail.events.${o.eventKind}`, 
                                  o.eventKind === 'injury' ? (isRtl ? 'إصابة' : 'Injury') :
                                  o.eventKind === 'missedPenalty' ? (isRtl ? 'ضربة جزاء ضائعة' : 'Missed Penalty') :
                                  o.eventKind === 'assist' ? (isRtl ? 'صناعة' : 'Assist') :
                                  o.eventKind === 'timeout' ? (isRtl ? 'وقت مستقطع' : 'Timeout') :
                                  o.eventKind === 'var' ? (isRtl ? 'مراجعة VAR' : 'VAR Review') :
                                  (isRtl ? 'حدث' : 'Event')
                                )
                            return (
                              <li
                                key={idx}
                                className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-[11px] leading-tight"
                              >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <span className="shrink-0 text-xs">{o.icon}</span>
                                  <span className="shrink-0 font-bold text-emerald-200/90 text-[11px]">
                                    {kindLabel}:
                                  </span>
                                  {o.name && (
                                    <span className="shrink-0 font-bold text-white text-[11px]">
                                      {o.name}
                                    </span>
                                  )}
                                  {o.detail && o.detail !== o.name && !kindLabel.includes(o.detail) && (
                                    <span className="truncate text-white/60 text-[10px]">({o.detail})</span>
                                  )}
                                </div>
                                {o.minute && (
                                  <span className="shrink-0 ms-auto font-mono text-[10px] text-white/60 font-semibold">
                                    {o.minute}
                                  </span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {homeEvents.goals.length === 0 && homeEvents.cards.length === 0 && homeEvents.subs.length === 0 && homeEvents.others.length === 0 && (
                      <p className="py-2 text-center text-xs font-semibold text-white/30">—</p>
                    )}
                  </div>

                  {/* Away Team Events */}
                  <div className="space-y-3 px-1 text-start">
                    {awayEvents.goals.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-amber-300">
                          <span className="text-xs">⚽</span>
                          <span>{t('public.matchDetail.goals', isRtl ? 'أهداف' : 'Goals')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {awayEvents.goals.map((g, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-xs leading-tight font-bold"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="shrink-0 text-xs">⚽</span>
                                <span className="shrink-0 font-bold text-white text-xs">{g.name}</span>
                                {g.isOwn && (
                                  <span className="shrink-0 text-[10px] text-rose-400 font-normal">
                                    ({isRtl ? 'عكسي' : 'OG'})
                                  </span>
                                )}
                                {g.isPen && (
                                  <span className="shrink-0 text-[10px] text-amber-300 font-normal">
                                    ({isRtl ? 'ضربة جزاء' : 'Pen'})
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 ms-auto font-mono text-emerald-300 text-xs font-black">
                                {g.minutes.join(', ')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {awayEvents.cards.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-yellow-300">
                          <span className="text-xs">🟨</span>
                          <span>{t('public.matchDetail.cards', isRtl ? 'بطاقات' : 'Cards')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {awayEvents.cards.map((c, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-xs leading-tight font-semibold"
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="shrink-0 text-xs">
                                  {c.cardType === 'red_card' ? '🟥' : c.cardType === 'second_yellow' ? '🟨🟥' : '🟨'}
                                </span>
                                <span className="shrink-0 font-bold text-white text-xs">{c.name}</span>
                                {c.reason && c.reason !== c.name && (
                                  <span className="truncate text-[10px] text-white/60">({c.reason})</span>
                                )}
                              </div>
                              <span className="shrink-0 ms-auto font-mono text-white/70 text-xs font-semibold">
                                {c.minute}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {awayEvents.subs.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-sky-300">
                          <span className="text-xs">🔄</span>
                          <span>{t('public.matchDetail.subs', isRtl ? 'تبديلات' : 'Substitutions')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {awayEvents.subs.map((s, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-[11px] leading-tight font-semibold"
                            >
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className="shrink-0 text-xs">🔄</span>
                                <span className="shrink-0 font-bold text-emerald-300 text-[11px]">
                                  {s.inName || (isRtl ? 'بديل' : 'Sub')}
                                </span>
                                <span className="shrink-0 text-white/40 text-[10px]">➔</span>
                                <span className="shrink-0 font-semibold text-rose-300/80 text-[11px]">
                                  {s.outName}
                                </span>
                              </div>
                              <span className="shrink-0 ms-auto font-mono text-white/60 text-[10px]">
                                {s.minute}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {awayEvents.others.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 text-xs font-black whitespace-nowrap text-violet-300">
                          <span className="text-xs">📋</span>
                          <span>{t('public.matchDetail.otherEvents', isRtl ? 'أحداث أخرى' : 'Other Events')}</span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {awayEvents.others.map((o, idx) => {
                            const kindLabel = o.eventKind === 'foul' && o.foulKey
                              ? t(`public.matchDetail.events.${o.foulKey}`, isRtl ? (o.defaultAr || 'خطأ بسيط') : (o.defaultEn || 'Simple Foul'))
                              : t(`public.matchDetail.events.${o.eventKind}`, 
                                  o.eventKind === 'injury' ? (isRtl ? 'إصابة' : 'Injury') :
                                  o.eventKind === 'missedPenalty' ? (isRtl ? 'ضربة جزاء ضائعة' : 'Missed Penalty') :
                                  o.eventKind === 'assist' ? (isRtl ? 'صناعة' : 'Assist') :
                                  o.eventKind === 'timeout' ? (isRtl ? 'وقت مستقطع' : 'Timeout') :
                                  o.eventKind === 'var' ? (isRtl ? 'مراجعة VAR' : 'VAR Review') :
                                  (isRtl ? 'حدث' : 'Event')
                                )
                            return (
                              <li
                                key={idx}
                                className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2 py-1 text-[11px] leading-tight"
                              >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <span className="shrink-0 text-xs">{o.icon}</span>
                                  <span className="shrink-0 font-bold text-emerald-200/90 text-[11px]">
                                    {kindLabel}:
                                  </span>
                                  {o.name && (
                                    <span className="shrink-0 font-bold text-white text-[11px]">
                                      {o.name}
                                    </span>
                                  )}
                                  {o.detail && o.detail !== o.name && !kindLabel.includes(o.detail) && (
                                    <span className="truncate text-white/60 text-[10px]">({o.detail})</span>
                                  )}
                                </div>
                                {o.minute && (
                                  <span className="shrink-0 ms-auto font-mono text-[10px] text-white/60 font-semibold">
                                    {o.minute}
                                  </span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {awayEvents.goals.length === 0 && awayEvents.cards.length === 0 && awayEvents.subs.length === 0 && awayEvents.others.length === 0 && (
                      <p className="py-2 text-center text-xs font-semibold text-white/30">—</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-3 text-center text-xs font-semibold text-emerald-200/50">
                  {t('public.matchDetail.noEvents', 'لا توجد أحداث مسجلة بعد')}
                </p>
              )}
            </div>

            {/* Custom Manager Actions (if any provided) */}
            {managerActions && (
              <div className="mt-4">
                {managerActions}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="no-share-capture mt-5 flex flex-col gap-2.5">
              {/* Share Story Button (Exact Match to Image 2) */}
              <button
                type="button"
                onClick={handleShareStory}
                disabled={sharingStory}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-950/90 via-emerald-900/90 to-emerald-950/90 py-3.5 px-5 text-sm font-black text-white shadow-[0_0_25px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.01] hover:border-emerald-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.99] disabled:opacity-75 disabled:hover:scale-100"
              >
                <div className="grid size-7 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                  {sharingStory ? <Loader2 className="size-4 animate-spin" /> : <FontAwesomeIcon icon={faWhatsapp} className="size-4" />}
                </div>
                <span className="text-sm font-extrabold tracking-wide">
                  {sharingStory
                    ? t('public.matchDetail.sharing', 'جاري تجهيز الصورة…')
                    : t('public.matchDetail.shareStory', 'مشاركة القصة')}
                </span>
                <Share2 className="size-4 text-emerald-300" />
              </button>

              {/* PDF Preview button if PDF generator provided */}
              {isFinished && onPdf && !previewUrl && (
                <button
                  type="button"
                  onClick={onPdf}
                  disabled={pdfBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 px-4 text-xs font-bold text-white/90 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                >
                  {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  <span>{pdfBusy ? t('public.matchDetail.generatingPdf', 'جاري التحضير…') : t('public.matchDetail.previewPdf', 'معاينة تقرير PDF')}</span>
                </button>
              )}
            </div>

            {/* PDF Viewer Frame if previewing */}
            {previewUrl && (
              <div className="no-share-capture mt-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/90 shadow-2xl">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950 px-3 py-2">
                  <p className="text-[11px] font-black text-emerald-300">{t('public.matchDetail.previewTitle', 'معاينة PDF')}</p>
                  <div className="flex items-center gap-1.5">
                    {onDownloadPdf && (
                      <button
                        type="button"
                        onClick={onDownloadPdf}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700"
                      >
                        <Download className="size-3.5" />
                        {t('public.matchDetail.downloadPdf', 'تحميل')}
                      </button>
                    )}
                    {onClosePreview && (
                      <button
                        type="button"
                        onClick={onClosePreview}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80 transition hover:bg-white/20"
                      >
                        <X className="size-3.5" />
                        {t('public.matchDetail.closePreview', 'إغلاق')}
                      </button>
                    )}
                  </div>
                </div>
                <iframe
                  title={t('public.matchDetail.previewTitle', 'معاينة PDF')}
                  src={previewUrl}
                  className="h-[360px] w-full bg-white"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
