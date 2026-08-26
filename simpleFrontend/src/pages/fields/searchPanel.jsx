import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faFutbol,
  faLocationDot,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import TimePicker from '../../components/TimePicker'
import Select from '../../components/ui/Select'

const today = new Date().toISOString().split('T')[0]

function SelectColumn({ label, icon: Icon, value, onChange, options, placeholder, className }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[22px] px-5 py-3 transition-colors hover:bg-slate-50 ${className ?? ''}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
        <FontAwesomeIcon icon={Icon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-start">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <span className="relative">
          <Select
            bare
            value={value}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
          />
        </span>
      </span>
    </label>
  )
}

export default function FieldsSearchPanel({ values, onChange, onSearch, cities }) {
  const { t } = useTranslation()
  const types = Object.entries(t('fieldsPage.search.types', { returnObjects: true })).map(
    ([key, label]) => ({ value: key, label }),
  )

  return (
    <div className="relative z-20 -mt-12">
      <div className="mx-auto w-[90%] max-w-[1400px]">
        <div className="grid grid-cols-1 gap-2 rounded-[26px] bg-white p-2 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 md:grid-cols-5 md:gap-0 md:divide-x md:divide-slate-100">
          <SelectColumn
            label={t('fieldsPage.search.location')}
            icon={faLocationDot}
            value={values.city}
            onChange={(v) => onChange({ city: v })}
            options={cities}
            placeholder={t('fieldsPage.search.locationPlaceholder')}
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-[22px] px-5 py-3 transition-colors hover:bg-slate-50">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
              <FontAwesomeIcon icon={faCalendarDays} className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-start">
              <span className="text-xs font-semibold text-slate-400">
                {t('fieldsPage.search.datePlaceholder')}
              </span>
              <input
                type="date"
                min={today}
                lang="en-GB"
                value={values.date}
                onChange={(e) => onChange({ date: e.target.value })}
                className="w-full bg-transparent py-0.5 text-sm font-bold text-slate-800 outline-none"
              />
            </span>
          </label>

          <TimePicker
            value={values.time}
            onChange={(v) => onChange({ time: v })}
            label={t('fieldsPage.search.timePlaceholder')}
            placeholder={t('fieldsPage.search.timePlaceholder')}
            labels={{ ok: t('timePicker.ok'), cancel: t('timePicker.cancel') }}
            minuteStep={5}
          />

          <SelectColumn
            label={t('fieldsPage.search.typePlaceholder')}
            icon={faFutbol}
            value={values.type}
            onChange={(v) => onChange({ type: v })}
            options={types}
            placeholder={t('fieldsPage.search.typePlaceholder')}
          />

          <div className="p-0 md:ps-2">
            <button
              type="button"
              onClick={onSearch}
              className="btn-ripple group flex h-full w-full items-center justify-center gap-2 rounded-[22px] bg-green-500 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 active:scale-[0.98]"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="size-5 transition-transform group-hover:scale-110" />
              {t('fieldsPage.search.button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
