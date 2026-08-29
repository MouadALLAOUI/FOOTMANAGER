import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, Eye, EyeOff, MapPin, Plus, Trophy } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Button, Field, FieldRow, SectionTitle, SkeletonCards, StatusBadge, inputClass, selectClass } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { useTranslation } from 'react-i18next'

const emptyForm = {
  name: '',
  edition: '',
  category: '',
  description: '',
  rules: '',
  location: '',
  stadium_id: '',
  start_date: '',
  end_date: '',
  tournament_format: 'groups_knockout',
  teams_count: '8',
  teams_per_group: '4',
  group_mode: 'fixed',
  qualify_per_group: '2',
  knockout_teams: '4',
  points_for_win: '3',
  points_for_draw: '1',
  points_for_loss: '0',
}

const formats = ['groups_knockout', 'groups_only', 'knockout_only', 'league', 'custom']
const categories = ['أكابر', 'شبان', 'صغار', 'نسوية', 'محلية']

export default function Tournaments() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [showHidden, setShowHidden] = useState(false)
  const { data, loading, errorState, refetch } = useApi(
    () => api.get('/committee/tournaments', { params: { visibility: showHidden ? 'hidden' : 'visible' } }).then((r) => r.data),
    [showHidden],
  )

  const tournaments = data?.data || []

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)

  const { data: stadiums } = useApi(
    () => api.get('/v1/stadiums', { params: { per_page: 50 } }).then((r) => r.data.data),
    [],
    { enabled: drawerOpen },
  )

  useEffect(() => {
    if (params.get('new')) {
      setForm(emptyForm)
      setDrawerOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openCreate = () => {
    setForm(emptyForm)
    setDrawerOpen(true)
  }

  const isGroupFormat = form.tournament_format === 'groups_knockout' || form.tournament_format === 'groups_only'
  const isKnockout = form.tournament_format === 'groups_knockout' || form.tournament_format === 'knockout_only'
  const derivedGroups = isGroupFormat
    ? Math.max(2, Math.min(16, Math.ceil(Number(form.teams_count || 0) / Math.max(2, Number(form.teams_per_group || 2)))))
    : 0
  const computedKnockout = derivedGroups * Number(form.qualify_per_group || 0)

  const save = async () => {
    if (!form.name || !form.start_date) {
      toast.error(t('committee.tournaments.form.required'))
      return
    }
    if (isGroupFormat && Number(form.teams_count) < 2) {
      toast.error(t('committee.tournaments.form.teamsCountMin'))
      return
    }
    setBusy(true)
    const payload = {
      name: form.name,
      edition: form.edition || null,
      category: form.category || null,
      description: form.description || null,
      rules: form.rules || null,
      location: form.location || null,
      stadium_id: form.stadium_id ? Number(form.stadium_id) : null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      tournament_format: form.tournament_format,
      teams_count: Number(form.teams_count),
      teams_per_group: isGroupFormat ? Number(form.teams_per_group) : null,
      group_mode: isGroupFormat ? form.group_mode : null,
      knockout_teams: form.tournament_format === 'groups_knockout'
        ? computedKnockout
        : isKnockout && form.knockout_teams
          ? Number(form.knockout_teams)
          : null,
      qualify_per_group: form.tournament_format === 'groups_knockout' ? Number(form.qualify_per_group || 0) : null,
      points_for_win: Number(form.points_for_win),
      points_for_draw: Number(form.points_for_draw),
      points_for_loss: Number(form.points_for_loss),
    }
    try {
      const r = await api.post('/committee/tournaments', payload)
      toast.success(r.data.message || t('committee.tournaments.form.created'))
      setDrawerOpen(false)
      refetch()
      navigate(`/committee/tournaments/${r.data.data.id}`)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <SectionTitle
        title={t('committee.tournaments.title')}
        subtitle={t('committee.tournaments.subtitle')}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('nav.committee.createTournament')}
          </Button>
        }
/>

      <div className="mb-4 flex w-fit gap-1.5 rounded-2xl bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
        <button
          type="button"
          onClick={() => setShowHidden(false)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
            !showHidden ? 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)]' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Eye className="size-4" />
          {t('committee.tournaments.showVisible')}
        </button>
        <button
          type="button"
          onClick={() => setShowHidden(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
            showHidden ? 'bg-slate-800 text-white shadow-[0_8px_20px_rgba(15,23,42,0.3)]' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <EyeOff className="size-4" />
          {t('committee.tournaments.showHidden')}
        </button>
      </div>

      {errorState ? (
        <SectionError state={errorState} onRetry={refetch} />
      ) : loading ? (
        <SkeletonCards count={3} />
      ) : tournaments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-green-50 text-green-500">
            <Trophy className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">{t('committee.tournaments.empty')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('committee.tournaments.emptyDesc')}</p>
          <Button size="sm" variant="soft" className="mt-5" onClick={openCreate}>
            <Plus className="size-3.5" />
            {t('nav.committee.createTournament')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tour) => (
            <button
              key={tour.id}
              type="button"
              onClick={() => navigate(`/committee/tournaments/${tour.id}`)}
              className="rounded-3xl border border-slate-200/70 bg-white p-5 text-start shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-green-50 text-green-500">
                  <Trophy className="size-5" strokeWidth={2} />
                </span>
                <StatusBadge status={tour.status} />
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-slate-900">{tour.name}</h3>
              {tour.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{tour.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-slate-400" />
                  {tour.start_date}{tour.end_date ? ` → ${tour.end_date}` : ''}
                </span>
                {tour.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-slate-400" />
                    {tour.location}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{t('committee.tournaments.teamsCount', { count: tour.teams_count })}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{t(`committee.tournaments.formats.${tour.tournament_format}`)}</span>
                {tour.is_hidden && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <EyeOff className="size-3" />
                    {t('committee.tournaments.hidden')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t('committee.tournaments.form.title')}
        subtitle={t('committee.tournaments.form.subtitle')}
        size="560"
      >
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-green-50 text-green-600">
                <Trophy className="size-4" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{t('committee.tournaments.form.basic')}</h4>
                <p className="text-[11px] font-semibold text-slate-400">{t('committee.tournaments.form.basicDesc')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <Field label={t('committee.tournaments.form.name')} required>
                <input className={inputClass} value={form.name} onChange={set('name')} />
              </Field>
              <FieldRow>
                <Field label={t('committee.tournaments.form.edition')}>
                  <input className={inputClass} value={form.edition} onChange={set('edition')} placeholder="8" />
                </Field>
                <Field label={t('committee.tournaments.form.category')}>
                  <select className={selectClass} value={form.category} onChange={set('category')}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </FieldRow>
              <Field label={t('committee.tournaments.form.stadium')}>
                <select className={selectClass} value={form.stadium_id} onChange={set('stadium_id')}>
                  <option value="">—</option>
                  {(stadiums || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.city ? ` • ${s.city}` : ''}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('committee.tournaments.form.description')}>
                <textarea className={`${inputClass} h-24 resize-none !h-auto py-3`} value={form.description} onChange={set('description')} />
              </Field>
              <Field label={t('committee.tournaments.form.rules')}>
                <textarea className={`${inputClass} h-24 resize-none !h-auto py-3`} value={form.rules} onChange={set('rules')} />
              </Field>
              <Field label={t('committee.tournaments.form.location')}>
                <input className={inputClass} value={form.location} onChange={set('location')} />
              </Field>
              <FieldRow>
                <Field label={t('committee.tournaments.form.startDate')} required>
                  <input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} />
                </Field>
                <Field label={t('committee.tournaments.form.endDate')}>
                  <input type="date" className={inputClass} value={form.end_date} onChange={set('end_date')} />
                </Field>
              </FieldRow>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{t('committee.tournaments.form.format')}</h4>
                <p className="text-[11px] font-semibold text-slate-400">{t('committee.tournaments.form.formatDesc')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <Field label={t('committee.tournaments.form.tournamentFormat')}>
                <select className={selectClass} value={form.tournament_format} onChange={set('tournament_format')}>
                  {formats.map((f) => (
                    <option key={f} value={f}>{t(`committee.tournaments.formats.${f}`)}</option>
                  ))}
                </select>
              </Field>
              <FieldRow cols={2}>
                <Field label={t('committee.tournaments.form.teamsCount')}>
                  <input type="number" min="2" max="64" className={inputClass} value={form.teams_count} onChange={set('teams_count')} />
                </Field>
                {isGroupFormat && (
                  <Field label={t('committee.tournaments.form.teamsPerGroup')}>
                    <input type="number" min="2" max="16" className={inputClass} value={form.teams_per_group} onChange={set('teams_per_group')} />
                  </Field>
                )}
              </FieldRow>
              {isGroupFormat && (
                <Field
                  label={t('committee.tournaments.form.groupsCount')}
                  hint={t('committee.tournaments.form.groupsDerivedHint')}
                >
                  <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                    {form.group_mode === 'free'
                      ? t('committee.tournaments.form.groupsDynamic')
                      : t('committee.tournaments.form.derivedGroups', { count: derivedGroups })}
                  </div>
                </Field>
              )}
              {isGroupFormat && (
                <Field label={t('committee.tournaments.form.groupMode')}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'fixed', label: t('committee.detail.modeFixed'), desc: t('committee.detail.modeFixedDesc') },
                      { key: 'free', label: t('committee.detail.modeFree'), desc: t('committee.detail.modeFreeDesc') },
                    ].map((m) => {
                      const selected = form.group_mode === m.key
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, group_mode: m.key }))}
                          className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-start transition-colors ${
                            selected ? 'border-green-400 bg-green-50/70 ring-1 ring-green-400' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-extrabold text-slate-800">{m.label}</span>
                          <span className="text-[10px] font-semibold text-slate-500">{m.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </Field>
              )}
              {form.tournament_format === 'groups_knockout' && (
                <Field label={t('committee.tournaments.form.qualifyPerGroup')} hint={t('committee.tournaments.form.qualifyPerGroupHint')}>
                  <input type="number" min="1" max="16" className={inputClass} value={form.qualify_per_group} onChange={set('qualify_per_group')} />
                </Field>
              )}
              {form.tournament_format === 'groups_knockout' && (
                <Field label={t('committee.tournaments.form.knockoutTeams')} hint={t('committee.tournaments.form.knockoutTeamsHint')}>
                  <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                    {computedKnockout}
                  </div>
                </Field>
              )}
              {form.tournament_format === 'knockout_only' && (
                <Field label={t('committee.tournaments.form.knockoutTeams')} hint={t('committee.tournaments.form.knockoutTeamsHint')}>
                  <input type="number" min="2" max="64" className={inputClass} value={form.knockout_teams} onChange={set('knockout_teams')} />
                </Field>
              )}
              <FieldRow cols={3}>
                <Field label={t('committee.tournaments.form.pointsWin')}>
                  <input type="number" min="0" max="10" className={inputClass} value={form.points_for_win} onChange={set('points_for_win')} />
                </Field>
                <Field label={t('committee.tournaments.form.pointsDraw')}>
                  <input type="number" min="0" max="10" className={inputClass} value={form.points_for_draw} onChange={set('points_for_draw')} />
                </Field>
                <Field label={t('committee.tournaments.form.pointsLoss')}>
                  <input type="number" min="0" max="10" className={inputClass} value={form.points_for_loss} onChange={set('points_for_loss')} />
                </Field>
              </FieldRow>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
            <Button className="flex-1" disabled={busy} onClick={save}>
              {t('committee.tournaments.form.submit')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
