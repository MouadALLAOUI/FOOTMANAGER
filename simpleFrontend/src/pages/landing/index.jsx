import { useState } from 'react'
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
