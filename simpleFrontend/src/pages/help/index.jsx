import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import { helpAr } from '../../content/help/ar'
import { helpEn } from '../../content/help/en'
import HelpHeader from './header'
import HelpTopics from './topics'
import HelpFaq from './faq'
import HelpContact from './contact'

export default function Help() {
  const { t, i18n } = useTranslation()
  const content = i18n.language.startsWith('ar') ? helpAr : helpEn

  useSeo({
    title: t('help.page.title'),
    description: t('help.page.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <HelpHeader />
      <HelpTopics content={content} />
      <HelpFaq />
      <HelpContact />
    </main>
  )
}