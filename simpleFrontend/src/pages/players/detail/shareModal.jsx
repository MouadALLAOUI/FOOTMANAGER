import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
import { inlineAllImages } from '../../../lib/cardExportUtils'
import TeamLogo from '../../../components/profile/TeamLogo'
import { toast } from '../../../components/ui/Toast/toastStore'
import { formatPositionArabic } from './header'

export default function PlayerShareModal({ isOpen, onClose, player, stats }) {
  const cardRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const onKey = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', onKey)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || !player) return null

  const profileUrl = typeof window !== 'undefined' ? window.location.href : `https://ajin9essro.com/players/${player.id}`

  const generateCardBlob = async () => {
    if (!cardRef.current) return null
    try {
      await inlineAllImages(cardRef.current)
    } catch {}

    return toBlob(cardRef.current, {
      cacheBust: false,
      skipFonts: true,
      pixelRatio: 3,
      quality: 0.95,
      filter: (node) => !node?.classList?.contains?.('no-share-capture'),
    })
  }

  const handleShare = async () => {
    if (generating) return
    setGenerating(true)

    try {
      const blob = await generateCardBlob()
      if (!blob) throw new Error('فشل توليد صورة البطاقة')

      const file = new File([blob], `aji-player-${player.id}.png`, {
        type: 'image/png',
      })

      // Native Web Share API with image file
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          title: `بطاقة اللاعب ${player.name} — أجي نقصرو`,
          text: `شاهد بطاقة وإحصائيات اللاعب ${player.name} على منصة أجي نقصرو لكرة القدم`,
          url: profileUrl,
          files: [file],
        })
        toast.success('تمت مشاركة البطاقة بنجاح')
      } else {
        // Fallback: download image and copy link
        downloadBlob(blob, `aji-player-${player.id}.png`)
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
      downloadBlob(blob, `aji-player-${player.id}.png`)
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-share-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)] bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[var(--z-modal)] my-auto flex flex-col items-center max-w-sm sm:max-w-md w-full max-h-[calc(100dvh-20px)] rounded-3xl border border-slate-800 bg-[#0A101D] p-3 sm:p-5 shadow-2xl text-white">
        {/* Header & 44px Close Button */}
        <div className="shrink-0 w-full flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-2">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Share2 className="size-4" />
            </span>
            <h3 id="player-share-modal-title" className="text-xs sm:text-sm font-black text-white">
              بطاقة اللاعب (9:16)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 min-w-[44px] min-h-[44px] place-items-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 9:16 Card Container Preview (Capturable area, max-height: calc(100dvh - 200px) with object-fit: contain) */}
        <div className="shrink min-h-0 flex items-center justify-center overflow-hidden my-auto w-full">
          <div
            ref={cardRef}
            style={{
              maxHeight: 'calc(100dvh - 200px)',
              aspectRatio: '9 / 16',
              width: 'auto',
              maxWidth: '320px',
            }}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-800 bg-gradient-to-b from-[#0B132B] via-[#0F172A] to-[#060A14] p-3.5 sm:p-4 text-white select-none w-full"
          >
            {/* Atmospheric Background & Field Lines */}
            <div className="pointer-events-none absolute -top-16 -start-16 size-48 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -end-16 size-48 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 rounded-full border border-emerald-500/10" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-emerald-500/10" />

            {/* 1. Card Top Branding */}
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] shadow-md">
                  AN
                </span>
                <div className="text-start leading-tight">
                  <span className="block text-[11px] font-black text-white tracking-wider">
                    أجي نقصرو
                  </span>
                  <span className="block text-[7px] font-bold text-emerald-400 tracking-widest uppercase">
                    AJI NQSSRO
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[8px] font-extrabold text-amber-300">
                <CheckCircle2 className="size-2 text-amber-400" />
                <span>بطاقة رسمية معتمدة</span>
              </span>
            </div>

            {/* 2. Hero Center: Player Photo & Identity */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto py-1">
              {/* Photo Frame */}
              <div className="relative">
                <div className="size-16 sm:size-20 rounded-2xl p-0.5 bg-gradient-to-tr from-emerald-400 via-emerald-500 to-amber-400 shadow-lg shadow-emerald-950/60">
                  <div className="size-full overflow-hidden rounded-[14px] bg-slate-900 grid place-items-center">
                    {hasPhoto ? (
                      <img
                        src={player.avatar_url}
                        alt={player.name}
                        onError={() => setImgError(true)}
                        className="size-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-emerald-400 text-xl font-black">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>

                {player.number != null && (
                  <div className="absolute -bottom-1 -end-1 grid size-6 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-[10px] shadow-md border-2 border-[#0F172A]">
                    #{player.number}
                  </div>
                )}
              </div>

              {/* Name & Position */}
              <h4 className="mt-1.5 text-sm sm:text-base font-black text-white tracking-tight leading-snug">
                {player.name}
              </h4>

              <div className="mt-0.5 flex items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                  <Shield className="size-2.5 text-emerald-400" />
                  <span>{formatPositionArabic(player.position)}</span>
                </span>
                {player.team ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                    <TeamLogo team={player.team} className="size-3 rounded-xs" />
                    <span>{player.team.name}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold text-sky-300">
                    لاعب حر
                  </span>
                )}
              </div>
            </div>

            {/* 3. Verified Performance Metrics Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-1.5 my-1 text-center">
              {/* Goals */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
                <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
                  <Flame className="size-2.5 text-emerald-400" />
                  <span className="text-[8px] font-bold text-slate-400">الأهداف</span>
                </div>
                <span className="text-base font-black text-white tabular-nums leading-none">
                  {stats?.goals ?? 0}
                </span>
              </div>

              {/* Tournaments */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                  <Trophy className="size-2.5 text-amber-400" />
                  <span className="text-[8px] font-bold text-slate-400">البطولات</span>
                </div>
                <span className="text-base font-black text-white tabular-nums leading-none">
                  {stats?.tournaments_count ?? 0}
                </span>
              </div>

              {/* Matches */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1.5">
                <div className="flex items-center justify-center gap-1 text-sky-400 mb-0.5">
                  <Users className="size-2.5 text-sky-400" />
                  <span className="text-[8px] font-bold text-slate-400">المباريات</span>
                </div>
                <span className="text-base font-black text-white tabular-nums leading-none">
                  {stats?.matches_played ?? 0}
                </span>
              </div>
            </div>

            {/* 4. Card Bottom Branding & URL */}
            <div className="relative z-10 border-t border-slate-800/80 pt-2 flex items-center justify-between text-[8px] text-slate-400 font-bold">
              <span>منصة كرة القدم الأولى بالمغرب</span>
              <span className="text-emerald-400 font-extrabold tracking-wider">
                ajin9essro.com
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Action Bar at Bottom: Always Visible Without Scrolling */}
        <div className="shrink-0 w-full mt-2.5 space-y-1.5">
          {/* Main Share Button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-emerald-400 py-2.5 px-4 text-xs sm:text-sm font-black text-white shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/30 transition-all cursor-pointer disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>جارٍ تجهيز البطاقة...</span>
              </>
            ) : (
              <>
                <Share2 className="size-4" />
                <span>مشاركة</span>
              </>
            )}
          </button>

          {/* Download & Copy Link Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-2 px-3 text-xs font-bold text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="size-3.5 text-emerald-400" />
              <span>تنزيل (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-2 px-3 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
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
    </div>,
    document.body,
  )
}
