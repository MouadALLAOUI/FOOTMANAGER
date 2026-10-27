import { useState } from 'react'
import {
  ArrowLeft,
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
  Users,
} from 'lucide-react'
import api from '../../../../api/client'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'

export default function Step3PublishTournament({
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
      toast.success('تم نشر البطولة بنجاح وفتح باب التسجيل رسمياً!')
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
    const text = `🏆 *دعوة للمشاركة في بطولة ${tournament.name}*\n\nتعلن اللجنة المنظمة عن فتح باب التسجيل الرسمي في البطولة عبر منصة "أجي نقصرو".\n\n🔗 *رابط تفاصيل البطولة والتسجيل المباشر:*\n${publicUrl}\n\nسارعوا بتسجيل فرقكم والمشاركة في المنافسات!`
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
            <span>المرحلة الثالثة: نشر البطولة رسمياً للعامة</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            نشر البطولة وفتح باب التسجيل
          </h2>

          <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            نشر البطولة الآن يتيح للفرق والمسيرين استعراض تفاصيلها وتقديم طلبات المشاركة، بينما يمكنك مباشرة في الخطوة التالية إضافة فرق اللجنة وإرسال رابط الواتساب الذكي.
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

          {/* Action Button: Publish Now */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!isPublished ? (
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="flex h-13 min-w-[220px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-[#10B981]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span>جاري نشر البطولة...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="size-5 text-white" />
                    <span>نشر البطولة رسمياً الآن</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="size-4" />
                  <span>مشاركة عبر واتساب</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <Copy className="size-4" />
                  <span>{copied ? 'تم النسخ!' : 'نسخ الرابط العام'}</span>
                </button>

                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 backdrop-blur-xs transition-colors"
                >
                  <ExternalLink className="size-4" />
                  <span>معاينة صفحة البطولة</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direct Transition Card to Step 4 (Teams) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-start">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#10B981]">
            <Users className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">
              الخطوة التالية: إضافة وتسجيل فرق البطولة
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              يمكنك البدء في إضافة فرق المنصة، إنشاء فرق حرة، أو إرسال رابط الواتساب لمسيري الفرق.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceedToTeams}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-black text-xs px-6 shadow-sm transition-all cursor-pointer"
        >
          <span>المتابعة لفرق البطولة</span>
          <ArrowLeft className="size-4 rtl:rotate-0" />
        </button>
      </div>
    </div>
  )
}
