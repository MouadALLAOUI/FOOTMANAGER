import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Loader2, Search, User, X } from 'lucide-react'
import api from '../../../api/client'
import TeamLogo from '../../../components/profile/TeamLogo'
import useScrollLock from '../../../components/useScrollLock'
import Jersey from '../../../pages/manager/live/components/Jersey'

export default function CumulativePenaltyModal({
  open,
  data,
  onScore,
  onMiss,
  onClose,
  isBusy = false,
}) {
  useScrollLock(open)

  const [step, setStep] = useState('decide') // 'decide' | 'pick_shooter'
  const [searchQuery, setSearchQuery] = useState('')
  const [customPlayerName, setCustomPlayerName] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [internalRoster, setInternalRoster] = useState([])
  const [loadingInternalRoster, setLoadingInternalRoster] = useState(false)

  const beneficiaryId = data?.beneficiaryId || data?.award?.awarded_to_team_id || data?.suggestion?.awarded_to_team_id

  // Load roster automatically if not provided or empty
  useEffect(() => {
    let cancelled = false
    if (!open || !beneficiaryId) return
    const initialList = data?.roster || []
    if (initialList.length > 0) {
      setInternalRoster(initialList)
      return
    }
    setLoadingInternalRoster(true)
    api.get(`/committee/teams/${beneficiaryId}/players`)
      .then((r) => {
        if (!cancelled) {
          setInternalRoster(r.data?.data || [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingInternalRoster(false)
      })
    return () => { cancelled = true }
  }, [open, beneficiaryId, data?.roster])

  // Reset step whenever modal data changes or opens
  useEffect(() => {
    if (open && data) {
      setStep(data.initialStep || 'decide')
      setSearchQuery('')
      setCustomPlayerName('')
      setShowCustomInput(false)
    }
  }, [open, data])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const activeRoster = internalRoster.length > 0 ? internalRoster : (data?.roster || [])

  // Filter roster by search query - unconditionally before any early returns to respect React Hook rules
  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return activeRoster
    return activeRoster.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.number != null && String(p.number).includes(q)),
    )
  }, [activeRoster, searchQuery])

  if (!open || !data) return null

  const {
    offenderName,
    offenderTeam,
    beneficiaryName,
    beneficiaryTeam,
    threshold,
    isHome = false,
    minute,
  } = data

  const handleChoosePlayer = (player) => {
    if (isBusy) return
    onScore?.(player)
  }

  const handleCustomPlayerSubmit = (e) => {
    e?.preventDefault?.()
    const trimmed = customPlayerName.trim()
    if (!trimmed || isBusy) return
    onScore?.({ id: null, name: trimmed })
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4">
      {/* Dark blur backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={isBusy ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Main Modal Box */}
      <div
        role="dialog"
        aria-modal="true"
        dir="rtl"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 text-center animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Glowing Top Amber/Emerald Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

        <div className="p-5 sm:p-6">
          {/* Close button top corner */}
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="absolute top-4 start-4 grid size-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>

          {/* STEP 1: DECISION (سُجلت أم ضاعت) */}
          {step === 'decide' && (
            <div>
              {/* Warning Capsule */}
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-black text-amber-800 mb-3 border border-amber-300 shadow-xs animate-pulse">
                <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                <span>الخطأ التراكمي المكتمل ({threshold}/{threshold})</span>
                {minute && <span className="font-mono text-[11px] text-amber-600">({minute}′)</span>}
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ركلة جزاء مستحقة!
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">
                بلغ فريق <span className="text-slate-900 font-black">{offenderName}</span> الحد الأقصى للأخطاء في هذا الشوط ({threshold}/{threshold}).
              </p>

              {/* Matchup Banner */}
              <div className="my-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-100/50 p-3.5 shadow-inner">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  {/* Offender */}
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="size-12 rounded-2xl ring-2 ring-amber-400 bg-white p-1 flex items-center justify-center shadow-sm">
                      <TeamLogo team={offenderTeam} name={offenderName} className="size-full object-contain" />
                    </div>
                    <span className="mt-1.5 text-xs font-black text-slate-800 line-clamp-1">{offenderName}</span>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full mt-1 border border-amber-300">
                      المرتكب للخطأ ({threshold})
                    </span>
                  </div>

                  {/* Indicator Arrow & Goal */}
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-2xl sm:text-3xl animate-bounce">🥅</span>
                    <span className="text-[10px] sm:text-xs font-black text-emerald-700 mt-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ركلة جزاء لصالح
                    </span>
                  </div>

                  {/* Beneficiary */}
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="size-12 rounded-2xl ring-2 ring-emerald-500 bg-white p-1 flex items-center justify-center shadow-sm">
                      <TeamLogo team={beneficiaryTeam} name={beneficiaryName} className="size-full object-contain" />
                    </div>
                    <span className="mt-1.5 text-xs font-black text-slate-800 line-clamp-1">{beneficiaryName}</span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full mt-1 border border-emerald-300">
                      المسدد للركلة
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Scored vs Missed */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 my-3">
                {/* Choice 1: Scored -> Always transitions to pick_shooter to select player */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setStep('pick_shooter')}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 text-white font-black p-4 shadow-lg shadow-emerald-700/25 border border-emerald-400/40 transition cursor-pointer disabled:opacity-50"
                >
                  <div className="size-13 rounded-2xl bg-white/20 grid place-items-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                    ⚽
                  </div>
                  <span className="text-base sm:text-lg font-black tracking-wide">سُجلت (هدف)</span>
                  <span className="text-[11px] font-semibold text-emerald-100 opacity-90 leading-tight">
                    اختيار المسدد واحتساب هدف
                  </span>
                </button>

                {/* Choice 2: Missed */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onMiss}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 active:scale-95 text-white font-black p-4 shadow-lg shadow-rose-600/25 border border-rose-300/40 transition cursor-pointer disabled:opacity-50"
                >
                  <div className="size-13 rounded-2xl bg-white/20 grid place-items-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                    ❌
                  </div>
                  <span className="text-base sm:text-lg font-black tracking-wide">ضاعت</span>
                  <span className="text-[11px] font-semibold text-rose-100 opacity-90 leading-tight">
                    تسجيل ركلة ضائعة وتصفير الأخطاء
                  </span>
                </button>
              </div>

              {/* Footer cancel / close */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onClose}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                >
                  إلغاء وإغلاق بدون تسجيل ركلة الجزاء الآن
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PICK SHOOTER (شبكة أيقونات اللاعبين بنقرة واحدة) */}
          {step === 'pick_shooter' && (
            <div className="text-start">
              {/* Header with Back button */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('decide')}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  <ArrowRight className="size-3.5" />
                  <span>رجوع</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 line-clamp-1">{beneficiaryName}</span>
                  <div className="size-6 rounded-lg bg-slate-100 p-0.5 overflow-hidden">
                    <TeamLogo team={beneficiaryTeam} name={beneficiaryName} className="size-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Title & Instruction */}
              <div className="mt-3 text-center">
                <h4 className="text-lg font-black text-slate-900">
                  من هو مسدد ركلة الجزاء؟
                </h4>
                <p className="mt-0.5 text-xs font-bold text-slate-500">
                  انقر على أيقونة اللاعب لاحتساب الهدف باسمه فوراً
                </p>
              </div>

              {/* Loading state for roster */}
              {loadingInternalRoster && (
                <div className="my-6 flex flex-col items-center justify-center gap-2 text-xs font-bold text-slate-400">
                  <Loader2 className="size-6 animate-spin text-emerald-500" />
                  <span>جاري تحميل قائمة اللاعبين…</span>
                </div>
              )}

              {/* Search filter if roster has more than 6 players */}
              {!loadingInternalRoster && activeRoster.length > 6 && (
                <div className="relative mt-3">
                  <Search className="absolute top-2.5 start-3 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث عن لاعب بالاسم أو الرقم…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 ps-9 pe-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {/* Player Badges Grid */}
              {!loadingInternalRoster && (
                <div className="mt-3 max-h-[300px] sm:max-h-[340px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-2 shadow-inner">
                  {filteredRoster.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {filteredRoster.map((player) => {
                        const photoSrc = player.photo_thumbnail_url || player.photo_url
                        return (
                          <button
                            key={player.id || player._key || player.name}
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleChoosePlayer(player)}
                            className="group relative flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md hover:ring-2 hover:ring-emerald-400/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {/* Visual: Photo or Jersey */}
                            <div className="relative my-1 flex items-center justify-center">
                              {photoSrc ? (
                                <div className="relative">
                                  <img
                                    src={photoSrc}
                                    alt={player.name}
                                    className="size-11 sm:size-12 rounded-xl object-cover ring-2 ring-white shadow-xs"
                                  />
                                  {player.number != null && (
                                    <span className="absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-black text-white shadow">
                                      {player.number}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Jersey
                                  number={player.number}
                                  variant={isHome ? 'home' : 'away'}
                                  className="h-11 w-10 sm:h-12 sm:w-11"
                                />
                              )}
                            </div>

                            {/* Player Name */}
                            <span className="mt-1 w-full truncate text-[11px] sm:text-xs font-black text-slate-800 group-hover:text-emerald-700" title={player.name}>
                              {player.name}
                            </span>

                            {/* Number badge under name if available */}
                            {player.number != null && (
                              <span className="mt-0.5 text-[9px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">
                                #{player.number}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs font-bold text-slate-400">
                      {searchQuery ? 'لم يتم العثور على لاعب مطابق للبحث' : 'لا يوجد لاعبون مسجلون في قائمة هذا الفريق'}
                    </div>
                  )}
                </div>
              )}

              {/* Fallback: Custom Player Name if unlisted or if roster is empty */}
              <div className="mt-3 pt-2 border-t border-slate-100">
                {!showCustomInput && activeRoster.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 transition"
                  >
                    + لاعب آخر غير مدرج في القائمة؟ اضغط هنا
                  </button>
                ) : (
                  <form onSubmit={handleCustomPlayerSubmit} className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold text-slate-600">
                      {activeRoster.length === 0 ? 'اكتب اسم مسدد ركلة الجزاء:' : 'إدخال اسم المسدد يدوياً:'}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={customPlayerName}
                        onChange={(e) => setCustomPlayerName(e.target.value)}
                        placeholder="اكتب اسم مسدد ركلة الجزاء…"
                        className="flex-1 rounded-xl border border-emerald-400 bg-white py-2 px-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                      />
                      <button
                        type="submit"
                        disabled={!customPlayerName.trim() || isBusy}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : 'احتساب الهدف'}
                      </button>
                      {activeRoster.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowCustomInput(false)}
                          className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
