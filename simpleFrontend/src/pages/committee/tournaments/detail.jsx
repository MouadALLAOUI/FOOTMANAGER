import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  LayoutGrid,
  ListOrdered,
  Lock,
  MessageSquareText,
  Network,
  Settings2,
  Share2,
  ShieldAlert,
  SlidersHorizontal,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, Empty, Modal, SectionTitle, Skeleton, StatusBadge } from '../../../components/dashboard/ui'
import DelegatedSubmissionReviewModal from '../../../domains/committee/components/DelegatedSubmissionReviewModal'
import QuickShareCard from '../../../components/tournaments/QuickShareCard'
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
  { key: 'overview', icon: Eye, label: 'committee.detail.overview', color: 'emerald', subtext: 'مركز العمليات', iconBg: 'bg-emerald-100 text-emerald-700', activeBg: 'bg-emerald-600 text-white' },
  { key: 'fixtures', icon: Swords, label: 'committee.detail.fixtures', color: 'rose', iconBg: 'bg-rose-100 text-rose-700', activeBg: 'bg-rose-600 text-white' },
  { key: 'teams', icon: Users, label: 'committee.detail.teams', color: 'sky', iconBg: 'bg-sky-100 text-sky-700', activeBg: 'bg-sky-600 text-white' },
  { key: 'standings', icon: Trophy, label: 'committee.detail.standings', color: 'amber', subtext: 'جدول النقاط', iconBg: 'bg-amber-100 text-amber-700', activeBg: 'bg-amber-600 text-white' },
  { key: 'draw', icon: ListOrdered, label: 'committee.detail.draw', color: 'indigo', subtext: 'قرعة المجموعات', iconBg: 'bg-indigo-100 text-indigo-700', activeBg: 'bg-indigo-600 text-white' },
  { key: 'bracket', icon: Network, label: 'committee.detail.bracket', color: 'violet', subtext: 'الأدوار الإقصائية', iconBg: 'bg-violet-100 text-violet-700', activeBg: 'bg-violet-600 text-white' },
  { key: 'statistics', icon: Trophy, label: 'committee.detail.statistics', color: 'teal', subtext: 'الهدافون والبطاقات', iconBg: 'bg-teal-100 text-teal-700', activeBg: 'bg-teal-600 text-white' },
  { key: 'analytics', icon: BarChart3, label: 'committee.detail.analytics', color: 'cyan', subtext: 'مؤشرات الأداء', iconBg: 'bg-cyan-100 text-cyan-700', activeBg: 'bg-cyan-600 text-white' },
  { key: 'content', icon: LayoutGrid, label: 'committee.detail.content', color: 'fuchsia', subtext: 'المنشورات والأخبار', iconBg: 'bg-fuchsia-100 text-fuchsia-700', activeBg: 'bg-fuchsia-600 text-white' },
  { key: 'communication', icon: MessageSquareText, label: 'committee.detail.communication', color: 'blue', subtext: 'إشعارات الفرق', iconBg: 'bg-blue-100 text-blue-700', activeBg: 'bg-blue-600 text-white' },
  { key: 'settings', icon: Settings2, label: 'committee.detail.settings', color: 'slate', subtext: 'إعدادات البطولة', iconBg: 'bg-slate-100 text-slate-700', activeBg: 'bg-slate-800 text-white' },
]

