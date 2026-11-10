import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  History,
  MapPin,
  Radio,
  ShieldAlert,
  Swords,
  Trophy,
} from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'
import { formatTime, matchDay } from '../../../lib/adapters'
import { parseDateSafe } from './useTeamFullData'

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'recent', label: 'النتائج الأخيرة' },
  { key: 'upcoming', label: 'المباريات القادمة' },
]

const OUTCOME_BADGES = {
  W: {
    label: 'فوز',
    cls: 'bg-[#179955]/12 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/30 dark:border-[#42D889]/35',
  },
  D: {
    label: 'تعادل',
    cls: 'bg-[#D9822B]/12 dark:bg-[#FFC857]/15 text-[#D9822B] dark:text-[#FFC857] border-[#D9822B]/30 dark:border-[#FFC857]/35',
  },
  L: {
    label: 'خسارة',
    cls: 'bg-[#D93636]/12 dark:bg-[#FF6868]/15 text-[#D93636] dark:text-[#FF6868] border-[#D93636]/30 dark:border-[#FF6868]/35',
  },
}

function TeamCell({ team, fallbackLabel = 'فريق غير محدد', align = 'start' }) {
  const hasId = team?.id != null
  const displayName = team?.name || fallbackLabel
  const content = (
    <div
      className={`flex items-center gap-2 sm:gap-2.5 min-w-0 ${
        align === 'end' ? 'flex-row-reverse text-end' : 'text-start'
      }`}
    >
      <TeamLogo
        team={team}
        name={displayName}
        className="size-8 sm:size-9 shrink-0"
        rounded="rounded-xl"
        fontSize="text-xs"
      />
      <span
        dir="auto"
        className={`min-w-0 truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] ${
          hasId ? 'group-hover/team:text-[#179955] dark:group-hover/team:text-[#D0FF38] transition-colors' : ''
        }`}
      >
        {displayName}
      </span>
    </div>
  )

  if (!hasId) {
    return <div className="min-w-0">{content}</div>
  }

  return (
    <Link
      to={`/teams/${team.id}`}
      onClick={(e) => e.stopPropagation()}
      className="group/team block min-w-0 rounded-xl p-1 -m-1 transition-colors hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]"
      title={`عرض ملف ${displayName}`}
    >
      {content}
    </Link>
  )
}

