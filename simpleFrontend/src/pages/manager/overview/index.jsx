import { CommandCenterProvider } from '../components/CommandCenterContext'
import ProductionHeroHeader from '../components/ProductionHeroHeader'
import ProductionAttentionBanners from '../components/ProductionAttentionBanners'
import ProductionUpcomingMatches from '../components/ProductionUpcomingMatches'
import ProductionTeamWidget from '../components/ProductionTeamWidget'
import ProductionNearbyStadiums from '../components/ProductionNearbyStadiums'
import ProductionOpenTournaments from '../components/ProductionOpenTournaments'
import ProductionSuggestedTeams from '../components/ProductionSuggestedTeams'
import ProductionRecentActivity from '../components/ProductionRecentActivity'
import ProductionTeamStatistics from '../components/ProductionTeamStatistics'
import ProductionMobileNav from '../components/ProductionMobileNav'

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
      <div className="space-y-6 pb-20 lg:pb-8">
        {/* 1. Hero Section: Greeting + 4 Primary Action Cards */}
        <ProductionHeroHeader />

        {/* 2. Needs Attention: 3 Alert Cards */}
        <ProductionAttentionBanners />

        {/* 3. Row 1: Upcoming Matches (8 cols) + My Team Widget (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-8">
            <ProductionUpcomingMatches />
          </div>
          <div className="lg:col-span-4">
            <ProductionTeamWidget />
          </div>
        </div>

        {/* 4. Row 2: Nearby Stadiums (8 cols) + Open Tournaments (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-8">
            <ProductionNearbyStadiums />
          </div>
          <div className="lg:col-span-4">
            <ProductionOpenTournaments />
          </div>
        </div>

        {/* 5. Row 3: Suggested Teams (8 cols) + Recent Activity (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-8">
            <ProductionSuggestedTeams />
          </div>
          <div className="lg:col-span-4">
            <ProductionRecentActivity />
          </div>
        </div>

        {/* 6. Row 4: Team Statistics (Full Width) */}
        <ProductionTeamStatistics />
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <ProductionMobileNav />

      {/* Functional Drawers & Modals */}
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
