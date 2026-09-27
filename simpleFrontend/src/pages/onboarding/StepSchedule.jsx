import { useState } from 'react'
import { Calendar, Clock, MapPin, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
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
  const existing = initialSchedule?.[0]
  const [hasRegular, setHasRegular] = useState(existing ? true : true)
  const [dayOfWeek, setDayOfWeek] = useState(existing?.day_of_week ?? 3) // Default Wednesday
  const [startTime, setStartTime] = useState(existing?.start_time ? existing.start_time.slice(0, 5) : '20:00')
  const [pitchName, setPitchName] = useState(existing?.custom_pitch_name || '')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (hasRegular) {
      if (!startTime) {
        setError('يرجى تحديد وقت بداية المباراة')
        return
      }
      onNext({
        has_regular_time: true,
        day_of_week: dayOfWeek,
        start_time: startTime,
        pitch_name: pitchName.trim() || 'ملعب معتاد',
      })
    } else {
      onNext({
        has_regular_time: false,
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
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">مواعيد مبارياتكم الاعتيادية</h1>
          <p className="mt-1 text-xs text-slate-500">
            حدد وقت لعبكم المعتاد لتسهيل برمجة المقابلات الودية مع الفرق الأخرى
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
            <div className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${hasRegular ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
              {hasRegular && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">عندنا موعد قار أسبوعياً</p>
              <p className="mt-0.5 text-xs text-slate-500">نلعب دائماً في نفس اليوم والساعة</p>
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
            <div className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${!hasRegular ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
              {!hasRegular && <div className="size-2 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">ما عندناش موعد قار</p>
              <p className="mt-0.5 text-xs text-slate-500">كنبرمجوا كل مباراة في وقتها</p>
            </div>
          </button>
        </div>

        {/* Detail form if has regular time */}
        {hasRegular && (
          <div className="mt-6 space-y-5 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70 text-start">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">
                اليوم المعتاد للعب:
              </label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DAYS.map((d) => {
                  const isSel = dayOfWeek === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDayOfWeek(d.id)}
                      className={`h-10 rounded-xl text-xs font-bold transition-all ${
                        isSel
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'
                      }`}
                    >
                      {d.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">
                توقيت المباراة:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setStartTime(time)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      startTime === time
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 ring-1 ring-slate-200'
                    }`}
                  >
                    {time}
                  </button>
                ))}
                <div className="relative ms-auto w-32">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <Field label="اسم الملعب أو المكان المعتاد (اختياري)">
              <div className="relative">
                <input
                  type="text"
                  value={pitchName}
                  onChange={(e) => setPitchName(e.target.value)}
                  placeholder="مثال: ملعب القرب، قاعة الحي..."
                  className={inputClass}
                  dir="auto"
                />
                <MapPin className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
              </div>
            </Field>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-5">
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
