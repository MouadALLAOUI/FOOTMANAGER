import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function NetworkError({ onRetry }) {
  const { t } = useTranslation()
  return (
    <ErrorPage
      title={t('errorPage.network.title')}
      description={t('errorPage.network.desc')}
      icon={<WifiOff />}
      iconTone="amber"
      onRetry={onRetry || (() => window.location.reload())}
      showHomeButton
      showBackButton
    />
  )
}