export default function TeamMatchHistory({ matches, onOpenMatch }) {
  const [tab, setTab] = useState('all')

  const all = matches?.all || []
  const recent = matches?.recent || []
  const upcoming = matches?.upcoming || []
  const live = matches?.live || []

  const visibleList = useMemo(() => {
    if (tab === 'recent') return matches?.recent || []
    if (tab === 'upcoming') return matches?.upcoming || []
    return matches?.all || []
  }, [tab, matches])

  const counts = {
    all: all.length,
    recent: recent.length,
    upcoming: upcoming.length,
  }

  return (
    <section className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-6 shadow-2xs space-y-4">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <History className="size-4" />
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            سجل المباريات والنتائج
          </h2>
          {live.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
              <Radio className="size-3 animate-pulse" />
              <span>{live.length} مباشر</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] p-1 border border-[#E1E5DF] dark:border-[#303832]">
          {TABS.map((tItem) => {
            const active = tab === tItem.key
            return (
              <button
                key={tItem.key}
                type="button"
                onClick={() => setTab(tItem.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  active
                    ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                    : 'text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2]'
                }`}
              >
                <span>{tItem.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active
                      ? 'bg-[#111313]/15 text-[#111313]'
                      : 'bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3]'
                  }`}
                >
                  {counts[tItem.key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Matches List */}
      {visibleList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] py-10 px-4 text-center">
          <Swords className="size-7 text-[#65706A] dark:text-[#B2B9B3] mb-2" />
          <p className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            {tab === 'upcoming'
              ? 'لا توجد مباريات قادمة مبرمجة حالياً'
              : tab === 'recent'
                ? 'لا توجد نتائج مباريات مسجلة بعد'
                : 'لا توجد مباريات مسجلة لهذا الفريق حتى الآن'}
          </p>
          <p className="mt-1 text-xs text-[#65706A] dark:text-[#B2B9B3] max-w-sm">
            ستظهر هنا جميع المباريات الرسمية في البطولات واللقاءات الودية فور جدولتها أو اعتماد نتائجها.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleList.map((m) => {
            const safeDate = parseDateSafe(m.scheduledAt)
            const dayText = safeDate ? matchDay(safeDate, 'ar') : ''
            const timeText = safeDate ? formatTime(safeDate) : ''
            const isFinished = m.statusCategory === 'finished'
            const isLive = m.statusCategory === 'live'
            const isPostponed = m.statusCategory === 'postponed'
            const canOpenModal = Boolean(onOpenMatch && m.tournamentKey && m.matchId)
            const outcomeMeta = m.outcome ? OUTCOME_BADGES[m.outcome] : null

            return (
              <div
                key={m.uid}
                onClick={
                  canOpenModal
                    ? () =>
                        onOpenMatch({
                          tournamentKey: m.tournamentKey,
                          fixture: m.fixture || { match: { id: m.matchId } },
                        })
                    : undefined
                }
                role={canOpenModal ? 'button' : undefined}
                tabIndex={canOpenModal ? 0 : undefined}
                onKeyDown={
                  canOpenModal
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpenMatch({
                            tournamentKey: m.tournamentKey,
                            fixture: m.fixture || { match: { id: m.matchId } },
                          })
                        }
                      }
                    : undefined
                }
                className={`rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5 sm:p-4 transition-all ${
                  canOpenModal
                    ? 'cursor-pointer hover:border-[#B8F000] dark:hover:border-[#D0FF38] hover:bg-white dark:hover:bg-[#1B201D]'
                    : ''
                } ${m.groupColor ? 'border-s-4' : ''}`}
                style={m.groupColor ? { borderInlineStartColor: m.groupColor.hex } : undefined}
              >
                {/* Top Meta Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {m.tournamentKey ? (
                      <Link
                        to={`/tournaments/${encodeURIComponent(m.tournamentKey)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] hover:border-[#B8F000] dark:hover:border-[#D0FF38] px-2.5 py-0.5 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] transition-colors max-w-[200px] sm:max-w-xs"
                      >
                        <Trophy className="size-3 shrink-0 text-[#179955] dark:text-[#D0FF38]" />
                        <span className="truncate">{m.tournamentName}</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2.5 py-0.5 text-[11px] font-black text-[#65706A] dark:text-[#B2B9B3]">
                        <Swords className="size-3 shrink-0 text-[#179955] dark:text-[#D0FF38]" />
                        <span>{m.tournamentName || 'مباراة ودية'}</span>
                      </span>
                    )}

                    {m.groupColor?.label && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${m.groupColor.badgeCls}`}
                      >
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: m.groupColor.hex }} />
                        <span>{m.groupColor.label}</span>
                      </span>
                    )}

                    {m.roundName && (
                      <span className="rounded-full bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                        {m.roundName}
                      </span>
                    )}

                    {m.isDefaultResult && (
                      <span
                        title={m.defaultResultNote || 'نتيجة اعتبارية معتمدة من اللجنة المنظمة'}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300"
                      >
                        <ShieldAlert className="size-3" />
                        <span>نتيجة اعتبارية</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 text-white px-2.5 py-0.5 text-[10px] font-black">
                        <Radio className="size-3 animate-pulse" />
                        <span>مباشر</span>
                      </span>
                    )}

                    {isPostponed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-[10px] font-black">
                        <CalendarClock className="size-3" />
                        <span>مؤجلة</span>
                      </span>
                    )}

                    {outcomeMeta && (
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black ${outcomeMeta.cls}`}>
                        {outcomeMeta.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams + Score Grid */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                  <TeamCell team={m.homeTeam} align="start" />

                  {/* Center Score / VS Pill */}
                  <div className="flex flex-col items-center justify-center min-w-[76px] sm:min-w-[100px] text-center">
                    {(isFinished || isLive) && m.homeScore != null && m.awayScore != null ? (
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-1.5 shadow-2xs">
                        <span className="text-base sm:text-lg font-black tabular-nums text-[#111313] dark:text-[#D0FF38]">
                          {m.homeScore}
                        </span>
                        <span className="text-xs font-black text-[#65706A] dark:text-[#B2B9B3]">-</span>
                        <span className="text-base sm:text-lg font-black tabular-nums text-[#111313] dark:text-[#D0FF38]">
                          {m.awayScore}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-1 text-xs sm:text-sm font-black text-[#65706A] dark:text-[#B2B9B3]">
                        VS
                      </span>
                    )}

                    {isFinished && m.homePen != null && m.awayPen != null && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                        <span>ترجيح:</span>
                        <span>{m.homePen}</span>
                        <span>-</span>
                        <span>{m.awayPen}</span>
                      </span>
                    )}
                  </div>

                  <TeamCell
                    team={m.awayTeam}
                    fallbackLabel={m.source === 'friendly_challenge' && m.statusRaw === 'open' ? 'بانتظار منافس' : 'فريق غير محدد'}
                    align="end"
                  />
                </div>

                {/* Footer Row: Date, Stadium, Details / Live CTA */}
                {(dayText || timeText || m.stadiumName || canOpenModal || m.publicToken || m.inviteToken) && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                      {(dayText || timeText) && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 shrink-0 text-[#179955] dark:text-[#D0FF38]" />
                          <span>{dayText}</span>
                          {timeText && (
                            <span className="inline-flex items-center gap-0.5 tabular-nums ms-1">
                              <Clock className="size-3 shrink-0" />
                              <span dir="ltr">{timeText}</span>
                            </span>
                          )}
                        </span>
                      )}

                      {m.stadiumName && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-xs">
                            {m.stadiumName}
                            {m.stadiumCity ? ` (${m.stadiumCity})` : ''}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isLive && m.publicToken && (
                        <Link
                          to={`/live/${encodeURIComponent(m.publicToken)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-500 hover:bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white transition-colors"
                        >
                          <Radio className="size-3" />
                          <span>متابعة المباشر</span>
                        </Link>
                      )}

                      {m.inviteToken && m.statusRaw === 'open' && (
                        <Link
                          to={`/matches/invite/${encodeURIComponent(m.inviteToken)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-1 text-[10px] font-black text-[#111313] hover:brightness-95 transition-all"
                        >
                          <ExternalLink className="size-3" />
                          <span>عرض التحدي</span>
                        </Link>
                      )}

                      {canOpenModal && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#179955] dark:text-[#D0FF38]">
                          <CheckCircle2 className="size-3" />
                          <span>تفاصيل المباراة</span>
                          <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
