import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import SEO from '../../components/system/SEO'
import TopBanner from './topBanner'
import PwaTopBanner from './pwaTopBanner'
import { isStandalone, isBannerDismissed } from './pwaHelper'
import HeroSection from './hero'
import StatsBar from './statsBar'
import LiveTournamentCard from './liveTournamentCard'
import Tournaments from './tournaments'
import AvailableFields from './availableFields'
import ChallengesWall from './challengesWall'
import PlayerOfTheWeek from './playerOfTheWeek'
import WhyUs from './whyUs'
import CommunityBanner from './communityBanner'
import MascotFaq from './mascotFaq'
import SearchResultsSheet from './searchResults'

export default function Landing() {
  const [city, setCity] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const [pwaBannerActive, setPwaBannerActive] = useState(() => {
    try {
      return !isStandalone() && !isBannerDismissed()
    } catch {
      return false
    }
  })

    const { theme, toggleTheme, isDark } = useTheme()

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F7F8F5] dark:bg-[#101211] text-[#111313] dark:text-[#F5F7F2]"
    >
      {/* 1. SEO Meta Tags in Pure Standard Arabic */}
      <SEO
        title="أجي نقصرو | الكرة تجمعنا... مباريات محلية بنكهة احترافية"
        description="أجي نقصرو — كل ما يحتاجه المنظّم واللاعب في مكان واحد، وبأداء احترافي. احجز ملاعب القرب، ونظّم البطولات المحلية، وتابع نتائج المباريات الرياضية في الدار البيضاء، الرباط، مراكش، طنجة وكافة المدن المغربية."
        canonical="https://ajin9essro.com/"
        keywords="أجي نقصرو, aji nqssro, حجز ملاعب القرب بالمغرب, تنظيم دوريات كرة القدم, بطولات محلية, مباريات ودية, ملاعب الدار البيضاء, ملاعب الرباط, ملاعب مراكش, ملاعب طنجة, دوري رمضان, كرة قدم الهواة"
      />

      {/* Semantic Main Element with Unified Proportions & Balanced Spacing */}
      <main
        id="main-content"
        className="w-full max-w-full space-y-2 sm:space-y-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+var(--genie-size))] sm:pb-12"
      >
        {/* 1. Top Banners & Hero Envelope (Seamless zero-gap integration) */}
        <div className="w-full max-w-full">
          <PwaTopBanner theme={theme} onVisibilityChange={setPwaBannerActive} />
          {!pwaBannerActive && <TopBanner theme={theme} />}
          <HeroSection
            theme={theme}
            onToggleTheme={toggleTheme}
            onSearchSubmit={(term) => {
              setCity(term)
              setResultsOpen(true)
            }}
          />
        </div>

        {/* 4. Balanced KPI Stats Bar (z-10) */}
        <StatsBar theme={theme} />

        {/* 5. Luxury Match Card & Real Results Ticker (Designated Dark Section) */}
        <LiveTournamentCard theme={theme} />

        {/* 6. Featured Tournaments */}
        <Tournaments theme={theme} />

        {/* 7. Available Fields Carousel (Designated Dark Section with integer prices & clear contact rules) */}
        <AvailableFields theme={theme} />

        {/* 8. Registered Teams Challenge Wall (Only displayed if >= 1 team exists) */}
        <ChallengesWall theme={theme} />

        {/* 9. Star Player of the Week (Only displayed if committee selected a player with verified stats) */}
        <PlayerOfTheWeek theme={theme} />

        {/* 10. Why Us & Pitch Owner CTA (Permanent Sections: لماذا أجي نقصرو + هل تملك ملعباً؟) */}
        <WhyUs theme={theme} />

        {/* 11. Join Our Community Banner (Permanent Section: Directly before Mascot FAQ) */}
        <CommunityBanner theme={theme} />

        {/* 12. Mascot FAQ Accordion (Permanent Section: Last section before footer) */}
        <MascotFaq theme={theme} />
      </main>

      {/* Search Results Sheet */}
      <SearchResultsSheet open={resultsOpen} city={city} onClose={() => setResultsOpen(false)} />
    </div>
  )
}
