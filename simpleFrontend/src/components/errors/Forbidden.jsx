import { useTranslation } from 'react-i18next'
import { ShieldX } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function Forbidden() {
  const { t } = useTranslation()
  return (
    <ErrorPage
      statusCode={403}
      title={t('errorPage.forbidden.title')}
      description={t('errorPage.forbidden.desc')}
      icon={<ShieldX />}
      showDashboardButton
      showBackButton
    />
  )
}
