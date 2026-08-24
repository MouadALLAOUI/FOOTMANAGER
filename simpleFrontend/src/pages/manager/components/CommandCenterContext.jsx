import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { queryClient } from '../../../api/queryClient'
import {
  invalidateManager,
  q,
  useChallenges,
  useLeaderboard,
  useManagerBookings,
  useManagerPlayers,
  useMatchFeed,
  useMatchRequests,
  useNotifications,
  useRecruitment,
  useStadiums,
  useTeamProfile,
} from '../../../api/queries'
import { isSameDay } from './shared'

const Ctx = createContext(null)

export function CommandCenterProvider({ children }) {
  const { toast } = useToast()
  const { user } = useAuth()

  const teamQ = useTeamProfile()
  const requestsQ = useMatchRequests({ status: 'all' })
  const bookingsQ = useManagerBookings({ filter: 'all' })
  const playersQ = useManagerPlayers()
  const notifQ = useNotifications({ filter: 'unread' })
  const chalQ = useChallenges()
  const marketQ = useMatchFeed({ per_page: 8 })
  const recruitQ = useRecruitment({ per_page: 5 })
  const boardQ = useLeaderboard({ per_page: 100 })
  const stadiumQ = useStadiums({ per_page: 100 })

  const team = teamQ.data?.team ?? null
  const requests = requestsQ.data?.match_requests || []
  const bookings = bookingsQ.data?.bookings || []
  const players = playersQ.data?.players || []
  const notifs = notifQ.data?.notifications || []
  const unread = notifQ.data?.unread_count || 0
  const challenges = chalQ.data?.challenges || []
  const market = marketQ.data?.matches || []
  const recruits = recruitQ.data?.players || []
  const board = boardQ.data?.data || []
  const stadiums = stadiumQ.data?.data || []
  const cities = stadiumQ.data?.meta?.filters?.cities || []

  const loadingBy = {
    team: teamQ.isLoading,
    requests: requestsQ.isLoading,
    bookings: bookingsQ.isLoading,
    players: playersQ.isLoading,
    notifs: notifQ.isLoading,
    challenges: chalQ.isLoading,
    market: marketQ.isLoading,
    recruits: recruitQ.isLoading,
    board: boardQ.isLoading,
    stadiums: stadiumQ.isLoading,
  }

  const loading =
    loadingBy.team ||
    loadingBy.requests ||
    loadingBy.bookings ||
    loadingBy.players ||
    loadingBy.notifs ||
    loadingBy.challenges

  const reload = useCallback(() => invalidateManager(), [])

  const [match, setMatch] = useState(null)
  const [booking, setBooking] = useState(null)
  const [player, setPlayer] = useState(null)
  const [teamRow, setTeamRow] = useState(null)
  const [joinMatch, setJoinMatch] = useState(null)
  const [bookTerrain, setBookTerrain] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [invite, setInvite] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [apps, setApps] = useState([])

  const myTeamId = team?.id || user?.team?.id

  const upcoming = useMemo(
    () =>
      requests
        .filter((m) => m.status === 'accepted' && m.match_datetime && new Date(m.match_datetime).getTime() >= Date.now())
        .sort((a, b) => new Date(a.match_datetime) - new Date(b.match_datetime)),
    [requests],
  )

  const hosted = useMemo(
    () => requests.filter((m) => m.status === 'open' && m.host_team_id === myTeamId),
    [requests, myTeamId],
  )

  const hostedKey = useMemo(() => hosted.slice(0, 2).map((m) => m.id).join('|'), [hosted])

  useEffect(() => {
    if (!hostedKey) {
      setApps((prev) => (prev.length ? [] : prev))
      return
    }
    let alive = true
    const ids = hostedKey
      .split('|')
      .map(Number)
      .filter(Boolean)
    Promise.all(
      ids.map((id) =>
        queryClient.fetchQuery({
          queryKey: q.applicants(id),
          queryFn: () => api.get(`/manager/matches/${id}/applicants`).then((r) => r.data),
          staleTime: 60 * 1000,
        }),
      ),
    )
      .then((res) => {
        if (!alive) return
        const next = res.flatMap((x) => x.applications || []).filter((a) => a.status === 'pending' && a.type === 'apply')
        setApps((prev) => (prev.length === next.length && prev.every((a, i) => a.id === next[i]?.id) ? prev : next))
      })
      .catch(() => alive && setApps((prev) => (prev.length ? [] : prev)))
    return () => {
      alive = false
    }
  }, [hostedKey])

  const rank = useMemo(() => {
    const idx = board.findIndex((t) => t.id === myTeamId)
    return idx >= 0 ? idx + 1 : null
  }, [board, myTeamId])

  const todayMatches = useMemo(() => upcoming.filter((m) => isSameDay(m.match_datetime)), [upcoming])
  const todayBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          isSameDay(b.booking_date ? `${b.booking_date}T00:00:00` : null) ||
          isSameDay(b.next_date ? `${b.next_date}T00:00:00` : null),
      ),
    [bookings],
  )

  const upcomingBookings = useMemo(() => {
    const now = new Date()
    return bookings.filter((b) => {
      if (b.status !== 'approved' && b.status !== 'confirmed') return false
      const base = b.booking_date ? new Date(`${b.booking_date}T00:00:00`) : b.next_date ? new Date(`${b.next_date}T00:00:00`) : null
      if (!base) return true
      if (base.getTime() > now.getTime()) return true
      if (b.next_date) {
        const next = new Date(`${b.next_date}T00:00:00`)
        return next.getTime() >= now.getTime()
      }
      return false
    })
  }, [bookings])

  const data = useMemo(
    () => ({
      team,
      requests,
      bookings,
      players,
      notifs,
      unread,
      challenges,
      market,
      recruits,
      board,
      stadiums,
      cities,
    }),
    [team, requests, bookings, players, notifs, unread, challenges, market, recruits, board, stadiums, cities],
  )

  const value = {
    toast,
    user,
    data,
    loading,
    loadingBy,
    reload,
    team,
    myTeamId,
    requests,
    bookings,
    upcoming,
    nextMatch: upcoming[0],
    hosted,
    apps,
    rank,
    todayMatches,
    todayBookings,
    upcomingBookings,
    cities,
    stadiums,
    notifs,
    unread,
    challenges,
    market,
    recruits,
    board,
    players,
    match,
    booking,
    player,
    teamRow,
    joinMatch,
    bookTerrain,
    createOpen,
    invite,
    notifOpen,
    setMatch,
    setBooking,
    setPlayer,
    setTeamRow,
    setJoinMatch,
    setBookTerrain,
    setCreateOpen,
    setInvite,
    setNotifOpen,
    searchOpen,
    setSearchOpen,
    openMatch: setMatch,
    openBooking: setBooking,
    openPlayer: setPlayer,
    openTeam: setTeamRow,
    openJoin: setJoinMatch,
    openBook: setBookTerrain,
    openCreate: () => setCreateOpen(true),
    openInvite: setInvite,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCommandCenter() {
  return useContext(Ctx)
}
