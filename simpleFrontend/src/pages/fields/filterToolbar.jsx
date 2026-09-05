import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faGrip,
  faList,
  faSliders,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

const chipGroups = ['types', 'surfaces', 'covers']

export default function FilterToolbar({ filters, onToggle, onReset, sort, onSortChange, view, onViewChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef(0)

  const sortOptions = ['nearest', 'priceAsc', 'priceDesc', 'rating']
  const activeCount =
    (filters.type !== 'all' ? 1 : 0) + (filters.surface !== 'all' ? 1 : 0) + (filters.cover !== 'all' ? 1 : 0)

  const isActive = (category, value) =>
    category === 'all' ? filters.type === 'all' && filters.surface === 'all' && filters.cover === 'all' : filters[category] === value

  const handleChip = (category, value) => {
    if (category === 'all') onReset()
    else onToggle(category, value)
  }

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
    if (dragY > 110) setOpen(false)
    setDragging(false)
    setDragY(0)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const chipClass = (category, value) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ease-out ${
      isActive(category, value)
        ? 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.35)]'
        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:ring-slate-300'
    }`

  const chipButtons = (
    <>
      <button type="button" onClick={() => handleChip('all', 'all')} className={chipClass('all', 'all')}>
        {t('fieldsPage.toolbar.all')}
      </button>
      {chipGroups.map((group) =>
        Object.entries(t(`fieldsPage.toolbar.${group}`, { returnObjects: true })).map(([key, label]) => (
          <button key={key} type="button" onClick={() => handleChip(group === 'covers' ? 'cover' : group, key)} className={chipClass(group === 'covers' ? 'cover' : group, key)}>
            {label}
          </button>
        )),
      )}
    </>
  )

  const chips = <div className="flex flex-wrap items-center gap-2.5">{chipButtons}</div>

  const mobileChips = <div className="flex items-center gap-2.5">{chipButtons}</div>

  const sortControl = (
    <label className="relative flex h-11 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-slate-200 transition hover:ring-slate-300">
      <span className="text-xs font-semibold text-slate-400">{t('fieldsPage.toolbar.sortLabel')}</span>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pe-5 text-sm font-bold text-slate-700 outline-none"
      >
        {sortOptions.map((key) => (
          <option key={key} value={key}>
            {t(`fieldsPage.toolbar.sort.${key}`)}
          </option>
        ))}
      </select>
      <FontAwesomeIcon icon={faChevronDown} className="pointer-events-none absolute end-3 size-4 text-slate-400" />
    </label>
  )

  const viewControl = (
    <div className="flex h-11 items-center rounded-2xl bg-slate-100 p-1">
      {(['grid', 'list']).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-label={mode}
          onClick={() => onViewChange(mode)}
          className={`grid size-9 place-items-center rounded-xl transition-all duration-300 ${
            view === mode
              ? 'bg-white text-green-600 shadow-[0_4px_12px_rgba(17,24,39,0.12)]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FontAwesomeIcon icon={mode === 'grid' ? faGrip : faList} className="size-4" />
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div className="hidden items-center justify-between gap-6 rounded-[24px] bg-white p-5 shadow-[0_16px_50px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 md:flex">
        {chips}
        <div className="flex items-center gap-3">
          {sortControl}
          {viewControl}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 md:hidden">
        <div className="no-scrollbar -mx-6 flex flex-1 items-center gap-2.5 overflow-x-auto px-6 pb-1">
          {mobileChips}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('fieldsPage.toolbar.sortView')}
          className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
        >
          <FontAwesomeIcon icon={faSliders} className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-green-500 text-[10px] font-extrabold text-white shadow-md">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[3px]" onClick={() => setOpen(false)} />
            <div
              className={`fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[80vh] w-full max-w-[1100px] flex-col rounded-t-[28px] bg-white p-6 pb-10 shadow-[0_-25px_70px_rgba(2,6,23,0.4)] transition-transform duration-[350ms] ease-out ${
                dragging ? '!transition-none' : ''
              }`}
              style={dragging ? { transform: `translateY(${dragY}px)` } : undefined}
            >
              <div
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                className="flex cursor-grab touch-none justify-center pb-4 active:cursor-grabbing"
              >
                <div className="h-[6px] w-[70px] rounded-full bg-slate-200" />
              </div>
              <div className="relative flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <FontAwesomeIcon icon={faSliders} className="size-5 text-green-600" />
                  {t('fieldsPage.toolbar.sortView')}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('common.close')}
                  className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:rotate-90 hover:text-slate-900"
                >
                  <FontAwesomeIcon icon={faXmark} className="size-5" />
                </button>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain py-6">
                <div className="flex flex-wrap items-center gap-4">
                  {sortControl}
                  {viewControl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-12 w-full rounded-2xl bg-green-500 text-sm font-bold text-white transition-colors hover:bg-green-600"
              >
                {t('timePicker.ok')}
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
