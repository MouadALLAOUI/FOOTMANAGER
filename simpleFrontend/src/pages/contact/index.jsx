import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import ContactHero from './hero'
import ContactInfo from './info'
import ContactForm from './form'

export default function Contact() {
  const { t } = useTranslation()

  useSeo({
    title: `${t('contact.hero.badge')} — ${t('contact.hero.title2')}`,
    description: t('contact.hero.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <ContactHero />
      <ContactInfo />
      <ContactForm />
    </main>
  )
}
