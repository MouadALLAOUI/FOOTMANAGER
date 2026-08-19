import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth, homeForRole } from '../../context/AuthContext'

const primaryClass =
  'btn-ripple inline-flex h-[52px] shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 disabled:cursor-not-allowed disabled:opacity-70'

const secondaryClass =
  'inline-flex h-[52px] shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'

function ActionButton({ label, to, onClick, variant = 'primary' }) {
  const className = variant === 'primary' ? primaryClass : secondaryClass
  if (to) {
    return (
      <Link to={to} className={className}>
        {label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  )
}

export default function ErrorPage({
  statusCode,
  title,
  description,
  icon,
  iconTone = 'red',
  onRetry,
  retryAfter,
  primaryAction,
  showHomeButton = false,
  showBackButton = false,
  showDashboardButton = false,
  children,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const iconClass =
    iconTone === 'green'
      ? 'bg-green-500/10 text-green-600'
      : iconTone === 'amber'
        ? 'bg-amber-500/10 text-amber-600'
        : 'bg-red-500/10 text-red-500'

  const actions = []
  if (primaryAction) actions.push(<ActionButton key="primary" {...primaryAction} />)
  else if (onRetry) actions.push(<ActionButton key="retry" label={t('errorPage.retry')} onClick={onRetry} />)

  if (showDashboardButton) {
    if (user) {
      actions.push(
        <ActionButton
          key="dashboard"
          label={t('errorPage.backToDashboard')}
          to={homeForRole(user.role)}
          variant="secondary"
        />,
      )
    } else {
      actions.push(
        <ActionButton key="home-guest" label={t('errorPage.backToHome')} to="/" variant="secondary" />,
      )
    }
  }

  if (showBackButton) {
    actions.push(
      <ActionButton
        key="back"
        label={t('errorPage.back')}
        onClick={() => {
          if (window.history.length > 1) window.history.back()
        }}
        variant="secondary"
      />,
    )
  }

  if (showHomeButton) {
    actions.push(<ActionButton key="home" label={t('errorPage.backToHome')} to="/" variant="secondary" />)
  }

  return (
    <section className="grid min-h-[70vh] place-items-center bg-[#f6f7fb] px-6 py-20" role="alert">
      <div className="w-full max-w-xl text-center">
        {statusCode ? (
          <p
            aria-hidden="true"
            className="bg-gradient-to-b from-slate-300/70 to-slate-200/40 bg-clip-text text-[110px] font-black leading-none text-transparent select-none lg:text-[130px]"
          >
            {statusCode}
          </p>
        ) : (
          <div className={`mx-auto grid size-16 place-items-center rounded-2xl ${iconClass}`}>
            <span className="[&>svg]:size-8">{icon}</span>
          </div>
        )}

        {statusCode && (
          <div className={`mx-auto -mt-8 grid size-16 place-items-center rounded-2xl ring-8 ring-[#f6f7fb] ${iconClass}`}>
            <span className="[&>svg]:size-8">{icon}</span>
          </div>
        )}

        <h1 className="mt-6 text-2xl font-black text-slate-900 lg:text-3xl">{title}</h1>
        {description && (
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">{description}</p>
        )}

        {retryAfter != null && (
          <p className="mt-4 inline-flex items-center rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-500/20">
            {t('errorPage.rateLimited.retryAfter', { seconds: retryAfter })}
          </p>
        )}

        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
        )}

        {children}
      </div>
    </section>
  )
}
