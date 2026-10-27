import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  DoorOpen,
  Save,
  Trophy,
} from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Button, Card, Skeleton } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'

import ProgressHeader, { WIZARD_STEPS } from './ProgressHeader'
import DraftResumeBanner from './DraftResumeBanner'
import Step1BasicInfo from './Step1BasicInfo'
import Step2PublishTournament from './Step2PublishTournament'
import Step3ManageTeams from './Step3ManageTeams'
import Step4CloseRegistration from './Step4CloseRegistration'

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
  league_mode: 'single_round_robin',
  rest_days_minimum: 1,
  teams_count: 8,
  teams_per_group: 4,
  group_mode: 'fixed',
  qualify_per_group: 2,
  knockout_teams: 4,
  match_duration_minutes: 90,
  half_duration_minutes: 45,
  points_for_win: 3,
  points_for_draw: 1,
  points_for_loss: 0,
  registration_fee: 0,
  registration_start_at: '',
  registration_end_at: '',
}

export default function TournamentWizard() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id: paramId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const tournamentId = paramId || searchParams.get('id') || searchParams.get('draft_id')

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch Stadiums for Step 1
  const { data: stadiumsData } = useApi(
    () => api.get('/v1/stadiums', { params: { per_page: 50 } }).then((r) => r.data.data),
    [],
  )
  const stadiums = stadiumsData || []

  // Fetch Current Tournament (if ID exists)
  const {
    data: tourData,
    loading: loadingTour,
    refetch: refetchTour,
  } = useApi(
    () => (tournamentId ? api.get(`/committee/tournaments/${tournamentId}`).then((r) => r.data.data) : Promise.resolve(null)),
    [tournamentId, refreshKey],
    { enabled: Boolean(tournamentId) },
  )

  const tour = tourData || null

  // Fetch Existing Drafts if no tournamentId is selected
  const {
    data: draftsData,
    loading: loadingDrafts,
    refetch: refetchDrafts,
  } = useApi(
    () => api.get('/committee/tournaments', { params: { status: 'draft', per_page: 10 } }).then((r) => r.data.data),
    [refreshKey],
    { enabled: !tournamentId },
  )
  const existingDrafts = draftsData || []

  // Populate form when tourData arrives
  useEffect(() => {
    if (tour) {
      setForm((prev) => ({
        ...prev,
        name: tour.name || '',
        edition: tour.edition || '',
        category: tour.category || '',
        description: tour.description || '',
        rules: tour.rules || '',
        location: tour.location || '',
        stadium_id: tour.stadium?.id || tour.stadium_id || '',
        start_date: tour.start_date || '',
        end_date: tour.end_date || '',
        tournament_format: tour.tournament_format || 'groups_knockout',
        league_mode: tour.league_mode || 'single_round_robin',
        rest_days_minimum: tour.rest_days_minimum ?? 1,
        teams_count: tour.teams_count ?? 8,
        teams_per_group: tour.teams_per_group ?? 4,
        group_mode: tour.group_mode || 'fixed',
        qualify_per_group: tour.qualify_per_group ?? 2,
        knockout_teams: tour.knockout_teams ?? 4,
        match_duration_minutes: tour.match_duration_minutes ?? 90,
        half_duration_minutes: tour.half_duration_minutes ?? 45,
        points_for_win: tour.points_for_win ?? 3,
        points_for_draw: tour.points_for_draw ?? 1,
        points_for_loss: tour.points_for_loss ?? 0,
        registration_fee: tour.registration_fee ?? 0,
        registration_start_at: tour.registration_start_at || '',
        registration_end_at: tour.registration_end_at || '',
        logo_url: tour.logo_url || '',
      }))

      if (tour.plan?.wizard?.current_step && !paramId) {
        const savedStep = Number(tour.plan.wizard.current_step)
        if (savedStep >= 1 && savedStep <= 4) {
          setCurrentStep(savedStep)
        }
      }
      setLastSavedAt(tour.updated_at || new Date().toISOString())
    }
  }, [tour, paramId])

  // Handle Form Change
  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Calculate Real Step Validation States
  const stepStates = useMemo(() => {
    const s1Complete = Boolean(tour?.name && tour?.start_date) || Boolean(form.name && form.start_date)
    const isPublished = tour?.status && tour.status !== 'draft'
    const s2Complete = isPublished
    const regTeamsCount = Number(tour?.stats?.registered_teams ?? 0)
    const targetTeams = Number(tour?.teams_count ?? form.teams_count ?? 8)
    const s3Complete = regTeamsCount >= 2
    const s4Complete = tour?.status === 'registration_closed' || regTeamsCount >= targetTeams

    return {
      1: { completed: s1Complete, accessible: true, attention: !s1Complete && currentStep > 1 },
      2: { completed: s2Complete, accessible: s1Complete && Boolean(tour?.id), attention: !s2Complete && currentStep > 2 },
      3: { completed: s3Complete, accessible: Boolean(tour?.id), attention: !s3Complete && currentStep > 3 },
      4: { completed: s4Complete, accessible: s3Complete, attention: false },
    }
  }, [tour, form, currentStep])

  // Persist Tournament Draft to Backend
  const saveTournamentDraft = async (targetNextStep = null) => {
    if (!form.name || !form.start_date) {
      toast.error('يرجى ملء اسم البطولة وتاريخ الانطلاق للمتابعة')
      return false
    }

    setSaving(true)
    const nextStep = targetNextStep || currentStep

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
      league_mode: form.tournament_format === 'league' ? form.league_mode : null,
      rest_days_minimum: form.tournament_format === 'league' ? Number(form.rest_days_minimum || 1) : null,
      teams_count: Number(form.teams_count || 8),
      teams_per_group: form.tournament_format === 'league' ? null : Number(form.teams_per_group || 4),
      group_mode: form.tournament_format === 'league' ? null : (form.group_mode || 'fixed'),
      knockout_teams: form.tournament_format === 'groups_knockout' ? Number(form.knockout_teams || 4) : null,
      qualify_per_group: form.tournament_format === 'groups_knockout' ? Number(form.qualify_per_group || 2) : null,
      match_duration_minutes: Number(form.match_duration_minutes || 90),
      half_duration_minutes: Number(form.half_duration_minutes || 45),
      points_for_win: Number(form.points_for_win ?? 3),
      points_for_draw: Number(form.points_for_draw ?? 1),
      points_for_loss: Number(form.points_for_loss ?? 0),
      registration_fee: Number(form.registration_fee || 0),
      plan: {
        ...(tour?.plan || {}),
        wizard: {
          current_step: nextStep,
          completed_steps: Object.entries(stepStates)
            .filter(([, s]) => s.completed)
            .map(([k]) => Number(k)),
          last_saved_at: new Date().toISOString(),
        },
      },
    }

    try {
      if (tour?.id) {
        await api.put(`/committee/tournaments/${tour.id}`, payload)
        setLastSavedAt(new Date().toISOString())
        toast.success('تم حفظ التغييرات في مسودة البطولة')
        refetchTour()
        return true
      } else {
        const res = await api.post('/committee/tournaments', payload)
        const createdTour = res.data.data
        toast.success('تم إنشاء وحفظ مسودة البطولة بنجاح')
        setSearchParams({ id: createdTour.id }, { replace: true })
        setLastSavedAt(new Date().toISOString())
        setRefreshKey((k) => k + 1)
        return true
      }
    } catch (err) {
      toastApiError(err)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Next / Previous Navigation Handlers
  const handleNext = async () => {
    if (currentStep === 1) {
      const ok = await saveTournamentDraft(2)
      if (ok) setCurrentStep(2)
    } else {
      setCurrentStep((s) => Math.min(WIZARD_STEPS.length, s + 1))
    }
  }

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  const handleStepClick = async (stepId) => {
    if (currentStep === 1) {
      await saveTournamentDraft(stepId)
    }
    setCurrentStep(stepId)
  }

  const handleResumeDraft = (draft) => {
    setSearchParams({ id: draft.id }, { replace: true })
    setRefreshKey((k) => k + 1)
  }

  const handleStartFresh = () => {
    setSearchParams({}, { replace: true })
    setForm(emptyForm)
    setCurrentStep(1)
  }

  if (loadingTour && tournamentId) {
    return (
      <div className="space-y-4 p-6 max-w-7xl mx-auto">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-32">
      {/* Persistent Progress Header */}
      <ProgressHeader
        currentStep={currentStep}
        onStepClick={handleStepClick}
        stepStates={stepStates}
        saving={saving}
        lastSavedAt={lastSavedAt}
        tournamentName={form.name || tour?.name}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Draft Resume Options Banner */}
        {!tournamentId && existingDrafts.length > 0 && (
          <DraftResumeBanner
            drafts={existingDrafts}
            onResumeDraft={handleResumeDraft}
            onStartFresh={handleStartFresh}
          />
        )}

        {/* Dynamic Wizard Stage Render */}
        <div className="mt-2">
          {/* المرحلة 1: المعلومات الأساسية والقواعد الرياضية */}
          {currentStep === 1 && (
            <Step1BasicInfo
              data={form}
              onChange={handleFieldChange}
              stadiums={stadiums}
              tournamentId={tour?.id}
              onLogoUploaded={(updatedTour) => {
                setForm((prev) => ({ ...prev, logo_url: updatedTour.logo_url }))
                refetchTour()
              }}
            />
          )}

          {/* المرحلة 2: نشر البطولة وفتح باب التسجيل للعامة */}
          {currentStep === 2 && tour && (
            <Step2PublishTournament
              tournament={tour}
              refresh={refetchTour}
              onProceedToTeams={() => setCurrentStep(3)}
            />
          )}

          {/* المرحلة 3: إدارة وتسجيل الفرق (المباشرة، الفريق الحر، ورابط الواتساب) */}
          {currentStep === 3 && tour && (
            <Step3ManageTeams
              tournament={tour}
              refresh={refetchTour}
            />
          )}

          {/* المرحلة 4 (الختامية): إغلاق التسجيل والانطلاق لمركز البطولة */}
          {currentStep === 4 && tour && (
            <Step4CloseRegistration
              tournament={tour}
              refresh={refetchTour}
            />
          )}
        </div>
      </main>

      {/* Persistent Ergonomic Thumb-Friendly Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/90 bg-white/95 px-4 py-3 sm:py-3.5 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:px-6">
          {/* Previous Button (Left Thumb Zone) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="flex h-12 sm:h-13 min-w-[90px] sm:min-w-[120px] items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ArrowRight className="size-4.5 rtl:rotate-0" />
              <span>السابق</span>
            </button>

            <Link
              to="/committee/tournaments"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <DoorOpen className="size-4" />
              <span>مغادرة والعودة لاحقاً</span>
            </Link>
          </div>

          {/* Right Thumb Actions (Save & Next / Finalize) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveTournamentDraft()}
              className="hidden sm:flex h-12 sm:h-13 items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm px-4 transition-all active:scale-95 cursor-pointer"
            >
              <Save className="size-4 text-slate-500" />
              <span>حفظ كمسودة</span>
            </button>

            {currentStep < WIZARD_STEPS.length ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleNext}
                className="flex h-12 sm:h-13 min-w-[140px] sm:min-w-[200px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs sm:text-base shadow-lg shadow-[#10B981]/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>المتابعة للخطوة التالية</span>
                <ArrowLeft className="size-4.5 rtl:rotate-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/committee/tournaments/${tour?.id || ''}`)}
                className="flex h-12 sm:h-13 min-w-[150px] sm:min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Trophy className="size-4 text-amber-400" />
                <span>مركز إدارة البطولة</span>
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
