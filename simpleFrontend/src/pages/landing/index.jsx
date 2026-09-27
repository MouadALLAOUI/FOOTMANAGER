import { useState } from 'react'
import SEO from '../../components/system/SEO'
import Hero from './hero'
import Search from './search'
import PopularSearches from './popularSearches'
import LiveStatus from './liveStatus'
import MySection from './mySection'
import Matches from './matches'
import Teams from './teams'
import AvailableFields from './availableFields'
import Tournaments from './tournaments'
import LiveAndNext from './liveAndNext'
import WhyUs from './whyUs'
import SearchResultsSheet from './searchResults'

export default function Landing() {
  const [city, setCity] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)

  return (
    <>
      <SEO
        title="أجي نقصرو | أول منصة لتنظيم مباريات كرة القدم وحجز ملاعب القرب بالمغرب"
        description="أجي نقصرو (Aji Nqssro) — المنصة المغربية الأولى لمسيري ولاعبي كرة القدم. احجز ملاعب القرب، نظّم مباريات ودية وتحديات كروية، انضم إلى دوريات الأحياء وبطولات الهواة في كازا، الرباط، مراكش، طنجة وجميع مدن المغرب."
        canonical="https://ajin9essro.com/"
        keywords="أجي نقصرو, aji nqssro, ajin9essro, حجز ملاعب القرب, تيران القرب, مباريات ودية, ماتش كورة, تنظيم دوريات كرة القدم, ملاعب الدار البيضاء, ملاعب الرباط, ملاعب مراكش, ملاعب طنجة"
      />
    <main id="main-content">
      <Hero>
          <Search
            city={city}
            onCityChange={setCity}
            onSubmit={() => setResultsOpen(true)}
          />
          <PopularSearches onSelect={setCity} />
          <LiveStatus />
        </Hero>
        <MySection />
        <Matches />
        <Teams />
        <AvailableFields />
        <Tournaments />
        <LiveAndNext />
        <WhyUs />
      </main>
      <SearchResultsSheet open={resultsOpen} city={city} onClose={() => setResultsOpen(false)} />
    </>
  )
}
