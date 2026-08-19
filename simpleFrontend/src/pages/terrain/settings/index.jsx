import { UserRound } from 'lucide-react'
import { SectionTitle } from '../../../components/dashboard/ui'
import NotificationPreferences from '../../../components/notifications/NotificationPreferences'
import { useAuth } from '../../../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        title="الإعدادات"
        subtitle="تفضيلات الإشعارات ومعلومات حسابك"
      />

      <NotificationPreferences />

      <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <UserRound className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">معلومات الحساب</h3>
            <p className="text-[11px] font-semibold text-slate-400">بيانات الدخول لحسابك</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'الاسم', value: user?.name || '—' },
            { label: 'البريد الإلكتروني', value: user?.email || '—' },
            { label: 'الهاتف', value: user?.phone || '—' },
            {
              label: 'الحالة',
              value: user?.status === 'approved' ? 'حساب مفعّل' : user?.status || '—',
            },
          ].map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400">{f.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
