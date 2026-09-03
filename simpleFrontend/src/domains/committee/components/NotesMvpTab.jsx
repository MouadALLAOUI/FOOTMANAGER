import React from 'react'
import { Trophy } from 'lucide-react'
import RefereesCard from './RefereesCard'

export default function NotesMvpTab({ potmOptions, mvp, mvpId, setMvpId, setMvp, mvpRating, setMvpRating, notes, setNotes, refereesProps, t }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Trophy className="size-4 text-amber-500" />
          {t('committee.result.mvp')}
        </div>
        <select
          className={`${'select'} pe-9`}
          value={mvpId || ''}
          onChange={(e) => {
            const id = e.target.value
            setMvpId(id)
            const p = potmOptions.find((x) => String(x.id) === String(id))
            setMvp(p?.name || '')
          }}
        >
          <option value="">{t('committee.result.selectPlayer')}</option>
          {potmOptions.map((p) => (
            <option key={`${p.team_id}-${p.id}`} value={p.id}>
              {p.name}{p.number ? ` (${p.number})` : ''}
            </option>
          ))}
        </select>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">{t('committee.result.mvpRating')}</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setMvpRating(n)} aria-label={`${n} stars`} className="grid size-9 place-items-center">
                <span className={`text-xl ${n <= mvpRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}>★</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.matchNotes')}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('committee.result.notesPlaceholder')}
          rows={4}
          className="input h-auto w-full resize-none py-3"
        />
      </div>

      <RefereesCard {...refereesProps} t={t} />
    </div>
  )
}