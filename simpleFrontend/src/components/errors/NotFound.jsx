import { useTranslation } from 'react-i18next'
import { SearchX } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <ErrorPage
      statusCode={404}
      title={t('errorPage.notFound.title')}
      description={t('errorPage.notFound.desc')}
      icon={<SearchX />}
      showHomeButton
      showBackButton
    />
  )
}
