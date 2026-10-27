import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { hideBrokenImage } from '../../lib/imageErrors'

function formatArabicDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return String(dateStr)
  }
}

function getSingleStatus(tour) {
  if (tour.status === 'open_for_registration' || tour.registration_open || tour.status === 'open') {
    return { label: 'مفتوحة', style: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
  }
  if (tour.status === 'upcoming' || tour.status === 'draft') {
    return { label: 'قريباً', style: 'bg-sky-100 text-sky-800 border-sky-300' }
  }
  return { label: 'مغلقة', style: 'bg-slate-200 text-slate-800 border-slate-300' }
}

export default function TournamentCard({ tournament: tour, className = '' }) {
  const status = getSingleStatus(tour)
  const formattedDate = formatArabicDate(tour.start_date)

  const bannerStyle = {
    backgroundImage: `linear-gradient(135deg, ${tour.primary_color || '#16a34a'} 0%, ${tour.secondary_color || '#0B1F3A'} 100%)`,
  }

  return (
    <article
      className={`group flex h-full w-[85%] sm:w-auto max-w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white text-[#14221C] shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 ${className}`}
    >
      {/* 1. الصورة مع حالة واحدة فقط */}
      <div className="relative h-[160px] overflow-hidden bg-slate-900">
        {tour.cover_url ? (
          <img
            src={tour.cover_url}
            alt={tour.name}
            loading="lazy"
            decoding="async"
            onError={hideBrokenImage}
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div style={bannerStyle} className="size-full opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* حالة واحدة فقط: مفتوحة / قريباً / مغلقة */}
        <span
          className={`absolute top-3 start-3 rounded-full border px-3 py-0.5 text-[11px] font-black shadow-xs ${status.style}`}
        >
          {status.label}
        </span>
      </div>

      {/* 2. محتوى البطاقة: العنوان (سطران كحد أقصى) + التاريخ + زر "التفاصيل" */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          {/* العنوان (سطران كحد أقصى بلا قص) */}
          <h3 className="line-clamp-2 text-sm sm:text-base font-black leading-snug text-[#14221C] group-hover:text-emerald-700 transition-colors">
            {tour.name}
          </h3>

          {/* التاريخ */}
          {formattedDate && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Calendar className="size-3.5 shrink-0 text-emerald-600" />
              <span>{formattedDate}</span>
            </p>
          )}
        </div>

        {/* زر "التفاصيل" فقط */}
        <div className="pt-4 mt-2">
          <Link
            to={`/tournaments/${tour.slug || tour.id}`}
            className="flex h-10 w-full items-center justify-center rounded-xl bg-[#1F7A4D] hover:bg-[#166534] text-xs font-black text-white shadow-xs transition-all active:scale-95"
          >
            التفاصيل
          </Link>
        </div>
      </div>
    </article>
  )
}
