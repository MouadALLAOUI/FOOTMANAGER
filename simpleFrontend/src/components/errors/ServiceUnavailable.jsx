import { useTranslation } from 'react-i18next'
import { CloudOff } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function ServiceUnavailable({ onRetry }) {
  const { t } = useTranslation()
  return (
    <ErrorPage
      statusCode={503}
      title={t('errorPage.serviceUnavailable.title')}
      description={t('errorPage.serviceUnavailable.desc')}
      icon={<CloudOff />}
      iconTone="amber"
      onRetry={onRetry || (() => window.location.reload())}
      showHomeButton
    />
  )
}
