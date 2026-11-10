import { useEffect, useState } from 'react'
import api from '../../../api/client'
import { LIVE_STATUSES } from '../../../data/fixtures'
import { extractOrderedGroupsFromFixtures, getGroupColor, sortOrderedGroups } from '../../../lib/groupColors'
import { syncTournamentGroupNames } from '../../../lib/groupNames'

const FINISHED_STATUSES = new Set(['finished', 'completed', 'played'])
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'abandoned', 'void'])
const POSTPONED_STATUSES = new Set(['postponed'])
const ALL_LIVE_STATUSES = new Set([
  ...LIVE_STATUSES,
  'live',
  'in_progress',
])

export function parseDateSafe(raw) {
  if (!raw) return null
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  const normalized = String(raw).trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/, '$1T$2')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

function timestampOf(raw) {
  const d = parseDateSafe(raw)
  return d ? d.getTime() : 0
}

export function normalizeTeamRef(t) {
  if (!t || typeof t !== 'object') return null
  const inner = t.team && typeof t.team === 'object' ? t.team : t
  const id = inner.id ?? t.team_id ?? null
  const name = inner.name ?? t.team_name ?? null
  const logoUrl = inner.logo_url ?? inner.logo_thumbnail_url ?? inner.logo_path ?? inner.image_url ?? t.logo_url ?? null
  return {
    ...inner,
    id: id != null ? Number(id) : null,
    name: name || null,
    logo_url: logoUrl,
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let nextIdx = 0
  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx
      nextIdx += 1
      results[idx] = await fn(items[idx], idx)
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function fetchAllPaginated(url, baseParams = {}) {
  const firstRes = await api
    .get(url, { params: { per_page: 100, page: 1, ...baseParams } })
    .catch(() => null)
  if (!firstRes?.data) return []
  const items = Array.isArray(firstRes.data.data) ? [...firstRes.data.data] : []
  const lastPage = Number(firstRes.data.meta?.last_page || 1)
  if (lastPage > 1) {
    const pages = Array.from({ length: Math.min(lastPage - 1, 9) }, (_, i) => i + 2)
    const rest = await mapWithConcurrency(pages, 2, (page) =>
      api
        .get(url, { params: { per_page: 100, page, ...baseParams } })
        .then((r) => (Array.isArray(r.data?.data) ? r.data.data : []))
        .catch(() => []),
    )
    for (const chunk of rest) items.push(...chunk)
  }
  return items
}

function classifyMatchStatus(rawStatus) {
  const st = String(rawStatus || 'scheduled').toLowerCase().trim()
  if (ALL_LIVE_STATUSES.has(st)) return 'live'
  if (FINISHED_STATUSES.has(st)) return 'finished'
  if (CANCELLED_STATUSES.has(st)) return 'cancelled'
  if (POSTPONED_STATUSES.has(st)) return 'postponed'
  return 'scheduled'
}

function resolveOutcomeForTeam({ statusCategory, isHome, homeScore, awayScore, homePen, awayPen, winnerTeamId, teamId }) {
  if (statusCategory !== 'finished') return null
  if (winnerTeamId != null) {
    return Number(winnerTeamId) === Number(teamId) ? 'W' : 'L'
  }
  if (homeScore != null && awayScore != null) {
    const myGoals = isHome ? Number(homeScore) : Number(awayScore)
    const oppGoals = isHome ? Number(awayScore) : Number(homeScore)
    if (myGoals > oppGoals) return 'W'
    if (myGoals < oppGoals) return 'L'
    if (homePen != null && awayPen != null && Number(homePen) !== Number(awayPen)) {
      const myPen = isHome ? Number(homePen) : Number(awayPen)
      const oppPen = isHome ? Number(awayPen) : Number(homePen)
      return myPen > oppPen ? 'W' : 'L'
    }
    return 'D'
  }
  return null
}

function normalizeFixtureMatch({ fixture, tour, teamId, orderedGroups }) {
  const rawStatus = fixture.match?.status || fixture.status || 'scheduled'
  const statusCategory = classifyMatchStatus(rawStatus)
  const homeTeam = normalizeTeamRef(fixture.home_team)
  const awayTeam = normalizeTeamRef(fixture.away_team)
  const isHome = Number(homeTeam?.id) === Number(teamId)
  const homeScore = fixture.match?.home_score ?? fixture.home_score ?? null
  const awayScore = fixture.match?.away_score ?? fixture.away_score ?? null
  const homePen = fixture.match?.home_penalties ?? fixture.home_penalties ?? null
  const awayPen = fixture.match?.away_penalties ?? fixture.away_penalties ?? null
  const winnerTeamId = fixture.match?.winner_team_id ?? fixture.winner_team_id ?? null
  const notes = fixture.match?.notes || ''
  const isDefaultResult = Boolean(fixture.is_default_result || String(notes).includes('[default_result'))

  const scheduledAt =
    fixture.scheduled_at ||
    fixture.match?.started_at ||
    fixture.match?.kicked_off_at ||
    fixture.match?.ended_at ||
    null

  const groupColor = fixture.group ? getGroupColor(fixture.group, orderedGroups) : null

  return {
    uid: (fixture.match?.id ?? fixture.match_id) ? `match:${fixture.match?.id ?? fixture.match_id}` : `fix:${tour.id}:${fixture.id}`,
    source: 'tournament',
    matchId: fixture.match?.id ?? fixture.match_id ?? null,
    fixtureId: fixture.id,
    fixture,
    tournamentKey: tour.slug || String(tour.id),
    tournamentId: tour.id,
    tournamentName: tour.name,
    tournamentLogoUrl: tour.logo_url,
    roundName: fixture.round?.name || null,
    roundStage: fixture.round?.stage || null,
    group: fixture.group || null,
    groupColor,
    homeTeam,
    awayTeam,
    isHome,
    myTeam: isHome ? homeTeam : awayTeam,
    opponent: isHome ? awayTeam : homeTeam,
    statusRaw: rawStatus,
    statusCategory,
    homeScore,
    awayScore,
    homePen,
    awayPen,
    winnerTeamId,
    outcome: resolveOutcomeForTeam({
      statusCategory,
      isHome,
      homeScore,
      awayScore,
      homePen,
      awayPen,
      winnerTeamId,
      teamId,
    }),
    isDefaultResult,
    defaultResultNote: isDefaultResult ? notes.replace(/\[default_result:[^\]]+\]\s*/g, '').trim() : null,
    stadiumName: fixture.stadium?.name || null,
    stadiumCity: fixture.stadium?.city || null,
    scheduledAt,
    timestamp: timestampOf(scheduledAt),
    publicToken: fixture.public_token || fixture.match?.public_token || null,
    inviteToken: null,
  }
}

function normalizePageMatch(m, teamId) {
  const statusCategory = classifyMatchStatus(m.status)
  const homeTeam = normalizeTeamRef(m.home_team) || {
    id: m.home_team_id != null ? Number(m.home_team_id) : null,
    name: null,
    logo_url: null,
  }
  const awayTeam = normalizeTeamRef(m.away_team) || {
    id: m.away_team_id != null ? Number(m.away_team_id) : null,
    name: null,
    logo_url: null,
  }
  const isHome = Number(homeTeam.id) === Number(teamId)
  const homeScore = m.home_score ?? null
  const awayScore = m.away_score ?? null
  const homePen = m.home_penalties ?? null
  const awayPen = m.away_penalties ?? null
  const winnerTeamId = m.winner_team_id ?? null
  const notes = m.notes || ''
  const isDefaultResult = String(notes).includes('[default_result')

  const scheduledAt = m.started_at || m.kicked_off_at || m.ended_at || m.created_at || null

  return {
    uid: m.id != null ? `match:${m.id}` : `page:${scheduledAt}:${homeTeam.id}-${awayTeam.id}`,
    source: m.competition_id ? 'tournament_match' : 'friendly_match',
    matchId: m.id ?? null,
    fixtureId: null,
    fixture: null,
    tournamentKey: null,
    tournamentId: m.competition_id || null,
    tournamentName: m.competition?.name || (m.competition_id ? 'مباراة بطولة' : 'مباراة مسجلة'),
    tournamentLogoUrl: null,
    roundName: m.round?.name || null,
    roundStage: m.round?.stage || null,
    group: null,
    groupColor: null,
    homeTeam,
    awayTeam,
    isHome,
    myTeam: isHome ? homeTeam : awayTeam,
    opponent: isHome ? awayTeam : homeTeam,
    statusRaw: m.status,
    statusCategory,
    homeScore,
    awayScore,
    homePen,
    awayPen,
    winnerTeamId,
    outcome: resolveOutcomeForTeam({
      statusCategory,
      isHome,
      homeScore,
      awayScore,
      homePen,
      awayPen,
      winnerTeamId,
      teamId,
    }),
    isDefaultResult,
    defaultResultNote: isDefaultResult ? notes.replace(/\[default_result:[^\]]+\]\s*/g, '').trim() : null,
    stadiumName: m.stadium?.name || null,
    stadiumCity: m.stadium?.city || null,
    scheduledAt,
    timestamp: timestampOf(scheduledAt),
    publicToken: m.public_token || null,
    inviteToken: null,
  }
}

