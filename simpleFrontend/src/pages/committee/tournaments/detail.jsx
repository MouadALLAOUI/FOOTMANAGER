import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FileDown,
  Info,
  LayoutGrid,
  ListOrdered,
  Lock,
  MessageSquareText,
  MoreVertical,
  Network,
  Settings2,
  Share2,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Card, Empty, Modal, SectionTitle, Skeleton, StatusBadge } from '../../../components/dashboard/ui'
import DelegatedSubmissionReviewModal from '../../../domains/committee/components/DelegatedSubmissionReviewModal'
import QuickShareCard from '../../../components/tournaments/QuickShareCard'
import { syncTournamentGroupNames } from '../../../lib/groupNames'
import OverviewTab from './overviewTab'
import TeamsTab from './teamsTab'
import DrawBoard from './draw'
import FixturesTab from './fixturesTab'
import StandingsTab from './standingsTab'
import BracketTab from './bracketTab'
import StatisticsTab from './statisticsTab'
import AnalyticsTab from './analyticsTab'
import SettingsTab from './settingsTab'
import ContentTab from './contentTab'
import CommunicationTab from './communicationTab'
import TournamentExport from './export'

const tabs = [
  { key: 'overview', icon: Info, label: 'committee.detail.overview', shortLabel: 'معلومات' },
  { key: 'draw', icon: Users, label: 'committee.detail.draw', shortLabel: 'المجموعات' },
  { key: 'fixtures', icon: CalendarDays, label: 'committee.detail.fixtures', shortLabel: 'المباريات' },
  { key: 'standings', icon: BarChart3, label: 'committee.detail.standings', shortLabel: 'الترتيب' },
  { key: 'teams', icon: Users, label: 'committee.detail.teams', shortLabel: 'الفرق' },
  { key: 'bracket', icon: Network, label: 'committee.detail.bracket', shortLabel: 'الأدوار الإقصائية' },
  { key: 'statistics', icon: Trophy, label: 'committee.detail.statistics', shortLabel: 'الإحصائيات' },
  { key: 'analytics', icon: BarChart3, label: 'committee.detail.analytics', shortLabel: 'التحليلات' },
  { key: 'content', icon: LayoutGrid, label: 'committee.detail.content', shortLabel: 'الأخبار' },
  { key: 'communication', icon: MessageSquareText, label: 'committee.detail.communication', shortLabel: 'التواصل' },
  { key: 'settings', icon: Settings2, label: 'committee.detail.settings', shortLabel: 'الإعدادات' },
]

