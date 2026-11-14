import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin, Trophy, Copy, Check, MessageCircle, Eye } from 'lucide-react'
import { formatTournamentDateRange } from '../list/shared'
import { useToast } from '../../../components/ui/Toast'

const STATUS_BADGE = {
  open_for_registration: {
    cls: 'bg-[#B8F000] text-[#111313] shadow-xs',
    fallback: 'التسجيل مفتوح',
  },
  registration_closed: {
    cls: 'bg-[#FFC857] text-[#111313] shadow-xs',
    fallback: 'التسجيل مغلق',
  },
  in_progress: {
    cls: 'bg-[#B8F000] text-[#111313] shadow-xs',
    fallback: 'جارية',
  },
  completed: {
    cls: 'bg-white/20 text-white border border-white/25',
    fallback: 'منتهية',
  },
  cancelled: {
    cls: 'bg-[#D93636] text-white',
    fallback: 'ملغاة',
  },
}

export default function Hero({ tour, embedded = false }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [copiedLink, setCopiedLink] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shortTourUrl = `${origin}/t/${tour.slug || tour.id}`

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shortTourUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2200)
      toast.success('تم نسخ الرابط بنجاح! 📋')
    } catch {
      toast.error('تعذر نسخ الرابط تلقائياً')
    }
  }

  const handleWhatsAppShare = () => {
    const msg = `🏆 *تابع تفاصيل وجدول مباريات بطولة ${tour.name}* ⚽\n\nشاهد نتائج المباريات وترتيب الفرق والإحصائيات مباشرة على منصة أجي نقصرو:\n\n🔗 رابط البطولة المباشر:\n${shortTourUrl}\n\n🇲🇦 منصة أجي نقصرو`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const hasCover = Boolean(tour.cover_url || tour.cover_image_url)
  const coverSrc = tour.cover_url || tour.cover_image_url
  const lang = i18n.language

  const statusMeta = STATUS_BADGE[tour.status] || {
    cls: 'bg-[#B8F000] text-[#111313]',
    fallback: t(`status.${tour.status}`),
  }
  const statusLabel =
    tour.status === 'in_progress'
      ? 'جارية'
      : t(`status.${tour.status}`, { defaultValue: statusMeta.fallback })

  const teamsCount = tour.stats?.registered_teams ?? tour.max_teams ?? 0
  const categoryLabel =
    tour.category ||
    (tour.tournament_format ? t(`committee.tournaments.formats.${tour.tournament_format}`) : 'بطولة محلية')
  const subtitleText = [categoryLabel, teamsCount ? `${teamsCount} فريقاً` : null]
    .filter(Boolean)
    .join(' • ')

  const venue = [tour.location, tour.stadium?.name].filter(Boolean).join(' • ')
  const dates = formatTournamentDateRange(tour.start_date, tour.end_date, lang)

  return (
    <section
      aria-label={tour.name}
      className={`relative overflow-hidden bg-[#101211] text-white ${
        embedded ? '' : 'rounded-2xl border border-[#303832] shadow-sm'
      }`}
    >
      {/* Stadium / Cover Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {hasCover ? (
          <img src={coverSrc} alt="" className="h-full w-full object-cover opacity-55" loading="eager" />
        ) : (
          <div
            className="h-full w-full opacity-55"
            style={{
              background:
                'radial-gradient(110% 100% at 85% 20%, rgba(184,240,0,0.28) 0%, transparent 55%), radial-gradient(90% 100% at 15% 95%, rgba(23,153,85,0.45) 0%, transparent 65%), linear-gradient(180deg, #121A15 0%, #0C120E 100%)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B100D] via-[#101211]/75 to-[#101211]/45" />
        {/* Subtle pitch grass glow at the bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#1F5E2B]/55 to-transparent" />
      </div>

      {/* Compact Mobile-First Header Layout (Matches Reference Image) */}
      <div className="relative z-10 px-3.5 py-4 sm:px-6 sm:py-6">
        {/* Top Row: Status Badge (Right in RTL) + Share Actions (Left in RTL) */}
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] sm:text-xs font-black ${statusMeta.cls}`}
            >
              {statusLabel}
            </span>
            {tour.registration_open && tour.status !== 'open_for_registration' && (
              <span className="inline-flex items-center rounded-full bg-[#179955] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black text-white">
                {t('status.open_for_registration')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex h-7 sm:h-8 items-center gap-1 rounded-full px-2.5 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-[#179955] text-white'
                  : 'bg-black/45 hover:bg-black/65 text-white/90 border border-white/15 backdrop-blur-xs'
              }`}
              title="نسخ الرابط السريع للبطولة"
            >
              {copiedLink ? <Check className="size-3 text-white" /> : <Copy className="size-3 text-white/80" />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-full bg-black/45 hover:bg-black/65 border border-white/15 px-2.5 text-[10px] sm:text-xs font-bold text-[#B8F000] backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
              title="مشاركة رابط البطولة عبر واتساب"
            >
              <MessageCircle className="size-3" />
              <span className="hidden xs:inline sm:inline">مشاركة</span>
            </button>
          </div>
        </div>

        {/* Main Row: Tournament Title & Subtitle Pill + Trophy/Logo Visual */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-center sm:text-start">
            <h1 className="truncate sm:whitespace-normal text-xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.65)]">
              {tour.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              {subtitleText && (
                <span className="inline-flex items-center rounded-full bg-black/55 border border-white/15 px-3 py-1 text-[11px] sm:text-xs font-bold text-white/95 backdrop-blur-xs">
                  {subtitleText}
                </span>
              )}
              {tour.views_count != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 border border-white/15 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white/95 backdrop-blur-xs">
                  <Eye className="size-3.5 text-[#B8F000]" />
                  <span>{Number(tour.views_count).toLocaleString('ar-MA')} مشاهدة</span>
                </span>
              )}
              {venue && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white/85">
                  <MapPin className="size-3 text-[#B8F000]" />
                  <span>{venue}</span>
                </span>
              )}
              {dates && (
                <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-bold text-white/85">
                  <CalendarDays className="size-3 text-[#B8F000]" />
                  <span>{dates}</span>
                </span>
              )}
            </div>
          </div>

          {/* Trophy / Tournament Logo */}
          <div className="relative shrink-0">
            <div className="relative grid size-14 sm:size-20 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#B8F000]/25 to-black/60 border border-white/20 shadow-lg">
              {tour.logo_url ? (
                <img src={tour.logo_url} alt={tour.name} className="size-full object-cover" />
              ) : (
                <Trophy className="size-7 sm:size-10 text-[#FFC857] drop-shadow-[0_2px_8px_rgba(255,200,87,0.45)]" strokeWidth={1.8} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
