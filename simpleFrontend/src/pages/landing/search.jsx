import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faChevronDown,
  faMagnifyingGlass,
  faMapPin,
} from '@fortawesome/free-solid-svg-icons'
import TimePicker from '../../components/TimePicker'
import { useCitiesSelect } from '../../api/queries'

const today = new Date().toISOString().split('T')[0]

function Field({ labelKey, icon: Icon, className, onClick, children }) {
  const { t } = useTranslation()

  return (
    <label
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-[22px] px-5 py-3 transition-colors hover:bg-slate-50 lg:flex-1 ${className ?? ''}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
        <FontAwesomeIcon icon={Icon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-start">
        <span className="text-xs font-semibold text-slate-400">
          {t(labelKey)}
        </span>
        {children}
      </span>
    </label>
  )
}

export default function Search({ city, onCityChange, onSubmit }) {
  const { t } = useTranslation()
  const [time, setTime] = useState('')
  const cityRef = useRef(null)
  const dateRef = useRef(null)
  const { data: citiesData } = useCitiesSelect()
  const cities = citiesData?.cities || []

  const openPicker = (ref) => (e) => {
    const el = ref.current
    if (!el || el.contains(e.target)) return
    e.preventDefault()
    if (typeof el.showPicker === 'function') {
      el.showPicker()
    } else {
      el.focus()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.()
  }

  return (
    <div className="mx-auto w-[92%] max-w-[1100px] lg:w-[75%]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[26px] bg-white p-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/5"
      >
        <div className="grid grid-cols-1 divide-y divide-slate-100 lg:h-[94px] lg:grid-cols-4 lg:divide-y-0">
          <Field
            labelKey="landing.hero.city"
            icon={faMapPin}
            onClick={openPicker(cityRef)}
          >
            <span className="relative">
              <select
                ref={cityRef}
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent py-0.5 pe-5 text-sm font-bold text-slate-800 outline-none"
              >
                <option value="" disabled>
                  {t('landing.hero.cityPlaceholder')}
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.localized_name}
                  </option>
                ))}
              </select>
              <FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute end-0 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </span>
          </Field>

          <Field
            labelKey="landing.hero.date"
            icon={faCalendarDays}
            className="lg:border-s lg:border-slate-100"
            onClick={openPicker(dateRef)}
          >
            <input
              ref={dateRef}
              type="date"
              min={today}
              className="w-full bg-transparent py-0.5 text-sm font-bold text-slate-800 outline-none"
            />
          </Field>

          <TimePicker
            value={time}
            onChange={setTime}
            label={t('landing.hero.time')}
            placeholder={t('landing.hero.timePlaceholder')}
            labels={{ ok: t('timePicker.ok'), cancel: t('timePicker.cancel') }}
            minuteStep={5}
            className="lg:border-s lg:border-slate-100"
          />

          <div className="p-0 lg:ps-2">
            <button
              type="submit"
              className="group flex h-full w-full items-center justify-center gap-2 rounded-[22px] bg-green-500 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 active:scale-[0.98]"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="size-5 transition-transform group-hover:scale-110" />
              {t('landing.hero.search')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
