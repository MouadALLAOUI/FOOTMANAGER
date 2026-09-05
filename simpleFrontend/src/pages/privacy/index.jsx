import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import { privacyAr } from '../../content/privacy/ar'
import { privacyEn } from '../../content/privacy/en'
import PrivacyHeader from './header'
import PrivacySections from './sections'
import PrivacyContact from './contact'
import FloatingToc from '../../components/FloatingToc'

export default function Privacy() {
  const { t, i18n } = useTranslation()
  const content = i18n.language.startsWith('ar') ? privacyAr : privacyEn

  useSeo({
    title: t('privacy.page.title'),
    description: t('privacy.page.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <PrivacyHeader content={content} />
      <PrivacySections content={content} />
      <PrivacyContact />
      <FloatingToc sections={content.sections} label={t('privacy.page.tocTitle')} />
    </main>
  )
}
