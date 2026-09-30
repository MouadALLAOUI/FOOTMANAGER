import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Search,
  Building2,
  X,
  Loader2,
  RefreshCw,
  CalendarDays,
  Repeat,
  AlertCircle,
} from 'lucide-react'
import { Button, inputClass } from '../../components/dashboard/ui'
import api from '../../api/client'

const DAYS = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الإثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' },
]

// Fallback times shown when no terrain is selected or terrain has no schedule
const FALLBACK_TIMES = ['19:00', '20:00', '21:00', '22:00', '23:00']

/**
 * Get the next occurrence of a given day_of_week from today.
 * Returns a date string in YYYY-MM-DD format.
 */
function getNextDateForDay(dayOfWeek) {
  const today = new Date()
  const todayDay = today.getDay() // 0=Sunday
  let daysAhead = dayOfWeek - todayDay
  if (daysAhead <= 0) daysAhead += 7
  const next = new Date(today)
  next.setDate(today.getDate() + daysAhead)
  return next.toISOString().split('T')[0]
}

/**
 * Format a date string for display in Arabic-style short format
 */
function formatDateAr(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ar-MA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function StepSchedule({
  initialSchedule,
  stadiums: propStadiums = [],
  teamCity = '',
  onNext,
  onBack,
  onSkip,
  busy,
}) {
  const [hasRegular, setHasRegular] = useState(
    Array.isArray(initialSchedule) && initialSchedule.length > 0 ? true : true
  )

  // Platform stadiums state
  const [dbStadiums, setDbStadiums] = useState(propStadiums)
  const [loadingStadiums, setLoadingStadiums] = useState(false)

  // Fetch registered stadiums if none provided
  useEffect(() => {
    if (propStadiums.length > 0) {
      setDbStadiums(propStadiums)
      return
    }
    let mounted = true
    setLoadingStadiums(true)
    api
      .get('/v1/stadiums', { params: { per_page: 80 } })
      .then((res) => {
        if (!mounted) return
        const list = res.data?.data || res.data || []
        setDbStadiums(list)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingStadiums(false)
      })
    return () => {
      mounted = false
    }
  }, [propStadiums])

  const [slots, setSlots] = useState(() => {
    if (Array.isArray(initialSchedule) && initialSchedule.length > 0) {
      return initialSchedule.map((s, index) => ({
        id: s.id || `slot-${index}-${Date.now()}`,
        day_of_week: s.day_of_week ?? 3,
        start_time: s.start_time ? s.start_time.slice(0, 5) : '20:00',
        terrain_id: s.terrain_id || null,
        pitch_name: s.custom_pitch_name || (s.terrain?.name ?? ''),
        venue_mode: s.terrain_id ? 'platform' : 'custom',
        reservation_type: s.reservation_type || 'weekly_subscription',
        booking_date: s.booking_date || '',
        searchQuery: '',
        // Terrain slot availability
        terrainSlots: null,
        loadingSlots: false,
        slotsError: null,
      }))
    }
    return [
      {
        id: `slot-0-${Date.now()}`,
        day_of_week: 3, // Wednesday default
        start_time: '20:00',
        terrain_id: null,
        pitch_name: '',
        venue_mode: 'platform',
        reservation_type: 'weekly_subscription',
        booking_date: '',
        searchQuery: '',
        terrainSlots: null,
        loadingSlots: false,
        slotsError: null,
      },
    ]
  })

  const [error, setError] = useState('')

  // ─── Slot Fetching Logic ───────────────────────────────────────────────
  // Cache for terrain slots to avoid re-fetching
  const slotsCache = useRef({})

  const fetchTerrainSlots = useCallback(
    async (slotId, terrainId, dayOfWeek) => {
      if (!terrainId) return

      const date = getNextDateForDay(dayOfWeek)
      const cacheKey = `${terrainId}-${date}`

      // Check cache first
      if (slotsCache.current[cacheKey]) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  terrainSlots: slotsCache.current[cacheKey],
                  loadingSlots: false,
                  slotsError: null,
                }
              : s
          )
        )
        return
      }

      // Set loading state
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, loadingSlots: true, slotsError: null }
            : s
        )
      )

      try {
        const res = await api.get(`/terrains/${terrainId}/slots`, {
          params: { date },
        })
        const data = res.data
        slotsCache.current[cacheKey] = data

        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  terrainSlots: data,
                  loadingSlots: false,
                  slotsError: data.terrain_closed
                    ? 'الملعب مغلق حالياً'
                    : null,
                }
              : s
          )
        )
      } catch (err) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  terrainSlots: null,
                  loadingSlots: false,
                  slotsError: 'تعذر تحميل الأوقات المتاحة',
                }
              : s
          )
        )
      }
    },
    []
  )

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleAddSlot = () => {
    const lastDay = slots[slots.length - 1]?.day_of_week ?? 3
    const nextDay = lastDay === 5 ? 6 : lastDay === 3 ? 5 : (lastDay + 2) % 7
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${prev.length}-${Date.now()}`,
        day_of_week: nextDay,
        start_time: '20:00',
        terrain_id: null,
        pitch_name: '',
        venue_mode: 'platform',
        reservation_type: 'weekly_subscription',
        booking_date: '',
        searchQuery: '',
        terrainSlots: null,
        loadingSlots: false,
        slotsError: null,
      },
    ])
  }

  const handleRemoveSlot = (id) => {
    if (slots.length <= 1) return
    setSlots((prev) => prev.filter((s) => s.id !== id))
  }

  const handleUpdateSlot = (id, field, value) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const handleDayChange = (slotId, dayOfWeek) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, day_of_week: dayOfWeek, start_time: '' } : s
      )
    )
    // Re-fetch slots if terrain is selected
    const slot = slots.find((s) => s.id === slotId)
    if (slot?.terrain_id && slot.venue_mode === 'platform') {
      fetchTerrainSlots(slotId, slot.terrain_id, dayOfWeek)
    }
  }

  const handleSelectStadium = (slotId, stadium) => {
    const slot = slots.find((s) => s.id === slotId)
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              terrain_id: stadium.id,
              pitch_name: stadium.name,
              searchQuery: stadium.name,
              start_time: '', // Reset time when changing terrain
              terrainSlots: null,
            }
          : s
      )
    )
    // Fetch available slots for this terrain + day
    if (slot) {
      fetchTerrainSlots(slotId, stadium.id, slot.day_of_week)
    }
  }

  const handleClearStadium = (slotId) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              terrain_id: null,
              pitch_name: '',
              searchQuery: '',
              start_time: '20:00',
              terrainSlots: null,
              loadingSlots: false,
              slotsError: null,
            }
          : s
      )
    )
  }

  const handleReservationTypeChange = (slotId, type) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              reservation_type: type,
              booking_date: type === 'single' ? '' : '',
            }
          : s
      )
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (hasRegular) {
      if (slots.length === 0) {
        setError('يرجى إضافة موعد واحد على الأقل')
        return
      }
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i].start_time) {
          setError(`يرجى تحديد وقت بداية المباراة للموعد رقم ${i + 1}`)
          return
        }
        // Validate booking_date for single reservations with platform terrains
        if (
          slots[i].reservation_type === 'single' &&
          slots[i].terrain_id &&
          !slots[i].booking_date
        ) {
          setError(
            `يرجى تحديد تاريخ الحجز للموعد رقم ${i + 1} (حجز لمرة واحدة)`
          )
          return
        }
      }

      const calculateEndTime = (start) => {
        if (!start) return '21:00'
        const parts = start.split(':')
        const h = parseInt(parts[0], 10)
        const m = parseInt(parts[1] || '0', 10)
        if (isNaN(h)) return '21:00'
        const endH = (h + 1) % 24
        return `${String(endH).padStart(2, '0')}:${String(isNaN(m) ? 0 : m).padStart(2, '0')}`
      }

      onNext({
        has_regular_time: true,
        schedules: slots.map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time || calculateEndTime(s.start_time),
          terrain_id: s.terrain_id || null,
          pitch_name: s.pitch_name?.trim() || 'ملعب معتاد',
          reservation_type: s.terrain_id
            ? s.reservation_type
            : 'weekly_subscription',
          booking_date: s.booking_date || null,
        })),
        // Fallback for older backend endpoints
        day_of_week: slots[0].day_of_week,
        start_time: slots[0].start_time,
        end_time: slots[0].end_time || calculateEndTime(slots[0].start_time),
        terrain_id: slots[0].terrain_id || null,
        pitch_name: slots[0].pitch_name?.trim() || 'ملعب معتاد',
      })
    } else {
      onNext({
        has_regular_time: false,
        schedules: [],
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Calendar className="size-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
            مواعيد مبارياتكم وملاعبكم الاعتيادية
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            حدد أوقات وملاعب لعبكم المعتادة، سواء من ملاعب المنصة أو ملاعب
            القرب المحلية
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Choice cards: Regular vs Flexible */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setHasRegular(true)}
            className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-start transition-all ${
              hasRegular
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                hasRegular
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300'
              }`}
            >
              {hasRegular && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                عندنا مواعيد قارة أسبوعياً
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                نلعب في أيام أو ملاعب محددة كل أسبوع
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setHasRegular(false)}
            className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-start transition-all ${
              !hasRegular
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                !hasRegular
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300'
              }`}
            >
              {!hasRegular && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                ما عندناش موعد قار
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                كنبرمجوا كل مباراة في وقتها حسب الاتفاق
              </p>
            </div>
          </button>
        </div>

        {/* Detail form: Slots list */}
        {hasRegular && (
          <div className="mt-6 space-y-5">
            {slots.map((slot, index) => {
              // Filtered platform stadiums based on slot search
              const searchLower = (slot.searchQuery || '').trim().toLowerCase()
              const matchingStadiums = dbStadiums.filter((st) => {
                if (!searchLower) return true
                return (
                  st.name?.toLowerCase().includes(searchLower) ||
                  st.city?.toLowerCase().includes(searchLower) ||
                  st.address?.toLowerCase().includes(searchLower)
                )
              })

              const selectedStadium = dbStadiums.find(
                (s) => s.id === slot.terrain_id
              )

              // Available slots from API
              const apiSlots = slot.terrainSlots?.slots || []
              const availableApiSlots = apiSlots.filter(
                (s) => s.status === 'available'
              )

              // Determine if we should show API slots or fallback times
              const showApiSlots =
                slot.venue_mode === 'platform' &&
                slot.terrain_id &&
                slot.terrainSlots &&
                !slot.slotsError
              const showFallbackTimes =
                slot.venue_mode === 'custom' || !slot.terrain_id

              return (
                <div
                  key={slot.id}
                  className="relative rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4.5 text-start shadow-xs transition-all sm:p-5"
                >
                  {/* Slot Card Header */}
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        {slots.length > 1
                          ? `الموعد والمكان #${index + 1}`
                          : 'الموعد والملعب المعتاد'}
                      </span>
                    </div>

                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="size-3.5" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>

                  {/* ─── SECTION 1: Day Selector ──────────────────────── */}
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-bold text-slate-700">
                      اليوم المعتاد للعب:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                      {DAYS.map((d) => {
                        const isSel = slot.day_of_week === d.id
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleDayChange(slot.id, d.id)}
                            className={`h-9 rounded-xl text-xs font-bold transition-all ${
                              isSel
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {d.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ─── SECTION 2: Stadium / Venue (MOVED UP) ─────── */}
                  <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-800">
                        مكان أو ملعب اللعب:
                      </label>

                      {/* Mode Switch Pills */}
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSlot(
                              slot.id,
                              'venue_mode',
                              'platform'
                            )
                          }
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                            slot.venue_mode === 'platform'
                              ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Building2 className="size-3" />
                          <span>من ملاعب المنصة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateSlot(slot.id, 'venue_mode', 'custom')
                            if (slot.terrain_id) {
                              handleClearStadium(slot.id)
                            }
                          }}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                            slot.venue_mode === 'custom'
                              ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <MapPin className="size-3" />
                          <span>ملعب محلي / كتابة يدوية</span>
                        </button>
                      </div>
                    </div>

                    {/* MODE 1: SELECT FROM PLATFORM STADIUMS */}
                    {slot.venue_mode === 'platform' ? (
                      <div className="space-y-2.5">
                        {/* If a stadium is already selected */}
                        {slot.terrain_id && selectedStadium ? (
                          <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
                                <CheckCircle2 className="size-4.5" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900">
                                  {selectedStadium.name}
                                </div>
                                <div className="text-[11px] font-medium text-slate-500">
                                  {selectedStadium.city || 'المدينة'}
                                  {selectedStadium.address
                                    ? ` — ${selectedStadium.address}`
                                    : ''}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleClearStadium(slot.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-emerald-100 hover:text-slate-700"
                              title="تغيير الملعب"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            {/* Search box */}
                            <div className="relative mb-2">
                              <input
                                type="text"
                                value={slot.searchQuery || ''}
                                onChange={(e) =>
                                  handleUpdateSlot(
                                    slot.id,
                                    'searchQuery',
                                    e.target.value
                                  )
                                }
                                placeholder="ابحث عن ملعب بالاسم أو المدينة..."
                                className={inputClass}
                                dir="auto"
                              />
                              <Search className="pointer-events-none absolute end-3 top-3 size-4 text-slate-400" />
                            </div>

                            {/* Dropdown / Suggestions list */}
                            <div className="max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1">
                              {loadingStadiums ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                  جارٍ تحميل الملاعب...
                                </div>
                              ) : matchingStadiums.length > 0 ? (
                                matchingStadiums.slice(0, 15).map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() =>
                                      handleSelectStadium(slot.id, st)
                                    }
                                    className="group flex w-full items-center justify-between rounded-lg p-2 text-start transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Building2 className="size-3.5 text-slate-400 group-hover:text-emerald-600" />
                                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                                        {st.name}
                                      </span>
                                    </div>
                                    <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-600 group-hover:bg-emerald-200/60 group-hover:text-emerald-800">
                                      {st.city || 'معتمد'}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-slate-500">
                                  لم يتم العثور على ملعب بهذا الاسم.
                                </div>
                              )}
                            </div>

                            {/* Quick link to switch to manual writing */}
                            <div className="mt-2 text-end">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateSlot(
                                    slot.id,
                                    'venue_mode',
                                    'custom'
                                  )
                                  if (slot.searchQuery) {
                                    handleUpdateSlot(
                                      slot.id,
                                      'pitch_name',
                                      slot.searchQuery
                                    )
                                  }
                                }}
                                className="text-[11px] font-bold text-emerald-600 underline decoration-dotted hover:text-emerald-800"
                              >
                                الملعب غير موجود في القائمة؟ اكتب اسمه يدوياً
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* MODE 2: CUSTOM MANUAL STADIUM INPUT */
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={slot.pitch_name || ''}
                            onChange={(e) =>
                              handleUpdateSlot(
                                slot.id,
                                'pitch_name',
                                e.target.value
                              )
                            }
                            placeholder="مثال: ملعب القرب، قاعة الحي، ملعب الفتح..."
                            className={inputClass}
                            dir="auto"
                          />
                          <MapPin className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                        </div>
                        <p className="text-[11px] leading-tight text-slate-500">
                          يمكنك كتابة اسم أي ملعب محلي أو قاعة معتادة يلعب فيها
                          فريقكم.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ─── SECTION 3: Reservation Type (NEW) ────────── */}
                  {slot.venue_mode === 'platform' && slot.terrain_id && (
                    <div className="mb-4">
                      <label className="mb-2 block text-xs font-bold text-slate-700">
                        نوع الحجز:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleReservationTypeChange(
                              slot.id,
                              'weekly_subscription'
                            )
                          }
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                            slot.reservation_type === 'weekly_subscription'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Repeat className="size-3.5" />
                          <span>أبونمان أسبوعي</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleReservationTypeChange(slot.id, 'single')
                          }
                          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                            slot.reservation_type === 'single'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <CalendarDays className="size-3.5" />
                          <span>حجز مرة واحدة</span>
                        </button>
                      </div>

                      {/* Reservation type description */}
                      <p className="mt-1.5 text-[11px] leading-tight text-slate-500">
                        {slot.reservation_type === 'weekly_subscription'
                          ? 'سيتم حجز هذا التوقيت كل أسبوع بشكل تلقائي — أبونمان'
                          : 'حجز لمرة واحدة فقط في تاريخ محدد'}
                      </p>

                      {/* Date picker for single reservations */}
                      {slot.reservation_type === 'single' && (
                        <div className="mt-2">
                          <label className="mb-1 block text-[11px] font-bold text-slate-600">
                            تاريخ الحجز:
                          </label>
                          <input
                            type="date"
                            value={slot.booking_date || ''}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              handleUpdateSlot(
                                slot.id,
                                'booking_date',
                                e.target.value
                              )
                              // Re-fetch slots for the specific date
                              if (slot.terrain_id && e.target.value) {
                                const cacheKey = `${slot.terrain_id}-${e.target.value}`
                                // Clear cache for this key to force re-fetch
                                delete slotsCache.current[cacheKey]

                                setSlots((prev) =>
                                  prev.map((s) =>
                                    s.id === slot.id
                                      ? { ...s, loadingSlots: true, start_time: '' }
                                      : s
                                  )
                                )
                                api
                                  .get(
                                    `/terrains/${slot.terrain_id}/slots`,
                                    { params: { date: e.target.value } }
                                  )
                                  .then((res) => {
                                    slotsCache.current[cacheKey] = res.data
                                    setSlots((prev) =>
                                      prev.map((s) =>
                                        s.id === slot.id
                                          ? {
                                              ...s,
                                              terrainSlots: res.data,
                                              loadingSlots: false,
                                              slotsError:
                                                res.data.terrain_closed
                                                  ? 'الملعب مغلق حالياً'
                                                  : null,
                                            }
                                          : s
                                      )
                                    )
                                  })
                                  .catch(() => {
                                    setSlots((prev) =>
                                      prev.map((s) =>
                                        s.id === slot.id
                                          ? {
                                              ...s,
                                              loadingSlots: false,
                                              slotsError:
                                                'تعذر تحميل الأوقات المتاحة',
                                            }
                                          : s
                                      )
                                    )
                                  })
                              }
                            }}
                            className={inputClass}
                          />
                          {slot.booking_date && (
                            <p className="mt-1 text-[11px] font-medium text-emerald-700">
                              📅 {formatDateAr(slot.booking_date)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── SECTION 4: Time Selector (DYNAMIC) ──────── */}
                  <div className="mb-1">
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Clock className="size-3.5" />
                      توقيت المباراة:
                    </label>

                    {/* Loading state */}
                    {slot.loadingSlots && (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-4">
                        <Loader2 className="size-4 animate-spin text-emerald-600" />
                        <span className="text-xs text-slate-500">
                          جارٍ تحميل الأوقات المتاحة...
                        </span>
                      </div>
                    )}

                    {/* Error state */}
                    {slot.slotsError && !slot.loadingSlots && (
                      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="size-4 text-amber-600" />
                          <span className="text-xs font-bold text-amber-800">
                            {slot.slotsError}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            fetchTerrainSlots(
                              slot.id,
                              slot.terrain_id,
                              slot.day_of_week
                            )
                          }
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-100"
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                      </div>
                    )}

                    {/* API Slots: from terrain schedule */}
                    {showApiSlots && !slot.loadingSlots && (
                      <div>
                        {apiSlots.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {apiSlots.map((ts) => {
                              const isAvailable = ts.status === 'available'
                              const isBooked = ts.status === 'booked'
                              const isClosed = ts.status === 'closed'
                              const isSelected =
                                slot.start_time === ts.start

                              return (
                                <button
                                  key={ts.start}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() =>
                                    handleUpdateSlot(
                                      slot.id,
                                      'start_time',
                                      ts.start
                                    )
                                  }
                                  className={`relative rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                                      : isAvailable
                                        ? 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:ring-emerald-300'
                                        : isBooked
                                          ? 'cursor-not-allowed bg-red-50 text-red-400 ring-1 ring-red-200'
                                          : 'cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                                  }`}
                                  title={
                                    isBooked
                                      ? `محجوز ${ts.booking?.team?.name ? `— ${ts.booking.team.name}` : ''}`
                                      : isClosed
                                        ? `مغلق ${ts.closure?.reason ? `— ${ts.closure.reason}` : ''}`
                                        : `متاح: ${ts.start} - ${ts.end}`
                                  }
                                >
                                  <span className="block">
                                    {ts.start}
                                  </span>
                                  <span
                                    className={`block text-[10px] font-medium ${
                                      isSelected
                                        ? 'text-emerald-200'
                                        : isAvailable
                                          ? 'text-emerald-600'
                                          : isBooked
                                            ? 'text-red-400'
                                            : 'text-slate-400'
                                    }`}
                                  >
                                    {isAvailable
                                      ? '✓ متاح'
                                      : isBooked
                                        ? '✕ محجوز'
                                        : '⊘ مغلق'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
                            لا توجد فترات متاحة لهذا اليوم في هذا الملعب
                          </div>
                        )}

                        {/* Info about which date was queried */}
                        {slot.terrainSlots?.date && (
                          <p className="mt-1.5 text-[10px] text-slate-400">
                            الأوقات المعروضة ليوم{' '}
                            {formatDateAr(slot.terrainSlots.date)}
                            {slot.terrainSlots.schedule && (
                              <>
                                {' '}
                                · ساعات العمل:{' '}
                                {slot.terrainSlots.schedule.open_time} -{' '}
                                {slot.terrainSlots.schedule.close_time}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Fallback times: for custom stadiums or when no terrain selected */}
                    {showFallbackTimes && !slot.loadingSlots && (
                      <div className="flex flex-wrap items-center gap-2">
                        {FALLBACK_TIMES.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() =>
                              handleUpdateSlot(slot.id, 'start_time', time)
                            }
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              slot.start_time === time
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                        <div className="relative ms-auto w-32">
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              handleUpdateSlot(
                                slot.id,
                                'start_time',
                                e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    )}

                    {/* Platform terrain selected but no terrain_id yet — prompt to select */}
                    {slot.venue_mode === 'platform' &&
                      !slot.terrain_id &&
                      !slot.loadingSlots && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          ⬆ اختر ملعب أولاً لعرض الأوقات المتاحة
                        </p>
                      )}
                  </div>

                  {/* Reservation info badge for platform terrains */}
                  {slot.venue_mode === 'platform' &&
                    slot.terrain_id &&
                    slot.start_time && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
                        <p className="text-[11px] font-bold leading-relaxed text-blue-800">
                          💡 عند المتابعة، سيتم إرسال طلب حجز{' '}
                          {slot.reservation_type === 'weekly_subscription'
                            ? '(أبونمان أسبوعي)'
                            : '(مرة واحدة)'}{' '}
                          لصاحب الملعب. سيتم تأكيد الحجز بعد موافقته.
                        </p>
                      </div>
                    )}
                </div>
              )
            })}

            {/* Add Another Stadium / Slot Button */}
            <button
              type="button"
              onClick={handleAddSlot}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400/80 bg-emerald-50/40 py-3.5 text-xs font-extrabold text-emerald-700 transition-all hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.99]"
            >
              <Plus className="size-4" />
              <span>إضافة موعد أو ملعب آخر (+ ملعب مختلف)</span>
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
              رجوع
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="flex h-11 items-center rounded-xl px-3 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              تخطي هذه الخطوة
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            className="w-full sm:w-auto"
          >
            متابعة الخطوة التالية ←
          </Button>
        </div>
      </div>
    </form>
  )
}