function normalizeFriendlyRequest(req, teamId) {
  const host = normalizeTeamRef(req.host_team)
  const opp = normalizeTeamRef(req.opponent_team)
  const isHome = Number(host?.id) === Number(teamId)
  const rawStatus = req.status || 'open'
  const statusCategory = classifyMatchStatus(
    rawStatus === 'open' || rawStatus === 'accepted' || rawStatus === 'pending' ? 'scheduled' : rawStatus,
  )

  return {
    uid: `req:${req.id}`,
    source: 'friendly_challenge',
    matchId: req.football_match_id || null,
    fixtureId: null,
    fixture: null,
    tournamentKey: null,
    tournamentId: null,
    tournamentName: rawStatus === 'open' ? 'تحدي مباراة ودية' : 'مباراة ودية',
    tournamentLogoUrl: null,
    roundName: req.player_format || req.stadium?.player_format || null,
    roundStage: null,
    group: null,
    groupColor: null,
    homeTeam: host,
    awayTeam: opp || (req.is_guest ? { id: null, name: req.guest_team_name || 'فريق ضيف', logo_url: null } : null),
    isHome,
    myTeam: isHome ? host : opp,
    opponent: isHome ? opp : host,
    statusRaw: rawStatus,
    statusCategory,
    homeScore: req.home_score ?? null,
    awayScore: req.away_score ?? null,
    homePen: null,
    awayPen: null,
    winnerTeamId: null,
    outcome: null,
    isDefaultResult: false,
    defaultResultNote: null,
    stadiumName: req.stadium?.name || req.custom_terrain_name || null,
    stadiumCity: req.stadium?.city || null,
    scheduledAt: req.match_datetime || null,
    timestamp: timestampOf(req.match_datetime),
    publicToken: null,
    inviteToken: req.invite_token || null,
  }
}