const STATUS_LABELS_AR = {
  draft: 'قيد التنظيم',
  open_for_registration: 'التسجيل مفتوح',
  registration_closed: 'قيد التنظيم',
  in_progress: 'جارية الآن',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

export default function TournamentDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [active, setActive] = useState(initialTab && tabs.some((tb) => tb.key === initialTab) ? initialTab : 'overview')

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested && tabs.some((tb) => tb.key === requested) && requested !== active) {
      setActive(requested)
    }
  }, [searchParams])

  const [refresh, setRefresh] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [reviewSubmissionFixture, setReviewSubmissionFixture] = useState(null)
  const [pendingPickerOpen, setPendingPickerOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [heroMenuOpen, setHeroMenuOpen] = useState(false)
  const tabsRef = useRef(null)

  const { data: tour, loading } = useApi(
    () => api.get(`/committee/tournaments/${id}`).then((r) => {
      syncTournamentGroupNames(r.data.data)
      return r.data.data
    }),
    [id, refresh],
    { staleTime: 0, keepPrevious: true },
  )

  const { data: pendingSubmissionsData } = useApi(
    () => api.get(`/committee/tournaments/${id}/delegated-submissions/pending`).then((r) => r.data),
    [id, refresh],
    { staleTime: 0, keepPrevious: true },
  )

  const pendingFixtures = pendingSubmissionsData?.data || []
  const pendingCount =
    pendingSubmissionsData?.count ??
    tour?.pending_delegated_count ??
    (tour?.stats?.pending_delegated_submissions ?? 0)

  const handleReviewClick = () => {
    if (pendingFixtures.length === 1) {
      setReviewSubmissionFixture(pendingFixtures[0])
    } else if (pendingFixtures.length > 1) {
      setPendingPickerOpen(true)
    } else {
      setActive('fixtures')
    }
  }

  const bump = () => setRefresh((v) => v + 1)
  syncTournamentGroupNames(tour)
  const tabProps = {
    tournament: tour,
    refresh: bump,
    refreshKey: refresh,
    setActive,
    onOpenExport: () => setExportOpen(true),
  }

  if (loading && !tour) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!tour) {
    return (
      <SectionTitle
        title={t('committee.detail.notFound')}
        subtitle={t('committee.detail.notFoundDesc')}
        action={
          <Link
            to="/committee/tournaments"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-5 text-sm font-bold text-[#111313] dark:text-[#F5F7F2]"
          >
            <ArrowRight className="size-4 rtl:rotate-180" />
            {t('committee.detail.back')}
          </Link>
        }
      />
    )
  }

  const editableStatuses = ['draft', 'open_for_registration', 'registration_closed']
  const settingsEditable = tour.settings_editable ?? editableStatuses.includes(tour.status)

  const gatedTabs = ['draw', 'fixtures', 'standings', 'bracket', 'statistics', 'analytics']
  const teamsComplete =
    (tour.stats?.registered_teams ?? 0) === (tour.teams_count ?? 0) && (tour.stats?.registered_teams ?? 0) > 0
  const canProceed = ['in_progress', 'completed'].includes(tour.status) || teamsComplete
  const isLeague = tour.tournament_format === 'league'

  const primaryTabs = [
    { key: 'overview', icon: Info, label: 'معلومات' },
    isLeague
      ? { key: 'teams', icon: Users, label: 'الفرق' }
      : { key: 'draw', icon: Users, label: 'المجموعات' },
    { key: 'fixtures', icon: CalendarDays, label: 'المباريات', alert: pendingCount > 0 },
    { key: 'standings', icon: BarChart3, label: 'الترتيب' },
  ]

  const secondaryTabs = tabs.filter((tb) => {
    if (isLeague && (tb.key === 'draw' || tb.key === 'bracket')) return false
    if (primaryTabs.some((p) => p.key === tb.key)) return false
    return true
  })

  const renderStep = (key, Component) => {
    if (active !== key) return null
    if (!gatedTabs.includes(key) || canProceed) return <Component {...tabProps} />
    return (
      <Card>
        <Empty
          icon={Lock}
          title={t('committee.detail.needAllTeams')}
          description={t('committee.detail.needAllTeamsCount', {
            current: tour.stats?.registered_teams ?? 0,
            expected: tour.teams_count ?? 0,
          })}
          action={
            <Button size="sm" onClick={() => setActive('teams')}>
              {t('committee.detail.teams')}
            </Button>
          }
        />
      </Card>
    )
  }

  const statusText = STATUS_LABELS_AR[tour.status] || t(`status.${tour.status}`) || 'قيد التنظيم'

  return (
    <div className="pb-24 sm:pb-10 space-y-4">
      {/* Tournament Hero Banner + Anchored Primary 4-Tab Bar */}
      <div className="overflow-hidden rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-xs">
        {/* Dark Sport-Premium Hero Section */}
        <div className="relative overflow-hidden bg-[#101211] p-4 sm:p-6 text-white">
          {/* Subtle Stadium / Trophy Visual Backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#101211] via-[#101211]/80 to-[#18221B]/60" />
            <div className="absolute -bottom-8 left-0 right-0 h-20 bg-gradient-to-t from-[#1F9D55]/25 to-transparent" />
            <div className="absolute start-3 bottom-2 sm:start-6 sm:bottom-3 opacity-90">
              <img
                src="/icon_trophy.png"
                alt=""
                className="size-20 sm:size-28 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>

          {/* Top Bar: Back Button + Edit / Actions */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
            <Link
              to="/committee/tournaments"
              className="inline-flex size-9 sm:h-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition active:scale-95"
              title={t('committee.detail.back') || 'عودة للقائمة'}
            >
              <ArrowRight className="size-4 rtl:rotate-0" />
              <span className="hidden sm:inline">{t('committee.detail.back') || 'عودة للقائمة'}</span>
            </Link>

            <div className="flex items-center gap-1.5">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleReviewClick}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#B8F000] px-3 text-xs font-black text-[#111313] shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <ShieldAlert className="size-3.5 shrink-0" />
                  <span>مراجعة النتائج ({pendingCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex size-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
                title="روابط المشاركة السريعة"
              >
                <Share2 className="size-4 text-[#B8F000]" />
                <span className="hidden md:inline">مشاركة</span>
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex size-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
                title={t('committee.export.openButton') || 'تصدير / طباعة'}
              >
                <FileDown className="size-4 text-[#B8F000]" />
                <span className="hidden md:inline">تصدير</span>
              </button>

              <button
                type="button"
                onClick={() => setActive('settings')}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-95 cursor-pointer"
                title="إعدادات البطولة"
              >
                <Edit3 className="size-4" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHeroMenuOpen((v) => !v)}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition active:scale-95 cursor-pointer"
                  aria-label="المزيد من الخيارات"
                >
                  <MoreVertical className="size-4" />
                </button>
                {heroMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setHeroMenuOpen(false)} />
                    <div className="absolute end-0 top-11 z-40 w-48 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-1.5 shadow-xl text-[#111313] dark:text-[#F5F7F2]">
                      <button
                        type="button"
                        onClick={() => {
                          setHeroMenuOpen(false)
                          setShareOpen(true)
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] text-start"
                      >
                        <Share2 className="size-3.5 text-[#1F9D55] dark:text-[#D0FF38]" />
                        <span>روابط المشاركة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHeroMenuOpen(false)
                          setExportOpen(true)
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] text-start"
                      >
                        <FileDown className="size-3.5 text-[#1F9D55] dark:text-[#D0FF38]" />
                        <span>تصدير / طباعة</span>
                      </button>
                      <Link
                        to={`/tournaments/${tour.id}`}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] text-start"
                      >
                        <Eye className="size-3.5 text-[#65706A] dark:text-[#B2B9B3]" />
                        <span>عرض صفحة الجمهور</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hero Content Aligned to Start (Right in RTL) with Trophy on End (Left in RTL) */}
          <div className="relative z-10 flex flex-col items-start pe-24 sm:pe-32">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center rounded-full bg-[#B8F000] px-3 py-0.5 text-[11px] font-black text-[#111313]">
                {statusText}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/85">
                {t(`committee.tournaments.formats.${tour.tournament_format}`) || 'دوري مجموعات'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              {tour.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-white/80">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5 text-[#B8F000]" />
                <span>{tour.stats?.registered_teams ?? 0} فريقاً</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <span>إدارة البطولة</span>
              </span>
              {tour.start_date && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-white/75">
                    <Calendar className="size-3.5 text-[#B8F000]" />
                    <span>
                      {tour.start_date} {tour.end_date ? `– ${tour.end_date}` : ''}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Draft Notice Banner */}
          {tour.status === 'draft' && (
            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2.5 text-xs text-white">
              <div className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-[#B8F000] text-[#111313] font-black shrink-0 text-[11px]">
                  !
                </span>
                <span className="font-semibold">البطولة في وضع المسودة — افتح باب التسجيل أو تابع الإعدادات.</span>
              </div>
              <Link
                to={`/committee/tournaments/wizard?id=${tour.id}`}
                className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#B8F000] hover:bg-[#a6d900] text-[#111313] px-3 font-black text-xs transition"
              >
                <span>معالج الإعداد</span>
                <ArrowRight className="size-3.5 rtl:rotate-180" />
              </Link>
            </div>
          )}
        </div>

        {/* Primary 4-Segment Navigation Bar (Matches Reference Images 1 & 2) */}
        <div className="p-2 sm:p-2.5 bg-white dark:bg-[#1B201D]">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {primaryTabs.map(({ key, icon: Icon, label, alert }) => {
              const locked = gatedTabs.includes(key) && !canProceed
              const isCurrent = active === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={locked}
                  onClick={() => setActive(key)}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-2 transition-all active:scale-95 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] font-black shadow-xs'
                      : locked
                        ? 'bg-[#F7F8F5] dark:bg-[#252B27]/50 text-[#65706A]/50 dark:text-[#B2B9B3]/40 cursor-not-allowed'
                        : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#E9ECE7] dark:hover:bg-[#303832] font-bold'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon className="size-5 stroke-[2.2]" />
                    {locked && <Lock className="size-3 ms-1 opacity-60" />}
                    {alert && (
                      <span className="absolute -top-1 -end-2 flex size-3.5 items-center justify-center rounded-full bg-[#D92D20] text-[9px] font-black text-white">
                        !
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm leading-tight truncate max-w-full">{label}</span>
                </button>
              )
            })}
          </div>

          {/* Secondary Operational Tools Bar (Teams, Knockout, Stats, Content, Settings...) */}
          <div
            ref={tabsRef}
            className="mt-2 pt-2 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            {secondaryTabs.map(({ key, icon: Icon, shortLabel }) => {
              const locked = gatedTabs.includes(key) && !canProceed
              const isCurrent = active === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={locked}
                  onClick={() => setActive(key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all active:scale-95 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#111313] dark:bg-[#D0FF38] text-white dark:text-[#111313] font-black'
                      : locked
                        ? 'opacity-45 cursor-not-allowed text-[#65706A] dark:text-[#B2B9B3]'
                        : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2] font-bold'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{shortLabel}</span>
                  {key === 'teams' && (tour.stats?.registered_teams ?? 0) > 0 && (
                    <span className="rounded-md bg-black/10 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono">
                      {tour.stats.registered_teams}
                    </span>
                  )}
                  {locked && <Lock className="size-3 opacity-60" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {active === 'overview' && <OverviewTab {...tabProps} editable={settingsEditable} setActive={setActive} />}
      {active === 'settings' && <SettingsTab {...tabProps} />}
      {active === 'teams' && <TeamsTab {...tabProps} />}
      {tour.tournament_format !== 'league' && renderStep('draw', DrawBoard)}
      {renderStep('fixtures', FixturesTab)}
      {renderStep('standings', StandingsTab)}
      {tour.tournament_format !== 'league' && renderStep('bracket', BracketTab)}
      {renderStep('statistics', StatisticsTab)}
      {renderStep('analytics', AnalyticsTab)}
      {active === 'content' && <ContentTab {...tabProps} />}
      {active === 'communication' && <CommunicationTab {...tabProps} />}

      {exportOpen && <TournamentExport tournament={tour} onClose={() => setExportOpen(false)} />}

      {pendingPickerOpen && (
        <Modal
          open={pendingPickerOpen}
          onClose={() => setPendingPickerOpen(false)}
          title="مباريات بانتظار اعتماد نتيجة المندوب"
          size="md"
        >
          <div className="space-y-3 py-1" dir="rtl">
            <p className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
              اختر المباراة التي ترغب في مراجعة نتيجتها واعتمادها:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {pendingFixtures.map((fix) => {
                const sub = fix.delegated_submission
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={fix.id}
                    onClick={() => {
                      setPendingPickerOpen(false)
                      setReviewSubmissionFixture(fix)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPendingPickerOpen(false)
                        setReviewSubmissionFixture(fix)
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] transition-all text-start group shadow-2xs cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-black text-xs text-[#111313] dark:text-[#F5F7F2]">
                        {fix.home_team?.id != null ? (
                          <Link
                            to={`/teams/${fix.home_team.id}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPendingPickerOpen(false)
                            }}
                            className="hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors"
                          >
                            {fix.home_team.name}
                          </Link>
                        ) : (
                          <span>{fix.home_team?.name || 'المضيف'}</span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#111313] dark:bg-[#252B27] text-white px-2 py-0.5 text-xs font-mono tabular-nums">
                          <span>{sub?.home_score ?? 0}</span>
                          <span className="font-sans opacity-70">-</span>
                          <span>{sub?.away_score ?? 0}</span>
                        </span>
                        {fix.away_team?.id != null ? (
                          <Link
                            to={`/teams/${fix.away_team.id}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPendingPickerOpen(false)
                            }}
                            className="hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors"
                          >
                            {fix.away_team.name}
                          </Link>
                        ) : (
                          <span>{fix.away_team?.name || 'الضيف'}</span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3] mt-1">
                        مسجلة بواسطة: <span className="text-[#111313] dark:text-[#F5F7F2] font-bold">{sub?.recorder_name || 'مندوب المباراة'}</span>
                        {sub?.anomalies?.length > 0 && (
                          <span className="ms-2 text-[#D92D20] font-bold">⚠️ تنبيهات</span>
                        )}
                        {sub?.is_disputed && (
                          <span className="ms-2 text-[#D97706] font-bold">🛡️ متنازع عليها</span>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-[#65706A] group-hover:text-[#1F9D55] dark:group-hover:text-[#D0FF38] rtl:rotate-180 transition-colors" />
                  </div>
                )
              })}
            </div>
          </div>
        </Modal>
      )}

      {reviewSubmissionFixture && (
        <DelegatedSubmissionReviewModal
          isOpen={Boolean(reviewSubmissionFixture)}
          onClose={() => setReviewSubmissionFixture(null)}
          tournamentId={tour.id}
          fixture={reviewSubmissionFixture}
          onApproved={() => {
            setReviewSubmissionFixture(null)
            bump()
          }}
          onRejected={() => {
            setReviewSubmissionFixture(null)
            bump()
          }}
        />
      )}

      {shareOpen && (
        <Modal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title="روابط المشاركة السريعة للبطولة"
          size="md"
        >
          <div className="p-1">
            <QuickShareCard tournament={tour} type="both" />
          </div>
        </Modal>
      )}
    </div>
  )
}
