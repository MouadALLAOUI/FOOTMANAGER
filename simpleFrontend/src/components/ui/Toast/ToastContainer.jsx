import Toast from './Toast'
import { useToasts } from './toastStore'

export default function ToastContainer() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed z-[300] mx-auto flex w-[min(400px,calc(100vw-32px))] flex-col gap-2.5 max-sm:inset-x-4 max-sm:top-4 sm:bottom-6 sm:end-6">
      {toasts.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  )
}
