import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { queryClient } from '../../../api/queryClient'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import TeamLogo from '../../../components/profile/TeamLogo'
import MatchControlRoom from '../tournaments/MatchControlRoom'
import PageSkeleton from '../../../components/system/PageSkeleton'

const STORAGE_KEY = 'aji_committee_active_tournament_id'

const formatArabicDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('ar-MA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

const formatArabicTime = (dateStr) => {
  if (!dateStr) return '20:00'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '20:00'
    return new Intl.DateTimeFormat('ar-MA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return '20:00'
  }
}

export default function Overview({ onActiveTournamentChange = null }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isRtl = i18n.language?.startsWith('ar')

  const [selectorOpen, setSelectorOpen] = useState(false)
  const [controlRoomFixture, setControlRoomFixture] = useState(null)
  const [controlRoomTab, setControlRoomTab] = useState('timeline')
  const [selectedTourId, setSelectedTourId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? parseInt(saved, 10) : null
    } catch {
      return null
    }
  })

  // 1. Load all tournaments for the committee organizer
  const { data: tournamentsData, loading: tourListLoading } = useApi(
    () => api.get('/committee/tournaments', { params: { per_page: 50 } }).then((r) => r.data),
    [],
  )
  const tournaments = tournamentsData?.data || []

  // Ensure active tournament is always valid and synced
  useEffect(() => {
    if (!tournaments || tournaments.length === 0) return

    const currentExists = tournaments.some((t) => t.id === selectedTourId)
    if (!currentExists) {
      const firstActive =
        tournaments.find((t) => ['in_progress', 'open_for_registration'].includes(t.status)) ||
        tournaments[0]
      if (firstActive) {
        setSelectedTourId(firstActive.id)
        try {
          localStorage.setItem(STORAGE_KEY, String(firstActive.id))
          window.dispatchEvent(new Event('aji_tournament_changed'))
        } catch {}
        if (onActiveTournamentChange) onActiveTournamentChange(firstActive.id)
      }
    } else {
      if (onActiveTournamentChange) onActiveTournamentChange(selectedTourId)
    }
  }, [tournaments, selectedTourId, onActiveTournamentChange])

  const activeTour = useMemo(() => {
    return tournaments.find((t) => t.id === selectedTourId) || tournaments[0] || null
  }, [tournaments, selectedTourId])

  const handleSelectTournament = (tour) => {
    setSelectedTourId(tour.id)
    try {
      localStorage.setItem(STORAGE_KEY, String(tour.id))
      window.dispatchEvent(new Event('aji_tournament_changed'))
    } catch {}
    if (onActiveTournamentChange) onActiveTournamentChange(tour.id)
    setSelectorOpen(false)
  }

  // 2. Load selected tournament details & statistics
  const { data: tourDetail, loading: tourDetailLoading, refetch: refetchTourDetail } = useApi(
    () => {
      if (!activeTour?.id) return Promise.resolve(null)
      return api.get(`/committee/tournaments/${activeTour.id}`).then((r) => r.data.data)
    },
    [activeTour?.id],
    { staleTime: 0 }
  )

  // 3. Load fixtures for the active tournament
  const {
    data: fixturesData,
    loading: fixturesLoading,
    refetch: refetchFixtures,
  } = useApi(
    () => {
      if (!activeTour?.id) return Promise.resolve(null)
      return api.get(`/committee/tournaments/${activeTour.id}/fixtures`).then((r) => r.data)
    },
    [activeTour?.id],
    { staleTime: 0 }
  )
  const fixtures = fixturesData?.data || []

  // 4. Load registrations for pending count
  const { data: registrationsData } = useApi(
    () => {
      if (!activeTour?.id) return Promise.resolve(null)
      return api.get(`/committee/tournaments/${activeTour.id}/registrations`).then((r) => r.data)
    },
    [activeTour?.id],
    { staleTime: 0 }
  )
  const registrations = registrationsData?.data || []
  const pendingRegistrationsCount = (registrations || []).filter((r) => r.status === 'pending').length

  // 5. Load stadiums for active tournament
  const { data: stadiumsData } = useApi(
    () => {
      if (!activeTour?.id) return Promise.resolve(null)
      return api.get(`/committee/tournaments/${activeTour.id}/stadiums`).then((r) => r.data)
    },
    [activeTour?.id],
    { staleTime: 0 }
  )
  const stadiums = stadiumsData?.data?.stadiums || []

  // Derived Stats & Lists
  const isMatchFinished = (f) => f.status === 'played' || f.match?.status === 'finished'

  const upcomingFixtures = useMemo(() => {
    return fixtures.filter((f) => !isMatchFinished(f) && f.status !== 'cancelled')
  }, [fixtures])

  const finishedFixtures = useMemo(() => {
    return fixtures.filter((f) => isMatchFinished(f))
  }, [fixtures])

  const upcomingMatch = useMemo(() => {
    if (upcomingFixtures.length === 0) return null
    const withDate = upcomingFixtures.filter((f) => f.scheduled_at)
    if (withDate.length > 0) {
      return withDate.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0]
    }
    return upcomingFixtures[0]
  }, [upcomingFixtures])

  const recentResults = useMemo(() => {
    return [...finishedFixtures].sort((a, b) => {
      const timeA = new Date(a.match?.ended_at || a.scheduled_at || 0).getTime()
      const timeB = new Date(b.match?.ended_at || b.scheduled_at || 0).getTime()
      if (timeA !== timeB) return timeB - timeA
      return (b.matchday || 0) - (a.matchday || 0)
    })
  }, [finishedFixtures])

  const postponedFixtures = useMemo(() => {
    return fixtures.filter((f) => f.status === 'postponed' || f.match?.status === 'postponed')
  }, [fixtures])

  const unscheduledFixtures = useMemo(() => {
    return fixtures.filter((f) => !f.scheduled_at)
  }, [fixtures])

  // Top scheduled upcoming matches (for the upcoming matches table)
  const nextScheduledMatches = useMemo(() => {
    return upcomingFixtures
      .filter((f) => f.id !== upcomingMatch?.id)
      .slice(0, 4)
  }, [upcomingFixtures, upcomingMatch?.id])

  // Counts strictly scoped to the SELECTED tournament
  const statsCounts = useMemo(() => {
    const upcomingCount = upcomingFixtures.length
    const playedCount = tourDetail?.stats?.finished_matches ?? finishedFixtures.length
    const teamsCount = activeTour?.stats?.registered_teams ?? activeTour?.teams_count ?? 0
    const fixturesCount = activeTour?.stats?.fixtures ?? fixtures.length ?? 0
    const pendingReportsCount = tourDetail?.stats?.pending_delegated_submissions ?? 0
    const pendingRegCount = pendingRegistrationsCount

    return {
      upcomingCount,
      playedCount,
      teamsCount,
      fixturesCount,
      pendingReportsCount,
      pendingRegCount,
    }
  }, [upcomingFixtures, finishedFixtures, tourDetail, activeTour, fixtures, pendingRegistrationsCount])

  const activeTourSeason =
    activeTour?.edition || new Date(activeTour?.start_date || Date.now()).getFullYear() || 2026

  const handleRefreshAll = () => {
    if (refetchTourDetail) refetchTourDetail()
    if (refetchFixtures) refetchFixtures()
    queryClient.invalidateQueries({ queryKey: ['api'] })
  }

  useEffect(() => {
    const handleUpdate = () => handleRefreshAll()
    window.addEventListener('aji_match_updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    return () => {
      window.removeEventListener('aji_match_updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
    }
  }, [refetchTourDetail, refetchFixtures])

    // Urgent tasks calculation
  const pendingResultsCount =
    fixtures.filter((f) => f.match && f.match.status === 'awaiting_confirmation').length ||
    tourDetail?.stats?.pending_delegated_submissions ||
    0
  const bookingAlertsCount =
    unscheduledFixtures.length > 0
      ? unscheduledFixtures.length
      : postponedFixtures.length > 0
        ? postponedFixtures.length
        : 0
  const urgentTasksTotal =
    (pendingResultsCount > 0 ? 1 : 0) +
    (pendingRegistrationsCount > 0 ? 1 : 0) +
    (bookingAlertsCount > 0 ? 1 : 0)

  // Action handlers connecting to existing functional systems
  const handleOpenMatchRecording = (fixture = upcomingMatch) => {
    if (fixture) {
      setControlRoomTab('timeline')
      setControlRoomFixture(fixture)
    } else if (activeTour) {
      navigate(`/committee/tournaments/${activeTour.id}?tab=fixtures`)
    }
  }

  const handleOpenMatchLineup = (fixture = upcomingMatch) => {
    if (fixture) {
      setControlRoomTab('players')
      setControlRoomFixture(fixture)
    } else if (activeTour) {
      navigate(`/committee/tournaments/${activeTour.id}?tab=fixtures`)
    }
  }

  if (tourListLoading) {
    return <PageSkeleton />
  }

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="space-y-6 sm:space-y-7 max-w-7xl mx-auto font-['IBM_Plex_Sans_Arabic',sans-serif]" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight tracking-tight">
              لوحة لجنة المسابقات
            </h1>
            <p className="text-sm sm:text-base font-normal text-[#64748B] mt-1">
              مركز القيادة والتنظيم وإدارة الجولات والنتائج المعتمدة
            </p>
          </div>

          <Link
            to="/committee/tournaments?new=1"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F9D58] hover:bg-[#0c854a] px-4 sm:px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-[0_4px_12px_rgba(15,157,88,0.25)] transition-all active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="size-4.5 stroke-[2.5]" />
            <span>إنشاء بطولة جديدة</span>
          </Link>
        </div>

        {/* Stats Row with zero values */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-semibold text-[#0F172A]">المواعيد القادمة</span>
              <div className="size-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
                <Clock className="size-4.5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">0</span>
              <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">مباريات بانتظار الانطلاق</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-semibold text-[#0F172A]">الفرق المشاركة</span>
              <div className="size-9 rounded-xl bg-blue-50 text-[#1E40AF] grid place-items-center">
                <Users className="size-4.5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">0</span>
              <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">فرق معتمدة في البطولة</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-semibold text-[#0F172A]">المباريات الملعوبة</span>
              <div className="size-9 rounded-xl bg-emerald-50 text-[#0F9D58] grid place-items-center">
                <CheckCheck className="size-4.5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">0</span>
              <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">مباريات منتهية ومعتمدة</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-semibold text-[#0F172A]">إجمالي المباريات</span>
              <div className="size-9 rounded-xl bg-slate-100 text-[#0F172A] grid place-items-center">
                <CalendarDays className="size-4.5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">0</span>
              <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">مجموع الجولات المقررة</span>
            </div>
          </div>
        </div>

        {/* Empty State Banner */}
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-8 sm:p-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="size-20 rounded-3xl bg-emerald-50 text-[#0F9D58] grid place-items-center mx-auto mb-5 shadow-xs ring-8 ring-emerald-50/50">
            <Trophy className="size-10 stroke-[1.75]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
            لا توجد بطولات مسجلة بعد
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] max-w-lg mx-auto mt-2 leading-relaxed font-normal">
            ابدأ بإنشاء بطولتك الأولى لتتمكن من إضافة الفرق المشاركة، توليد جداول المباريات، ومتابعة النتائج والترتيب المعتمد مباشرة من لوحة التحكم.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/committee/tournaments?new=1"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F9D58] hover:bg-[#0c854a] px-6 py-3 text-sm sm:text-base font-bold text-white shadow-[0_4px_14px_rgba(15,157,88,0.28)] transition-all active:scale-[0.98]"
            >
              <Plus className="size-5 stroke-[2.5]" />
              <span>إنشاء بطولة جديدة الآن</span>
            </Link>

            <Link
              to="/fields"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-5 py-3 text-sm sm:text-base font-bold text-[#0F172A] transition-colors"
            >
              <MapPin className="size-4.5 text-[#0F9D58] stroke-[2]" />
              <span>استعراض الملاعب المتاحة</span>
            </Link>
          </div>

          {/* 3 Steps Guide */}
          <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-start">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="size-8 rounded-lg bg-emerald-100 text-[#0F9D58] font-bold text-sm grid place-items-center mb-3">
                1
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">إنشاء وتخصيص البطولة</h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                حدد اسم البطولة، صيغة المنافسة (دوري أو مجموعات)، والملاعب المعتمدة.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="size-8 rounded-lg bg-blue-100 text-[#1E40AF] font-bold text-sm grid place-items-center mb-3">
                2
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">تسجيل واعتماد الفرق</h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                استقبل طلبات انضمام الفرق، تحقق من الأهلية واعتمد لوائح المشاركين.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="size-8 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm grid place-items-center mb-3">
                3
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">برمجة وإدارة المباريات</h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                ولّد الجولات تلقائياً، حدد المواعيد، وتابع النتائج المعتمدة وترتيب الفرق.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-7 max-w-7xl mx-auto font-['IBM_Plex_Sans_Arabic',sans-serif]" dir="rtl">
      {/* 1. Page Header: Title + Tournament Selector + New Tournament CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight tracking-tight">
            لوحة لجنة المسابقات
          </h1>
          <p className="text-sm sm:text-base font-normal text-[#64748B] mt-1">
            مركز القيادة والتنظيم وإدارة الجولات والنتائج المعتمدة
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Tournament Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectorOpen((v) => !v)}
              aria-expanded={selectorOpen}
              className="flex items-center gap-3 bg-white border border-[#E6EBF2] rounded-2xl px-4 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#0F9D58] transition-all text-start group cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-emerald-50 text-[#0F9D58] grid place-items-center shrink-0">
                <Trophy className="size-4.5 stroke-[2]" />
              </div>
              <div className="min-w-[140px] sm:min-w-[180px] max-w-[260px]">
                <span className="block text-xs font-medium text-[#64748B] leading-tight">
                  {t('committee.overview.activeTournament', 'البطولة النشطة')}
                </span>
                <span className="block text-sm sm:text-base font-bold text-[#0F172A] truncate mt-0.5">
                  {activeTour?.name || t('committee.overview.noTournaments', 'اختر بطولة')}
                </span>
              </div>
              <ChevronDown
                className={`size-4.5 text-[#64748B] transition-transform duration-200 ${
                  selectorOpen ? 'rotate-180 text-[#0F9D58]' : 'group-hover:text-[#0F172A]'
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {selectorOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSelectorOpen(false)} />
                <div className="absolute start-0 top-14 z-50 w-76 sm:w-88 overflow-hidden rounded-2xl border border-[#E6EBF2] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#0F172A]">البطولات المسجلة</span>
                    <span className="text-xs text-[#64748B] font-medium">{tournaments.length} بطولات</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 py-1.5">
                    {tournaments.map((tour) => {
                      const isCurrent = tour.id === selectedTourId
                      const season =
                        tour.edition || new Date(tour.start_date || Date.now()).getFullYear() || 2026
                      const teams = tour.teams_count ?? 0

                      return (
                        <button
                          key={tour.id}
                          type="button"
                          onClick={() => handleSelectTournament(tour)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl text-start transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-50 text-[#0F9D58] font-bold'
                              : 'hover:bg-slate-50 text-[#0F172A] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`size-9 rounded-lg grid place-items-center shrink-0 ${
                                isCurrent
                                  ? 'bg-[#0F9D58] text-white'
                                  : 'bg-slate-100 text-[#64748B]'
                              }`}
                            >
                              <Trophy className="size-4.5 stroke-[2]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{tour.name}</p>
                              <p className="text-xs text-[#64748B] font-medium mt-0.5">
                                الموسم {season} • {teams} فرق
                              </p>
                            </div>
                          </div>
                          {isCurrent && (
                            <div className="size-5 rounded-full bg-[#0F9D58] text-white grid place-items-center shrink-0">
                              <Check className="size-3.5 stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-1.5">
                    <Link
                      to="/committee/tournaments?new=1"
                      onClick={() => setSelectorOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-sm font-bold text-[#0F9D58] bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="size-4 stroke-[2.5]" />
                      <span>إنشاء بطولة جديدة</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Primary "+ بطولة جديدة" CTA */}
          <Link
            to="/committee/tournaments?new=1"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F9D58] hover:bg-[#0c854a] px-4 sm:px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-[0_4px_12px_rgba(15,157,88,0.25)] transition-all active:scale-[0.98]"
          >
            <Plus className="size-4.5 stroke-[2.5]" />
            <span className="hidden sm:inline">إنشاء بطولة</span>
            <span className="sm:hidden">جديدة</span>
          </Link>
        </div>
      </div>

      {/* 2. Hero Element: Next Match Card (أكبر عنصر في الصفحة - بطاقة البطل) */}
      {upcomingMatch ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1F3A] via-[#081a28] to-[#041d13] p-5 sm:p-7 text-white shadow-[0_12px_32px_rgba(11,31,58,0.22)] border border-emerald-950/40">
          {/* Subtle Pitch Markings and Ambient Glow */}
          <div className="pointer-events-none absolute -end-16 -top-16 size-72 rounded-full bg-[#0F9D58]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 start-1/4 size-80 rounded-full bg-[#0B1F3A]/30 blur-3xl" />

          {/* Top Header Row of the Hero Card */}
          <div className="relative flex items-center justify-between pb-4 border-b border-white/10 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F9D58] px-3.5 py-1 text-xs sm:text-sm font-bold text-white shadow-xs">
                <Calendar className="size-3.5 stroke-[2]" />
                <span>الجولة {upcomingMatch.matchday || 1}</span>
              </span>
              <span className="text-white/40 hidden sm:inline">•</span>
              <span className="text-white/90 font-medium hidden sm:inline text-xs sm:text-sm">
                {activeTour?.name}
              </span>
            </div>

            <span className="text-white/90 font-medium text-xs sm:text-sm">
              {upcomingMatch.scheduled_at
                ? formatArabicDate(upcomingMatch.scheduled_at)
                : 'موعد غير محدد'}
            </span>
          </div>

          {/* Center Matchup Row: Home Team VS Away Team */}
          <div className="relative py-6 sm:py-8 flex items-center justify-between px-2 sm:px-8">
            {/* Home Team */}
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <div className="relative">
                <TeamLogo
                  team={upcomingMatch.home_team || upcomingMatch.homeTeam}
                  name={upcomingMatch.home_team?.name || upcomingMatch.homeTeam?.name || 'الفريق المضيف'}
                  className="size-16 sm:size-20 rounded-2xl bg-white/10 p-2 shadow-lg ring-2 ring-white/15"
                  fontSize="text-xl font-bold"
                />
              </div>
              <h3 className="mt-3 text-base sm:text-lg font-bold text-white line-clamp-1 max-w-[180px]">
                {upcomingMatch.home_team?.name || upcomingMatch.homeTeam?.name || 'الفريق المضيف'}
              </h3>
              <span className="text-xs sm:text-sm text-white/70 font-medium mt-0.5">الفريق المضيف</span>
            </div>

            {/* Center Kickoff Time & VS */}
            <div className="flex flex-col items-center justify-center px-4 shrink-0">
              <span className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
                {formatArabicTime(upcomingMatch.scheduled_at)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0F9D58] mt-2.5 bg-[#0F9D58]/15 px-3 py-0.5 rounded-full border border-[#0F9D58]/30">
                VS
              </span>
              <span className="text-xs text-white/60 font-medium mt-2">توقيت الانطلاق</span>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <div className="relative">
                <TeamLogo
                  team={upcomingMatch.away_team || upcomingMatch.awayTeam}
                  name={upcomingMatch.away_team?.name || upcomingMatch.awayTeam?.name || 'الفريق الضيف'}
                  className="size-16 sm:size-20 rounded-2xl bg-white/10 p-2 shadow-lg ring-2 ring-white/15"
                  fontSize="text-xl font-bold"
                />
              </div>
              <h3 className="mt-3 text-base sm:text-lg font-bold text-white line-clamp-1 max-w-[180px]">
                {upcomingMatch.away_team?.name || upcomingMatch.awayTeam?.name || 'الفريق الضيف'}
              </h3>
              <span className="text-xs sm:text-sm text-white/70 font-medium mt-0.5">الفريق الضيف</span>
            </div>
          </div>

          {/* Footer Row: Venue + Action Buttons */}
          <div className="relative pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90">
              <MapPin className="size-4.5 text-[#0F9D58] shrink-0 stroke-[2]" />
              <span className="truncate max-w-[280px] font-medium">
                {upcomingMatch.stadium?.name || activeTour?.stadium?.name || 'ملعب معتمد للمباراة'}
              </span>
            </div>

            {/* Match Action Buttons: Primary + Secondary */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <Link
                to={`/committee/tournaments/${activeTour.id}?tab=fixtures`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F9D58] hover:bg-[#0c854a] px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-xs transition-colors"
              >
                <Swords className="size-4 stroke-[2]" />
                <span>إدارة المباراة</span>
              </Link>

              <button
                type="button"
                onClick={() => handleOpenMatchRecording(upcomingMatch)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-sm sm:text-base font-bold text-white backdrop-blur-md transition-colors cursor-pointer"
              >
                <Plus className="size-4 text-[#0F9D58] stroke-[2.5]" />
                <span>تسجيل المباراة</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenMatchLineup(upcomingMatch)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-sm sm:text-base font-bold text-white backdrop-blur-md transition-colors cursor-pointer"
              >
                <Users className="size-4 text-white/90 stroke-[2]" />
                <span>التشكيلة</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1F3A] via-[#081a28] to-[#041d13] p-6 sm:p-8 text-white shadow-[0_12px_32px_rgba(11,31,58,0.22)] border border-emerald-950/40">
          <div className="pointer-events-none absolute -end-16 -top-16 size-72 rounded-full bg-[#0F9D58]/10 blur-3xl" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-start">
              <div className="size-14 rounded-2xl bg-white/10 border border-white/15 grid place-items-center text-[#0F9D58] shrink-0">
                <CalendarDays className="size-7 stroke-[2]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#0F9D58] uppercase tracking-wider block">
                  {activeTour?.name}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                  لا توجد مباريات قادمة مجدولة حالياً
                </h3>
                <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-md">
                  يمكنك إنشاء برنامج المباريات وتحديد المواعيد والملاعب من قسم إدارة المباريات.
                </p>
              </div>
            </div>

            {activeTour && (
              <Link
                to={`/committee/tournaments/${activeTour.id}?tab=fixtures`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0F9D58] hover:bg-[#0c854a] px-5 py-2.5 text-sm sm:text-base font-bold text-white shadow-xs transition-colors shrink-0"
              >
                <Calendar className="size-4 stroke-[2]" />
                <span>جدولة المباريات</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 3. Stats Row: 4 Metric Cards (المواعيد القادمة، الفرق المشاركة، المباريات الملعوبة، إجمالي المباريات) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Stat 1: Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-semibold text-[#0F172A]">المواعيد القادمة</span>
            <div className="size-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
              <Clock className="size-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">
              {statsCounts.upcomingCount}
            </span>
            <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">
              مباريات بانتظار الانطلاق
            </span>
          </div>
        </div>

        {/* Stat 2: Participating Teams */}
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-semibold text-[#0F172A]">الفرق المشاركة</span>
            <div className="size-9 rounded-xl bg-blue-50 text-[#1E40AF] grid place-items-center">
              <Users className="size-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">
              {statsCounts.teamsCount}
            </span>
            <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">
              فرق معتمدة في البطولة
            </span>
          </div>
        </div>

        {/* Stat 3: Matches Played */}
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-semibold text-[#0F172A]">المباريات الملعوبة</span>
            <div className="size-9 rounded-xl bg-emerald-50 text-[#0F9D58] grid place-items-center">
              <CheckCheck className="size-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">
              {statsCounts.playedCount}
            </span>
            <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">
              مباريات منتهية ومعتمدة
            </span>
          </div>
        </div>

        {/* Stat 4: Total Matches */}
        <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-semibold text-[#0F172A]">إجمالي المباريات</span>
            <div className="size-9 rounded-xl bg-slate-100 text-[#0F172A] grid place-items-center">
              <CalendarDays className="size-4.5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight block">
              {statsCounts.fixturesCount}
            </span>
            <span className="text-xs sm:text-sm text-[#64748B] font-medium block mt-1">
              مجموع الجولات المقررة
            </span>
          </div>
        </div>
      </div>

      {/* 4. Core Content Grid: Two Balanced Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Right Column 1: Urgent Tasks & Alerts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section C: المهام العاجلة (Urgent Tasks) */}
          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`size-2.5 rounded-full ${urgentTasksTotal > 0 ? 'bg-rose-500' : 'bg-[#0F9D58]'}`} />
                <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">المهام العاجلة</h2>
              </div>
              <span className={`rounded-full text-xs sm:text-sm font-bold px-3 py-0.5 ${
                urgentTasksTotal > 0 ? 'bg-rose-100 text-[#991B1B]' : 'bg-emerald-50 text-[#0F9D58]'
              }`}>
                {urgentTasksTotal > 0 ? `${urgentTasksTotal} مهام` : 'لا توجد مهام'}
              </span>
            </div>

            <div className="space-y-3">
              {urgentTasksTotal === 0 ? (
                <div className="p-5 text-center rounded-xl border border-dashed border-[#E6EBF2] bg-slate-50/50">
                  <CheckCircle2 className="size-8 text-[#0F9D58] mx-auto mb-2 stroke-[2]" />
                  <p className="text-sm font-bold text-[#0F172A]">لا توجد مهام عاجلة تتطلب تدخلك</p>
                  <p className="text-xs text-[#64748B] mt-1">جميع النتائج والطلبات وجداول الملاعب معتمدة ومحدثة</p>
                </div>
              ) : (
                <>
                  {/* Task 1: عاجل (Red Priority Status) */}
                  {pendingResultsCount > 0 && activeTour && (
                    <Link
                      to={`/committee/tournaments/${activeTour.id}?tab=fixtures`}
                      className="flex items-center justify-between p-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] hover:bg-rose-100/70 transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-9 rounded-lg bg-rose-200/80 text-[#991B1B] grid place-items-center shrink-0">
                          <AlertCircle className="size-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm sm:text-base font-bold text-[#991B1B] truncate">
                              تأكيد نتائج الجولة {upcomingMatch?.matchday ? Math.max(1, upcomingMatch.matchday - 1) : 1}
                            </p>
                            <span className="rounded-full bg-[#DC2626] text-white text-xs font-bold px-2 py-0.5 shrink-0">
                              عاجل
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#991B1B]/80 font-medium mt-1 truncate">
                            مراجعة النتائج النهائية • {pendingResultsCount} بانتظار الاعتماد
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="size-4.5 text-[#991B1B] group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                  )}

                  {/* Task 2: هام (Orange Priority Status) */}
                  {pendingRegistrationsCount > 0 && activeTour && (
                    <Link
                      to={`/committee/tournaments/${activeTour.id}?tab=teams`}
                      className="flex items-center justify-between p-4 rounded-xl border border-[#FEF3C7] bg-[#FFFBEB] hover:bg-amber-100/70 transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-9 rounded-lg bg-amber-200/80 text-[#92400E] grid place-items-center shrink-0">
                          <Users className="size-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm sm:text-base font-bold text-[#92400E] truncate">
                              التحقق من أهلية الفرق واللاعبين
                            </p>
                            <span className="rounded-full bg-[#D97706] text-white text-xs font-bold px-2 py-0.5 shrink-0">
                              هام
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#92400E]/80 font-medium mt-1 truncate">
                            لوائح المشاركة • {pendingRegistrationsCount} طلب جديد
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="size-4.5 text-[#92400E] group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                  )}

                  {/* Task 3: تنبيهات البرمجة */}
                  {bookingAlertsCount > 0 && activeTour && (
                    <Link
                      to={`/committee/tournaments/${activeTour.id}?tab=fixtures`}
                      className="flex items-center justify-between p-4 rounded-xl border border-[#FEF3C7] bg-[#FFFBEB] hover:bg-amber-100/70 transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-9 rounded-lg bg-amber-200/80 text-[#92400E] grid place-items-center shrink-0">
                          <AlertTriangle className="size-5 stroke-[2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm sm:text-base font-bold text-[#92400E] truncate">
                              تنبيهات برمجة الملاعب والمواعيد
                            </p>
                            <span className="rounded-full bg-[#D97706] text-white text-xs font-bold px-2 py-0.5 shrink-0">
                              تنبيه
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#92400E]/80 font-medium mt-1 truncate">
                            {bookingAlertsCount} مباريات بحاجة لتحديد موعد أو ملعب
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="size-4.5 text-[#92400E] group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section F: حالة الملاعب اليوم (Stadium Status Today) */}
          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-xl bg-[#0F9D58] text-white grid place-items-center shadow-sm shrink-0">
                <LayoutGrid className="size-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">حالة الملاعب والمرافق</h3>
                <p className="text-xs sm:text-sm font-medium text-[#64748B] mt-0.5">
                  {stadiums.length > 0
                    ? `${stadiums.length} ملاعب نشطة ومعتمدة`
                    : 'لا توجد ملاعب مخصصة لهذه البطولة'}
                </p>
              </div>
            </div>

            <Link
              to="/fields"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6EBF2] px-4 py-2.5 text-sm font-bold text-[#0F172A] transition-colors"
            >
              <span>عرض الحجوزات</span>
              <ArrowLeft className="size-4 stroke-[2]" />
            </Link>
          </div>

          {/* Section G: اختصارات سريعة (Quick Actions) */}
          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-[#64748B] uppercase tracking-wider">
              اختصارات سريعة
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to={activeTour ? `/committee/tournaments/${activeTour.id}?tab=fixtures` : '/committee/tournaments'}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E6EBF2] hover:border-[#0F9D58] hover:bg-emerald-50/40 text-sm sm:text-base font-bold text-[#0F172A] transition-all"
              >
                <CalendarDays className="size-4.5 text-[#0F9D58] stroke-[2]" />
                <span>إدارة المباريات</span>
              </Link>

              <Link
                to={activeTour ? `/committee/tournaments/${activeTour.id}?tab=teams` : '/committee/tournaments'}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E6EBF2] hover:border-[#0F9D58] hover:bg-emerald-50/40 text-sm sm:text-base font-bold text-[#0F172A] transition-all"
              >
                <Users className="size-4.5 text-[#1E40AF] stroke-[2]" />
                <span>إدارة الفرق</span>
              </Link>

              <Link
                to={activeTour ? `/committee/tournaments/${activeTour.id}?tab=standings` : '/committee/tournaments'}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E6EBF2] hover:border-[#0F9D58] hover:bg-emerald-50/40 text-sm sm:text-base font-bold text-[#0F172A] transition-all"
              >
                <Trophy className="size-4.5 text-amber-600 stroke-[2]" />
                <span>الترتيب والنتائج</span>
              </Link>

              <Link
                to="/fields"
                className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E6EBF2] hover:border-[#0F9D58] hover:bg-emerald-50/40 text-sm sm:text-base font-bold text-[#0F172A] transition-all"
              >
                <LayoutGrid className="size-4.5 text-[#0F9D58] stroke-[2]" />
                <span>الملاعب والحجوزات</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column 2: Results & Upcoming Matches Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section D: آخر النتائج (Recent Results) */}
          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="size-5 text-[#0F9D58] stroke-[2]" />
                <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">آخر النتائج</h2>
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0F9D58] transition-colors cursor-pointer"
                  title="تحديث النتائج"
                >
                  <RefreshCw className={`size-4 ${fixturesLoading ? 'animate-spin text-[#0F9D58]' : ''}`} />
                </button>
              </div>
              <Link
                to={activeTour ? `/committee/tournaments/${activeTour.id}?tab=standings` : '/committee/tournaments'}
                className="inline-flex items-center gap-1 text-sm font-bold text-[#0F9D58] hover:underline"
              >
                <span>جدول الترتيب</span>
                <ChevronLeft className="size-4 stroke-[2]" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentResults.length > 0 ? (
                recentResults.slice(0, 3).map((fixture) => (
                  <div
                    key={fixture.id}
                    onClick={() => handleOpenMatchRecording(fixture)}
                    className="flex items-center justify-between p-4 rounded-xl border border-[#E6EBF2] bg-[#F4F7FB]/50 hover:bg-[#F4F7FB] transition-colors cursor-pointer group"
                    title="انقر لمراجعة أو تعديل النتيجة"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <TeamLogo
                        team={fixture.home_team || fixture.homeTeam}
                        className="size-8 rounded-lg bg-white p-0.5 shadow-2xs"
                        fontSize="text-xs font-bold"
                      />
                      <span className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                        {fixture.home_team?.name || fixture.homeTeam?.name}
                      </span>
                    </div>

                    <div className="px-4 text-center shrink-0">
                      <span className="text-base sm:text-lg font-black text-[#0F172A]">
                        {fixture.match?.home_score ?? 0} - {fixture.match?.away_score ?? 0}
                      </span>
                      <span className="block text-xs font-medium text-[#64748B] mt-0.5">
                        الجولة {fixture.matchday || 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-end">
                      <span className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                        {fixture.away_team?.name || fixture.awayTeam?.name}
                      </span>
                      <TeamLogo
                        team={fixture.away_team || fixture.awayTeam}
                        className="size-8 rounded-lg bg-white p-0.5 shadow-2xs"
                        fontSize="text-xs font-bold"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-xl border border-dashed border-[#E6EBF2] bg-slate-50/50">
                  <p className="text-sm font-medium text-[#64748B]">
                    لا توجد نتائج مسجلة حتى الآن في هذه البطولة
                  </p>
                  <Link
                    to={activeTour ? `/committee/tournaments/${activeTour.id}?tab=fixtures` : '/committee/tournaments'}
                    className="inline-flex items-center gap-1.5 mt-2.5 text-sm font-bold text-[#0F9D58] hover:underline"
                  >
                    <span>استعراض برنامج المباريات</span>
                    <ArrowLeft className="size-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Section E: المباريات القادمة (Upcoming Matches Structured Table) */}
          <div className="bg-white rounded-2xl border border-[#E6EBF2] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="size-5 text-[#0F9D58] stroke-[2]" />
                <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">المباريات القادمة</h2>
              </div>
              <Link
                to={activeTour ? `/committee/tournaments/${activeTour.id}?tab=fixtures` : '/committee/tournaments'}
                className="inline-flex items-center gap-1 text-sm font-bold text-[#0F9D58] hover:underline"
              >
                <span>عرض الجدول كاملاً</span>
                <ChevronLeft className="size-4 stroke-[2]" />
              </Link>
            </div>

            {nextScheduledMatches.length > 0 ? (
              <div className="divide-y divide-[#E6EBF2] border border-[#E6EBF2] rounded-xl overflow-hidden">
                {nextScheduledMatches.map((fixture) => (
                  <div
                    key={fixture.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-white hover:bg-slate-50 transition-colors"
                  >
                    {/* Teams with Logos */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TeamLogo
                          team={fixture.home_team || fixture.homeTeam}
                          className="size-7 rounded-md bg-white p-0.5"
                          fontSize="text-[10px] font-bold"
                        />
                        <span className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                          {fixture.home_team?.name || fixture.homeTeam?.name || 'فريق مضيف'}
                        </span>
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-[#64748B] shrink-0 px-1">VS</span>

                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TeamLogo
                          team={fixture.away_team || fixture.awayTeam}
                          className="size-7 rounded-md bg-white p-0.5"
                          fontSize="text-[10px] font-bold"
                        />
                        <span className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                          {fixture.away_team?.name || fixture.awayTeam?.name || 'فريق ضيف'}
                        </span>
                      </div>
                    </div>

                    {/* Date, Time & Stadium */}
                    <div className="flex items-center justify-between sm:justify-end gap-3.5 text-xs sm:text-sm text-[#64748B] shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 stroke-[2] text-[#64748B]" />
                        <span className="font-bold text-[#0F172A]">
                          {formatArabicTime(fixture.scheduled_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 max-w-[150px] truncate">
                        <MapPin className="size-3.5 stroke-[2] text-[#0F9D58]" />
                        <span className="truncate font-medium text-[#475569]">
                          {fixture.stadium?.name || activeTour?.stadium?.name || 'الملعب'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenMatchRecording(fixture)}
                        className="size-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0F9D58] grid place-items-center transition-colors cursor-pointer"
                        title="إدارة وتسجيل المباراة"
                      >
                        <Swords className="size-4 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl border border-dashed border-[#E6EBF2] bg-slate-50/50">
                <p className="text-sm font-medium text-[#64748B]">
                  لا توجد مباريات أخرى مبرمجة في هذه الجولة
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Match Control Room Modal (Operational Match Result & Lineup Entry) */}
      {controlRoomFixture && activeTour && (
        <MatchControlRoom
          fixture={controlRoomFixture}
          tournament={activeTour}
          initialTab={controlRoomTab}
          onClose={() => {
            setControlRoomFixture(null)
            handleRefreshAll()
          }}
          onSaved={() => {
            setControlRoomFixture(null)
            handleRefreshAll()
          }}
        />
      )}
    </div>
  )
}
