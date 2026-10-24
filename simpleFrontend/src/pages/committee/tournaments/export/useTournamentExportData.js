import { useCallback, useEffect, useState } from 'react'
import api from '../../../../api/client'

export function useTournamentExportData(tournamentId) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => setAttempt((v) => v + 1), [])

  useEffect(() => {
    if (!tournamentId) return undefined
    let cancelled = false
    setState({ data: null, loading: true, error: '' })

    const load = async () => {
      try {
        const [detailRes, teamsRes, fixturesRes, standingsRes, statsRes, newsRes, galleryRes, sponsorsRes, partnersRes, contactRes] =
          await Promise.all([
            api.get(`/committee/tournaments/${tournamentId}`),
            api.get(`/committee/tournaments/${tournamentId}/teams`),
            api.get(`/committee/tournaments/${tournamentId}/fixtures`),
            api.get(`/committee/tournaments/${tournamentId}/standings`),
            api.get(`/committee/tournaments/${tournamentId}/statistics`),
            api.get(`/committee/tournaments/${tournamentId}/news`),
            api.get(`/committee/tournaments/${tournamentId}/gallery`),
            api.get(`/committee/tournaments/${tournamentId}/sponsors`),
            api.get(`/committee/tournaments/${tournamentId}/partners`),
            api.get(`/committee/tournaments/${tournamentId}/contact`),
          ])

        const unwrap = (res) => res.data?.data ?? res.data ?? []
        const tournament = detailRes.data?.data ?? null
        const fixtures = unwrap(fixturesRes)

        if (cancelled) return
        setState({
          loading: false,
          error: '',
          data: {
            tournament,
            teams: unwrap(teamsRes),
            fixtures,
            standings: unwrap(standingsRes),
            statistics: unwrap(statsRes),
            news: unwrap(newsRes),
            gallery: unwrap(galleryRes),
            sponsors: unwrap(sponsorsRes),
            partners: unwrap(partnersRes),
            contact: unwrap(contactRes),
            eventsMap: new Map(),
          },
        })
      } catch (e) {
        if (cancelled) return
        setState({ loading: false, error: e.response?.data?.message || e.message || 'error', data: null })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tournamentId, attempt])

  return { ...state, reload }
}
