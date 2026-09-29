import { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Building2,
  Check,
  ChevronDown,
  X,
} from 'lucide-react'
import { Button, Field, inputClass } from '../../components/dashboard/ui'
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

const QUICK_TIMES = ['19:00', '20:00', '21:00', '22:00', '23:00']

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
        searchQuery: '',
      }))
    }
    return [
      {
        id: `slot-0-${Date.now()}`,
        day_of_week: 3, // Wednesday default
        start_time: '20:00',
        terrain_id: null,
        pitch_name: '',
        venue_mode: 'platform', // Default try to select from platform, can toggle to custom
        searchQuery: '',
      },
    ]
  })

  const [error, setError] = useState('')

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
        searchQuery: '',
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

  const handleSelectStadium = (slotId, stadium) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              terrain_id: stadium.id,
              pitch_name: stadium.name,
              searchQuery: stadium.name,
            }
          : s
      )
    )
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
            حدد أوقات وملاعب لعبكم المعتادة، سواء من ملاعب المنصة أو ملاعب القرب المحلية
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
                hasRegular ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
              }`}
            >
              {hasRegular && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">عندنا مواعيد قارة أسبوعياً</p>
              <p className="mt-0.5 text-xs text-slate-500">نلعب في أيام أو ملاعب محددة كل أسبوع</p>
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
                !hasRegular ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
              }`}
            >
              {!hasRegular && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">ما عندناش موعد قار</p>
              <p className="mt-0.5 text-xs text-slate-500">كنبرمجوا كل مباراة في وقتها حسب الاتفاق</p>
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

              const selectedStadium = dbStadiums.find((s) => s.id === slot.terrain_id)

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
                        {slots.length > 1 ? `الموعد والمكان #${index + 1}` : 'الموعد والملعب المعتاد'}
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

                  {/* Day selector */}
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
                            onClick={() => handleUpdateSlot(slot.id, 'day_of_week', d.id)}
                            className={`h-9 rounded-xl text-xs font-bold transition-all ${
                              isSel
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'
                            }`}
                          >
                            {d.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time selector */}
                  <div className="mb-5">
                    <label className="mb-2 block text-xs font-bold text-slate-700">
                      توقيت المباراة:
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {QUICK_TIMES.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => handleUpdateSlot(slot.id, 'start_time', time)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            slot.start_time === time
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'
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
                            handleUpdateSlot(slot.id, 'start_time', e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stadium / Venue Selection Mode */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-800">
                        مكان أو ملعب اللعب:
                      </label>

                      {/* Mode Switch Pills */}
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleUpdateSlot(slot.id, 'venue_mode', 'platform')}
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
                              handleUpdateSlot(slot.id, 'terrain_id', null)
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
                                  {selectedStadium.address ? ` — ${selectedStadium.address}` : ''}
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
                                  handleUpdateSlot(slot.id, 'searchQuery', e.target.value)
                                }
                                placeholder="ابحث عن ملعب بالاسم أو المدينة..."
                                className={inputClass}
                                dir="auto"
                              />
                              <Search className="pointer-events-none absolute end-3 top-3 size-4 text-slate-400" />
                            </div>

                            {/* Dropdown / Suggestions list */}
                            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1 divide-y divide-slate-100">
                              {loadingStadiums ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                  جارٍ تحميل الملاعب...
                                </div>
                              ) : matchingStadiums.length > 0 ? (
                                matchingStadiums.slice(0, 15).map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => handleSelectStadium(slot.id, st)}
                                    className="flex w-full items-center justify-between rounded-lg p-2 text-start transition-colors hover:bg-emerald-50 hover:text-emerald-900 group"
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
                                  handleUpdateSlot(slot.id, 'venue_mode', 'custom')
                                  if (slot.searchQuery) {
                                    handleUpdateSlot(slot.id, 'pitch_name', slot.searchQuery)
                                  }
                                }}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 underline decoration-dotted"
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
                              handleUpdateSlot(slot.id, 'pitch_name', e.target.value)
                            }
                            placeholder="مثال: ملعب القرب، قاعة الحي، ملعب الفتح..."
                            className={inputClass}
                            dir="auto"
                          />
                          <MapPin className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          يمكنك كتابة اسم أي ملعب محلي أو قاعة معتادة يلعب فيها فريقكم.
                        </p>
                      </div>
                    )}
                  </div>
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
