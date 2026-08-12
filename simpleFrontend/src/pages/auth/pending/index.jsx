import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faCircleCheck, faCircleXmark, faBan } from '@fortawesome/free-solid-svg-icons'

export default function Pending() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
    } else if (user.status === 'approved') {
      const dest = user.role === 'admin' ? '/admin'
        : user.role === 'terrain_owner' ? '/terrain'
        : user.role === 'player' ? '/player'
        : user.role === 'committee' ? '/committee'
        : '/dashboard'
      navigate(dest, { replace: true })
    }
  }, [user, navigate])

  if (!user) return null

  const config = {
    pending: {
      icon: faClock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      title: 'طلبك قيد المراجعة',
      desc: 'يراجع فريق الإدارة طلبك حالياً. سيتم تفعيل حسابك فور الموافقة عليه، عادة خلال 24 ساعة.',
    },
    rejected: {
      icon: faCircleXmark,
      color: 'text-red-400',
      bg: 'bg-red-500/15',
      title: 'تم رفض طلبك',
      desc: 'عذراً، لم تتم الموافقة على طلب الانضمام الخاص بك. يمكنك التواصل مع الإدارة للمزيد من التفاصيل.',
    },
    blocked: {
      icon: faBan,
      color: 'text-red-400',
      bg: 'bg-red-500/15',
      title: 'تم حظر حسابك',
      desc: 'تم حظر حسابك من قبل الإدارة. تواصل معنا إذا كان ذلك خطأ.',
    },
  }

  const c = config[user.status] || config.pending

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 py-24 text-center">
      <div className={`mb-6 grid size-20 place-items-center rounded-3xl ${c.bg} ${c.color}`}>
        <FontAwesomeIcon icon={c.icon} className="size-9" />
      </div>
      <h1 className="text-2xl font-extrabold text-white">{c.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/50">{c.desc}</p>

      <div className="mt-8 w-full rounded-2xl bg-[#101a2b] p-5 text-start ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faCircleCheck} className="size-4 text-green-400" />
          <span className="text-xs font-bold text-white">{user.name}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <FontAwesomeIcon icon={faCircleCheck} className="size-4 text-green-400" />
          <span className="text-xs text-white/50">تم استلام جميع المعلومات بنجاح</span>
        </div>
      </div>

      <p className="mt-8 text-xs text-white/40">أجي نقصرو © 2026</p>
    </div>
  )
}
