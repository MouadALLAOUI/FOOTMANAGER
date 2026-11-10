import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, Shield, Target, Users, Trophy, Sparkles, Lock } from 'lucide-react'
import { usePublicTeamProfile } from '../../api/queries'
import { Modal, Skeleton, Badge, Button } from '../dashboard/ui'
import TeamLogo from './TeamLogo'

function Stat({ label, value, accent = 'text-[#111313] dark:text-[#F5F7F2]' }) {
  return (
    <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-center">
      <p className={`text-base font-black tabular-nums ${accent}`}>{value ?? '—'}</p>
      <p className="mt-0.5 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">{label}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3]" />
      <span className="shrink-0 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">{label}:</span>
      <span className="min-w-0 truncate font-extrabold text-[#111313] dark:text-[#F5F7F2]">{value}</span>
    </div>
  )
}

export default function TeamProfileModal({ team, onClose }) {
  const { t } = useTranslation()
  const teamId = team?.id
  const { data, isLoading, error } = usePublicTeamProfile(teamId, { enabled: !!teamId })
  const info = data?.team

  // Merge initial clicked team prop with full backend response so committee fields
  // (e.g. manager_name, players_count, is_free) remain available even if visibility is private.
  const display = { ...(team || {}), ...(info || {}) }
  const isNotFound = error?.response?.status === 404
  const isPrivate = (info && info.visibility && info.visibility !== 'public') || isNotFound

  const managerName = info?.manager?.name || display.manager_name || null
  const managerAvatar = info?.manager?.avatar_url || null
  const managerCity = info?.manager?.city || null
  const playersCount = info?.players_count ?? team?.players_count ?? info?.member_count ?? null

  const weeklyBookings = info?.weekly_bookings || display?.weekly_bookings || []
  const recurringBookings = weeklyBookings.filter((b) => b.is_weekly)
  const otherBookings = weeklyBookings.filter((b) => !b.is_weekly)

  const hasPublicStats =
    info &&
    !isPrivate &&
    (info.points != null ||
      info.matches_played != null ||
      info.wins != null ||
      info.draws != null ||
      info.losses != null ||
      info.goals_for != null)

  return (
    <Modal
      open={Boolean(team)}
      onClose={onClose}
      title={display.name || t('profile.public.teamTitle')}
      subtitle={display.city || (display.is_free ? 'فريق مشارك بالبطولة' : undefined)}
      footer={
        <Button variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto">
          {t('common.close') || 'إغلاق'}
        </Button>
      }
    >
      {!team && !info ? (
        <p className="py-10 text-center text-sm font-semibold text-[#65706A] dark:text-[#B2B9B3]">
          {t('profile.public.loadFailed')}
        </p>
      ) : (
        <div className="space-y-4" dir="rtl">
          {/* Identity header — rendered immediately from team data */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
            <TeamLogo
              team={display}
              className="size-16 shrink-0"
              rounded="rounded-2xl"
              ring="ring-1 ring-[#E1E5DF] dark:ring-[#303832]"
              fontSize="text-xl"
            />
            <div className="min-w-0 flex-1">
              <h4 className="break-words text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
                {display.name || '—'}
              </h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {display.is_free && <Badge variant="info">فريق البطولة</Badge>}
                {display.category && <Badge variant="success">{display.category}</Badge>}
                {display.level && (
                  <Badge variant="info">
                    {t(`matchesPage.teams.levels.${display.level}`, { defaultValue: display.level })}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Manager Info (shown whenever real manager data exists from backend profile or committee team) */}
          {managerName && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5">
              {managerAvatar ? (
                <img src={managerAvatar} alt="" className="size-11 shrink-0 rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-sm font-black text-[#111313] dark:text-[#D0FF38]">
                  {managerName.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  <Trophy className="size-3.5 text-[#179955] dark:text-[#D0FF38]" />
                  <span>{t('profile.public.manager') || 'مسير الفريق'}</span>
                </p>
                <p className="truncate text-sm font-black text-[#111313] dark:text-[#F5F7F2]">{managerName}</p>
                {managerCity && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                    <MapPin className="size-3" />
                    <span>{managerCity}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Details Card (City, Players Count, Founded Year, Association, Description) */}
          {(playersCount != null || display.city || display.founded_year || display.association_name || display.description) && (
            <div className="space-y-2.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4">
              {playersCount != null && (
                <InfoRow icon={Users} label={t('profile.public.playersCount') || 'عدد اللاعبين'} value={playersCount} />
              )}
              {display.city && <InfoRow icon={MapPin} label={t('profile.public.city') || 'المدينة'} value={display.city} />}
              {display.founded_year && (
                <InfoRow icon={CalendarDays} label={t('profile.public.founded') || 'سنة التأسيس'} value={display.founded_year} />
              )}
              {display.association_name && (
                <InfoRow icon={Shield} label={t('profile.public.association') || 'الجمعية'} value={display.association_name} />
              )}
              {display.description && (
                <div className="flex items-start gap-2.5 text-sm pt-1">
                  <Target className="mt-0.5 size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3]" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                      {t('profile.public.description') || 'نبذة'}:{' '}
                    </span>
                    <span className="text-xs sm:text-sm leading-relaxed text-[#111313] dark:text-[#F5F7F2]">
                      {display.description}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading extra profile details */}
          {isLoading && !info && (
            <div className="space-y-2.5">
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          )}

          {/* Public Team Stats Grid */}
          {hasPublicStats && (
            <div className="grid grid-cols-3 gap-2">
              <Stat
                label={t('profile.public.points') || 'النقاط'}
                value={info.points}
                accent="text-[#179955] dark:text-[#D0FF38]"
              />
              <Stat label={t('profile.public.played') || 'لعب'} value={info.matches_played} />
              <Stat label={t('profile.public.wins') || 'فوز'} value={info.wins} />
              <Stat label={t('profile.public.draws') || 'تعادل'} value={info.draws} />
              <Stat label={t('profile.public.losses') || 'خسارة'} value={info.losses} />
              <Stat label={t('profile.public.goals') || 'الأهداف'} value={info.goals_for} />
            </div>
          )}

          {/* Private Team Notice (without hiding basic identity/manager/players_count above) */}
          {!isLoading && isPrivate && !hasPublicStats && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3]" />
              <div>
                <p className="text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
                  {t('profile.public.teamPrivate') || 'الملف الكامل للفريق خاص'}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#65706A] dark:text-[#B2B9B3]">
                  {t('profile.public.teamPrivateDesc') || 'تم عرض المعلومات الأساسية المتوفرة لهذا الفريق.'}
                </p>
              </div>
            </div>
          )}

          {/* Weekly Bookings Section (compact when empty, detailed when booked) */}
          {!isLoading && (weeklyBookings.length > 0 || !isNotFound) && (
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/70 dark:bg-[#252B27]/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#111313] dark:text-[#D0FF38]">
                    <CalendarDays className="size-4" />
                  </span>
                  <h5 className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                    الحجوزات والمواعيد الأسبوعية
                  </h5>
                </div>
                {weeklyBookings.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 px-2 py-0.5 text-[10px] font-black text-[#111313] dark:text-[#D0FF38]">
                    <Sparkles className="size-2.5" />
                    <span>{weeklyBookings.length} موعد</span>
                  </span>
                )}
              </div>

              {weeklyBookings.length === 0 ? (
                <p className="text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                  لا توجد حجوزات أسبوعية دائمة مسجلة لهذا الفريق حالياً.
                </p>
              ) : (
                <div className="space-y-2">
                  {recurringBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#179955] text-white font-black text-xs">
                          {b.day_name ? b.day_name.slice(0, 3) : 'يوم'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[#111313] dark:text-[#F5F7F2]">
                            كل يوم {b.day_name || 'أسبوعي'}
                          </p>
                          {b.terrain && (
                            <p className="flex items-center gap-1 text-[11px] text-[#65706A] dark:text-[#B2B9B3] font-medium truncate mt-0.5">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{b.terrain.name}</span>
                              {b.terrain.city && <span>({b.terrain.city})</span>}
                            </p>
                          )}
                        </div>
                      </div>

                      {b.start_time && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs font-black text-[#111313] dark:text-[#F5F7F2] border border-[#E1E5DF] dark:border-[#303832] self-start sm:self-auto shrink-0">
                          <Clock className="size-3 text-[#179955] dark:text-[#D0FF38]" />
                          <span className="tabular-nums" dir="ltr">{b.start_time} - {b.end_time}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {otherBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] font-black text-xs">
                          {b.day_name ? b.day_name.slice(0, 3) : 'موعد'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[#111313] dark:text-[#F5F7F2]">
                            {b.day_name || ''} {b.booking_date || ''}
                          </p>
                          {b.terrain && (
                            <p className="flex items-center gap-1 text-[11px] text-[#65706A] dark:text-[#B2B9B3] font-medium truncate mt-0.5">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{b.terrain.name}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {b.start_time && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs font-black text-[#111313] dark:text-[#F5F7F2] border border-[#E1E5DF] dark:border-[#303832] self-start sm:self-auto shrink-0">
                          <Clock className="size-3 text-[#65706A] dark:text-[#B2B9B3]" />
                          <span className="tabular-nums" dir="ltr">{b.start_time} - {b.end_time}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
