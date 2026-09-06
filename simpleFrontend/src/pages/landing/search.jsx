import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faMagnifyingGlass,
  faMapPin,
} from '@fortawesome/free-solid-svg-icons'
import TimePicker from '../../components/TimePicker'
import Select from '../../components/ui/Select'
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

export default function Search({ city, onCityChange, date, onDateChange, onSubmit }) {
  const { t } = useTranslation()
  const [time, setTime] = useState('')
  const selectRef = useRef(null)
  const dateRef = useRef(null)
  const { data: citiesData } = useCitiesSelect()
  const cities = citiesData?.cities || []

  const cityOptions = cities.map((c) => ({ value: c.slug, label: c.localized_name }))

  const openSelect = () => {
    if (selectRef.current) {
      if (typeof selectRef.current.showPicker === 'function') {
        selectRef.current.showPicker()
      } else {
        selectRef.current.focus()
      }
    }
  }

  const openDatePicker = () => {
    if (dateRef.current) {
      if (typeof dateRef.current.showPicker === 'function') {
        dateRef.current.showPicker()
      } else {
        dateRef.current.focus()
      }
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
            onClick={openSelect}
          >
            <span className="relative">
              <Select
                ref={selectRef}
                bare
                value={city}
                onChange={onCityChange}
                options={cityOptions}
                placeholder={t('landing.hero.cityPlaceholder')}
              />
            </span>
          </Field>

          <Field
            labelKey="landing.hero.date"
            icon={faCalendarDays}
            className="lg:border-s lg:border-slate-100"
            onClick={openDatePicker}
          >
            <input
              ref={dateRef}
              type="date"
              min={today}
              value={date || ''}
              onChange={(e) => onDateChange?.(e.target.value)}
              className="w-full bg-transparent py-0.5 text-sm font-bold text-slate-800 outline-none cursor-pointer"
            />
          </Field>

          <TimePicker
            value={time}
            onChange={setTime}
            label={t('landing.hero.time')}
            placeholder={t('landing.hero.timePlaceholder')}
            labels={{ ok: t('timePicker.ok'), cancel: t('timePicker.cancel') }}
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
