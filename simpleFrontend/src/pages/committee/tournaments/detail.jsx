import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BarChart3,
  FileDown,
  LayoutGrid,
  ListOrdered,
  Lock,
  MessageSquareText,
  Network,
  Settings2,
  SlidersHorizontal,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, Empty, SectionTitle, Skeleton, StatusBadge } from '../../../components/dashboard/ui'
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
  { key: 'overview', icon: Settings2, label: 'committee.detail.overview' },
  { key: 'settings', icon: SlidersHorizontal, label: 'committee.detail.settings' },
  { key: 'teams', icon: Users, label: 'committee.detail.teams' },
  { key: 'draw', icon: ListOrdered, label: 'committee.detail.draw' },
  { key: 'fixtures', icon: Swords, label: 'committee.detail.fixtures' },
  { key: 'standings', icon: Trophy, label: 'committee.detail.standings' },
  { key: 'bracket', icon: Network, label: 'committee.detail.bracket' },
  { key: 'statistics', icon: Trophy, label: 'committee.detail.statistics' },
  { key: 'analytics', icon: BarChart3, label: 'committee.detail.analytics' },
  { key: 'content', icon: LayoutGrid, label: 'committee.detail.content' },
  { key: 'communication', icon: MessageSquareText, label: 'committee.detail.communication' },
]

export default function TournamentDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [active, setActive] = useState('overview')
  const [refresh, setRefresh] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)

  const { data: tour, loading } = useApi(
    () => api.get(`/committee/tournaments/${id}`).then((r) => r.data.data),
    [id, refresh],
    { staleTime: 0 },
  )

  const bump = () => setRefresh((v) => v + 1)
  const tabProps = { tournament: tour, refresh: bump, refreshKey: refresh, setActive }

  if (loading) {
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
      <SectionTitle
        title={tour.name}
        subtitle={`${tour.edition || ''} ${tour.category || ''} • ${t(`committee.tournaments.formats.${tour.tournament_format}`)}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-green-500 px-3.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)] transition-opacity hover:opacity-90"
            >
              <FileDown className="size-4" />
              {t('committee.export.openButton')}
            </button>
            <StatusBadge status={tour.status} />
            <Badge variant="info">{t('committee.detail.teamsCount', { count: tour.stats?.registered_teams ?? 0 })}</Badge>
            <Link
              to="/committee/tournaments"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ArrowRight className="size-4 rtl:rotate-180" />
              {t('committee.detail.back')}
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
        {tabs.map(({ key, icon: Icon, label }) => {
          const locked = gatedTabs.includes(key) && !canProceed
          return (
            <button
              key={key}
              type="button"
              disabled={locked}
              onClick={() => setActive(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${
                active === key
                  ? 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)]'
                  : locked
                    ? 'cursor-not-allowed text-slate-300'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className="size-4" />
              {t(label)}
              {locked && <Lock className="size-3" />}
            </button>
          )
        })}
      </div>

      {active === 'overview' && <OverviewTab {...tabProps} editable={settingsEditable} setActive={setActive} />}
      {active === 'settings' && <SettingsTab {...tabProps} />}
      {active === 'teams' && <TeamsTab {...tabProps} />}
      {renderStep('draw', DrawBoard)}
      {renderStep('fixtures', FixturesTab)}
      {renderStep('standings', StandingsTab)}
      {renderStep('bracket', BracketTab)}
      {renderStep('statistics', StatisticsTab)}
      {renderStep('analytics', AnalyticsTab)}
      {active === 'content' && <ContentTab {...tabProps} />}
      {active === 'communication' && <CommunicationTab {...tabProps} />}

      {exportOpen && <TournamentExport tournament={tour} onClose={() => setExportOpen(false)} />}
    </div>
  )
}
