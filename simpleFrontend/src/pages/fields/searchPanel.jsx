import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faChevronDown,
  faClock,
  faFutbol,
  faLocationDot,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import TimeSlotPicker from '../../components/TimeSlotPicker'
import { buildTimeSlots } from '../../lib/timeSlots'
import Select from '../../components/ui/Select'

const today = new Date().toISOString().split('T')[0]
const SLOTS = buildTimeSlots('08:00', '23:00', 30)

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

function DateField({ value, onChange }) {
  const { t } = useTranslation()
  return (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-0.5 text-sm font-bold text-slate-800 outline-none"
        />
      </span>
    </label>
  )
}

function TimeField({ value, onChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-[22px] px-5 py-3 text-start transition-colors hover:bg-slate-50 ${
          open ? 'bg-slate-50' : ''
        }`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
          <FontAwesomeIcon icon={faClock} className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-semibold text-slate-400">{t('fieldsPage.search.time')}</span>
          <span className={`truncate text-sm font-bold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {value || t('fieldsPage.search.timePlaceholder')}
          </span>
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`shrink-0 size-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-[22px] bg-white p-4 shadow-[0_20px_60px_rgba(2,6,23,0.25)] ring-1 ring-black/5 max-md:hidden">
          <TimeSlotPicker selectedTime={value} onChange={onChange} availableSlots={SLOTS} />
        </div>
      )}
    </div>
  )
}

function MobileSummaryBar({ values, cities, onOpen }) {
  const { t, i18n } = useTranslation()
  const cityLabel = cities.find((o) => o.value === values.city)?.label || ''
  const parts = []
  if (cityLabel) parts.push(cityLabel)
  if (values.date)
    parts.push(
      new Date(`${values.date}T00:00:00`).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB', {
        day: 'numeric',
        month: 'short',
      }),
    )
  if (values.time) parts.push(values.time)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="btn-ripple flex w-full items-center gap-3 rounded-[26px] bg-white p-3 text-start shadow-[0_30px_80px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 md:hidden"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-[18px] bg-green-500 text-white shadow-md shadow-green-500/30">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-extrabold ${parts.length ? 'text-slate-800' : 'text-slate-400'}`}
        >
          {parts.length ? parts.join(' • ') : t('fieldsPage.search.mobileSummaryPlaceholder')}
        </span>
      </span>
      <FontAwesomeIcon icon={faChevronDown} className="size-4 shrink-0 text-slate-400" />
    </button>
  )
}

function MobileSearchSheet({ open, onClose, values, onChange, cities, onSearch }) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef(0)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const types = Object.entries(t('fieldsPage.search.types', { returnObjects: true })).map(
    ([key, label]) => ({ value: key, label }),
  )

  const onHandleDown = (e) => {
    startY.current = e.clientY
    setDragging(true)
    setDragY(0)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onHandleMove = (e) => {
    if (!dragging) return
    setDragY(Math.max(0, e.clientY - startY.current))
  }
  const onHandleUp = () => {
    if (!dragging) return
    if (dragY > 110) onClose()
    setDragging(false)
    setDragY(0)
  }

  const submit = () => {
    onSearch()
    onClose()
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[3px]" onClick={onClose} />
      <div
        className={`fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[85vh] w-full max-w-[1100px] flex-col rounded-t-[28px] bg-white p-4 pb-6 shadow-[0_-25px_70px_rgba(2,6,23,0.4)] transition-transform duration-[350ms] ease-out ${
          dragging ? '!transition-none' : ''
        }`}
        style={dragging ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          className="flex cursor-grab touch-none justify-center pb-2 active:cursor-grabbing"
        >
          <div className="h-[6px] w-[70px] rounded-full bg-slate-200" />
        </div>
        <div className="relative flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="size-5 text-green-600" />
            {t('fieldsPage.search.sheetTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:rotate-90 hover:text-slate-900"
          >
            <FontAwesomeIcon icon={faXmark} className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain py-4">
          <SelectColumn
            label={t('fieldsPage.search.location')}
            icon={faLocationDot}
            value={values.city}
            onChange={(v) => onChange({ city: v })}
            options={cities}
            placeholder={t('fieldsPage.search.locationPlaceholder')}
          />
          <DateField value={values.date} onChange={(d) => onChange({ date: d })} />
          <div className="rounded-[22px] p-4">
            <TimeSlotPicker
              selectedTime={values.time}
              onChange={(v) => onChange({ time: v })}
              availableSlots={SLOTS}
              label={t('fieldsPage.search.time')}
            />
          </div>
          <SelectColumn
            label={t('fieldsPage.search.typePlaceholder')}
            icon={faFutbol}
            value={values.type}
            onChange={(v) => onChange({ type: v })}
            options={types}
            placeholder={t('fieldsPage.search.typePlaceholder')}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          className="btn-ripple flex h-14 w-full shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-green-500 text-base font-extrabold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} className="size-5" />
          {t('fieldsPage.search.button')}
        </button>
      </div>
    </>,
    document.body,
  )
}

export default function FieldsSearchPanel({ values, onChange, onSearch, cities }) {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const types = Object.entries(t('fieldsPage.search.types', { returnObjects: true })).map(
    ([key, label]) => ({ value: key, label }),
  )

  return (
    <div className="relative z-20 -mt-12">
      <div className="mx-auto w-[90%] max-w-[1400px]">
        <MobileSummaryBar values={values} cities={cities} onOpen={() => setMobileOpen(true)} />

        <div className="hidden grid-cols-1 gap-2 rounded-[26px] bg-white p-2 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 md:grid md:grid-cols-5 md:gap-0 md:divide-x md:divide-slate-100">
          <SelectColumn
            label={t('fieldsPage.search.location')}
            icon={faLocationDot}
            value={values.city}
            onChange={(v) => onChange({ city: v })}
            options={cities}
            placeholder={t('fieldsPage.search.locationPlaceholder')}
          />

          <DateField value={values.date} onChange={(d) => onChange({ date: d })} />

          <TimeField value={values.time} onChange={(v) => onChange({ time: v })} />

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

        <MobileSearchSheet
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          values={values}
          onChange={onChange}
          cities={cities}
          onSearch={onSearch}
        />
      </div>
    </div>
  )
}