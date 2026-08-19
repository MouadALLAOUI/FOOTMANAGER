import { useTranslation } from 'react-i18next'
import { Hourglass } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function RateLimited({ onRetry, retryAfter }) {
  const { t } = useTranslation()
  return (
    <ErrorPage
      statusCode={429}
      title={t('errorPage.rateLimited.title')}
      description={t('errorPage.rateLimited.desc')}
      icon={<Hourglass />}
      iconTone="amber"
      onRetry={onRetry}
      retryAfter={retryAfter}
      showHomeButton
    />
  )
}
