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
      className={`pointer-events-auto relative w-full overflow-hidden rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] shadow-md ${motion}`}
      onMouseEnter={() => pauseToast(item.id)}
      onMouseLeave={() => resumeToast(item.id)}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 start-0 w-1.5 ${theme.chip}`} />

      <div className="flex items-start gap-3 px-3.5 py-3 ps-5">
        <ToastIcon type={item.type} className={`mt-0.5 size-5 shrink-0 ${theme.accent}`} />

        <div className="min-w-0 flex-1">
          {item.title ? (
            <>
              <p className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">{item.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">{item.message}</p>
            </>
          ) : (
            <p className="text-sm font-bold text-[#111313] dark:text-[#F5F7F2]">{item.message}</p>
          )}

          {item.action && (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#111313] dark:bg-[#252B27] px-3 py-1 text-xs font-black text-[#F5F7F2] hover:bg-[#252B27] dark:hover:bg-[#303832] transition active:scale-95 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast(item.id)
                item.action.onClick?.()
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>

        {item.closable && <ToastCloseButton onClick={() => dismissToast(item.id)} />}
      </div>

      {progress !== null && <ToastProgress value={progress} barClass={theme.bar} />}
    </div>
  )
}
