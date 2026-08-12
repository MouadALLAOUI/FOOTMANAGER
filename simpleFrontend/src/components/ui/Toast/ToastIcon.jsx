import { TOAST_THEMES } from './toastTheme'

export default function ToastIcon({ type, className }) {
  const theme = TOAST_THEMES[type] || TOAST_THEMES.info
  const Icon = theme.Icon
  return <Icon className={className} aria-hidden="true" />
}