export default function TournamentDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [active, setActive] = useState(initialTab && tabs.some((t) => t.key === initialTab) ? initialTab : 'overview')

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested && tabs.some((t) => t.key === requested) && requested !== active) {
      setActive(requested)
    }
  }, [searchParams])
  const [refresh, setRefresh] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [reviewSubmissionFixture, setReviewSubmissionFixture] = useState(null)
  const [pendingPickerOpen, setPendingPickerOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const tabsRef = useRef(null)

  const scrollTabs = (direction) => {
    if (!tabsRef.current) return
    const scrollAmount = 260
    tabsRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  const handleWheel = (e) => {
    if (tabsRef.current && e.deltaY !== 0 && !e.shiftKey) {
      tabsRef.current.scrollLeft += e.deltaY
    }
  }

  const { data: tour, loading } = useApi(
    () => api.get(`/committee/tournaments/${id}`).then((r) => r.data.data),
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
  const tabProps = { tournament: tour, refresh: bump, refreshKey: refresh, setActive }

  if (loading && !tour) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!tour) {
    return (
      <SectionTitle
        title={t('committee.detail.notFound')}
        subtitle={t('committee.detail.notFoundDesc')}
        action={
          <Link to="/committee/tournaments" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">
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
          action={<Button size="sm" variant="soft" onClick={() => setActive('teams')}>{t('committee.detail.teams')}</Button>}
        />
      </Card>
    )
  }

  return (
    <div>
      {/* Tournament Hero Card */}
      <div className="relative overflow-visible rounded-3xl bg-gradient-to-br from-[#0B1F3A] via-[#0e2746] to-[#071426] p-5 sm:p-6 text-white shadow-lg border border-slate-800/60 mb-4">
        {/* Decorative lighting & glow */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="pointer-events-none absolute -start-10 -top-10 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute end-0 bottom-0 h-40 w-40 rounded-full bg-[#0F9D58]/15 blur-2xl" />
          <div className="pointer-events-none absolute end-4 bottom-2 opacity-15">
            <img src="/icon_trophy.png" alt="" className="size-24 sm:size-28 object-contain" />
          </div>
        </div>

        {/* Top Badges & Actions */}
        <div className="relative z-[9999] flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-300">
              <Trophy className="size-3.5 text-emerald-400" />
              {t(`committee.tournaments.formats.${tour.tournament_format}`) || 'دوري مجموعات'}
            </span>
            <StatusBadge status={tour.status} />
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-slate-200">
              <Users className="size-3" />
              {tour.stats?.registered_teams ?? 0} فرق
            </span>
          </div>

          {/* Actions in Hero */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto relative z-[9999]">
            {/* Pending Delegated Results button */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleReviewClick}
                className="inline-flex min-h-[42px] sm:min-h-[36px] items-center gap-2 rounded-xl border border-white/20 bg-emerald-500 px-3.5 text-xs font-black text-white shadow-md hover:bg-emerald-600 transition-all active:scale-95 animate-pulse cursor-pointer"
                title="توجد نتائج مباريات مسجلة عبر المندوب بانتظار المراجعة والاعتماد"
              >
                <ShieldAlert className="size-3.5 shrink-0 text-white" />
                <span>مراجعة نتائج المندوب</span>
                {pendingCount > 1 && (
                  <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] font-black text-emerald-800">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* Quick Share Links */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex min-h-[42px] sm:min-h-[36px] items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer"
              title="مشاركة الروابط السريعة للبطولة والتسجيل"
            >
              <Share2 className="size-4 text-emerald-400" />
              <span>روابط المشاركة السريعة</span>
            </button>

            {/* Export / Print */}
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex min-h-[42px] sm:min-h-[36px] items-center gap-2 rounded-xl bg-[#0F9D58] hover:bg-[#0c874b] px-3.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <FileDown className="size-4" />
              <span>{t('committee.export.openButton') || 'تصدير / طباعة'}</span>
            </button>

            {/* Back to tournaments list */}
            <Link
              to="/committee/tournaments"
              className="inline-flex min-h-[42px] sm:min-h-[36px] items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-3.5 text-xs font-bold text-white transition-all active:scale-95"
            >
              <ArrowRight className="size-4 rtl:rotate-180" />
              <span>{t('committee.detail.back') || 'عودة للقائمة'}</span>
            </Link>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white font-heading">
            {tour.name}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-2 flex-wrap">
            {tour.edition && <span className="font-bold text-emerald-400">{tour.edition}</span>}
            {tour.category && <span>• {tour.category}</span>}
            {tour.start_date && (
              <span className="inline-flex items-center gap-1 text-slate-300">
                • <Calendar className="size-3.5 text-slate-400 inline" />
                {tour.start_date} {tour.end_date ? `إلى ${tour.end_date}` : ''}
              </span>
            )}
          </p>
        </div>

        {/* Notice for Draft Status on Mobile / Desktop */}
        {tour.status === 'draft' && (
          <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 p-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-amber-500 text-slate-900 font-bold shrink-0">!</span>
              <span>هذه البطولة ما زالت في مرحلة المسودة، انشرها لفتح باب التسجيل للعامة والفرق.</span>
            </div>
            <Link
              to={`/committee/tournaments/wizard?id=${tour.id}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1 font-black text-xs transition-colors shadow-sm"
            >
              <span>متابعة خطوات النشر</span>
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </Link>
          </div>
        )}
      </div>

      {/* Prominent Athletic Navigation Bar with Scrolling Arrows */}
      <div className="mb-6 rounded-3xl bg-slate-100/70 p-2 sm:p-2.5 border border-slate-200/70 shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scroll Right Arrow */}
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/90 shadow-2xs text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all active:scale-95"
            aria-label="تمرير لليمين"
            title="تمرير لليمين"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Scrollable Tabs Track */}
          <div
            ref={tabsRef}
            onWheel={handleWheel}
            className="flex flex-1 items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
          >
            {tabs
              .filter((tab) => {
                if (tour.tournament_format === 'league') {
                  return tab.key !== 'draw' && tab.key !== 'bracket'
                }
                return true
              })
              .map(({ key, icon: Icon, label, subtext, iconBg, activeBg }) => {
                const locked = gatedTabs.includes(key) && !canProceed
                const isCurrent = active === key
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={locked}
                    onClick={() => setActive(key)}
                    className={`group relative flex shrink-0 items-center gap-2.5 sm:gap-3 rounded-2xl p-2 pe-4 sm:p-2.5 sm:pe-5 transition-all active:scale-95 text-start ${
                      isCurrent
                        ? 'bg-white border-2 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : locked
                          ? 'cursor-not-allowed bg-slate-50/60 border border-slate-200/50 opacity-40 text-slate-400'
                          : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs text-slate-800'
                    }`}
                  >
                    {/* Prominent Athletic Icon Pill */}
                    <div
                      className={`relative flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl transition-all shadow-2xs ${
                        isCurrent ? activeBg : iconBg
                      }`}
                    >
                      <Icon className="size-5 sm:size-5.5" />
                      {/* Pending review alert dot on icon */}
                      {key === 'fixtures' && pendingCount > 0 && (
                        <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
                          !
                        </span>
                      )}
                    </div>

                    {/* Label & Dynamic Stats Subtext */}
                    <div className="flex flex-col items-start min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-black tracking-tight whitespace-nowrap ${
                            isCurrent ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                          }`}
                        >
                          {t(label)}
                        </span>
                        {locked && <Lock className="size-3 text-slate-400 shrink-0" />}
                      </div>

                      {/* Numerical Badge under label or context subtext */}
                      {key === 'fixtures' && (tour.stats?.fixtures ?? 0) > 0 ? (
                        <span className="text-[11px] font-black font-mono text-rose-600 tabular-nums">
                          {tour.stats.fixtures} مباراة
                        </span>
                      ) : key === 'teams' && (tour.stats?.registered_teams ?? 0) > 0 ? (
                        <span className="text-[11px] font-black font-mono text-sky-600 tabular-nums">
                          {tour.stats.registered_teams} فرق
                        </span>
                      ) : subtext ? (
                        <span
                          className={`text-[10px] font-semibold truncate max-w-[90px] sm:max-w-none ${
                            isCurrent ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {subtext}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
          </div>

          {/* Scroll Left Arrow */}
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/90 shadow-2xs text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all active:scale-95"
            aria-label="تمرير لليسار"
            title="تمرير لليسار"
          >
            <ChevronLeft className="size-5" />
          </button>
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
            <p className="text-xs font-bold text-slate-500">
              اختر المباراة التي ترغب في مراجعة نتيجتها واعتمادها:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {pendingFixtures.map((fix) => {
                const sub = fix.delegated_submission
                return (
                  <button
                    key={fix.id}
                    type="button"
                    onClick={() => {
                      setPendingPickerOpen(false)
                      setReviewSubmissionFixture(fix)
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-emerald-300 transition-all text-start group shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                        <span>{fix.home_team?.name || 'المضيف'}</span>
                        <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-xs tabular-nums font-mono">
                          {sub?.home_score ?? 0} - {sub?.away_score ?? 0}
                        </span>
                        <span>{fix.away_team?.name || 'الضيف'}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1">
                        مسجلة بواسطة: <span className="text-slate-700 font-bold">{sub?.recorder_name || 'مندوب المباراة'}</span>
                        {sub?.anomalies?.length > 0 && (
                          <span className="ms-2 text-rose-600 font-bold">⚠️ تنبيهات</span>
                        )}
                        {sub?.is_disputed && (
                          <span className="ms-2 text-amber-600 font-bold">🛡️ متنازع عليها</span>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-slate-300 group-hover:text-emerald-600 rtl:rotate-180 transition-colors" />
                  </button>
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
      {/* Quick Share Modal */}
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