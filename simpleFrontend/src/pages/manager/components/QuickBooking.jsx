import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, MapPin, Search, ShieldCheck } from 'lucide-react'
import api from '../../../api/client'
import { Button, Field, Skeleton, inputClass } from '../../../components/dashboard/ui'
import Select from '../../../components/ui/Select'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section } from '../components/shared'
import { coverThumb } from '../../../lib/thumb'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function QuickBooking() {
  const { t } = useTranslation()
  const { toast, cities, openBook } = useCommandCenter()
  const [city, setCity] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (cities.length && !city) setCity(cities[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities])

  const search = async () => {
    if (!city) return toast.error(t('ov.quick.selectCity'))
    const id = ++seq.current
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get(`/v1/stadiums?city=${encodeURIComponent(city)}&per_page=12`)
      if (id === seq.current) setResults(res.data?.data || [])
    } catch {
      if (id === seq.current) setResults([])
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }

  return (
    <Section
      id="quick-booking"
      icon={CalendarPlus}
      tint="sky"
      title={t('ov.quick.title')}
      subtitle={t('ov.quick.subtitle')}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={t('ov.common.city')}>
          <Select
            value={city}
            onChange={setCity}
            options={cities.map((c) => ({ value: c, label: c }))}
            placeholder={t('ov.quick.allCities')}
          />
        </Field>
        <Field label={t('ov.common.date')}>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('ov.quick.timeOptional')}>
          <input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button className="w-full" onClick={search} disabled={loading}>
            <Search className="size-4" />
            {loading ? t('ov.quick.searching') : t('ov.common.search')}
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : searched && results?.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center text-xs font-semibold text-slate-400">
            {t('ov.quick.noResults')}
          </p>
        ) : results?.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition-colors hover:border-green-200 hover:bg-white"
              >
                {s.cover_image_url ? (
                  <img loading="lazy" decoding="async" src={coverThumb(s)} alt="" className="size-12 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-green-600 shadow-sm">
                    <ShieldCheck className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <MapPin className="size-3 text-green-500" />
                    {s.city} {s.type ? `• ${s.type}` : ''}
                  </p>
                  {typeof s.price_per_team === 'number' && s.price_per_team > 0 && (
                    <p className="mt-0.5 text-xs font-black text-slate-700">
                      {s.price_per_team}
                      <span className="ms-1 text-[10px] font-bold text-slate-400">{t('ov.common.perTeam')}</span>
                    </p>
                  )}
                </div>
                <Button size="sm" variant="soft" onClick={() => openBook({ terrain: s, date })}>
                  {t('ov.quick.book')}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  )
}
