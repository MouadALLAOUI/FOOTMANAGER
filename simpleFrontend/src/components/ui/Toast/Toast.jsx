import ToastCloseButton from './ToastCloseButton'
import ToastIcon from './ToastIcon'
import ToastProgress from './ToastProgress'
import { dismissToast, pauseToast, resumeToast } from './toastStore'
import { TOAST_THEMES } from './toastTheme'

export default function Toast({ item }) {
  const theme = TOAST_THEMES[item.type] || TOAST_THEMES.info
  const isAlert = item.type === 'error' || item.type === 'warning'
  const progress = item.persistent ? null : (item.remaining / item.totalDuration) * 100
  const motion = item.leaving ? 'toast-leave' : 'toast-enter'

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.12)] ${motion} ${theme.glow}`}
      onMouseEnter={() => pauseToast(item.id)}
      onMouseLeave={() => resumeToast(item.id)}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 start-0 w-1 ${theme.chip}`} />

      <div className="flex items-start gap-3 px-3.5 py-3 ps-5">
        <ToastIcon type={item.type} className={`mt-0.5 size-5 shrink-0 ${theme.accent}`} />

        <div className="min-w-0 flex-1">
          {item.title ? (
            <>
              <p className="text-sm font-extrabold text-slate-800">{item.title}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{item.message}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-700">{item.message}</p>
          )}
        </div>

        {item.closable && <ToastCloseButton onClick={() => dismissToast(item.id)} />}
      </div>

      {progress !== null && <ToastProgress value={progress} barClass={theme.bar} />}
    </div>
  )
}
