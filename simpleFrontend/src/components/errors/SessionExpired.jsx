import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Timer } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function SessionExpired() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const goToLogin = () => {
    sessionStorage.setItem('auth_redirect', location.pathname + location.search)
    navigate('/login')
  }

  return (
    <ErrorPage
      statusCode={419}
      title={t('errorPage.sessionExpired.title')}
      description={t('errorPage.sessionExpired.desc')}
      icon={<Timer />}
      primaryAction={{ label: t('errorPage.login'), onClick: goToLogin }}
      showHomeButton
    />
  )
}
