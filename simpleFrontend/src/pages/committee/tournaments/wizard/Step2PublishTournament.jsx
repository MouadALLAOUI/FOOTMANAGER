import { useState } from 'react'
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  Rocket,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react'
import api from '../../../../api/client'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'

export default function Step2PublishTournament({
  tournament,
  refresh,
  onProceedToTeams,
}) {
  const { toast } = useToast()
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)

  const isPublished =
    tournament.status === 'open_for_registration' ||
    tournament.status === 'registration_closed' ||
    tournament.status === 'in_progress' ||
    tournament.status === 'completed'

  const publicUrl = `${window.location.origin}/tournaments/${tournament.slug || tournament.id}`

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/open-registration`)
      toast.success('تم نشر البطولة بنجاح وفتح باب التسجيل للعامة!')
      if (refresh) refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setPublishing(false)
    }
  }

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('تم نسخ رابط البطولة العام بنجاح')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.info(`رابط البطولة: ${publicUrl}`)
    }
  }

  const handleShareWhatsApp = () => {
    const text = `🏆 *دعوة للمشاركة في بطولة ${tournament.name}*\n\nيسرنا الإعلان عن فتح باب التسجيل في البطولة عبر منصة "أجي نقصرو".\n\n🔗 رابط تفاصيل البطولة والتسجيل المباشر:\n${publicUrl}\n\nسارعوا بتسجيل فرقكم والمشاركة في المنافسات!`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero Announcement Card */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-[#0F172A] via-[#142320] to-[#0A1220] p-6 sm:p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -end-24 size-80 rounded-full bg-[#10B981]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-3xl bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] shadow-lg mb-4">
            <Rocket className="size-8 text-[#10B981] animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-black text-emerald-300 border border-emerald-500/40 mb-2">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>المرحلة الثانية: نشر البطولة للعامة</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            نشر البطولة وفتح باب التسجيل
          </h2>

          <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            نشر البطولة الآن يتيح للفرق والمسيرين استعراض تفاصيلها وتقديم طلبات المشاركة، بينما يمكنك مباشرة في الخطوة التالية إضافة فرق اللجنة والفرق الحرة.
          </p>

          {/* Status Badge */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {isPublished ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-4 py-1.5 text-xs font-black text-emerald-400">
                <CheckCircle2 className="size-4" />
                <span>البطولة منشورة رسمياً ومتاحة للتسجيل العام</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-1.5 text-xs font-black text-amber-300">
                <Flame className="size-4" />
                <span>البطولة في وضع المسودة (غير مرئية للعامة بعد)</span>
              </span>
            )}
          </div>

          {/* Main Action Button */}
          {!isPublished ? (
            <div className="mt-7 w-full max-w-sm">
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm sm:text-base shadow-xl shadow-[#10B981]/30 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span>جاري نشر البطولة...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="size-5" />
                    <span>نشر البطولة وفتح باب التسجيل الآن</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-7 w-full max-w-md space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-2 text-xs">
                <span className="truncate flex-1 text-slate-300 font-mono px-2" dir="ltr">
                  {publicUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  <Copy className="size-3.5" />
                  <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  <Share2 className="size-3.5" />
                  <span>واتساب</span>
                </button>
              </div>

              {onProceedToTeams && (
                <button
                  type="button"
                  onClick={onProceedToTeams}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>المتابعة إلى إدارة وتسجيل الفرق المشاركة</span>
                  <ExternalLink className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Review of Tournament */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500">اسم البطولة</p>
          <p className="mt-1 text-sm font-black text-slate-900 truncate">{tournament.name}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500">نظام المنافسة</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {tournament.tournament_format === 'league' ? 'دوري نقاط' : 'مجموعات وخروج مغلوب'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500">العدد المطلوب للفرق</p>
          <p className="mt-1 text-sm font-black text-slate-900">{tournament.teams_count || 8} فرق</p>
        </div>
      </div>
    </div>
  )
}
