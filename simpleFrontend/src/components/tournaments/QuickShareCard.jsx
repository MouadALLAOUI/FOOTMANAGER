import { useState } from 'react'
import { Check, Copy, Link as LinkIcon, MessageCircle, Share2, Sparkles } from 'lucide-react'
import { useToast } from '../ui/Toast'

export default function QuickShareCard({
  tournament,
  type = 'join',
  className = '',
  compact = false,
}) {
  const { toast } = useToast()
  const [copiedJoin, setCopiedJoin] = useState(false)
  const [copiedTour, setCopiedTour] = useState(false)

  if (!tournament) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const slug = tournament.slug || tournament.id

  const shortJoinUrl = `${origin}/j/${slug}`
  const shortTourUrl = `${origin}/t/${slug}`

  const handleCopy = (url, isJoin = true) => {
    try {
      navigator.clipboard.writeText(url)
      if (isJoin) {
        setCopiedJoin(true)
        setTimeout(() => setCopiedJoin(false), 2200)
      } else {
        setCopiedTour(true)
        setTimeout(() => setCopiedTour(false), 2200)
      }
      toast.success('تم نسخ الرابط بنجاح! 📋')
    } catch {
      toast.error('تعذر نسخ الرابط تلقائياً')
    }
  }

  const handleWhatsAppShare = (url, isJoin = true) => {
    const tourName = tournament.name || 'البطولة'
    let msg = ''
    if (isJoin) {
      msg = `🏆 *دعوة للانضمام إلى بطولة ${tourName}* ⚽\n\nيسر اللجنة المنظمة دعوتكم لتسجيل فريقكم والمشاركة معنا في البطولة.\n\n🔗 رابط الانضمام المباشر والسريع:\n${url}\n\nسارعوا بالتسجيل، المقاعد المتاحة محدودة! 🇲🇦\nمنصة أجي نقصرو`
    } else {
      msg = `🏆 *تابع تفاصيل وجدول مباريات بطولة ${tourName}* ⚽\n\nشاهد نتائج المباريات وترتيب الفرق والإحصائيات مباشرة على منصة أجي نقصرو:\n\n🔗 رابط البطولة المباشر:\n${url}\n\n🇲🇦 منصة أجي نقصرو`
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {/* Short Join Link Copy Button */}
        <button
          type="button"
          onClick={() => handleCopy(shortJoinUrl, true)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            copiedJoin
              ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
              : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 shadow-2xs'
          }`}
          title="نسخ رابط الانضمام المختصر"
        >
          {copiedJoin ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span>{copiedJoin ? 'تم النسخ! ✓' : 'نسخ رابط الانضمام'}</span>
        </button>

        {/* WhatsApp Share Button */}
        <button
          type="button"
          onClick={() => handleWhatsAppShare(shortJoinUrl, true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          title="مشاركة رابط الانضمام عبر واتساب"
        >
          <MessageCircle className="size-3.5" />
          <span>مشاركة عبر واتساب</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/90 to-slate-950 p-4 sm:p-5 shadow-lg text-slate-100 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-[#10B981] ring-1 ring-emerald-500/40 shrink-0">
            <Share2 className="size-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>روابط المشاركة السريعة</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold text-emerald-400">
                روابط مختصرة
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              شارك رابط التسجيل والبطولة بسهولة مع الفرق والمسيرين عبر واتساب.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleWhatsAppShare(shortJoinUrl, true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 shadow-md shadow-emerald-950/50 transition-all shrink-0 cursor-pointer active:scale-95"
        >
          <MessageCircle className="size-4" />
          <span>مشاركة سريعة عبر واتساب</span>
        </button>
      </div>

      <div className="space-y-3">
        {/* رابط الانضمام المختصر */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">
            رابط انضمام وتسجيل الفرق المباشر:
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={shortJoinUrl}
                onClick={(e) => e.target.select()}
                className="h-10 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 text-xs font-mono text-emerald-400 select-all outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleCopy(shortJoinUrl, true)}
              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs ${
                copiedJoin
                  ? 'bg-emerald-500 text-white'
                  : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:border-emerald-500'
              }`}
            >
              {copiedJoin ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copiedJoin ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </button>
          </div>
        </div>

        {/* رابط صفحة البطولة المختصر */}
        {type === 'both' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              رابط صفحة البطولة العامة:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  readOnly
                  value={shortTourUrl}
                  onClick={(e) => e.target.select()}
                  className="h-10 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 text-xs font-mono text-slate-300 select-all outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCopy(shortTourUrl, false)}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs ${
                  copiedTour
                    ? 'bg-emerald-500 text-white'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:border-emerald-500'
                }`}
              >
                {copiedTour ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span>{copiedTour ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
