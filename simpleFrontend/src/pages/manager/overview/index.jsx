import { CommandCenterProvider } from '../components/CommandCenterContext'
import HeroHeader from '../components/HeroHeader'
import TodayPanel from '../components/TodayPanel'
import QuickBooking from '../components/QuickBooking'
import MatchMarket from '../components/MatchMarket'
import TeamManagement from '../components/TeamManagement'
import PerformancePanel from '../components/PerformancePanel'
import BookingsPanel from '../components/BookingsPanel'
import RecruitmentPanel from '../components/RecruitmentPanel'
import ActivityFeed from '../components/ActivityFeed'
import GoToSite from '../../../components/ui/GoToSite'
import {
  MatchDrawer,
  BookingDrawer,
  PlayerDrawer,
  TeamRowDrawer,
  JoinMatchDrawer,
  BookTerrainDrawer,
  CreateMatchDrawer,
  InviteDrawer,
} from '../components/CommandCenterDrawers'
import NotificationsPanel from '../components/NotificationsPanel'
import GlobalSearch from '../components/GlobalSearch'

export default function Overview() {
  return (
    <CommandCenterProvider>
      <div className="space-y-5">
        <GoToSite />
        <HeroHeader />

        <TodayPanel />

        <QuickBooking />

        <MatchMarket />

        <div className="grid items-start gap-5 lg:grid-cols-3">
          <TeamManagement />
          <div className="lg:col-span-2">
            <PerformancePanel />
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <BookingsPanel />
          <RecruitmentPanel />
        </div>

        <ActivityFeed />
      </div>

      <MatchDrawer />
      <BookingDrawer />
      <PlayerDrawer />
      <TeamRowDrawer />
      <JoinMatchDrawer />
      <BookTerrainDrawer />
      <CreateMatchDrawer />
      <InviteDrawer />
      <NotificationsPanel />
      <GlobalSearch />
    </CommandCenterProvider>
  )
}
