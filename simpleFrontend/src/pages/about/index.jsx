import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import AboutHero from './hero'
import AboutStats from './stats'
import AboutWho from './who'
import AboutMission from './mission'
import AboutProblem from './problem'
import AboutHow from './howItWorks'
import AboutAudience from './audience'
import AboutBenefits from './benefits'
import AboutVision from './vision'
import AboutCta from './cta'

export default function About() {
  const { t } = useTranslation()

  useSeo({
    title: `${t('about.hero.badge')} — ${t('about.hero.title2')}`,
    description: t('about.hero.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <AboutHero />
      <AboutStats />
      <AboutWho />
      <AboutMission />
      <AboutProblem />
      <AboutHow />
      <AboutAudience />
      <AboutBenefits />
      <AboutVision />
      <AboutCta />
    </main>
  )
}
