import { useLocation } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { usePageMaintenance } from './MaintenanceGate'

export default function PageMaintenanceGate({ children }) {
  const { pathname } = useLocation()
  const ctx = usePageMaintenance()

  if (!ctx) return children

  const { isPageActive, getPageMessage, pageLabels } = ctx

  if (!isPageActive(pathname)) return children

  const message = getPageMessage(pathname) || 'هذه الصفحة غير متاحة حالياً due to صيانة'
  const label = pageLabels[pathname] || pathname

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-3xl bg-amber-500/10">
          <Wrench className="size-10 text-amber-500" />
        </div>
        <h2 className="mb-2 text-2xl font-black text-slate-900">{label}</h2>
        <p className="mb-1 text-lg font-bold text-amber-600">هذه الصفحة قيد الصيانة</p>
        <p className="text-sm text-slate-500">{message}</p>
        <p className="mt-4 text-xs text-slate-400">يرجى المحاولة لاحقاً</p>
      </div>
    </div>
  )
}
