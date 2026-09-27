import { useState } from 'react'
import { Calendar, Clock, MapPin, Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button, Field, inputClass } from '../../components/dashboard/ui'

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

export default function StepSchedule({ initialSchedule, onNext, onBack, onSkip, busy }) {
  const [hasRegular, setHasRegular] = useState(
    Array.isArray(initialSchedule) && initialSchedule.length > 0 ? true : true
  )

  const [slots, setSlots] = useState(() => {
    if (Array.isArray(initialSchedule) && initialSchedule.length > 0) {
      return initialSchedule.map((s, index) => ({
        id: s.id || `slot-${index}-${Date.now()}`,
        day_of_week: s.day_of_week ?? 3,
        start_time: s.start_time ? s.start_time.slice(0, 5) : '20:00',
        pitch_name: s.custom_pitch_name || '',
      }))
    }
    return [
      {
        id: `slot-0-${Date.now()}`,
        day_of_week: 3, // Wednesday default
        start_time: '20:00',
        pitch_name: '',
      },
    ]
  })

  const [error, setError] = useState('')

  const handleAddSlot = () => {
    // Pick next day or a Friday/Sunday as sensible default for extra slots
    const lastDay = slots[slots.length - 1]?.day_of_week ?? 3
    const nextDay = lastDay === 5 ? 6 : lastDay === 3 ? 5 : (lastDay + 2) % 7
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${prev.length}-${Date.now()}`,
        day_of_week: nextDay,
        start_time: '20:00',
        pitch_name: '',
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

      onNext({
        has_regular_time: true,
        schedules: slots.map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          pitch_name: s.pitch_name?.trim() || 'ملعب معتاد',
        })),
        // Fallback for older backends
        day_of_week: slots[0].day_of_week,
        start_time: slots[0].start_time,
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
            حدد أوقات لعبكم والملاعب المعتادة لتسهيل برمجة المقابلات الودية مع الفرق الأخرى
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Choice cards */}
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

        {/* Detail form if has regular time */}
        {hasRegular && (
          <div className="mt-6 space-y-4">
            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className="relative rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 text-start shadow-xs transition-all hover:border-slate-300"
              >
                {/* Slot Card Header */}
                <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {slots.length > 1 ? `الموعد والمكان #${index + 1}` : 'الموعد والمكان المعتاد'}
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
                <div className="mb-4">
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
                        onChange={(e) => handleUpdateSlot(slot.id, 'start_time', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Stadium / Pitch Name */}
                <Field label="اسم الملعب أو المكان المعتاد لهذا الموعد (اختياري)">
                  <div className="relative">
                    <input
                      type="text"
                      value={slot.pitch_name}
                      onChange={(e) => handleUpdateSlot(slot.id, 'pitch_name', e.target.value)}
                      placeholder="مثال: ملعب القرب، قاعة الحي، ملعب الوازيس..."
                      className={inputClass}
                      dir="auto"
                    />
                    <MapPin className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                  </div>
                </Field>
              </div>
            ))}

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
