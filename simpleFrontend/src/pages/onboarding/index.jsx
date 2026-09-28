import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { toast } from '../../components/ui/Toast/toastStore'
import { Spinner } from '../../components/dashboard/ui'
import ProgressBar from './ProgressBar'
import StepTeam from './StepTeam'
import StepSchedule from './StepSchedule'
import StepTournament from './StepTournament'
import StepRoster from './StepRoster'
import StepCelebration from './StepCelebration'

export default function OnboardingPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('team') // 'team' | 'schedule' | 'tournament' | 'roster' | 'celebration'
  const [team, setTeam] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [players, setPlayers] = useState([])
  const [presets, setPresets] = useState([])
  const [stadiums, setStadiums] = useState([])
  const [percentage, setPercentage] = useState(25)

  // Fetch initial onboarding state
  useEffect(() => {
    let mounted = true
    const loadStatus = async () => {
      try {
        const { data } = await api.get('/manager/onboarding/status')
        if (!mounted) return
        setTeam(data.team)
        setSchedules(data.schedules || [])
        setTournaments(data.tournaments || [])
        setPlayers(data.players || [])
        setPresets(data.presets || [])
        setStadiums(data.stadiums || [])
        setPercentage(data.completion_percentage || 25)

        // Set initial step if in progress
        if (data.is_completed) {
          setStep('celebration')
        } else if (data.step && ['team', 'schedule', 'tournament', 'roster'].includes(data.step)) {
          setStep(data.step)
        }
      } catch (err) {
        toast.error('تعذر تحميل بيانات الإعداد')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStatus()
    return () => {
      mounted = false
    }
  }, [])

  const handleNextTeam = async (formData) => {
    setBusy(true)
    try {
      const { data } = await api.post('/manager/onboarding/team', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTeam(data.team)
      setPercentage((p) => Math.max(p, 50))
      setStep('schedule')
      toast.success(data.message || 'تم حفظ بيانات الفريق')
    } catch (err) {
      const first = Object.values(err.response?.data?.errors || {})[0]
      toast.error(first?.[0] || err.response?.data?.message || 'فشل حفظ الفريق')
    } finally {
      setBusy(false)
    }
  }

  const handleNextSchedule = async (scheduleData) => {
    setBusy(true)
    try {
      const { data } = await api.post('/manager/onboarding/schedule', scheduleData)
      setPercentage((p) => Math.max(p, 75))
      setStep('tournament')
      toast.success(data.message || 'تم حفظ المواعيد')
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل حفظ المواعيد')
    } finally {
      setBusy(false)
    }
  }

  const handleSkipSchedule = async () => {
    await handleNextSchedule({ has_regular_time: false })
  }

  const handleNextTournament = async (agreementData) => {
    setBusy(true)
    try {
      const { data } = await api.post('/manager/onboarding/tournament-agreement', agreementData)
      setPercentage((p) => Math.max(p, 85))
      setStep('roster')
      toast.success(data.message || 'تم تسجيل الرغبة في البطولة')
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تسجيل البطولة')
    } finally {
      setBusy(false)
    }
  }

  const handleSkipTournament = async () => {
    await handleNextTournament({ skip: true })
  }

  const handleNextRoster = async (rosterData) => {
    setBusy(true)
    try {
      if (rosterData?.players?.length > 0) {
        const { data } = await api.post('/manager/onboarding/players', {
          players: rosterData.players,
        })
        setPlayers(data.players || [])
      }

      // Mark onboarding as complete
      const { data: completeData } = await api.post('/manager/onboarding/complete')
      setPercentage(100)
      setStep('celebration')
      toast.success(completeData.message || 'اكتمل إعداد فريقك بنجاح!')
      if (refresh) refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل إكمال اللائحة')
    } finally {
      setBusy(false)
    }
  }

  const handleSkipRoster = async () => {
    await handleNextRoster({ players: [] })
  }

  const handleFinish = () => {
    if (user?.status === 'approved') {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/pending', { replace: true })
    }
  }

  const handleExit = () => {
    if (user?.status === 'approved') {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/pending', { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Progress Bar Header */}
      {step !== 'celebration' && (
        <ProgressBar
          currentStep={step}
          percentage={percentage}
          onExit={handleExit}
        />
      )}

      {/* Main Step Container */}
      <main className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12">
        {step === 'team' && (
          <StepTeam
            initialTeam={team}
            presets={presets}
            onNext={handleNextTeam}
            busy={busy}
          />
        )}

        {step === 'schedule' && (
          <StepSchedule
            initialSchedule={schedules}
            stadiums={stadiums}
            teamCity={team?.city}
            onNext={handleNextSchedule}
            onBack={() => setStep('team')}
            onSkip={handleSkipSchedule}
            busy={busy}
          />
        )}

        {step === 'tournament' && (
          <StepTournament
            tournaments={tournaments}
            onNext={handleNextTournament}
            onBack={() => setStep('schedule')}
            onSkip={handleSkipTournament}
            busy={busy}
          />
        )}

        {step === 'roster' && (
          <StepRoster
            initialPlayers={players}
            onNext={handleNextRoster}
            onBack={() => setStep('tournament')}
            onSkip={handleSkipRoster}
            busy={busy}
          />
        )}

        {step === 'celebration' && (
          <StepCelebration
            team={team}
            schedules={schedules}
            tournaments={tournaments}
            playersCount={players.length}
            onFinish={handleFinish}
          />
        )}
      </main>
    </div>
  )
}
