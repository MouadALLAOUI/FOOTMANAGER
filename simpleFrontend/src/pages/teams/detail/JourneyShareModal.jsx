import { useState } from 'react'
import {
  Check,
  Copy,
  Crown,
  Download,
  Flame,
  Share2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { Button, Modal } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'

export default function JourneyShareModal({ open, onClose, journeyData, team }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (!journeyData) return null

  const selectedTour = journeyData.selected_tournament
  const summary = journeyData.summary
  const group = journeyData.group_stage
  const knockout = journeyData.knockout_stages || []

  const shareUrl = window.location.href

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('تم نسخ الرابط بنجاح')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('تعذر نسخ الرابط')
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `رحلة فريق ${team?.name} في ${selectedTour?.name}`,
          text: `شاهد المسار والنتائج الرسمية لفريق ${team?.name} في بطولة ${selectedTour?.name} على منصة أجي نقصرو!`,
          url: shareUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md" title="مشاركة مسار الفريق في البطولة">
      <div className="space-y-5" dir="rtl">
        {/* Visual Share Card Preview */}
        <div
          id="journey-share-card"
          className="relative overflow-hidden rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-gradient-to-b from-[#111313] via-[#1B201D] to-[#111313] p-5 text-white shadow-xl"
        >
          {/* Subtle Glows */}
          <div className="absolute -top-12 -start-12 size-36 rounded-full bg-[#179955]/30 blur-2xl" />
          <div className="absolute -bottom-12 -end-12 size-36 rounded-full bg-[#B8F000]/20 blur-2xl" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              {team?.logo_url ? (
                <img src={team.logo_url} alt="" className="size-12 rounded-2xl object-cover ring-2 ring-white/20" />
              ) : (
                <div className="grid size-12 place-items-center rounded-2xl bg-[#252B27] font-black text-white">
                  {team?.name?.slice(0, 2) || 'ف'}
                </div>
              )}
              <div>
                <h3 className="text-base font-black text-white">{team?.name}</h3>
                <p className="text-xs text-[#B2B9B3]">{selectedTour?.name}</p>
              </div>
            </div>

            {summary?.is_champion ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-400 ring-1 ring-amber-400/30">
                <Crown className="size-3.5" />
                البطل
              </span>
            ) : (
              <span className="rounded-full bg-[#179955]/20 px-2.5 py-1 text-xs font-bold text-[#42D889] ring-1 ring-[#179955]/40">
                {summary?.current_stage_label || 'مشارك'}
              </span>
            )}
          </div>

          {/* Stats Bar */}
          <div className="relative my-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 p-2 backdrop-blur-xs">
              <span className="text-[10px] text-[#B2B9B3]">المباريات</span>
              <p className="text-base font-black text-white">{summary?.total_matches || 0}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2 backdrop-blur-xs">
              <span className="text-[10px] text-[#B2B9B3]">الانتصارات</span>
              <p className="text-base font-black text-[#42D889]">{summary?.total_wins || 0}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2 backdrop-blur-xs">
              <span className="text-[10px] text-[#B2B9B3]">المرحلة</span>
              <p className="truncate text-xs font-black text-white">{summary?.current_stage_label || '-'}</p>
            </div>
          </div>

          {/* Group Summary Snippet */}
          {group && (
            <div className="relative mb-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs">
              <span className="text-[#B2B9B3]">{group.group_name}</span>
              <span className="font-bold text-white">
                المركز {group.rank} • {group.points} نقطة
              </span>
            </div>
          )}

          {/* Knockout Stages Snippet */}
          {knockout.length > 0 && (
            <div className="relative space-y-1.5 pt-1">
              {knockout.map((stg) => (
                <div
                  key={stg.round_id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-1.5 text-xs"
                >
                  <span className="text-[#B2B9B3]">{stg.round_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">ضد {stg.opponent?.name || 'TBD'}</span>
                    {stg.status === 'completed' && stg.won && (
                      <span className="text-[10px] font-bold text-[#42D889]">تأهل ✓</span>
                    )}
                    {stg.status === 'eliminated' && (
                      <span className="text-[10px] font-bold text-red-400">أُقصي ✗</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Branding */}
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-[#B2B9B3]">
            <span>منصة أجي نقصرو — AJI NQSSRO</span>
            <span className="font-mono">ajinqssro.com</span>
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {navigator.share && (
            <Button variant="primary" className="flex-1" onClick={handleNativeShare}>
              <Share2 className="size-4" />
              مشاركة مباشرة (موبايل)
            </Button>
          )}

          <Button variant="secondary" className="flex-1" onClick={handleCopyLink}>
            {copied ? <Check className="size-4 text-[#179955]" /> : <Copy className="size-4" />}
            {copied ? 'تم النسخ!' : 'نسخ رابط المسار'}
          </Button>

          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  )
}
