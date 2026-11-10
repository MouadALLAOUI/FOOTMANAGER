import { Link } from 'react-router-dom'
import {
  Award,
  Calendar,
  ChevronLeft,
  Crown,
  MapPin,
  Medal,
  Trophy,
} from 'lucide-react'
import { formatGroupName } from '../../../lib/groupNames'

const TOURNAMENT_STATUS_META = {
  ongoing: {
    label: 'جارية الآن',
    cls: 'bg-[#179955]/12 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/30 dark:border-[#42D889]/35',
  },
  in_progress: {
    label: 'جارية الآن',
    cls: 'bg-[#179955]/12 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/30 dark:border-[#42D889]/35',
  },
  active: {
    label: 'جارية الآن',
    cls: 'bg-[#179955]/12 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/30 dark:border-[#42D889]/35',
  },
  open_for_registration: {
    label: 'التسجيل مفتوح',
    cls: 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] border-[#B8F000]/50 dark:border-[#D0FF38]/35',
  },
  registration_closed: {
    label: 'مغلقة للتسجيل',
    cls: 'bg-sky-500/12 dark:bg-sky-400/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  draw_completed: {
    label: 'تمت القرعة',
    cls: 'bg-sky-500/12 dark:bg-sky-400/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  completed: {
    label: 'مكتملة',
    cls: 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] border-[#E1E5DF] dark:border-[#303832]',
  },
  finished: {
    label: 'مكتملة',
    cls: 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] border-[#E1E5DF] dark:border-[#303832]',
  },
  cancelled: {
    label: 'ملغاة',
    cls: 'bg-[#D93636]/12 dark:bg-[#FF6868]/15 text-[#D93636] dark:text-[#FF6868] border-[#D93636]/30',
  },
}

const FORMAT_LABELS = {
  groups_knockout: 'مجموعات + إقصاء مباشر',
  league: 'دوري كامل',
  knockout_only: 'إقصاء مباشر',
  knockout: 'إقصاء مباشر',
}

