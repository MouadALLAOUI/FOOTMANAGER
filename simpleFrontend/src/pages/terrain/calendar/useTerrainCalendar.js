import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../../api/client'
import { useOwnerTerrains } from '../../../api/queries'
import { adaptTerrainCalendar } from './terrainCalendarAdapter'

function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeekISO(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return toISODate(d)
}

function shiftDaysISO(iso, delta) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

function todayISO() {
  return toISODate(new Date())
}

export function useTerrainCalendar() {
  const { data: terrainsData, isLoading: loadingTerrains, refetch: refetchTerrains } = useOwnerTerrains()
  const terrains = useMemo(() => terrainsData?.terrains || [], [terrainsData])

  const [terrainId, setTerrainId] = useState(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO())
  const [selectedDate, setSelectedDateValue] = useState(() => startOfWeekISO())
  const today = useMemo(todayISO, [])

  const setSelectedDate = useCallback((date) => {
    if (!date) return
    setSelectedDateValue(date)
    setWeekStart((ws) => {
      const weekOfDate = startOfWeekISO(new Date(date + 'T00:00:00'))
      return weekOfDate === ws ? ws : weekOfDate
    })
  }, [])

  useEffect(() => {
    if (terrains.length && !terrainId) setTerrainId(terrains[0].id)
  }, [terrains, terrainId])

  const calendarQuery = useApi(
    () =>
      api
        .get(`/owner/terrains/${terrainId}/calendar`, { params: { week_start: weekStart } })
        .then((r) => r.data),
    [terrainId, weekStart],
    {
      queryKey: ['owner', 'terrain-calendar', terrainId, weekStart],
      enabled: !!terrainId,
      keepPrevious: true,
      staleTime: 60 * 1000,
    },
  )

  const calendar = useMemo(
    () => (calendarQuery.data ? adaptTerrainCalendar(calendarQuery.data, { today, selectedDate }) : null),
    [calendarQuery.data, today, selectedDate],
  )

  const selectedTerrain = useMemo(() => terrains.find((t) => t.id === terrainId) || null, [terrains, terrainId])

  const selectTerrain = useCallback((id) => {
    setTerrainId(id)
    const ws = startOfWeekISO()
    setWeekStart(ws)
    setSelectedDateValue(ws)
  }, [])

  const nextWeek = useCallback(() => setWeekStart((ws) => shiftDaysISO(ws, 7)), [])
  const previousWeek = useCallback(() => setWeekStart((ws) => shiftDaysISO(ws, -7)), [])
  const goToToday = useCallback(() => {
    setWeekStart(startOfWeekISO())
    setSelectedDateValue(todayISO())
  }, [])

  const { refetch: refetchCalendar } = calendarQuery

  const refresh = useCallback(() => {
    refetchCalendar()
    refetchTerrains()
  }, [refetchCalendar, refetchTerrains])

  return {
    calendar,
    terrains,
    loadingTerrains,
    terrainId,
    selectedTerrain,
    weekStart,
    selectedDate,
    today,
    setSelectedDate,
    selectTerrain,
    nextWeek,
    previousWeek,
    goToToday,
    loading: calendarQuery.loading,
    isFetching: calendarQuery.isFetching,
    error: calendarQuery.error,
    refresh,
  }
}
