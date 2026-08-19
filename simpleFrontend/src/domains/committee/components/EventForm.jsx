import React from 'react'
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'
import { inputClass, selectClass } from '../../../components/dashboard/ui'
import PlayerSelector from './PlayerSelector'

const GOAL_TYPES = [
  { value: 'regular', labelKey: 'committee.result.goalTypes.regular' },
  { value: 'header', labelKey: 'committee.result.goalTypes.header' },
  { value: 'freeKick', labelKey: 'committee.result.goalTypes.freeKick' },
  { value: 'penalty', labelKey: 'committee.result.goalTypes.penalty' },
  { value: 'ownGoal', labelKey: 'committee.result.goalTypes.ownGoal' },
]

export default function EventForm({ type, form, setField, setForm, homeId, awayId, homeName, awayName, onSelectPlayer, onSelectAssist, t, onSubmit, validation, suspendedIds = [] }) {
  const [fieldMinute, fieldAdded] = [setField('minute'), setField('added_time')]

  const changeTeam = (e) => {
    const teamId = e.target.value
    setForm((f) => ({ ...f, team_id: teamId, player_id: null, player: '', assist_player_id: null, assist: '' }))
  }

  return (
    <div className="space-y-4">
      {form.missed !== undefined && type === 'penalty_goal' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, missed: false }))}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${!form.missed ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'}`}
          >
            ✓ {t('committee.result.ev.penaltyGoal')}
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, missed: true }))}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${form.missed ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500'}`}
          >
            ✖ {t('committee.result.ev.missedPenalty')}
          </button>
        </div>
      )}

      {type !== 'other' && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.team')}</span>
          <div className="relative">
            <select className={`${selectClass} pe-9`} value={form.team_id ?? ''} onChange={changeTeam}>
              <option value="">{t('committee.result.selectTeam')}</option>
              {homeId && <option value={homeId}>{homeName}</option>}
              {awayId && <option value={awayId}>{awayName}</option>}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
      )}

      {type === 'goal' && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.goalType')}</span>
          <div className="relative">
            <select className={`${selectClass} pe-9`} value={form.goalType} onChange={setField('goalType')}>
              {GOAL_TYPES.map((g) => <option key={g.value} value={g.value}>{t(g.labelKey)}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
      )}

      {(type === 'yellow_card' || type === 'second_yellow' || type === 'red_card') && (
        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.cardType')}</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, cardColor: 'yellow_card' }))}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${form.cardColor === 'yellow_card' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'}`}
            >
              🟨 {t('committee.result.yellow')}
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, cardColor: 'second_yellow' }))}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${form.cardColor === 'second_yellow' ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500'}`}
            >
              🟨🟥 {t('committee.result.secondYellow')}
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, cardColor: 'red_card' }))}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${form.cardColor === 'red_card' ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-500'}`}
            >
              🟥 {t('committee.result.red')}
            </button>
          </div>
        </div>
      )}

      {type === 'substitution' ? (
        <div className="space-y-3">
          <PlayerSelector
            teamId={form.team_id}
            value={form.player_id}
            valueName={form.player}
            onSelect={onSelectPlayer}
            onClear={() => setForm((f) => ({ ...f, player_id: null, player: '' }))}
            label={t('committee.result.playerOut')}
            placeholder={t('committee.result.selectPlayer')}
            t={t}
            suspendedIds={suspendedIds}
          />
          <div className="flex items-center gap-2">
            <ArrowDown className="size-4 shrink-0 text-rose-400" />
            <div className="flex-1 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600">{form.player || t('committee.result.playerOut')}</div>
          </div>
          <PlayerSelector
            teamId={form.team_id}
            value={form.assist_player_id}
            valueName={form.assist}
            onSelect={onSelectAssist}
            onClear={() => setForm((f) => ({ ...f, assist_player_id: null, assist: '' }))}
            label={t('committee.result.playerIn')}
            placeholder={t('committee.result.selectPlayer')}
            t={t}
            suspendedIds={suspendedIds}
          />
          <div className="flex items-center gap-2">
            <ArrowUp className="size-4 shrink-0 text-emerald-500" />
            <div className="flex-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">{form.assist || t('committee.result.playerIn')}</div>
          </div>
        </div>
      ) : type === 'other' ? (
        <textarea
          value={form.note}
          onChange={setField('note')}
          rows={4}
          placeholder={t('committee.result.notesPlaceholder')}
          className={`${inputClass} h-auto resize-none py-3`}
        />
      ) : (
        <PlayerSelector
          teamId={form.team_id}
          value={form.player_id}
          valueName={form.player}
          onSelect={onSelectPlayer}
          onClear={() => setForm((f) => ({ ...f, player_id: null, player: '' }))}
          label={type === 'goal' ? t('committee.result.scorer') : t('committee.result.player')}
          placeholder={t('committee.result.selectPlayer')}
          t={t}
          autoFocus
          suspendedIds={suspendedIds}
        />
      )}

      {(type === 'goal') && (
        <div className="flex items-center gap-2">
          <input id="mcr-no-assist" type="checkbox" checked={form.noAssist} onChange={(e) => setForm((f) => ({ ...f, noAssist: e.target.checked }))} className="size-4 accent-green-500" />
          <label htmlFor="mcr-no-assist" className="text-xs font-bold text-slate-600">{t('committee.result.noAssist')}</label>
        </div>
      )}

      {(type === 'goal' && !form.noAssist) && (
        <PlayerSelector
          teamId={form.team_id}
          value={form.assist_player_id}
          valueName={form.assist}
          onSelect={onSelectAssist}
          onClear={() => setForm((f) => ({ ...f, assist_player_id: null, assist: '' }))}
          label={t('committee.result.assist')}
          placeholder={t('committee.result.selectPlayer')}
          t={t}
          suspendedIds={suspendedIds}
        />
      )}

      {type !== 'other' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.minute')}</span>
            <input type="number" min="0" max="130" inputMode="numeric" className={inputClass} value={form.minute} onChange={fieldMinute} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.addedTime')}</span>
            <input type="number" min="0" max="30" inputMode="numeric" className={inputClass} value={form.added_time} onChange={fieldAdded} />
          </label>
        </div>
      )}

      {(type === 'yellow_card' || type === 'second_yellow' || type === 'red_card') && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('committee.result.cardReason')}</span>
          <input value={form.reason} onChange={setField('reason')} className={inputClass} />
        </label>
      )}

      {validation && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-600">
          {t(`committee.result.${validation}`)}
        </p>
      )}

      <button className="w-full rounded-md bg-green-500 px-4 py-2 font-semibold text-white" onClick={onSubmit}>
        {t('committee.result.addEventBtn')}
      </button>
    </div>
  )
}
