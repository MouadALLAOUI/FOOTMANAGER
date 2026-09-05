import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import { faqAr } from '../../content/faq/ar'
import { faqEn } from '../../content/faq/en'
import FaqHeader from './header'
import FaqSections from './sections'
import FaqContact from './contact'

export default function Faq() {
  const { t, i18n } = useTranslation()
  const content = i18n.language.startsWith('ar') ? faqAr : faqEn

  useSeo({
    title: t('faq.page.title'),
    description: t('faq.page.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <FaqHeader content={content} />
      <FaqSections content={content} />
      <FaqContact />
    </main>
  )
}