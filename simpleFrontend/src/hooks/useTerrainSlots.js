import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

/**
 * useTerrainSlots — loads a terrain's available/booked time slots for a date
 * from GET /terrains/{resourceId}/slots?date=YYYY-MM-DD.
 *
 * Returns:
 *   availableStartTimes (string[])  start times of status==='available' slots
 *   disabledStartTimes  (string[])  start times of booked/closed slots
 *   loading, error, closed, closedReason, dayMessage, reload
 *
 * The two start-time arrays feed TimeSlotPicker's availableSlots/disabledSlots.
 */
export default function useTerrainSlots(resourceId, date) {
  const [allSlots, setAllSlots] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [closed, setClosed] = useState(false)
  const [closedReason, setClosedReason] = useState('')
  const [dayMessage, setDayMessage] = useState('')

  const load = useCallback(async () => {
    if (!resourceId || !date) {
      setAllSlots([])
      setSchedule(null)
      return
    }
    setLoading(true)
    setError('')
    setClosed(false)
    setClosedReason('')
    setDayMessage('')
    try {
      const { data } = await api.get(`/terrains/${resourceId}/slots`, { params: { date } })
      setAllSlots(data.slots || [])
      setSchedule(data.schedule || null)
      setClosed(Boolean(data.terrain_closed))
      setClosedReason(data.closure_reason || '')
      setDayMessage(data.message || '')
    } catch {
      setError('تعذر جلب الفتحات المتاحة')
    } finally {
      setLoading(false)
    }
  }, [resourceId, date])

  useEffect(() => {
    load()
  }, [load])

  const availableStartTimes = allSlots
    .filter((s) => s.status === 'available')
    .map((s) => s.start)

  const disabledStartTimes = allSlots
    .filter((s) => s.status !== 'available')
    .map((s) => s.start)

  return {
    availableStartTimes,
    disabledStartTimes,
    allSlots,
    schedule,
    loading,
    error,
    closed,
    closedReason,
    dayMessage,
    reload: load,
  }
}
