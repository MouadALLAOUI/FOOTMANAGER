import { useActivityLock } from '../../context/AuthContext'

export default function ActivityLockBanner() {
  const { locked, reason } = useActivityLock()

  if (!locked) return null

  return (
    <div className="bg-amber-500 px-4 py-3 text-center text-sm font-bold text-white" role="alert">
      <span>تم تقييد نشاط حسابك</span>
      {reason ? <span className="ms-2 font-normal opacity-90">— {reason}</span> : null}
    </div>
  )
}
