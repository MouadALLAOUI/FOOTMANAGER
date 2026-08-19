import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import { termsAr } from '../../content/terms/ar'
import { termsEn } from '../../content/terms/en'
import TermsHeader from './header'
import TermsToc from './toc'
import TermsSections from './sections'
import TermsContact from './contact'

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
      <TermsToc content={content} />
      <TermsSections content={content} />
      <TermsContact />
    </main>
  )
}
