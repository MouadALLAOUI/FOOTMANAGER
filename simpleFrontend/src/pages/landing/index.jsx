import { useEffect, useState } from 'react'
import SEO from '../../components/system/SEO'
import TopBanner from './topBanner'
import PwaTopBanner from './pwaTopBanner'
import MainHeader from './header'
import HeroSection from './hero'
import StatsBar from './statsBar'
import LiveTournamentCard from './liveTournamentCard'
import ChallengesWall from './challengesWall'
import Tournaments from './tournaments'
import AvailableFields from './availableFields'
import MascotFaq from './mascotFaq'
import FloatingHelper from './floatingHelper'
import SearchResultsSheet from './searchResults'

export default function Landing() {
  const [city, setCity] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const [pwaBannerActive, setPwaBannerActive] = useState(false)

  // Dark / Light Mode state (Default: 'dark' as in official brand, with localStorage memory)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('aji_theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {}
    return 'dark'
  })

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch {}
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('aji_theme', next)
      } catch {}
      return next
    })
  }

  const isDark = theme === 'dark'

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden transition-colors duration-300 pb-16 sm:pb-0 ${
        isDark ? 'bg-[#0F3D2E] text-slate-100' : 'bg-[#F4F6F1] text-slate-900'
      }`}
    >
      {/* 1. SEO Meta Tags in Pure Standard Arabic */}
      <SEO
        title="أجي نقصرو | الكورة كتجمعنا... مباريات محلية بنكهة احترافية"
        description="أجي نقصرو — كل ما يحتاجه المنظم واللاعب في مكان واحد، وبأداء صاروخي. احجز ملاعب القرب، ونظّم البطولات المحلية، وتابع نتائج المباريات الرياضية في الدار البيضاء، الرباط، مراكش، طنجة وكافة المدن المغربية."
        canonical="https://ajin9essro.com/"
        keywords="أجي نقصرو, aji nqssro, حجز ملاعب القرب بالمغرب, تنظيم دوريات كرة القدم, بطولات محلية, مباريات ودية, ملاعب الدار البيضاء, ملاعب الرباط, ملاعب مراكش, ملاعب طنجة, دوري رمضان, كرة قدم الهواة"
      />

      {/* Semantic Main Element with Unified Proportions & Balanced Spacing */}
      <main id="main-content" className="w-full max-w-full overflow-x-hidden space-y-2 sm:space-y-4 pb-[88px]">
        {/* 1. Top Banners: Never show both banners together. PWA banner has first priority. */}
        <PwaTopBanner theme={theme} onVisibilityChange={setPwaBannerActive} />
        {!pwaBannerActive && <TopBanner theme={theme} />}

        {/* 2. Main Platform Header with Crisp Mascot Avatar */}
        <MainHeader theme={theme} onToggleTheme={toggleTheme} />

        {/* 3. Innovative Hero Section with Slogan */}
        <HeroSection
          theme={theme}
          onSearchSubmit={(term) => {
            setCity(term)
            setResultsOpen(true)
          }}
        />

        {/* 4. Balanced KPI Stats Bar (Unified max-w-6xl) */}
        <StatsBar theme={theme} />

        {/* 5. Luxury Match Card & Real Results Ticker (Unified max-w-6xl) */}
        <LiveTournamentCard theme={theme} />

        {/* 6. Horizontal Scrollable Challenges Wall (Disappears completely if 0 challenges) */}
        <ChallengesWall theme={theme} />

        {/* 7. Featured Tournaments & Player of the Week (Unified max-w-6xl) */}
        <Tournaments theme={theme} />

        {/* 8. Available Fields Carousel (Unified max-w-6xl, Proportional Cards) */}
        <AvailableFields theme={theme} />

        {/* 9. Mascot FAQ Accordion with Crisp High-Res Mascot (Unified max-w-6xl) */}
        <MascotFaq theme={theme} />

        {/* 10. Floating AI/Help Speech Bubble Widget with Crisp Mascot */}
        <FloatingHelper theme={theme} />
      </main>

      {/* Search Results Sheet */}
      <SearchResultsSheet open={resultsOpen} city={city} onClose={() => setResultsOpen(false)} />
    </div>
  )
}