const PARTICIPANT_STATUS_META = {
  registered: {
    label: 'مسجل',
    cls: 'bg-[#179955]/10 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/25',
  },
  withdrawn: {
    label: 'منسحب',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  disqualified: {
    label: 'مُقصى',
    cls: 'bg-[#D93636]/15 text-[#D93636] dark:text-[#FF6868] border-[#D93636]/30',
  },
}

export default function TeamTournamentHistory({ tournaments = [] }) {
  const list = Array.isArray(tournaments) ? tournaments : []

  return (
    <section className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <Trophy className="size-4" />
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            سجل المشاركات في البطولات
          </h2>
          {list.length > 0 && (
            <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] border border-[#E1E5DF] dark:border-[#303832] px-2.5 py-0.5 text-[11px] font-black text-[#111313] dark:text-[#D0FF38] tabular-nums">
              {list.length} بطولة
            </span>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] py-10 px-4 text-center">
          <Trophy className="size-7 text-[#65706A] dark:text-[#B2B9B3] mb-2" />
          <p className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            لم يشارك الفريق في أي بطولة عامة بعد
          </p>
          <p className="mt-1 text-xs text-[#65706A] dark:text-[#B2B9B3] max-w-sm">
            ستظهر هنا جميع البطولات التي سجل بها الفريق مع الترتيب والمجموعة والمراحل الإقصائية.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => {
            const statusMeta = TOURNAMENT_STATUS_META[t.status] || {
              label: t.status || 'بطولة',
              cls: 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] border-[#E1E5DF] dark:border-[#303832]',
            }
            const partMeta = PARTICIPANT_STATUS_META[t.participantStatus] || PARTICIPANT_STATUS_META.registered
            const formatLabel = FORMAT_LABELS[t.format] || t.format
            const groupLabel = t.group ? formatGroupName(t.group.name, { groupId: t.group.id }) : null
            const standing = t.standing
            const gd = standing?.goalDifference ?? 0

            return (
              <Link
                key={t.id}
                to={`/tournaments/${encodeURIComponent(t.slug)}`}
                className={`group block rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-4 transition-all hover:border-[#B8F000] dark:hover:border-[#D0FF38] hover:bg-white dark:hover:bg-[#1B201D] ${
                  t.groupColor ? 'border-s-4' : ''
                }`}
                style={t.groupColor ? { borderInlineStartColor: t.groupColor.hex } : undefined}
              >
                {/* Tournament Title + Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {t.logoUrl ? (
                      <img
                        src={t.logoUrl}
                        alt={t.name}
                        className="size-12 shrink-0 rounded-xl object-cover border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]"
                        loading="lazy"
                      />
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#179955]/15 to-[#B8F000]/25 dark:from-[#42D889]/20 dark:to-[#D0FF38]/20 text-[#179955] dark:text-[#D0FF38] border border-[#E1E5DF] dark:border-[#303832]">
                        <Trophy className="size-6" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2] group-hover:text-[#179955] dark:group-hover:text-[#D0FF38] transition-colors truncate" dir="auto">
                          {t.name}
                        </h3>

                        {t.isChampion && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                            <Crown className="size-3" />
                            <span>البطل</span>
                          </span>
                        )}

                        {t.isRunnerUp && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 border border-slate-400/30 px-2.5 py-0.5 text-[10px] font-black text-[#111313] dark:text-[#F5F7F2]">
                            <Medal className="size-3 text-slate-400" />
                            <span>الوصيف</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                        {formatLabel && <span>{formatLabel}</span>}
                        {t.startDate && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Calendar className="size-3" />
                            <span>
                              {t.startDate}
                              {t.endDate ? ` — ${t.endDate}` : ''}
                            </span>
                          </span>
                        )}
                        {t.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            <span>{t.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status + Group + CTA */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${statusMeta.cls}`}>
                      {statusMeta.label}
                    </span>

                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${partMeta.cls}`}>
                      {partMeta.label}
                    </span>

                    {groupLabel && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                          t.groupColor
                            ? t.groupColor.badgeCls
                            : 'bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#111313] dark:text-[#F5F7F2]'
                        }`}
                      >
                        {t.groupColor && (
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: t.groupColor.hex }} />
                        )}
                        <span>{groupLabel}</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-[#179955] dark:text-[#D0FF38] ms-1">
                      <span>عرض البطولة</span>
                      <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                    </span>
                  </div>
                </div>

                {/* Mini Standings & Knockout Summary */}
                {(standing || t.highestKnockout?.roundName) && (
                  <div className="mt-3 pt-3 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {standing ? (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                        {standing.rank != null && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-1 text-[11px] font-black text-[#111313] tabular-nums">
                            المركز #{standing.rank}
                          </span>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                          <span>
                            لعب: <strong className="text-[#111313] dark:text-[#F5F7F2]">{standing.played}</strong>
                          </span>
                          <span>
                            ف: <strong className="text-[#179955] dark:text-[#42D889]">{standing.wins}</strong>
                          </span>
                          <span>
                            ت: <strong className="text-[#D9822B] dark:text-[#FFC857]">{standing.draws}</strong>
                          </span>
                          <span>
                            خ: <strong className="text-[#D93636] dark:text-[#FF6868]">{standing.losses}</strong>
                          </span>
                          <span>
                            له: <strong className="text-[#111313] dark:text-[#F5F7F2]">{standing.goalsFor}</strong>
                          </span>
                          <span>
                            عليه: <strong className="text-[#111313] dark:text-[#F5F7F2]">{standing.goalsAgainst}</strong>
                          </span>
                          <span>
                            +/-:{' '}
                            <strong
                              dir="ltr"
                              className={
                                gd > 0
                                  ? 'text-[#179955] dark:text-[#42D889]'
                                  : gd < 0
                                    ? 'text-[#D93636] dark:text-[#FF6868]'
                                    : 'text-[#111313] dark:text-[#F5F7F2]'
                              }
                            >
                              {gd > 0 ? `+${gd}` : gd}
                            </strong>
                          </span>
                          <span>
                            النقاط: <strong className="text-[#179955] dark:text-[#D0FF38]">{standing.points}</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    {t.highestKnockout?.roundName && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-2.5 py-1 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] shrink-0">
                        <Award className="size-3.5 text-amber-500" />
                        <span>الإقصاء المباشر: {t.highestKnockout.roundName}</span>
                      </span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
