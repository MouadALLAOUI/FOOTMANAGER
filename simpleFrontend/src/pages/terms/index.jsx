import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import { termsAr } from '../../content/terms/ar'
import { termsEn } from '../../content/terms/en'
import TermsHeader from './header'
import TermsSections from './sections'
import TermsContact from './contact'
import FloatingToc from '../../components/FloatingToc'

export default function Terms() {
  const { t, i18n } = useTranslation()
  const content = i18n.language.startsWith('ar') ? termsAr : termsEn

  useSeo({
    title: t('terms.page.title'),
    description: t('terms.page.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <TermsHeader content={content} />
      <TermsSections content={content} />
      <TermsContact />
      <FloatingToc sections={content.sections} label={t('terms.page.tocTitle')} />
    </main>
  )
}
