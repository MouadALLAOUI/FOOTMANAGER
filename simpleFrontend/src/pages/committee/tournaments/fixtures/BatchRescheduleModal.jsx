import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CalendarRange, Check, Clock, Landmark, Loader2 } from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Button, Field, Modal, inputClass, selectClass } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { getGroupColor } from '../../../../lib/groupColors'
import { formatGroupName } from '../../../../lib/groupNames'

function addMinutesToTime(hhmm, offsetMinutes) {
  const [h, m] = (hhmm || '18:00').split(':').map((n) => Number(n) || 0)
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + offsetMinutes))
  const nh = String(Math.floor(total / 60)).padStart(2, '0')
  const nm = String(total % 60).padStart(2, '0')
  return `${nh}:${nm}`
}

export default function BatchRescheduleModal({
  open,
  onClose,
  tournament,
  orderedGroups = [],
  candidateFixtures = [],
  initialSelectedIds = [],
  initialDate = '',
  defaultTime = '18:00',
  onDone,
}) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const fallbackDate =
    initialDate && initialDate !== 'all' && initialDate !== 'unscheduled'
      ? initialDate
      : tournament?.start_date || new Date().toISOString().slice(0, 10)

  const [date, setDate] = useState(fallbackDate)
  const [timeMode, setTimeMode] = useState('staggered') // 'keep' | 'single' | 'staggered'
  const [baseTime, setBaseTime] = useState(defaultTime || '18:00')
  const [stepMinutes, setStepMinutes] = useState(60)
  const [stadiumId, setStadiumId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [overrideQueue, setOverrideQueue] = useState([])
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return
    const targetDate =
      initialDate && initialDate !== 'all' && initialDate !== 'unscheduled'
        ? initialDate
        : tournament?.start_date || new Date().toISOString().slice(0, 10)
    setDate(targetDate)
    setTimeMode(initialSelectedIds.length > 0 ? 'keep' : 'staggered')
    setBaseTime(defaultTime || '18:00')
    setStadiumId('')
    setOverrideQueue([])
    if (initialSelectedIds.length > 0) {
      setSelectedIds(initialSelectedIds)
    } else if (initialDate && initialDate !== 'all' && initialDate !== 'unscheduled') {
      const sameDayIds = candidateFixtures
        .filter((f) => f.scheduled_at && f.scheduled_at.slice(0, 10) === initialDate)
        .map((f) => f.id)
      setSelectedIds(sameDayIds)
    } else {
      setSelectedIds([])
    }
  }, [open, initialDate, initialSelectedIds, defaultTime, tournament?.start_date, candidateFixtures])

  const { data: terrainData } = useApi(
    () =>
      api
        .get(`/committee/tournaments/${tournament.id}/fixtures/terrains`, {
          params: { date: date || undefined, time: baseTime || undefined },
        })
        .then((r) => r.data.data),
    [tournament.id, date, baseTime],
    { enabled: open && Boolean(tournament?.id), staleTime: 0 },
  )

  const terrains = useMemo(() => terrainData?.terrains || [], [terrainData])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggleId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleAllVisible = () => {
    if (selectedIds.length === candidateFixtures.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(candidateFixtures.map((f) => f.id))
    }
  }

  const executeBatch = async (targets, forceOverride = false) => {
    if (!date || targets.length === 0) return
    setSubmitting(true)
    setProgress({ done: 0, total: targets.length })
    const warned = []
    let succeeded = 0
    let lastErr = null

    for (let i = 0; i < targets.length; i += 1) {
      const item = targets[i]
      const f = item.fixture || item
      const resolvedTime = item.resolvedTime
        ? item.resolvedTime
        : timeMode === 'keep'
          ? f.scheduled_at
            ? f.scheduled_at.slice(11, 16)
            : baseTime || '18:00'
          : timeMode === 'single'
            ? baseTime || '18:00'
            : addMinutesToTime(baseTime || '18:00', i * Number(stepMinutes || 60))

      const payload = {
        scheduled_at: `${date}T${resolvedTime}:00`,
        stadium_id: stadiumId ? Number(stadiumId) : f.stadium?.id || f.stadium_id || undefined,
        override_warnings: forceOverride,
      }

      try {
        await api.put(`/committee/tournaments/${tournament.id}/fixtures/${f.id}`, payload)
        succeeded += 1
      } catch (err) {
        if (err?.response?.data?.requires_override && !forceOverride) {
          warned.push({
            fixture: f,
            resolvedTime,
            message: err.response.data.message || 'تعارض أو تنبيه برمجة',
          })
        } else {
          lastErr = err
        }
      }
      setProgress({ done: i + 1, total: targets.length })
    }

    setSubmitting(false)

    if (warned.length > 0) {
      setOverrideQueue(warned)
      if (succeeded > 0) {
        toast.info(`تم تحديث ${succeeded} مباراة، وتوجد ${warned.length} مباراة تحتاج تأكيد تجاوز التنبيهات`)
      }
      return
    }

    if (lastErr && succeeded === 0) {
      toastApiError(lastErr, t, 'تعذر تحديث مواعيد المباريات المحددة')
      return
    }

    if (lastErr && succeeded > 0) {
      toast.warning(`تم تحديث ${succeeded} من أصل ${targets.length} مباراة`)
    } else {
      toast.success(`تم تحديث موعد ${succeeded} مباراة بنجاح`)
    }

    setOverrideQueue([])
    onDone?.(date)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="برمجة وتعديل جماعي للمباريات"
      subtitle="تطبيق التاريخ والتوقيت والملعب على المباريات غير المنجزة عبر التحديث الفعلي بالخادم"
      size="lg"
    >
      <div className="space-y-4" dir="rtl">
        {/* Date, Time Mode, Stadium */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اليوم المستهدف">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="الملعب">
            <div className="relative">
              <select
                value={stadiumId}
                onChange={(e) => setStadiumId(e.target.value)}
                className={selectClass}
              >
                <option value="">الإبقاء على ملعب كل مباراة الحالي</option>
                {terrains.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.slot_available === false ? ' (مشغول غالباً)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        {/* Time Strategy */}
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
            <Clock className="size-4 text-[#1F9D55] dark:text-[#D0FF38]" />
            <span>نظام التوقيت</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'keep', label: 'الإبقاء على التوقيت' },
              { key: 'staggered', label: 'أوقات متتابعة' },
              { key: 'single', label: 'توقيت موحد' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTimeMode(opt.key)}
                className={`rounded-xl px-2 py-2 text-[11px] font-black transition cursor-pointer ${
                  timeMode === opt.key
                    ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                    : 'bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3] border border-[#E1E5DF] dark:border-[#303832]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {timeMode !== 'keep' && (
            <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
              <Field label={timeMode === 'staggered' ? 'توقيت بداية أول مباراة' : 'التوقيت الموحد'}>
                <input
                  type="time"
                  value={baseTime}
                  onChange={(e) => setBaseTime(e.target.value)}
                  className={inputClass}
                />
              </Field>
              {timeMode === 'staggered' && (
                <Field label="الفاصل الزمني بين كل مباراة">
                  <select
                    value={stepMinutes}
                    onChange={(e) => setStepMinutes(Number(e.target.value))}
                    className={selectClass}
                  >
                    <option value={30}>30 دقيقة</option>
                    <option value={60}>60 دقيقة (ساعة)</option>
                    <option value={90}>90 دقيقة (ساعة ونصف)</option>
                    <option value={120}>120 دقيقة (ساعتان)</option>
                  </select>
                </Field>
              )}
            </div>
          )}
        </div>

        {/* Override Warning Confirmation Box */}
        {overrideQueue.length > 0 && (
          <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <span>توجد {overrideQueue.length} مباريات بها تنبيه برمجة:</span>
            </div>
            <ul className="space-y-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 max-h-28 overflow-y-auto">
              {overrideQueue.map(({ fixture: f, message }) => (
                <li key={f.id}>
                  • {f.home_team?.name || 'فريق 1'} ضد {f.away_team?.name || 'فريق 2'}: {message}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOverrideQueue([])} disabled={submitting}>
                إلغاء المتبقي
              </Button>
              <Button size="sm" onClick={() => executeBatch(overrideQueue, true)} loading={submitting}>
                تأكيد التجاوز وحفظ المتبقي
              </Button>
            </div>
          </div>
        )}

        {/* Selectable Matches List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
              المباريات القابلة للتعديل ({selectedIds.length}/{candidateFixtures.length})
            </span>
            {candidateFixtures.length > 0 && (
              <button
                type="button"
                onClick={toggleAllVisible}
                className="text-xs font-black text-[#1F9D55] dark:text-[#D0FF38] hover:underline cursor-pointer"
              >
                {selectedIds.length === candidateFixtures.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            )}
          </div>

          {candidateFixtures.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] p-5 text-center text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
              لا توجد مباريات غير منجزة قابلة لإعادة البرمجة.
            </p>
          ) : (
            <div className="max-h-60 space-y-1.5 overflow-y-auto pe-1">
              {candidateFixtures.map((f) => {
                const checked = selectedSet.has(f.id)
                const gColor = f.group ? getGroupColor(f.group, orderedGroups) : null
                const gLabel = f.group?.name
                  ? formatGroupName(f.group.name, { groupId: f.group.id, tournamentId: tournament?.id })
                  : f.round?.name || `جولة ${f.matchday || '—'}`
                const curDate = f.scheduled_at ? `${f.scheduled_at.slice(0, 10)} · ${f.scheduled_at.slice(11, 16)}` : 'بدون موعد'

                return (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleId(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleId(f.id)
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl border border-s-4 px-3 py-2 text-start transition cursor-pointer ${
                      checked
                        ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/14 dark:bg-[#D0FF38]/12'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
                    }`}
                    style={gColor ? { borderInlineStartColor: gColor.hex } : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                          checked
                            ? 'border-[#111313] bg-[#111313] dark:border-[#D0FF38] dark:bg-[#D0FF38] text-white dark:text-[#111313]'
                            : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27]'
                        }`}
                      >
                        {checked && <Check className="size-3.5 stroke-[3]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                          {f.home_team?.id != null ? <Link to={`/teams/${f.home_team.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors">{f.home_team.name}</Link> : (f.home_team?.name || 'مقعد مفتوح')} VS {f.away_team?.id != null ? <Link to={`/teams/${f.away_team.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors">{f.away_team.name}</Link> : (f.away_team?.name || 'مقعد مفتوح')}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                          <span className={gColor ? gColor.textCls : ''}>{gLabel}</span>
                          <span>•</span>
                          <span>{curDate}</span>
                          {f.stadium?.name && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5">
                                <Landmark className="size-2.5" />
                                {f.stadium.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E5DF] dark:border-[#303832] pt-3">
          <div className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
            {submitting && (
              <span className="inline-flex items-center gap-1.5 text-[#1F9D55] dark:text-[#D0FF38]">
                <Loader2 className="size-3.5 animate-spin" />
                جاري التحديث ({progress.done}/{progress.total})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              loading={submitting}
              disabled={!date || selectedIds.length === 0}
              onClick={() => {
                const selectedFixtures = candidateFixtures.filter((f) => selectedSet.has(f.id))
                executeBatch(selectedFixtures, false)
              }}
            >
              <CalendarRange className="size-4" />
              <span>تطبيق على {selectedIds.length} مباراة</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