export function useTeamFullData(id) {
  const [state, setState] = useState({
    loading: true,
    notFound: false,
    isPrivate: false,
    error: null,
    team: null,
    stats: null,
    squad: [],
    matches: {
      all: [],
      recent: [],
      upcoming: [],
      live: [],
    },
    tournaments: [],
    weeklyBookings: [],
    announcements: [],
    gallery: [],
    form: [],
  })

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false

    setState((prev) => ({
      ...prev,
      loading: true,
      notFound: false,
      error: null,
    }))

    async function load() {
      const encodedId = encodeURIComponent(id)

      const [profileOutcome, pageOutcome, allTournaments, openMatches, liveFriendlyMatches] = await Promise.all([
        api
          .get(`/v1/teams/${encodedId}/profile`)
          .then((r) => ({ ok: true, data: r.data }))
          .catch((err) => ({ ok: false, err })),
        api
          .get(`/v1/teams/${encodedId}/page`)
          .then((r) => ({ ok: true, data: r.data?.data || r.data }))
          .catch((err) => ({ ok: false, err })),
        fetchAllPaginated('/v1/tournaments'),
        fetchAllPaginated('/v1/matches'),
        api
          .get('/v1/live-matches')
          .then((r) => (Array.isArray(r.data?.data) ? r.data.data : []))
          .catch(() => []),
      ])

      if (cancelled) return

      const profileTeam = profileOutcome.ok ? profileOutcome.data?.team : null
      const pageData = pageOutcome.ok ? pageOutcome.data : null
      const pageTeam = pageData?.team || null

      const profileStatus = profileOutcome.err?.response?.status
      const pageStatus = pageOutcome.err?.response?.status

      if (!profileTeam && !pageTeam) {
        if (profileStatus === 404 || !profileOutcome.ok) {
          setState({
            loading: false,
            notFound: true,
            isPrivate: false,
            error: null,
            team: null,
            stats: null,
            squad: [],
            matches: { all: [], recent: [], upcoming: [], live: [] },
            tournaments: [],
            weeklyBookings: [],
            announcements: [],
            gallery: [],
            form: [],
          })
          return
        }
      }

      const teamId = Number(profileTeam?.id ?? pageTeam?.id ?? id)
      if (!Number.isFinite(teamId)) {
        setState((prev) => ({ ...prev, loading: false, notFound: true }))
        return
      }

      // Check tournament registrations across public tournaments
      const teamsPerTournament = await mapWithConcurrency(allTournaments, 3, async (tour) => {
        const key = tour.slug || tour.id
        const res = await api
          .get(`/v1/tournaments/${encodeURIComponent(key)}/teams`)
          .then((r) => (Array.isArray(r.data?.data) ? r.data.data : []))
          .catch(() => [])
        const participant = res.find((p) => Number(p.team_id ?? p.team?.id) === teamId) || null
        return { tour, participant, allParticipants: res }
      })

      if (cancelled) return

      const participations = teamsPerTournament.filter((item) => item.participant !== null)

      // Fetch rich details ONLY for tournaments this team participates in
      const enrichedTournaments = await mapWithConcurrency(participations, 3, async ({ tour, participant, allParticipants }) => {
        const key = encodeURIComponent(tour.slug || tour.id)
        const [standings, fixtures, statistics, bracket] = await Promise.all([
          api.get(`/v1/tournaments/${key}/standings`).then((r) => r.data?.data || null).catch(() => null),
          api.get(`/v1/tournaments/${key}/fixtures`).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => []),
          api.get(`/v1/tournaments/${key}/statistics`).then((r) => r.data?.data || null).catch(() => null),
          api.get(`/v1/tournaments/${key}/bracket`).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => []),
        ])
        const tourDetail = await api.get(`/v1/tournaments/${key}`).then((r) => r.data?.data || null).catch(() => null)
        syncTournamentGroupNames(tourDetail || tour)
        return { tour, participant, allParticipants, standings, fixtures, statistics, bracket }
      })

      if (cancelled) return

      const pageStats = pageData?.stats || null
      const hasOverallStats = profileTeam?.matches_played != null || pageStats?.matches_played != null
      const pageForbidden = pageStatus === 403
      const isPrivate =
        Boolean((profileTeam?.visibility && profileTeam.visibility !== 'public') || pageForbidden) && !hasOverallStats

      // Build manager object (prefer structured object from /profile over plain string from /page)
      const firstTourParticipantTeam = participations[0]?.participant?.team || null
      const managerObj =
        profileTeam?.manager && typeof profileTeam.manager === 'object'
          ? profileTeam.manager
          : pageTeam?.manager && typeof pageTeam.manager === 'object'
            ? pageTeam.manager
            : typeof pageTeam?.manager === 'string' && pageTeam.manager.trim()
              ? { id: null, name: pageTeam.manager.trim(), avatar_url: null, city: null }
              : firstTourParticipantTeam?.manager_name
                ? { id: null, name: firstTourParticipantTeam.manager_name, avatar_url: null, city: null }
                : null

      const mergedTeam = {
        id: teamId,
        name: profileTeam?.name || pageTeam?.name || firstTourParticipantTeam?.name || 'فريق رياضي',
        city: profileTeam?.city || pageTeam?.city || firstTourParticipantTeam?.city || null,
        region: pageTeam?.region || profileTeam?.region || null,
        category: profileTeam?.category || pageTeam?.category || firstTourParticipantTeam?.category || null,
        level: profileTeam?.level || pageTeam?.level || firstTourParticipantTeam?.level || null,
        founded_year: profileTeam?.founded_year || pageTeam?.founded_year || null,
        association_name: profileTeam?.association_name || null,
        description: profileTeam?.description || pageTeam?.description || null,
        logo_url:
          profileTeam?.logo_thumbnail_url ||
          profileTeam?.logo_url ||
          pageTeam?.logo_url ||
          firstTourParticipantTeam?.logo_url ||
          null,
        cover_image_url: profileTeam?.cover_image_url || pageTeam?.cover_image_url || null,
        primary_color: profileTeam?.primary_color || pageTeam?.primary_color || null,
        secondary_color: profileTeam?.secondary_color || pageTeam?.secondary_color || null,
        member_count: profileTeam?.member_count ?? null,
        players_count:
          profileTeam?.players_count ??
          (Array.isArray(pageData?.squad) ? pageData.squad.length : null) ??
          firstTourParticipantTeam?.players_count ??
          null,
        max_squad_size: profileTeam?.max_squad_size ?? null,
        followers_count: pageStats?.followers_count ?? null,
        primary_stadium: pageTeam?.primary_stadium || null,
        captain: pageTeam?.captain || null,
        manager: managerObj,
        created_at: profileTeam?.created_at || null,
        visibility: profileTeam?.visibility || (pageForbidden ? 'private' : 'public'),
      }

      const squad = (Array.isArray(pageData?.squad) ? pageData.squad : []).map((p) => ({
        ...p,
        avatar_url: p.photo_thumbnail_url || p.photo_url || p.user?.avatar_url || null,
        is_captain: mergedTeam.captain?.id != null && Number(mergedTeam.captain.id) === Number(p.id),
      }))

      // Build tournament history + collect tournament matches
      const matchMap = new Map()
      const tournamentHistory = []
      const fallbackForms = []

      for (const item of enrichedTournaments) {
        const { tour, participant, allParticipants, standings, fixtures, statistics, bracket } = item

        const orderedGroups = sortOrderedGroups([
          ...extractOrderedGroupsFromFixtures(fixtures, allParticipants),
          ...((standings?.groups || []).map((g) => ({ id: g.group_id ?? g.id, name: g.name }))),
        ])

        // Filter fixtures for this team
        const teamFixtures = (fixtures || []).filter(
          (f) => Number(f.home_team?.id) === teamId || Number(f.away_team?.id) === teamId,
        )

        for (const f of teamFixtures) {
          const nm = normalizeFixtureMatch({ fixture: f, tour, teamId, orderedGroups })
          const dedupKey = nm.matchId != null ? `m:${nm.matchId}` : nm.uid
          if (!matchMap.has(dedupKey)) {
            matchMap.set(dedupKey, nm)
          }
        }

        // Group info & standing row
        let standingRow = null
        let standingGroup = null
        let standingRank = null
        for (const grp of standings?.groups || []) {
          const rows = grp.rows || []
          const idx = rows.findIndex((r) => Number(r.team_id ?? r.team?.id) === teamId)
          if (idx >= 0) {
            standingRow = rows[idx]
            standingGroup = grp
            standingRank = idx + 1
            break
          }
        }

        if (Array.isArray(standingRow?.form) && standingRow.form.length > 0) {
          fallbackForms.push(...standingRow.form)
        }

        const groupId = participant.group?.id ?? standingGroup?.group_id ?? null
        const groupName = participant.group?.name ?? standingGroup?.name ?? null
        const groupColor =
          groupId != null || groupName
            ? getGroupColor({ id: groupId, name: groupName }, orderedGroups)
            : null

        // Determine knockout stage reached
        const knockoutEntries = []
        for (const round of bracket || []) {
          for (const bf of round.fixtures || []) {
            if (Number(bf.home_team_id ?? bf.home_team?.id) === teamId || Number(bf.away_team_id ?? bf.away_team?.id) === teamId) {
              knockoutEntries.push({
                roundName: round.name,
                stage: round.stage,
                order: round.order_index ?? 0,
                fixture: bf,
              })
            }
          }
        }
        knockoutEntries.sort((a, b) => (b.order || 0) - (a.order || 0))
        const highestKnockout = knockoutEntries[0] || null

        // Strictly settled titles & runner-up checks (NEVER invent from unfinished tables)
        const isSettled = Boolean(tour.has_settled_result) || tour.status === 'completed'
        const finalRound = (bracket || []).find(
          (r) =>
            r.stage === 'final' ||
            r.round_type === 'final' ||
            (r.name && r.name.includes('النهائي') && !r.name.includes('نصف') && !r.name.includes('ربع')),
        )
        const finalFix = finalRound?.fixtures?.find((bf) => bf.status === 'finished' && bf.winner_team_id != null) || null
        const finalWinnerId = finalFix ? Number(finalFix.winner_team_id) : null
        const finalLoserId = finalFix
          ? Number(finalFix.home_team_id ?? finalFix.home_team?.id) === finalWinnerId
            ? Number(finalFix.away_team_id ?? finalFix.away_team?.id)
            : Number(finalFix.home_team_id ?? finalFix.home_team?.id)
          : null

        const rawChampId =
          statistics?.champion_team_id ?? statistics?.champion?.team_id ?? statistics?.champion?.id ?? null
        const championTeamId = isSettled ? (rawChampId != null ? Number(rawChampId) : finalWinnerId) : null

        const leagueSecondId =
          isSettled && championTeamId && tour.tournament_format === 'league'
            ? Number(standings?.groups?.[0]?.rows?.[1]?.team_id ?? standings?.groups?.[0]?.rows?.[1]?.team?.id ?? 0) || null
            : null
        const runnerUpTeamId = isSettled && championTeamId ? (finalLoserId || leagueSecondId) : null

        const isChampion = Boolean(championTeamId && Number(championTeamId) === teamId)
        const isRunnerUp = !isChampion && Boolean(runnerUpTeamId && Number(runnerUpTeamId) === teamId)

        const tourFinishedCount = teamFixtures.filter(
          (f) => classifyMatchStatus(f.match?.status || f.status) === 'finished',
        ).length

        const hasMeaningfulRank = Boolean(
          standingRow && ((standingRow.played ?? 0) > 0 || isSettled) && standingRank != null,
        )

        tournamentHistory.push({
          id: tour.id,
          slug: tour.slug || String(tour.id),
          name: tour.name,
          logoUrl: tour.logo_url,
          coverUrl: tour.cover_url || tour.banner_url,
          format: tour.tournament_format,
          status: tour.status,
          hasSettledResult: Boolean(tour.has_settled_result),
          isSettled,
          startDate: tour.start_date,
          endDate: tour.end_date,
          location: tour.location,
          organizerName: tour.organizer?.name || null,
          participantStatus: participant.status || 'registered',
          group: groupId != null || groupName ? { id: groupId, name: groupName } : null,
          groupColor,
          standing: standingRow
            ? {
                rank: hasMeaningfulRank ? standingRank : null,
                played: standingRow.played ?? 0,
                wins: standingRow.wins ?? 0,
                draws: standingRow.draws ?? 0,
                losses: standingRow.losses ?? 0,
                goalsFor: standingRow.goals_for ?? 0,
                goalsAgainst: standingRow.goals_against ?? 0,
                goalDifference: standingRow.goal_difference ?? 0,
                points: standingRow.points ?? 0,
                form: Array.isArray(standingRow.form) ? standingRow.form : [],
              }
            : null,
          highestKnockout,
          isChampion,
          isRunnerUp,
          matchesCount: teamFixtures.length,
          finishedMatchesCount: tourFinishedCount,
        })
      }

      // Merge /page recent & upcoming FootballMatches without duplicating tournament fixtures
      for (const m of [...(pageData?.recent_matches || []), ...(pageData?.upcoming_matches || [])]) {
        const dedupKey = m.id != null ? `m:${m.id}` : null
        if (dedupKey && matchMap.has(dedupKey)) {
          // Enrich tournament fixture with notes / public_token if missing
          const existing = matchMap.get(dedupKey)
          if (!existing.publicToken && m.public_token) existing.publicToken = m.public_token
          if (!existing.defaultResultNote && String(m.notes || '').includes('[default_result')) {
            existing.isDefaultResult = true
            existing.defaultResultNote = String(m.notes).replace(/\[default_result:[^\]]+\]\s*/g, '').trim()
          }
          continue
        }
        const nm = normalizePageMatch(m, teamId)
        matchMap.set(dedupKey || nm.uid, nm)
      }

      // Merge open friendly challenges & live friendly matches involving this team
      for (const req of openMatches) {
        if (Number(req.host_team?.id) !== teamId && Number(req.opponent_team?.id) !== teamId) continue
        const dedupKey = req.football_match_id ? `m:${req.football_match_id}` : `req:${req.id}`
        if (matchMap.has(dedupKey)) continue
        matchMap.set(dedupKey, normalizeFriendlyRequest(req, teamId))
      }
      for (const lm of liveFriendlyMatches) {
        const hId = Number(lm.host_team?.id ?? lm.home_team?.id)
        const aId = Number(lm.opponent_team?.id ?? lm.away_team?.id)
        if (hId !== teamId && aId !== teamId) continue
        const dedupKey = lm.football_match_id ? `m:${lm.football_match_id}` : `live:${lm.id}`
        if (matchMap.has(dedupKey)) continue
        matchMap.set(dedupKey, normalizeFriendlyRequest({ ...lm, status: 'live' }, teamId))
      }

      const allMatches = [...matchMap.values()]
      const liveMatches = allMatches
        .filter((m) => m.statusCategory === 'live')
        .sort((a, b) => a.timestamp - b.timestamp)

      const recentMatches = allMatches
        .filter((m) => m.statusCategory === 'finished')
        .sort((a, b) => b.timestamp - a.timestamp)

      const upcomingMatches = allMatches
        .filter((m) => m.statusCategory === 'scheduled' || m.statusCategory === 'postponed')
        .sort((a, b) => {
          if (!a.timestamp && !b.timestamp) return 0
          if (!a.timestamp) return 1
          if (!b.timestamp) return -1
          return a.timestamp - b.timestamp
        })

      // Overall Statistics: NEVER double-count, NEVER include cancelled/postponed/scheduled
      const tournamentsCount = tournamentHistory.length
      const titlesWon = tournamentHistory.filter((t) => t.isChampion).length

      let statsPayload
      if (isPrivate) {
        statsPayload = {
          isPrivate: true,
          matchesPlayed: null,
          wins: null,
          draws: null,
          losses: null,
          goalsFor: null,
          goalsAgainst: null,
          goalDifference: null,
          winPercentage: null,
          points: null,
          tournamentsCount,
          titlesWon,
          recordedFinishedCount: recentMatches.length,
        }
      } else if (hasOverallStats) {
        const matchesPlayed = Number(profileTeam?.matches_played ?? pageStats?.matches_played ?? 0)
        const wins = Number(profileTeam?.wins ?? pageStats?.wins ?? 0)
        const draws = Number(profileTeam?.draws ?? pageStats?.draws ?? 0)
        const losses = Number(profileTeam?.losses ?? pageStats?.losses ?? 0)
        const goalsFor = Number(profileTeam?.goals_for ?? pageStats?.goals_for ?? 0)
        const goalsAgainst = Number(profileTeam?.goals_against ?? pageStats?.goals_against ?? 0)
        const goalDifference =
          profileTeam?.goal_difference ?? pageStats?.goal_difference ?? goalsFor - goalsAgainst
        const points = profileTeam?.points ?? pageStats?.points ?? wins * 3 + draws
        const winPercentage =
          matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 1000) / 10 : 0

        statsPayload = {
          isPrivate: false,
          matchesPlayed,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDifference,
          winPercentage,
          points,
          tournamentsCount,
          titlesWon,
          recordedFinishedCount: recentMatches.length,
        }
      } else {
        // Compute strictly from verified finished matches (excluding cancelled/postponed/scheduled)
        let wins = 0
        let draws = 0
        let losses = 0
        let goalsFor = 0
        let goalsAgainst = 0
        for (const m of recentMatches) {
          if (m.outcome === 'W') wins += 1
          else if (m.outcome === 'D') draws += 1
          else if (m.outcome === 'L') losses += 1
          if (m.homeScore != null && m.awayScore != null) {
            goalsFor += m.isHome ? Number(m.homeScore) : Number(m.awayScore)
            goalsAgainst += m.isHome ? Number(m.awayScore) : Number(m.homeScore)
          }
        }
        const matchesPlayed = recentMatches.length
        const goalDifference = goalsFor - goalsAgainst
        const winPercentage =
          matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 1000) / 10 : 0

        statsPayload = {
          isPrivate: false,
          matchesPlayed,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDifference,
          winPercentage,
          points: wins * 3 + draws,
          tournamentsCount,
          titlesWon,
          recordedFinishedCount: recentMatches.length,
        }
      }

      // Derive recent form (last 5 finished matches oldest -> newest, or standings form fallback)
      const finishedOutcomes = recentMatches
        .slice(0, 5)
        .reverse()
        .map((m) => m.outcome)
        .filter(Boolean)
      const recentForm = finishedOutcomes.length > 0 ? finishedOutcomes : fallbackForms.slice(-5)

      setState({
        loading: false,
        notFound: false,
        isPrivate,
        error: null,
        team: mergedTeam,
        stats: statsPayload,
        squad,
        matches: {
          all: [...liveMatches, ...recentMatches, ...upcomingMatches],
          recent: recentMatches,
          upcoming: upcomingMatches,
          live: liveMatches,
        },
        tournaments: tournamentHistory,
        weeklyBookings: Array.isArray(profileTeam?.weekly_bookings) ? profileTeam.weekly_bookings : [],
        announcements: Array.isArray(pageData?.announcements) ? pageData.announcements : [],
        gallery: Array.isArray(pageData?.gallery) ? pageData.gallery : [],
        form: recentForm,
      })
    }

    load().catch((err) => {
      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err?.message || 'تعذر تحميل بيانات الفريق',
        }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [id])

  return state
}
