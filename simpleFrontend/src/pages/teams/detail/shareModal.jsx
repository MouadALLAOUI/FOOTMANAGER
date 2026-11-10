import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Flame,
  Loader2,
  MapPin,
  Percent,
  Share2,
  Shield,
  Swords,
  Trophy,
  X,
} from 'lucide-react'
import { toBlob } from 'html-to-image'
import { inlineAllImages } from '../../../lib/cardExportUtils'
import TeamLogo from '../../../components/profile/TeamLogo'
import { toast } from '../../../components/ui/Toast/toastStore'
import { formatCategoryArabic, formatLevelArabic } from './header'

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function TeamShareModal({ isOpen, onClose, team, stats }) {
  const cardRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen || !team) return null

  const profileUrl =
    typeof window !== 'undefined' ? window.location.href : `https://ajin9essro.com/teams/${team.id}`

  const generateCardBlob = async () => {
    if (!cardRef.current) return null
    try {
      await inlineAllImages(cardRef.current)
    } catch {
      // Ignore image inlining fallback failures
    }

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

      const file = new File([blob], `aji-team-${team.id}.png`, { type: 'image/png' })
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          title: `بطاقة فريق ${team.name} — أجي نقصرو`,
          text: `شاهد بطاقة وإحصائيات فريق ${team.name} على منصة أجي نقصرو لكرة القدم`,
          url: profileUrl,
          files: [file],
        })
        toast.success('تمت مشاركة البطاقة بنجاح')
      } else {
        downloadBlob(blob, `aji-team-${team.id}.png`)
        await navigator.clipboard.writeText(profileUrl)
        toast.success('تم تنزيل بطاقة الفريق ونسخ الرابط')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
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
      downloadBlob(blob, `aji-team-${team.id}.png`)
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
      toast.success('تم نسخ رابط ملف الفريق')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('تعذر نسخ الرابط')
    }
  }

  const categoryLabel = formatCategoryArabic(team.category)
  const levelLabel = formatLevelArabic(team.level)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-share-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden"
    >
      <div
        className="fixed inset-0 z-[var(--z-overlay)] bg-[#101211]/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[var(--z-modal)] my-auto flex flex-col items-center max-w-sm sm:max-w-md w-full max-h-[calc(100dvh-20px)] rounded-3xl border border-[#303832] bg-[#1B201D] p-3 sm:p-5 shadow-2xl text-[#F5F7F2]">
        {/* Header & 44px Close Button */}
        <div className="shrink-0 w-full flex items-center justify-between pb-2.5 border-b border-[#303832] mb-2">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-xl bg-[#D0FF38]/15 text-[#D0FF38]">
              <Share2 className="size-4" />
            </span>
            <h3 id="team-share-modal-title" className="text-xs sm:text-sm font-black text-[#F5F7F2]">
              بطاقة الفريق (9:16)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 min-w-[44px] min-h-[44px] place-items-center rounded-xl text-[#B2B9B3] hover:text-[#F5F7F2] hover:bg-[#252B27] transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 9:16 Card Container Preview */}
        <div className="shrink min-h-0 flex items-center justify-center overflow-hidden my-auto w-full">
          <div
            ref={cardRef}
            style={{
              maxHeight: 'calc(100dvh - 200px)',
              aspectRatio: '9 / 16',
              width: 'auto',
              maxWidth: '320px',
            }}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl shadow-2xl ring-1 ring-[#303832] bg-gradient-to-b from-[#173A26] via-[#1B201D] to-[#101211] p-3.5 sm:p-4 text-[#F5F7F2] select-none w-full"
          >
            {/* Atmospheric Stadium Accents */}
            <div className="pointer-events-none absolute -top-16 -start-16 size-48 rounded-full bg-[#D0FF38]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -end-16 size-48 rounded-full bg-[#42D889]/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-36 rounded-full border border-[#D0FF38]/10" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-[#D0FF38]/10" />

            {/* 1. Card Top Branding */}
            <div className="relative z-10 flex items-center justify-between border-b border-[#303832] pb-2">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-[#D0FF38] text-[#111313] font-black text-[10px] shadow-md">
                  AN
                </span>
                <div className="text-start leading-tight">
                  <span className="block text-[11px] font-black text-[#F5F7F2]">أجي نقصرو</span>
                  <span className="block text-[7px] font-bold text-[#42D889] tracking-widest uppercase">
                    AJI NQSSRO
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-[#D0FF38]/30 bg-[#D0FF38]/15 px-2 py-0.5 text-[8px] font-extrabold text-[#D0FF38]">
                <CheckCircle2 className="size-2.5" />
                <span>بطاقة فريق رسمية</span>
              </span>
            </div>

            {/* 2. Hero Center: Team Emblem & Identity */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto py-1">
              <div className="rounded-2xl bg-[#101211] p-1 ring-1 ring-[#303832] shadow-lg">
                <TeamLogo
                  team={team}
                  className="size-16 sm:size-20"
                  rounded="rounded-xl"
                  fontSize="text-xl"
                />
              </div>

              <h4 className="mt-2 text-sm sm:text-base font-black text-[#F5F7F2] tracking-tight leading-snug" dir="auto">
                {team.name}
              </h4>

              <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                {team.city && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-[#303832] bg-[#252B27] px-2 py-0.5 text-[9px] font-bold text-[#B2B9B3]">
                    <MapPin className="size-2.5 text-[#D0FF38]" />
                    <span>{team.city}</span>
                  </span>
                )}
                {categoryLabel && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-[#42D889]/30 bg-[#42D889]/15 px-2 py-0.5 text-[9px] font-black text-[#42D889]">
                    <Shield className="size-2.5" />
                    <span>{categoryLabel}</span>
                  </span>
                )}
                {levelLabel && (
                  <span className="inline-flex items-center rounded-full border border-[#303832] bg-[#252B27] px-2 py-0.5 text-[9px] font-bold text-[#F5F7F2]">
                    {levelLabel}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Verified Statistics Grid (6 metrics) */}
            <div className="relative z-10 grid grid-cols-3 gap-1.5 my-1 text-center">
              <div className="rounded-xl border border-[#303832] bg-[#252B27]/90 p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Swords className="size-2.5 text-[#D0FF38]" />
                  <span className="text-[8px] font-bold text-[#B2B9B3]">المباريات</span>
                </div>
                <span className="text-sm font-black text-[#F5F7F2] tabular-nums">
                  {stats?.matchesPlayed ?? '—'}
                </span>
              </div>

              <div className="rounded-xl border border-[#303832] bg-[#252B27]/90 p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <CheckCircle2 className="size-2.5 text-[#42D889]" />
                  <span className="text-[8px] font-bold text-[#B2B9B3]">الفوز</span>
                </div>
                <span className="text-sm font-black text-[#42D889] tabular-nums">
                  {stats?.wins ?? '—'}
                </span>
              </div>

              <div className="rounded-xl border border-[#303832] bg-[#252B27]/90 p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Percent className="size-2.5 text-[#D0FF38]" />
                  <span className="text-[8px] font-bold text-[#B2B9B3]">نسبة الفوز</span>
                </div>
                <span className="text-sm font-black text-[#D0FF38] tabular-nums" dir="ltr">
                  {stats?.winPercentage == null ? '—' : `${stats.winPercentage}%`}
                </span>
              </div>

              <div className="rounded-xl border border-[#303832] bg-[#252B27]/90 p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame className="size-2.5 text-[#42D889]" />
                  <span className="text-[8px] font-bold text-[#B2B9B3]">الأهداف</span>
                </div>
                <span className="text-sm font-black text-[#F5F7F2] tabular-nums">
                  {stats?.goalsFor ?? '—'}
                </span>
              </div>

              <div className="rounded-xl border border-[#303832] bg-[#252B27]/90 p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Trophy className="size-2.5 text-sky-400" />
                  <span className="text-[8px] font-bold text-[#B2B9B3]">البطولات</span>
                </div>
                <span className="text-sm font-black text-[#F5F7F2] tabular-nums">
                  {stats?.tournamentsCount ?? 0}
                </span>
              </div>

              <div className="rounded-xl border border-[#303832] bg-[#252B27]/90 p-1.5">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Award className="size-2.5 text-amber-400" />
                  <span className="text-[8px] font-bold text-[#B2B9B3]">الألقاب</span>
                </div>
                <span className="text-sm font-black text-amber-400 tabular-nums">
                  {stats?.titlesWon ?? 0}
                </span>
              </div>
            </div>

            {/* 4. Bottom Branding */}
            <div className="relative z-10 border-t border-[#303832] pt-2 flex items-center justify-between text-[8px] text-[#B2B9B3] font-bold">
              <span>منصة كرة القدم الأولى بالمغرب</span>
              <span className="text-[#D0FF38] font-extrabold tracking-wider">ajin9essro.com</span>
            </div>
          </div>
        </div>

        {/* Fixed Action Bar */}
        <div className="shrink-0 w-full mt-2.5 space-y-1.5">
          <button
            type="button"
            onClick={handleShare}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D0FF38] hover:brightness-95 py-2.5 px-4 text-xs sm:text-sm font-black text-[#111313] shadow-lg transition-all cursor-pointer disabled:opacity-60"
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#303832] bg-[#252B27] hover:bg-[#303832] py-2 px-3 text-xs font-bold text-[#F5F7F2] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="size-3.5 text-[#D0FF38]" />
              <span>تنزيل (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#303832] bg-[#252B27] hover:bg-[#303832] py-2 px-3 text-xs font-bold text-[#F5F7F2] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-[#42D889]" />
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
