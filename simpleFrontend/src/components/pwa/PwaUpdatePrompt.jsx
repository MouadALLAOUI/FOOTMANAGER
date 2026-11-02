import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, X } from 'lucide-react'
import { applyPwaUpdate } from '../../pages/landing/pwaHelper'

export default function PwaUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const handleUpdate = (e) => {
      const worker = e.detail && e.detail.waitingWorker ? e.detail.waitingWorker : null
      setWaitingWorker(worker)
      setUpdateAvailable(true)
    }

    window.addEventListener('aji_pwa_update_available', handleUpdate)
    return () => {
      window.removeEventListener('aji_pwa_update_available', handleUpdate)
    }
  }, [])

  const handleApplyUpdate = () => {
    setUpdating(true)
    applyPwaUpdate(waitingWorker)
    // Reload safely after short delay if controllerchange didn't fire
    setTimeout(() => {
      const path = window.location.pathname
      const isBookingActive = /booking|reservation|payment/i.test(path)
      if (!isBookingActive) {
        window.location.reload()
      }
    }, 600)
  }

  if (!updateAvailable) return null

  return (
    <div
      role="alert"
      className="fixed bottom-20 sm:bottom-6 start-4 end-4 sm:start-auto sm:end-6 z-[var(--z-toast)] max-w-sm rounded-2xl bg-[#1B201D] border border-[#303832] p-3.5 shadow-2xl backdrop-blur-md text-[#F5F7F2] animate-bounce-in"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#D0FF38]/20 text-[#D0FF38]">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-xs font-black text-[#F5F7F2]">تحديث جديد متوفر</p>
            <p className="text-[11px] text-[#B2B9B3]">نسخة محسنة وجديدة من أجي نقصرو</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={updating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] hover:brightness-105 px-3 py-1.5 text-xs font-black text-[#111313] shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'جارٍ التحديث...' : 'حدّث الآن'}</span>
          </button>
          <button
            type="button"
            onClick={() => setUpdateAvailable(false)}
            aria-label="إغلاق"
            className="grid size-7 place-items-center rounded-lg text-[#B2B9B3] hover:text-[#F5F7F2] hover:bg-[#252B27] cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
