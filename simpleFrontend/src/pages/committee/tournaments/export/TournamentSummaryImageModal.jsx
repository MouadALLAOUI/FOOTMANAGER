import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toBlob } from 'html-to-image'
import {
  X,
  Download,
  Share2,
  Loader2,
  Trophy,
  Users,
  Swords,
  Target,
  Shield,
  Activity,
  Award,
  Calendar,
  MapPin,
  Sparkles,
  Medal,
} from 'lucide-react'
import { useToast } from '../../../../components/ui/Toast'
import useScrollLock from '../../../../components/useScrollLock'
import TeamLogo from '../../../../components/profile/TeamLogo'

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAEASTN7V4='

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function TournamentSummaryImageModal({ data, appName, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const cardRef = useRef(null)

  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)

  useScrollLock(true)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { tournament, teams = [], fixtures = [], standings, statistics } = data || {}

  const isCompleted = tournament?.status === 'completed'

  // Eligible finished matches
  const finishedMatches = useMemo(() => {
    return (fixtures || []).filter((f) => f.match?.status === 'finished')
  }, [fixtures])

  // Total goals in finished matches
  const totalGoals = useMemo(() => {
    if (statistics?.summary?.total_goals != null) {
      return statistics.summary.total_goals
    }
    return finishedMatches.reduce((sum, f) => {
      return sum + Number(f.match?.home_score ?? 0) + Number(f.match?.away_score ?? 0)
    }, 0)
  }, [finishedMatches, statistics])

  const goalsPerMatch = useMemo(() => {
    if (!finishedMatches.length) return '0.0'
    return (totalGoals / finishedMatches.length).toFixed(1)
  }, [totalGoals, finishedMatches])

  // Standings rows (top teams)
  const standingsRows = useMemo(() => {
    return standings?.groups?.[0]?.rows || []
  }, [standings])

  // Champion and Runner-up: ONLY when officially completed
  const championTeam = useMemo(() => {
    if (!isCompleted) return null
    if (tournament?.winner_team) return tournament.winner_team
    if (standingsRows.length > 0) return standingsRows[0].team
    return null
  }, [isCompleted, tournament, standingsRows])

  const runnerUpTeam = useMemo(() => {
    if (!isCompleted) return null
    if (tournament?.runner_up_team) return tournament.runner_up_team
    if (standingsRows.length > 1) return standingsRows[1].team
    return null
  }, [isCompleted, tournament, standingsRows])

  // Top Scorer (only if verified)
  const topScorer = useMemo(() => {
    const scorers = statistics?.scorers || []
    if (scorers.length > 0 && scorers[0].count > 0) {
      return scorers[0]
    }
    return null
  }, [statistics])

  // Best attack & best defense
  const bestAttack = useMemo(() => {
    if (statistics?.best_attack?.team) return statistics.best_attack
    if (standingsRows.length > 0) {
      const sorted = [...standingsRows].sort((a, b) => (b.goals_for ?? 0) - (a.goals_for ?? 0))
      if (sorted[0]?.goals_for > 0) {
        return { team: sorted[0].team, goals_for: sorted[0].goals_for }
      }
    }
    return null
  }, [statistics, standingsRows])

  const bestDefense = useMemo(() => {
    if (statistics?.best_defense?.team) return statistics.best_defense
    if (standingsRows.length > 0) {
      const eligible = standingsRows.filter((r) => (r.played ?? 0) > 0)
      if (eligible.length > 0) {
        const sorted = [...eligible].sort((a, b) => (a.goals_against ?? 0) - (b.goals_against ?? 0))
        return { team: sorted[0].team, goals_against: sorted[0].goals_against }
      }
    }
    return null
  }, [statistics, standingsRows])

  const generateBlob = async () => {
    if (!cardRef.current) return null
    try {
      return await toBlob(cardRef.current, {
        cacheBust: false,
        skipFonts: true,
        imagePlaceholder: TRANSPARENT_PIXEL,
        pixelRatio: 2,
        filter: (node) => !node?.classList?.contains?.('no-share-capture'),
        onImageErrorHandler: () => TRANSPARENT_PIXEL,
      })
    } catch (e1) {
      console.warn('Summary capture primary failed, falling back:', e1)
      return await toBlob(cardRef.current, {
        cacheBust: true,
        skipFonts: true,
        imagePlaceholder: TRANSPARENT_PIXEL,
        pixelRatio: 1.5,
      })
    }
  }

  const handleDownload = async () => {
    if (downloading || !cardRef.current) return
    setDownloading(true)
    try {
      const blob = await generateBlob()
      if (!blob) throw new Error('Blob generation failed')
      const fileName = `tournament-summary-${tournament?.slug || tournament?.id || 'report'}.png`
      downloadBlob(blob, fileName)
      toast.success('تم حفظ صورة ملخص البطولة بنجاح')
    } catch (err) {
      console.error('Download error:', err)
      toast.error('تعذر حفظ الصورة، يرجى المحاولة مرة أخرى')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (sharing || !cardRef.current) return
    setSharing(true)
    try {
      const blob = await generateBlob()
      if (!blob) throw new Error('Blob generation failed')
      const fileName = `tournament-summary-${tournament?.slug || tournament?.id || 'report'}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `ملخص بطولة ${tournament?.name || ''}`,
          text: `ملخص ${tournament?.name || ''} عبر منصة أجي نقصروا`,
          files: [file],
        })
        toast.success('تمت المشاركة بنجاح')
        return
      }

      // Fallback
      downloadBlob(blob, fileName)
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('تم تنزيل الصورة ونسخ الرابط للمشاركة')
      } else {
        toast.success('تم تنزيل صورة الملخص بنجاح')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Share error:', err)
        toast.error('تعذر المشاركة المباشرة، جاري حفظ الصورة...')
        handleDownload()
      }
    } finally {
      setSharing(false)
    }
  }

  const formattedDateRange = useMemo(() => {
    if (!tournament?.start_date) return ''
    const start = new Date(tournament.start_date).toLocaleDateString('ar-MA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (!tournament.end_date) return start
    const end = new Date(tournament.end_date).toLocaleDateString('ar-MA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return `${start} — ${end}`
  }, [tournament])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100">
        
        {/* Top Header Toolbar */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>ملخص البطولة — صورة</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {isCompleted ? 'تقرير ختامي رسمي' : 'تقرير مجريات البطولة'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">بطاقة ملخص احترافية عالية الجودة معدة للمشاركة على واتساب وشبكات التواصل</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloading || sharing}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>{downloading ? 'جاري الحفظ...' : 'حفظ الصورة'}</span>
            </button>

            <button
              type="button"
              disabled={downloading || sharing}
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 transition-all shadow-sm disabled:opacity-50"
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              <span>{sharing ? 'جاري المشاركة...' : 'مشاركة'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950/40">
          <div className="flex justify-center">
            {/* THE EXPORTABLE SUMMARY CARD */}
            <div
              ref={cardRef}
              className="w-[820px] max-w-[820px] shrink-0 rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f172a] to-[#091520] p-8 text-white shadow-2xl border border-slate-800 font-sans"
            >
              {/* Card Header & Branding */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-6 mb-6">
                <div className="flex items-start gap-4">
                  {tournament?.logo_url ? (
                    <div className="size-16 shrink-0 rounded-2xl bg-slate-800/80 border border-slate-700 p-1 overflow-hidden shadow-md">
                      <img src={tournament.logo_url} alt="" className="size-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-2xl shadow-inner">
                      <Trophy className="size-8" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Trophy className="size-3.5" />
                        AJI NQSSRO • أجي نقصروا
                      </span>
                      {tournament?.edition && (
                        <span className="text-xs text-slate-400 font-bold">• {tournament.edition}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {isCompleted ? 'التقرير الختامي الرسمي' : 'تقرير مجريات البطولة'}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
                      {tournament?.name}
                    </h1>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-2 flex-wrap">
                      {formattedDateRange && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-emerald-400" />
                          {formattedDateRange}
                        </span>
                      )}
                      {tournament?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-emerald-400" />
                          {tournament.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-start bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-inner shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isCompleted ? 'حالة البطولة' : 'المرحلة الحالية'}
                  </p>
                  <p className="text-xs font-black text-white mt-0.5">
                    {isCompleted ? 'بطولة مكتملة رسمياً ✓' : 'البطولة جارية'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{finishedMatches.length} مباراة منتهية</p>
                </div>
              </div>

              {/* Big Stat Counters (4-column grid) */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-3.5 text-center">
                  <div className="flex items-center justify-center size-8 mx-auto rounded-xl bg-sky-500/10 text-sky-400 mb-2">
                    <Users className="size-4" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">{teams.length}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">أندية مشاركة</p>
                </div>

                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-3.5 text-center">
                  <div className="flex items-center justify-center size-8 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 mb-2">
                    <Swords className="size-4" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">{finishedMatches.length}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">مباريات ملعوبة</p>
                </div>

                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-3.5 text-center">
                  <div className="flex items-center justify-center size-8 mx-auto rounded-xl bg-amber-500/10 text-amber-400 mb-2">
                    <Target className="size-4" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">{totalGoals}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">إجمالي الأهداف</p>
                </div>

                <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-3.5 text-center">
                  <div className="flex items-center justify-center size-8 mx-auto rounded-xl bg-purple-500/10 text-purple-400 mb-2">
                    <Activity className="size-4" />
                  </div>
                  <p className="text-2xl font-black text-white font-mono">{goalsPerMatch}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">معدل الأهداف / مباراة</p>
                </div>
              </div>

              {/* Champion & Runner-up (ONLY when officially completed) */}
              {isCompleted && championTeam && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Champion Gold Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-900 border border-amber-500/40 p-4 shadow-lg flex items-center gap-3.5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
                      <Trophy className="size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                        <Sparkles className="size-3.5" />
                        <span>بطل البطولة 🏆</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="size-6 shrink-0 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                          <TeamLogo team={championTeam} className="size-full object-contain" />
                        </div>
                        <p className="text-base font-black text-white truncate font-heading">{championTeam.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Runner-up Silver Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800/80 to-slate-900 border border-slate-700/80 p-4 shadow-lg flex items-center gap-3.5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-300 text-slate-900 font-black shadow-md">
                      <Medal className="size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                        <span>وصيف البطولة 🥈</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="size-6 shrink-0 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                          <TeamLogo team={runnerUpTeam} className="size-full object-contain" />
                        </div>
                        <p className="text-base font-black text-white truncate font-heading">
                          {runnerUpTeam?.name || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Awards & Key Statistics */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-6">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Award className="size-4 text-emerald-400" />
                  <span>الأرقام المميزة والجوائز المعتمدة</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {/* Top Scorer */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                    <p className="text-[10px] font-bold text-slate-400">هداف البطولة ⚽</p>
                    {topScorer ? (
                      <>
                        <p className="text-sm font-black text-white mt-1 truncate">{topScorer.name}</p>
                        <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                          {topScorer.count} أهداف {topScorer.team ? `(${topScorer.team.name})` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-slate-500 mt-1">قيد التحديد</p>
                    )}
                  </div>

                  {/* Best Attack */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                    <p className="text-[10px] font-bold text-slate-400">أقوى خط هجوم 🔥</p>
                    {bestAttack?.team ? (
                      <>
                        <p className="text-sm font-black text-white mt-1 truncate">{bestAttack.team.name}</p>
                        <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                          {bestAttack.goals_for} هدفاً مسجلاً
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-slate-500 mt-1">قيد التحديد</p>
                    )}
                  </div>

                  {/* Best Defense */}
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                    <p className="text-[10px] font-bold text-slate-400">أقوى خط دفاع 🛡️</p>
                    {bestDefense?.team ? (
                      <>
                        <p className="text-sm font-black text-white mt-1 truncate">{bestDefense.team.name}</p>
                        <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                          استقبل {bestDefense.goals_against} أهداف فقط
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-slate-500 mt-1">قيد التحديد</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Standings Podium (Top 3) */}
              {standingsRows.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="size-4 text-amber-400" />
                      <span>{isCompleted ? 'الترتيب النهائي المعتمد' : 'صدارة الترتيب الحالي'}</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">أفضل المراكز</span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 text-[10px] font-black text-slate-400 border-b border-slate-800">
                          <th className="p-2 text-start w-10">#</th>
                          <th className="p-2 text-start">الفريق</th>
                          <th className="p-2">لعب</th>
                          <th className="p-2">فاز</th>
                          <th className="p-2">تعادل</th>
                          <th className="p-2">خسر</th>
                          <th className="p-2">له/عليه</th>
                          <th className="p-2">فارق</th>
                          <th className="p-2 font-black text-emerald-400">النقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {standingsRows.slice(0, 4).map((row, idx) => {
                          const rank = idx + 1
                          return (
                            <tr
                              key={row.team_id || idx}
                              className={rank === 1 ? 'bg-amber-950/20' : rank === 2 ? 'bg-slate-800/40' : 'bg-slate-900/30'}
                            >
                              <td className="p-2 text-start font-black text-slate-400">
                                {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : rank}
                              </td>
                              <td className="p-2 text-start">
                                <div className="flex items-center gap-2">
                                  <div className="size-5 shrink-0 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                    <TeamLogo team={row.team} className="size-full object-contain" />
                                  </div>
                                  <span className="font-bold text-white truncate max-w-[150px]">{row.team?.name}</span>
                                </div>
                              </td>
                              <td className="p-2 font-semibold text-slate-300">{row.played}</td>
                              <td className="p-2 font-semibold text-slate-300">{row.wins}</td>
                              <td className="p-2 font-semibold text-slate-300">{row.draws}</td>
                              <td className="p-2 font-semibold text-slate-300">{row.losses}</td>
                              <td className="p-2 font-semibold text-slate-300">{row.goals_for}:{row.goals_against}</td>
                              <td className={`p-2 font-bold ${row.goal_difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {row.goal_difference >= 0 ? `+${row.goal_difference}` : row.goal_difference}
                              </td>
                              <td className="p-2 font-black text-sm text-emerald-400">{row.points}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Discreet Footer & Watermark */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800/80">
                <span>تم التوثيق والاعتماد رسمياً عبر منصة أجي نقصروا لإدارة الدوريات والبطولات الرياضية</span>
                <span className="font-mono text-slate-400">ajin9essro.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <p className="text-xs text-slate-400">
            يمكنك حفظ الصورة مباشرة أو مشاركتها مع الفرق والجمهور بجودة عالية
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              إغلاق
            </button>
            <button
              type="button"
              disabled={downloading || sharing}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>حفظ الصورة (PNG)</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body,
  )
}
