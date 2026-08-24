import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, ImagePlus, Lock, Palette, Save, ScrollText, ShieldAlert, SlidersHorizontal, Trophy, Unlock, Users } from 'lucide-react'
import api from '../../../api/client'
import { Button, Card, Field, FieldRow, Toggle, inputClass, selectClass } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

const modes = [
  { key: 'fixed', icon: Lock, label: 'committee.detail.modeFixed', desc: 'committee.detail.modeFixedDesc' },
  { key: 'free', icon: Unlock, label: 'committee.detail.modeFree', desc: 'committee.detail.modeFreeDesc' },
]

const formats = ['groups_knockout', 'groups_only', 'knockout_only', 'league', 'custom']

const cardAccumulationModes = ['disabled', 'group', 'tournament']

const toLocalInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SectionHeader({ icon: Icon, title, desc }) {
  return (
    <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-50 text-green-600">
        <Icon className="size-4" />
      </span>
      <div>
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
        <p className="text-[11px] font-semibold text-slate-400">{desc}</p>
      </div>
    </div>
  )
}

export default function SettingsTab({ tournament, refresh }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const editable = ['draft', 'open_for_registration', 'registration_closed'].includes(tournament.status)
  const registrationOpen = tournament.status === 'open_for_registration'

  const [name, setName] = useState(tournament.name ?? '')
  const [format, setFormat] = useState(tournament.tournament_format ?? 'groups_knockout')
  const [teamsCount, setTeamsCount] = useState(tournament.teams_count ?? 8)
  const [teamsPerGroup, setTeamsPerGroup] = useState(tournament.teams_per_group ?? 4)
  const [qualifyPerGroup, setQualifyPerGroup] = useState(tournament.qualify_per_group ?? 2)
  const [groupMode, setGroupMode] = useState(tournament.group_mode ?? 'fixed')
  const [matchDuration, setMatchDuration] = useState(tournament.match_duration_minutes ?? 90)
  const [cardAccumulation, setCardAccumulation] = useState(tournament.card_accumulation ?? 'tournament')
  const [matchesPerDay, setMatchesPerDay] = useState(tournament.matches_per_day ?? '')
  const [regStart, setRegStart] = useState(toLocalInput(tournament.registration_start_at))
  const [regEnd, setRegEnd] = useState(toLocalInput(tournament.registration_end_at))
  const [regFee, setRegFee] = useState(tournament.registration_fee ?? '')
  const [rules, setRules] = useState(tournament.rules ?? '')
  const [primaryColor, setPrimaryColor] = useState(tournament.primary_color ?? '')
  const [secondaryColor, setSecondaryColor] = useState(tournament.secondary_color ?? '')
  const [coverFile, setCoverFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [brandingBusy, setBrandingBusy] = useState(false)

  const isGroupFormat = format === 'groups_knockout' || format === 'groups_only'
  const derivedGroups = isGroupFormat
    ? Math.max(2, Math.min(16, Math.ceil(Number(teamsCount || 0) / Math.max(2, Number(teamsPerGroup || 2)))))
    : 0
  const computedKnockout = derivedGroups * Number(qualifyPerGroup || 0)

  const save = async () => {
    setBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}`, {
        name,
        tournament_format: format,
        teams_count: teamsCount,
        teams_per_group: isGroupFormat ? teamsPerGroup : null,
        qualify_per_group: isGroupFormat ? qualifyPerGroup : null,
        knockout_teams: format === 'groups_knockout'
          ? computedKnockout
          : format === 'knockout_only'
            ? tournament.knockout_teams || tournament.teams_count
            : null,
        group_mode: groupMode,
        match_duration_minutes: matchDuration,
        card_accumulation: cardAccumulation,
        matches_per_day: matchesPerDay === '' || matchesPerDay === null ? null : matchesPerDay,
        registration_start_at: regStart || null,
        registration_end_at: regEnd || null,
        registration_fee: regFee === '' ? 0 : regFee,
        rules: rules || null,
      })
      toast.success(t('committee.detail.settingsSaved'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const toggleRegistration = async (open) => {
    setToggleBusy(true)
    try {
      const endpoint = open ? '/open-registration' : '/close-registration'
      await api.post(`/committee/tournaments/${tournament.id}${endpoint}`)
      toast.success(t(open ? 'committee.detail.openRegistrationToast' : 'committee.detail.closeRegistrationToast'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setToggleBusy(false)
    }
  }

  const saveBranding = async () => {
    setBrandingBusy(true)
    try {
      const fd = new FormData()
      if (logoFile) fd.append('logo', logoFile)
      if (coverFile) fd.append('cover', coverFile)
      if (primaryColor) fd.append('primary_color', primaryColor)
      if (secondaryColor) fd.append('secondary_color', secondaryColor)
      await api.post(`/committee/tournaments/${tournament.id}/branding`, fd)
      toast.success(t('committee.detail.brandingUpdated'))
      setLogoFile(null)
      setCoverFile(null)
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBrandingBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card title={t('committee.detail.settings')} subtitle={t('committee.detail.settingsDesc')}>
        {!editable && (
          <p className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-bold text-amber-700">
            <Lock className="size-4 shrink-0" />
            {t('committee.detail.settingsLocked')}
          </p>
        )}

        <Field label={t('committee.detail.settingsName')}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} />
        </Field>
      </Card>

      <Card>
        <SectionHeader
          icon={Palette}
          title={t('committee.detail.settingsSectionBranding')}
          desc={t('committee.detail.settingsSectionBrandingDesc')}
        />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">{t('committee.detail.settingsBrandingLogo')}</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3 transition-colors hover:border-green-400">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  {(logoFile || tournament.logo_url) ? (
                    <img src={logoFile ? URL.createObjectURL(logoFile) : tournament.logo_url} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus className="size-5 text-slate-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-700">
                    {logoFile ? logoFile.name : t('committee.detail.settingsBrandingUpload')}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{t('committee.detail.settingsBrandingLogoHint')}</span>
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">{t('committee.detail.settingsBrandingCover')}</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3 transition-colors hover:border-green-400">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  {(coverFile || tournament.cover_url) ? (
                    <img src={coverFile ? URL.createObjectURL(coverFile) : tournament.cover_url} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus className="size-5 text-slate-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-700">
                    {coverFile ? coverFile.name : t('committee.detail.settingsBrandingUpload')}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{t('committee.detail.settingsBrandingCoverHint')}</span>
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <FieldRow>
            <Field label={t('committee.detail.settingsBrandingPrimary')}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor || '#16a34a'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-11 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                />
                <input
                  className={inputClass}
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#16a34a"
                />
              </div>
            </Field>
            <Field label={t('committee.detail.settingsBrandingSecondary')}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor || '#0f172a'}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="size-11 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                />
                <input
                  className={inputClass}
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#0f172a"
                />
              </div>
            </Field>
          </FieldRow>
          <div className="flex justify-end">
            <Button variant="outline" loading={brandingBusy} onClick={saveBranding}>
              <Save className="size-4" />
              {t('committee.detail.settingsBrandingSave')}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={CalendarClock}
          title={t('committee.detail.settingsSectionRegistration')}
          desc={t('committee.detail.settingsSectionRegistrationDesc')}
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-800">{t('committee.detail.settingsRegistrationEnabled')}</p>
              <p className="text-[11px] font-semibold text-slate-400">{t('committee.detail.settingsRegistrationEnabledHint')}</p>
              {!registrationOpen && editable && tournament.status !== 'draft' && (
                <p className="mt-1 text-[11px] font-bold text-amber-600">{t('committee.detail.settingsRegistrationClosedNote')}</p>
              )}
            </div>
            <Toggle
              checked={registrationOpen}
              disabled={!editable || tournament.status === 'registration_closed' || toggleBusy}
              onChange={toggleRegistration}
              title={t('committee.detail.settingsRegistrationEnabled')}
            />
          </div>
          <FieldRow>
            <Field label={t('committee.detail.settingsRegistrationStart')}>
              <input
                type="datetime-local"
                className={inputClass}
                value={regStart}
                onChange={(e) => setRegStart(e.target.value)}
                disabled={!editable}
              />
            </Field>
            <Field label={t('committee.detail.settingsRegistrationEnd')}>
              <input
                type="datetime-local"
                className={inputClass}
                value={regEnd}
                onChange={(e) => setRegEnd(e.target.value)}
                disabled={!editable}
              />
            </Field>
          </FieldRow>
          <Field label={t('committee.detail.registrationFee')}>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={regFee}
              onChange={(e) => setRegFee(e.target.value)}
              placeholder="0"
              disabled={!editable}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={ScrollText}
          title={t('committee.detail.settingsSectionRules')}
          desc={t('committee.detail.settingsSectionRulesDesc')}
        />
        <Field label={t('committee.detail.settingsRules')} hint={t('committee.detail.settingsRulesHint')}>
          <textarea
            className={`${inputClass} min-h-32 resize-y py-3`}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder={t('committee.detail.settingsRulesPlaceholder')}
            disabled={!editable}
          />
        </Field>
      </Card>

      <Card>
        <SectionHeader
          icon={SlidersHorizontal}
          title={t('committee.detail.settingsSectionFormat')}
          desc={t('committee.detail.settingsSectionFormatDesc')}
        />
        <div className="space-y-4">
          <Field label={t('committee.detail.settingsFormatLabel')}>
            <select className={selectClass} value={format} onChange={(e) => setFormat(e.target.value)} disabled={!editable}>
              {formats.map((f) => (
                <option key={f} value={f}>{t(`committee.tournaments.formats.${f}`)}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map(({ key, icon: Icon, label, desc }) => {
              const selected = groupMode === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!editable}
                  onClick={() => setGroupMode(key)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors ${
                    selected ? 'border-green-400 bg-green-50/70 ring-1 ring-green-400' : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${!editable ? 'cursor-not-allowed opacity-60' : ''}`}
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
          <FieldRow>
            <Field label={t('committee.detail.settingsMatchDuration')}>
              <input
                type="number"
                min="1"
                max="300"
                className={inputClass}
                value={matchDuration}
                onChange={(e) => setMatchDuration(e.target.value)}
                disabled={!editable}
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
                disabled={!editable}
              />
            </Field>
          </FieldRow>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={ShieldAlert}
          title={t('committee.detail.settingsSectionCards')}
          desc={t('committee.detail.settingsSectionCardsDesc')}
        />
        <div className="space-y-4">
          <Field label={t('committee.detail.settingsCardAccumulation')} hint={t('committee.detail.settingsCardAccumulationHint')}>
            <select
              className={selectClass}
              value={cardAccumulation}
              onChange={(e) => setCardAccumulation(e.target.value)}
              disabled={!editable}
            >
              {cardAccumulationModes.map((m) => (
                <option key={m} value={m}>{t(`committee.detail.cardAccumulation.${m}`)}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={Users}
          title={t('committee.detail.settingsSectionTeamLimits')}
          desc={t('committee.detail.settingsSectionTeamLimitsDesc')}
        />
        <div className="space-y-4">
          <FieldRow>
            <Field label={t('committee.detail.settingsTeamsCount')}>
              <input
                type="number"
                min="2"
                max="64"
                className={inputClass}
                value={teamsCount}
                onChange={(e) => setTeamsCount(e.target.value)}
                disabled={!editable}
              />
            </Field>
            {isGroupFormat && (
              <Field label={t('committee.detail.settingsTeamsPerGroup')}>
                <input
                  type="number"
                  min="2"
                  max="16"
                  className={inputClass}
                  value={teamsPerGroup}
                  onChange={(e) => setTeamsPerGroup(e.target.value)}
                  disabled={!editable}
                />
              </Field>
            )}
          </FieldRow>
          {isGroupFormat && (
            <Field label={t('committee.detail.settingsGroupsCount')} hint={t('committee.detail.settingsGroupsDerived')}>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                <Users className="size-4 text-slate-400" />
                {groupMode === 'free'
                  ? t('committee.detail.settingsGroupsDynamic')
                  : t('committee.tournaments.form.derivedGroups', { count: derivedGroups })}
              </div>
            </Field>
          )}
          {isGroupFormat && (
            <FieldRow>
              <Field label={t('committee.detail.settingsQualifyPerGroup')}>
                <input
                  type="number"
                  min="1"
                  max="16"
                  className={inputClass}
                  value={qualifyPerGroup}
                  onChange={(e) => setQualifyPerGroup(e.target.value)}
                  disabled={!editable}
                />
              </Field>
              <Field label={t('committee.detail.settingsKnockoutTeams')} hint={t('committee.detail.settingsKnockoutDerived')}>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                  <Trophy className="size-4 text-slate-400" />
                  {format === 'groups_knockout'
                    ? computedKnockout
                    : format === 'knockout_only'
                      ? (tournament.knockout_teams || tournament.teams_count)
                      : '—'}
                </div>
              </Field>
            </FieldRow>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button loading={busy} onClick={save} disabled={!editable}>
          <Save className="size-4" />
          {t('committee.detail.settingsSave')}
        </Button>
      </div>
    </div>
  )
}
