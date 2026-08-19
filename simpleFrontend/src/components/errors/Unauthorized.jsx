import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import ErrorPage from './ErrorPage'

export default function Unauthorized() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const goToLogin = () => {
    sessionStorage.setItem('auth_redirect', location.pathname + location.search)
    navigate('/login')
  }

  return (
    <ErrorPage
      statusCode={401}
      title={t('errorPage.unauthorized.title')}
      description={t('errorPage.unauthorized.desc')}
      icon={<Lock />}
      primaryAction={{ label: t('errorPage.login'), onClick: goToLogin }}
      showHomeButton
    />
  )
}
