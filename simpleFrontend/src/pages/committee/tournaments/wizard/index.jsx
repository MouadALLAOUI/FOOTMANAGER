import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
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
import Step2FormatRules from './Step2FormatRules'
import Step3Registration from './Step3Registration'
import Step4TeamReview from './Step4TeamReview'
import Step5Scheduling from './Step5Scheduling'
import Step6Operations from './Step6Operations'
import Step7ReviewPublish from './Step7ReviewPublish'

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

      if (tour.plan?.wizard?.current_step) {
        setCurrentStep(Number(tour.plan.wizard.current_step))
      }
      setLastSavedAt(tour.updated_at || new Date().toISOString())
    }
  }, [tour])

  // Handle Form Change
  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Calculate Real Step Validation States
  const stepStates = useMemo(() => {
    const s1Complete = Boolean(tour?.name && tour?.start_date) || Boolean(form.name && form.start_date)
    const s2Complete = Boolean(tour?.tournament_format && tour?.teams_count >= 2) || Boolean(form.tournament_format && form.teams_count >= 2)
    const regTeamsCount = Number(tour?.stats?.registered_teams ?? 0)
    const targetTeams = Number(tour?.teams_count ?? form.teams_count ?? 8)
    const s3Complete = regTeamsCount >= 2
    const s4Complete = regTeamsCount >= targetTeams && targetTeams > 0
    const s5Complete = (tour?.stats?.fixtures ?? 0) > 0
    const s6Complete = s5Complete
    const s7Complete = tour?.status && tour.status !== 'draft'

    return {
      1: { completed: s1Complete, accessible: true, attention: !s1Complete && currentStep > 1 },
      2: { completed: s2Complete, accessible: s1Complete, attention: false },
      3: { completed: s3Complete, accessible: s2Complete && Boolean(tour?.id), attention: !s3Complete && currentStep > 3 },
      4: { completed: s4Complete, accessible: s3Complete, attention: regTeamsCount < targetTeams && currentStep > 4 },
      5: { completed: s5Complete, accessible: s4Complete, attention: false },
      6: { completed: s6Complete, accessible: s5Complete, attention: false },
      7: { completed: s7Complete, accessible: s1Complete && s2Complete, attention: false },
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
        const res = await api.put(`/committee/tournaments/${tour.id}`, payload)
        setLastSavedAt(new Date().toISOString())
        toast.success('تم حفظ التغييرات في المسودة')
        refetchTour()
        return true
      } else {
        const res = await api.post('/committee/tournaments', payload)
        const createdTour = res.data.data
        toast.success('تم إنشاء مسودة البطولة وحفظها بنجاح')
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
    if (currentStep === 1 || currentStep === 2) {
      const ok = await saveTournamentDraft(currentStep + 1)
      if (ok) setCurrentStep((s) => Math.min(WIZARD_STEPS.length, s + 1))
    } else {
      if (tour?.id) {
        saveTournamentDraft(currentStep + 1)
      }
      setCurrentStep((s) => Math.min(WIZARD_STEPS.length, s + 1))
    }
  }

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  const handleStepClick = async (stepId) => {
    if (currentStep === 1 || currentStep === 2) {
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
    <div className="min-h-screen bg-[#F4F7FB] pb-24">
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
        {/* Draft Resume Options Banner (When user has previous drafts and hasn't selected one) */}
        {!tournamentId && existingDrafts.length > 0 && (
          <DraftResumeBanner
            drafts={existingDrafts}
            onResumeDraft={handleResumeDraft}
            onStartFresh={handleStartFresh}
          />
        )}

        {/* Dynamic Wizard Stage Render */}
        <div className="mt-2">
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

          {currentStep === 2 && (
            <Step2FormatRules
              data={form}
              onChange={handleFieldChange}
            />
          )}

          {currentStep === 3 && tour && (
            <Step3Registration
              tournament={tour}
              refresh={refetchTour}
            />
          )}

          {currentStep === 4 && tour && (
            <Step4TeamReview
              tournament={tour}
              refresh={refetchTour}
            />
          )}

          {currentStep === 5 && tour && (
            <Step5Scheduling
              tournament={tour}
              refresh={refetchTour}
              onGoToFullFixtures={() => navigate(`/committee/tournaments/${tour.id}?tab=fixtures`)}
            />
          )}

          {currentStep === 6 && tour && (
            <Step6Operations
              tournament={tour}
              refresh={refetchTour}
            />
          )}

          {currentStep === 7 && tour && (
            <Step7ReviewPublish
              tournament={tour}
              refresh={refetchTour}
              onJumpToStep={handleStepClick}
            />
          )}
        </div>
      </main>

      {/* Persistent Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="text-xs sm:text-sm"
            >
              <ArrowRight className="size-4 rtl:rotate-0" />
              السابق
            </Button>

            <Link
              to="/committee/tournaments"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <DoorOpen className="size-4" />
              مغادرة ومتابعة لاحقاً
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              loading={saving}
              onClick={() => saveTournamentDraft()}
              className="text-xs sm:text-sm"
            >
              <Save className="size-4 text-slate-500" />
              حفظ كمسودة
            </Button>

            {currentStep < WIZARD_STEPS.length ? (
              <Button
                variant="primary"
                size="md"
                loading={saving}
                onClick={handleNext}
                className="text-xs sm:text-sm font-bold shadow-md"
              >
                المتابعة للخطوة التالية
                <ArrowLeft className="size-4 rtl:rotate-0" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/committee/tournaments/${tour?.id || ''}`)}
                className="text-xs sm:text-sm font-black shadow-md bg-emerald-600 hover:bg-emerald-700"
              >
                الانتقال لمركز إدارة البطولة
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
