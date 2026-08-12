import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { EVENT_META, minuteText } from '../constants'
import EventSub from './EventSub'

export default function EventRow({ ev, index, total, fresh, onEdit, onDelete }) {
  const { t } = useTranslation()
  const meta = EVENT_META[ev.type] || EVENT_META.other
  const out = ev.type === 'substitution' ? ev.player : null
  const inn = ev.type === 'substitution' ? ev.assist_player : null

  return (
    <div className={`group flex gap-3 ${fresh ? 'pop-in' : ''}`}>
      <div className="flex flex-col items-center">
        <span className={`mt-1 w-14 shrink-0 rounded-lg px-1 py-1 text-center text-[11px] font-black tabular-nums ${meta.tone} ring-1`}>
          {minuteText(ev.minute, ev.added_time)}
        </span>
        {index < total - 1 && <span className="w-px flex-1 bg-slate-100" />}
      </div>
      <div className="mb-3 min-w-0 flex-1 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm ring-1 ${meta.tone}`}>{meta.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800">{t(meta.labelKey)}</p>
              {out && <EventSub player={out} inOut="out" />}
              {inn && <EventSub player={inn} inOut="in" />}
              {!out && ev.player && <p className="mt-0.5 truncate text-xs font-bold text-slate-600">{ev.player}</p>}
              {ev.assist_player && (
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{t('committee.result.assist')}: {ev.assist_player}</p>
              )}
              {ev.reason && <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{ev.reason}</p>}
              {ev.note && <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-slate-500">{ev.note}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity xl:opacity-0 xl:group-hover:opacity-100">
            <button type="button" onClick={onEdit} aria-label={t('committee.result.editEventTitle')} title={t('committee.result.editEventTitle')} className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <Pencil className="size-3.5" />
            </button>
            <button type="button" onClick={onDelete} aria-label={t('committee.result.deleteConfirm')} title={t('committee.result.deleteConfirm')} className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
