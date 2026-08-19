import { useTranslation } from 'react-i18next'
import { ServerCrash } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function ServerError({ onRetry }) {
  const { t } = useTranslation()
  return (
    <ErrorPage
      statusCode={500}
      title={t('errorPage.serverError.title')}
      description={t('errorPage.serverError.desc')}
      icon={<ServerCrash />}
      onRetry={onRetry || (() => window.location.reload())}
      showHomeButton
    />
  )
}
