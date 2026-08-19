import { useState } from 'react'
import Hero from './hero'
import Search from './search'
import PopularSearches from './popularSearches'
import LiveStatus from './liveStatus'
import MySection from './mySection'
import AvailableFields from './availableFields'
import Matches from './matches'
import Tournaments from './tournaments'
import WhyUs from './whyUs'
import SearchResultsSheet from './searchResults'

export default function Landing() {
  const [city, setCity] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)

  return (
    <>
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
        <AvailableFields />
        <Matches />
        <Tournaments />
        <WhyUs />
      </main>
      <SearchResultsSheet open={resultsOpen} city={city} onClose={() => setResultsOpen(false)} />
    </>
  )
}
