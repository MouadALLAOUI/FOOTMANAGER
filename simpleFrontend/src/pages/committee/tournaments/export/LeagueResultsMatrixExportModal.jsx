import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toBlob } from 'html-to-image'
import { inlineAllImages } from '../../../../lib/cardExportUtils'
import {
  X,
  Download,
  Share2,
  Loader2,
  Trophy,
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
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

export default function LeagueResultsMatrixExportModal({
  tournament,
  standingsData,
  onClose,
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const cardRef = useRef(null)

  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)

  useScrollLock(true)

  // Handle escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Fetch standings if not passed
  const { data: fetchedStandings, loading: standingsLoading } = useApi(
    () =>
      standingsData
        ? Promise.resolve(standingsData)
        : api.get(`/committee/tournaments/${tournament?.id}/standings`).then((r) => r.data.data),
    [tournament?.id, standingsData],
  )

  // Fetch fixtures
  const { data: fixtures, loading: fixturesLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament?.id}/fixtures`).then((r) => r.data.data || r.data || []),
    [tournament?.id],
  )

  // Fetch pending submissions to identify fixtures awaiting committee review
  const { data: pendingData } = useApi(
    () =>
      api
        .get(`/committee/tournaments/${tournament?.id}/delegated-submissions/pending`)
        .then((r) => r.data.data || r.data || [])
        .catch(() => []),
    [tournament?.id],
  )

  const pendingFixturesSet = useMemo(() => {
    const set = new Set()
    for (const p of pendingData || []) {
      if (p.fixture_id) set.add(p.fixture_id)
      if (p.id) set.add(p.id)
    }
    return set
  }, [pendingData])

  const effectiveStandings = standingsData || fetchedStandings
  const teams = useMemo(() => {
    const rows = effectiveStandings?.groups?.[0]?.rows || []
    return rows
  }, [effectiveStandings])

  // Build Fixture Lookup Map
  // Key: `${teamA_id}_${teamB_id}` -> { fixture, isHome }
  const fixtureMap = useMemo(() => {
    const map = new Map()
    if (!fixtures || !Array.isArray(fixtures)) return map

    for (const f of fixtures) {
      const homeId = f.home_team?.id ?? f.home_team_id
      const awayId = f.away_team?.id ?? f.away_team_id
      if (homeId && awayId) {
        map.set(`${homeId}_${awayId}`, { fixture: f, isHome: true })
        map.set(`${awayId}_${homeId}`, { fixture: f, isHome: false })
      }
    }
    return map
  }, [fixtures])

  const isLoading = standingsLoading || fixturesLoading

  // Compute cell data for rowTeam vs colTeam
  const getCellData = (rowTeam, colTeam) => {
    const rowId = rowTeam.team?.id ?? rowTeam.team_id
    const colId = colTeam.team?.id ?? colTeam.team_id

    if (rowId === colId) {
      return { type: 'diagonal' }
    }

    const entry = fixtureMap.get(`${rowId}_${colId}`)
    if (!entry) {
      return { type: 'unplayed', text: '—' }
    }

    const { fixture, isHome } = entry
    const match = fixture.match
    const isPending =
      pendingFixturesSet.has(fixture.id) ||
      fixture.status === 'pending_approval' ||
      match?.status === 'pending_approval'

    if (fixture.status === 'postponed' || match?.status === 'postponed') {
      return { type: 'postponed', label: 'مؤجلة' }
    }

    if (match?.status === 'finished' || fixture.status === 'completed' || fixture.status === 'finished') {
      const homeScore = Number(match?.home_score ?? 0)
      const awayScore = Number(match?.away_score ?? 0)
      const myScore = isHome ? homeScore : awayScore
      const oppScore = isHome ? awayScore : homeScore

      let outcome = 'draw'
      if (myScore > oppScore) outcome = 'win'
      else if (myScore < oppScore) outcome = 'loss'

      return {
        type: 'finished',
        outcome,
        scoreDisplay: `${myScore} - ${oppScore}`,
        myScore,
        oppScore,
      }
    }

    if (isPending) {
      const homeScore = match?.home_score ?? fixture.delegated_submission?.home_score ?? '?'
      const awayScore = match?.away_score ?? fixture.delegated_submission?.away_score ?? '?'
      const myScore = isHome ? homeScore : awayScore
      const oppScore = isHome ? awayScore : homeScore
      return {
        type: 'pending_approval',
        label: 'اعتماد',
        scoreDisplay: `${myScore} - ${oppScore}`,
      }
    }

    if (fixture.scheduled_at) {
      try {
        const d = new Date(fixture.scheduled_at)
        const day = d.getDate()
        const month = d.getMonth() + 1
        return {
          type: 'scheduled',
          dateText: `${day}/${month}`,
        }
      } catch {
        return { type: 'scheduled', dateText: 'قادمة' }
      }
    }

    return { type: 'unplayed', text: '—' }
  }

  // Generation helper for html-to-image
  const generateBlob = async () => {
    if (!cardRef.current) return null
    await inlineAllImages(cardRef.current)
    try {
      return await toBlob(cardRef.current, {
        cacheBust: false,
        skipFonts: true,
        pixelRatio: 2,
        filter: (node) => !node?.classList?.contains?.('no-share-capture'),
      })
    } catch (e1) {
      console.warn('Matrix capture primary failed, falling back:', e1)
      return await toBlob(cardRef.current, {
        cacheBust: true,
        skipFonts: true,
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
      const fileName = `league-matrix-${tournament?.id || 'tournament'}.png`
      downloadBlob(blob, fileName)
      toast.success('تم حفظ صورة مصفوفة النتائج بنجاح')
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
      const fileName = `league-matrix-${tournament?.id || 'tournament'}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `مصفوفة نتائج ${tournament?.name || 'الدوري'}`,
          text: `مصفوفة نتائج دوري ${tournament?.name || ''} عبر منصة أجي نقصروا`,
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
        toast.success('تم تنزيل صورة المصفوفة بنجاح')
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

  const currentDateFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-MA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date())
    } catch {
      return new Date().toLocaleDateString()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100">
        
        {/* Top Header / Modal Toolbar */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>تصدير صورة مصفوفة نتائج الدوري</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  دوري مرحلة واحدة
                </span>
              </h2>
              <p className="text-xs text-slate-400">معاينة تفاعلية عالية الدقة لشبكة مواجهات ونتائج كافة الفرق</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading || downloading || sharing}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>{downloading ? 'جاري الحفظ...' : 'حفظ الصورة'}</span>
            </button>

            <button
              type="button"
              disabled={isLoading || downloading || sharing}
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
              <p className="text-sm font-semibold">جاري إعداد بيانات مصفوفة النتائج...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 text-center">
              <Trophy className="size-10 text-slate-500" />
              <p className="text-sm font-bold text-slate-300">لا تتوفر فرق مسجلة في هذا الدوري بعد</p>
            </div>
          ) : (
            <div className="flex justify-center">
              {/* THE EXPORTABLE MATRIX CARD (Ref for html-to-image) */}
              <div
                ref={cardRef}
                className="w-[960px] max-w-[960px] shrink-0 rounded-3xl bg-gradient-to-br from-[#0c1424] via-[#0f172a] to-[#091520] p-7 text-white shadow-2xl border border-slate-800 font-sans"
              >
                {/* Branding & Tournament Header */}
                <div className="flex items-start justify-between border-b border-slate-800/80 pb-5 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Trophy className="size-3.5" />
                        AJI NQSSRO • أجي نقصروا
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">• {tournament?.edition || 'الدوري العام'}</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight font-heading">
                      {tournament?.name}
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      مصفوفة النتائج والمواجهات المباشرة المعتمدة • الترتيب الحالي للفرق
                    </p>
                  </div>

                  <div className="text-start bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-2xl shadow-inner">
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <CalendarDays className="size-3 text-emerald-400" />
                      تاريخ الاستخراج
                    </p>
                    <p className="text-xs font-black text-white mt-0.5">{currentDateFormatted}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{teams.length} أندية مشاركة</p>
                  </div>
                </div>

                {/* THE MATRIX TABLE */}
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl">
                  <table className="w-full border-collapse text-center">
                    <thead>
                      <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-black text-slate-300">
                        {/* Corner Cell */}
                        <th className="p-3 text-start min-w-[200px] max-w-[220px] text-slate-400 border-e border-slate-800">
                          الفريق \ المنافس
                        </th>

                        {/* Column Teams */}
                        {teams.map((tCol, colIdx) => (
                          <th
                            key={tCol.team?.id ?? tCol.team_id ?? colIdx}
                            className="p-2 border-e border-slate-800/80 min-w-[58px] max-w-[68px]"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="flex size-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                                {colIdx + 1}
                              </span>
                              <div className="size-6 shrink-0 rounded-full overflow-hidden bg-slate-800 border border-slate-700/60 p-0.5">
                                <TeamLogo team={tCol.team} className="size-full object-contain" />
                              </div>
                            </div>
                          </th>
                        ))}

                        {/* Final Column: Total Points */}
                        <th className="p-2 min-w-[65px] bg-emerald-950/50 text-emerald-300 border-s border-emerald-800/60 font-black text-xs">
                          النقاط
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {teams.map((tRow, rowIdx) => {
                        const rank = rowIdx + 1
                        const isTop = rank === 1
                        const isSecond = rank === 2

                        return (
                          <tr
                            key={tRow.team?.id ?? tRow.team_id ?? rowIdx}
                            className={`transition-colors ${
                              isTop
                                ? 'bg-emerald-950/20'
                                : rowIdx % 2 === 0
                                  ? 'bg-slate-900/40'
                                  : 'bg-slate-900/10'
                            }`}
                          >
                            {/* Row Header (Team Info) */}
                            <td className="p-2.5 text-start border-e border-slate-800">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                                    isTop
                                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                                      : isSecond
                                        ? 'bg-slate-300 text-slate-950'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {rank}
                                </span>
                                <div className="size-7 shrink-0 rounded-full bg-slate-800 border border-slate-700/70 p-0.5 overflow-hidden">
                                  <TeamLogo team={tRow.team} className="size-full object-contain" />
                                </div>
                                <span className="font-bold text-slate-200 truncate max-w-[125px]" title={tRow.team?.name}>
                                  {tRow.team?.name || '—'}
                                </span>
                              </div>
                            </td>

                            {/* Matrix Result Cells */}
                            {teams.map((tCol, colIdx) => {
                              const cell = getCellData(tRow, tCol)

                              if (cell.type === 'diagonal') {
                                return (
                                  <td
                                    key={colIdx}
                                    className="p-1 border-e border-slate-800/60 bg-slate-950/70"
                                  >
                                    <div className="h-9 w-full flex items-center justify-center rounded-lg bg-slate-900/40 text-slate-600 font-bold select-none text-xs">
                                      ✕
                                    </div>
                                  </td>
                                )
                              }

                              if (cell.type === 'finished') {
                                const isWin = cell.outcome === 'win'
                                const isLoss = cell.outcome === 'loss'
                                const isDraw = cell.outcome === 'draw'

                                return (
                                  <td
                                    key={colIdx}
                                    className="p-1 border-e border-slate-800/60"
                                  >
                                    <div
                                      className={`h-9 w-full flex items-center justify-center rounded-lg font-black text-xs shadow-xs tracking-tight ${
                                        isWin
                                          ? 'bg-emerald-600 text-white shadow-emerald-950 ring-1 ring-emerald-400/40'
                                          : isLoss
                                            ? 'bg-rose-600/90 text-white shadow-rose-950 ring-1 ring-rose-400/30'
                                            : 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                                      }`}
                                      title={cell.scoreDisplay}
                                    >
                                      {cell.scoreDisplay}
                                    </div>
                                  </td>
                                )
                              }

                              if (cell.type === 'pending_approval') {
                                return (
                                  <td
                                    key={colIdx}
                                    className="p-1 border-e border-slate-800/60"
                                  >
                                    <div
                                      className="h-9 w-full flex flex-col items-center justify-center rounded-lg bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 text-[10px] font-bold"
                                      title="نتيجة مسجلة بانتظار اعتماد اللجنة"
                                    >
                                      <span className="font-black text-xs text-white">{cell.scoreDisplay}</span>
                                      <span className="text-[8px] text-indigo-300">اعتماد</span>
                                    </div>
                                  </td>
                                )
                              }

                              if (cell.type === 'postponed') {
                                return (
                                  <td
                                    key={colIdx}
                                    className="p-1 border-e border-slate-800/60"
                                  >
                                    <div
                                      className="h-9 w-full flex items-center justify-center rounded-lg bg-amber-950/70 border border-amber-600/50 text-amber-400 text-[10px] font-bold"
                                      title="مباراة مؤجلة"
                                    >
                                      مؤجلة
                                    </div>
                                  </td>
                                )
                              }

                              if (cell.type === 'scheduled') {
                                return (
                                  <td
                                    key={colIdx}
                                    className="p-1 border-e border-slate-800/60"
                                  >
                                    <div
                                      className="h-9 w-full flex items-center justify-center rounded-lg bg-slate-900/30 border border-slate-800 text-slate-400 text-[10px] font-medium"
                                      title={`موعد المباراة: ${cell.dateText}`}
                                    >
                                      {cell.dateText}
                                    </div>
                                  </td>
                                )
                              }

                              // Unplayed or no fixture
                              return (
                                <td
                                  key={colIdx}
                                  className="p-1 border-e border-slate-800/60"
                                >
                                  <div className="h-9 w-full flex items-center justify-center rounded-lg text-slate-600 text-xs font-bold">
                                    —
                                  </div>
                                </td>
                              )
                            })}

                            {/* Total Points (Final Column) */}
                            <td className="p-2 border-s border-emerald-800/60 bg-emerald-950/30 font-black text-center">
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-black shadow-inner">
                                {tRow.points} ن
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend & Verification Footer */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Legend Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-slate-400 font-bold text-[11px]">الدليل:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white font-bold text-[10px]">
                      <span className="size-2 rounded-full bg-white"></span>
                      فوز
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                      <span className="size-2 rounded-full bg-amber-400"></span>
                      تعادل
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600/90 text-white font-bold text-[10px]">
                      <span className="size-2 rounded-full bg-white"></span>
                      خسارة
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-600/50 text-amber-400 font-bold text-[10px]">
                      مؤجلة
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 font-bold text-[10px]">
                      ✕ متطابقة
                    </span>
                  </div>

                  {/* Platform Watermark */}
                  <div className="text-start text-[11px] text-slate-500 font-medium">
                    منصة أجي نقصروا لإدارة الدوريات والبطولات الرياضية • ajinqssro.com
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <p className="text-xs text-slate-400">
            الصورة المستخرجة بدقة فائقة وجاهزة للنشر المباشر عبر واتساب ومواقع التواصل
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
              disabled={isLoading || downloading || sharing}
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
