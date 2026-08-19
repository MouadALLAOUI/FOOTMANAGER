import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function GenericError({ onRetry }) {
  const { t } = useTranslation()
  return (
    <ErrorPage
      title={t('errorPage.generic.title')}
      description={t('errorPage.generic.desc')}
      icon={<TriangleAlert />}
      onRetry={onRetry}
      showHomeButton
      showBackButton
    />
  )
}
