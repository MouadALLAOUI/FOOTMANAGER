import React from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import SectionCard from '../../../components/ui/SectionCard'
import { inputClass, selectClass } from '../../../components/dashboard/ui'

export default function RefereesCard({ referees, assigned, setAssigned, newRefName, setNewRefName, newRefPhone, setNewRefPhone, addingReferee, addReferee, t }) {
  return (
    <SectionCard title={t('committee.result.referees')} icon={() => null}>
      <p className="mb-3 text-[11px] font-semibold text-slate-400">{t('committee.result.refereesDesc')}</p>
      <div className="space-y-2.5">
        {['main', 'assistant1', 'assistant2', 'fourth'].map((value) => (
          <label key={value} className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
              {t(`committee.result.refereeRoles.${value}`)}
              {assigned[value] != null && (
                <button
                  type="button"
                  onClick={() => setAssigned((a) => ({ ...a, [value]: null }))}
                  aria-label={t('committee.result.noReferee')}
                  className="text-[10px] font-bold text-slate-400 transition-colors hover:text-rose-500"
                >
                  {t('committee.result.noReferee')} ✕
                </button>
              )}
            </span>
            <div className="relative">
              <select
                className={`${selectClass} pe-9`}
                value={assigned[value] ?? ''}
                onChange={(e) => setAssigned((a) => ({ ...a, [value]: e.target.value || null }))}
              >
                <option value="">{t('committee.result.noReferee')}</option>
                {referees.map((ref) => (
                  <option key={ref.id} value={ref.id}>{ref.name}{ref.position ? ` (${ref.position})` : ''}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-3">
        <p className="mb-2 text-[11px] font-bold text-slate-600">{t('committee.result.addReferee')}</p>
        <input
          value={newRefName}
          onChange={(e) => setNewRefName(e.target.value)}
          placeholder={t('committee.result.refereeName')}
          className={inputClass}
        />
        <input
          value={newRefPhone}
          onChange={(e) => setNewRefPhone(e.target.value)}
          placeholder={t('committee.result.refereePhone')}
          inputMode="tel"
          className={`${inputClass} mt-2`}
        />
        <button className="mt-2 w-full rounded-md bg-green-500 px-4 py-2 font-semibold text-white" onClick={addReferee} disabled={addingReferee}>
          <Plus className="size-4" />
          {t('committee.result.addRefereeBtn')}
        </button>
      </div>
    </SectionCard>
  )
}
