import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Lock, Save, Unlock } from 'lucide-react'
import api from '../../../api/client'
import { Button, Card, Field, FieldRow, inputClass } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'

const modes = [
  { key: 'fixed', icon: Lock, label: 'committee.detail.modeFixed', desc: 'committee.detail.modeFixedDesc' },
  { key: 'free', icon: Unlock, label: 'committee.detail.modeFree', desc: 'committee.detail.modeFreeDesc' },
]

export default function SettingsTab({ tournament, refresh }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isDraft = tournament.status === 'draft'

  const [name, setName] = useState(tournament.name ?? '')
  const [teamsCount, setTeamsCount] = useState(tournament.teams_count ?? 2)
  const [teamsPerGroup, setTeamsPerGroup] = useState(tournament.teams_per_group ?? 2)
  const [qualifyPerGroup, setQualifyPerGroup] = useState(tournament.qualify_per_group ?? 2)
  const [groupMode, setGroupMode] = useState(tournament.group_mode ?? 'fixed')
  const [matchDuration, setMatchDuration] = useState(tournament.match_duration_minutes ?? 90)
  const [matchesPerDay, setMatchesPerDay] = useState(tournament.matches_per_day ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}`, {
        name,
        teams_count: teamsCount,
        teams_per_group: teamsPerGroup,
        qualify_per_group: qualifyPerGroup,
        group_mode: groupMode,
        match_duration_minutes: matchDuration,
        matches_per_day: matchesPerDay === '' || matchesPerDay === null ? null : matchesPerDay,
      })
      toast.success(t('committee.detail.settingsSaved'))
      refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={t('committee.detail.settings')} subtitle={t('committee.detail.settingsDesc')}>
      {!isDraft && (
        <p className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-bold text-amber-700">
          <Lock className="size-4 shrink-0" />
          {t('committee.detail.settingsLocked')}
        </p>
      )}

      <Field label={t('committee.detail.settingsName')}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} disabled={!isDraft} />
      </Field>

      <div className="mt-4">
        <FieldRow>
          <Field label={t('committee.detail.settingsTeamsCount')}>
            <input
              type="number"
              min="2"
              max="64"
              className={inputClass}
              value={teamsCount}
              onChange={(e) => setTeamsCount(e.target.value)}
              disabled={!isDraft}
            />
          </Field>
          <Field label={t('committee.detail.settingsTeamsPerGroup')}>
            <input
              type="number"
              min="2"
              max="16"
              className={inputClass}
              value={teamsPerGroup}
              onChange={(e) => setTeamsPerGroup(e.target.value)}
              disabled={!isDraft}
            />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label={t('committee.detail.settingsMatchDuration')}>
            <input
              type="number"
              min="1"
              max="300"
              className={inputClass}
              value={matchDuration}
              onChange={(e) => setMatchDuration(e.target.value)}
              disabled={!isDraft}
            />
          </Field>
          <Field label={t('committee.detail.settingsMatchesPerDay')} hint={t('committee.detail.settingsMatchesPerDayHint')}>
            <input
              type="number"
              min="1"
              max="30"
              className={inputClass}
              value={matchesPerDay}
              onChange={(e) => setMatchesPerDay(e.target.value)}
              placeholder={t('committee.detail.settingsMatchesPerDayPlaceholder')}
              disabled={!isDraft}
            />
          </Field>
        </FieldRow>
      </div>

      {tournament.tournament_format === 'groups_knockout' && (
        <div className="mt-4">
          <FieldRow>
            <Field label={t('committee.tournaments.form.qualifyPerGroup')} hint={t('committee.tournaments.form.qualifyPerGroupHint')}>
              <input
                type="number"
                min="1"
                max="16"
                className={inputClass}
                value={qualifyPerGroup}
                onChange={(e) => setQualifyPerGroup(e.target.value)}
                disabled={!isDraft}
              />
            </Field>
            <Field label={t('committee.tournaments.form.knockoutTeams')}>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                {Number(tournament.groups_count ?? 0) * Number(qualifyPerGroup || 0)}
              </div>
            </Field>
          </FieldRow>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-xs font-extrabold text-slate-700">{t('committee.detail.settingsMode')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map(({ key, icon: Icon, label, desc }) => {
            const selected = groupMode === key
            return (
              <button
                key={key}
                type="button"
                disabled={!isDraft}
                onClick={() => setGroupMode(key)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors ${
                  selected ? 'border-green-400 bg-green-50/70 ring-1 ring-green-400' : 'border-slate-200 bg-white hover:border-slate-300'
                } ${!isDraft ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    selected ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-extrabold text-slate-900">
                    {t(label)}
                    {selected && <Check className="size-4 text-green-500" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{t(desc)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6">
        <Button loading={busy} onClick={save} disabled={!isDraft}>
          <Save className="size-4" />
          {t('committee.detail.settingsSave')}
        </Button>
      </div>
    </Card>
  )
}
