import { useCallback, useEffect, useState } from 'react'
import api from '../../../../api/client'

const EVENT_FETCH_CONCURRENCY = 6

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

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
        const finished = (fixtures || []).filter((f) => f.match?.status === 'finished')

        const eventRows = await mapWithConcurrency(finished, EVENT_FETCH_CONCURRENCY, async (fixture) => {
          try {
            const res = await api.get(`/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/events`)
            return { fixtureId: fixture.id, events: res.data?.data ?? [] }
          } catch {
            return { fixtureId: fixture.id, events: [] }
          }
        })

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
            eventsMap: new Map(eventRows.map((r) => [r.fixtureId, r.events])),
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
