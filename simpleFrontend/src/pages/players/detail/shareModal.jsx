import { useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Flame,
  Hand,
  Loader2,
  Share2,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { toBlob } from 'html-to-image'
import TeamLogo from '../../../components/profile/TeamLogo'
import { toast } from '../../../components/ui/Toast/toastStore'
import { formatPositionArabic } from './header'

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAEASTN7V4='

export default function PlayerShareModal({ isOpen, onClose, player, stats }) {
  const cardRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (!isOpen || !player) return null

  const profileUrl = typeof window !== 'undefined' ? window.location.href : `https://ajin9essro.com/players/${player.id}`

  const generateCardBlob = async () => {
    if (!cardRef.current) return null
    return toBlob(cardRef.current, {
      cacheBust: false,
      skipFonts: true,
      imagePlaceholder: TRANSPARENT_PIXEL,
      pixelRatio: 2,
      filter: (node) => !node?.classList?.contains?.('no-share-capture'),
      onImageErrorHandler: () => TRANSPARENT_PIXEL,
    })
  }

  const handleShare = async () => {
    if (generating) return
    setGenerating(true)

    try {
      const blob = await generateCardBlob()
      if (!blob) throw new Error('فشل توليد صورة البطاقة')

      const file = new File([blob], `player-${player.id}-card.png`, {
        type: 'image/png',
      })

      // Attempt native Web Share API with image file
      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          title: `بطاقة اللاعب ${player.name} — أجي نقصرو`,
          text: `شاهد بطاقة وإحصائيات اللاعب ${player.name} على منصة أجي نقصرو`,
          url: profileUrl,
          files: [file],
        })
        toast.success('تمت مشاركة البطاقة بنجاح')
      } else {
        // Fallback: download the image and copy link
        downloadBlob(blob, `player-${player.id}-card.png`)
        await navigator.clipboard.writeText(profileUrl)
        toast.success('تم تنزيل بطاقة اللاعب ونسخ الرابط')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('تعذرت المشاركة المباشرة. يمكنك تنزيل الصورة أو نسخ الرابط.')
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const blob = await generateCardBlob()
      if (!blob) throw new Error('فشل توليد الصورة')
      downloadBlob(blob, `player-${player.id}-card.png`)
      toast.success('تم تنزيل صورة البطاقة بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء تنزيل الصورة')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      toast.success('تم نسخ رابط الملف الشخصي')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('تعذر نسخ الرابط')
    }
  }

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const initials = player.name
    ? player.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
    : 'ل'

  const hasPhoto = Boolean(player.avatar_url) && !imgError

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative my-auto flex flex-col items-center max-w-md w-full rounded-3xl border border-slate-800 bg-[#0A101D] p-4 sm:p-6 shadow-2xl text-white">
        {/* Header & Close */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Share2 className="size-4" />
            </span>
            <h3 className="text-sm sm:text-base font-black text-white">
              بطاقة اللاعب (9:16)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 9:16 Card Container Preview (Capturable area) */}
        <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-800 my-2">
          <div
            ref={cardRef}
            style={{ width: '320px', height: '568px' }}
            className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0B132B] via-[#0F172A] to-[#060A14] p-5 text-white select-none"
          >
            {/* Atmospheric Background & Field Lines */}
            <div className="pointer-events-none absolute -top-16 -start-16 size-48 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -end-16 size-48 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 rounded-full border border-emerald-500/10" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-emerald-500/10" />

            {/* 1. Card Top Branding */}
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-md">
                  AN
                </span>
                <div className="text-start leading-tight">
                  <span className="block text-xs font-black text-white tracking-wider">
                    أجي نقصرو
                  </span>
                  <span className="block text-[8px] font-bold text-emerald-400 tracking-widest uppercase">
                    AJI NQSSRO
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[9px] font-extrabold text-amber-300">
                <CheckCircle2 className="size-2.5 text-amber-400" />
                <span>بطاقة رسمية معتمدة</span>
              </span>
            </div>

            {/* 2. Hero Center: Player Photo & Identity */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto py-2">
              {/* Photo Frame */}
              <div className="relative">
                <div className="size-24 rounded-3xl p-1 bg-gradient-to-tr from-emerald-400 via-emerald-500 to-amber-400 shadow-xl shadow-emerald-950/60">
                  <div className="size-full overflow-hidden rounded-[20px] bg-slate-900 grid place-items-center">
                    {hasPhoto ? (
                      <img
                        src={player.avatar_url}
                        alt={player.name}
                        onError={() => setImgError(true)}
                        className="size-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-slate-800 text-emerald-400 text-2xl font-black">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>

                {player.number != null && (
                  <div className="absolute -bottom-1.5 -end-1.5 grid size-7 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs shadow-md border-2 border-[#0F172A]">
                    #{player.number}
                  </div>
                )}
              </div>

              {/* Name & Position */}
              <h4 className="mt-3 text-lg font-black text-white tracking-tight leading-snug">
                {player.name}
              </h4>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                  <Shield className="size-2.5 text-emerald-400" />
                  <span>{formatPositionArabic(player.position)}</span>
                </span>
                {player.team ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    <TeamLogo team={player.team} className="size-3.5 rounded-sm" />
                    <span>{player.team.name}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                    لاعب حر
                  </span>
                )}
              </div>
            </div>

            {/* 3. Verified Performance Metrics Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-2 my-2 text-center">
              {/* Goals */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
                  <Flame className="size-3 text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-400">الأهداف</span>
                </div>
                <span className="text-lg font-black text-white tabular-nums">
                  {stats?.goals ?? 0}
                </span>
              </div>

              {/* Tournaments */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                  <Trophy className="size-3 text-amber-400" />
                  <span className="text-[9px] font-bold text-slate-400">البطولات</span>
                </div>
                <span className="text-lg font-black text-white tabular-nums">
                  {stats?.tournaments_count ?? 0}
                </span>
              </div>

              {/* Matches */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                <div className="flex items-center justify-center gap-1 text-sky-400 mb-0.5">
                  <Users className="size-3 text-sky-400" />
                  <span className="text-[9px] font-bold text-slate-400">المباريات</span>
                </div>
                <span className="text-lg font-black text-white tabular-nums">
                  {stats?.matches_played ?? 0}
                </span>
              </div>
            </div>

            {/* 4. Card Bottom Branding & URL */}
            <div className="relative z-10 border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[9px] text-slate-400 font-bold">
              <span>منصة كرة القدم الأولى بالمغرب</span>
              <span className="text-emerald-400 font-extrabold tracking-wider">
                ajin9essro.com
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full mt-4 space-y-2">
          {/* Main Share Button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 py-3 px-4 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>جارٍ تجهيز البطاقة...</span>
              </>
            ) : (
              <>
                <Share2 className="size-4" />
                <span>مشاركة البطاقة (WhatsApp / Instagram)</span>
              </>
            )}
          </button>

          {/* Download & Copy Link Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-2.5 px-3 text-xs font-bold text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="size-3.5 text-emerald-400" />
              <span>تنزيل (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-2.5 px-3 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-sky-400" />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
