import { Link } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Crown,
  Landmark,
  Lock,
  MapPin,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'

const CATEGORY_LABELS = {
  children: 'فئة الصغار',
  teenager: 'فئة الفتيان',
  youth: 'فئة الشباب',
  adult: 'فئة الكبار',
  veteran: 'فئة القدماء',
  mixed: 'فئة مختلطة',
}

const LEVEL_LABELS = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  good: 'جيد',
  veryGood: 'جيد جداً',
  very_good: 'جيد جداً',
  excellent: 'ممتاز',
}

export function formatCategoryArabic(category) {
  if (!category) return null
  const key = String(category).trim()
  return CATEGORY_LABELS[key] || CATEGORY_LABELS[key.toLowerCase()] || key
}

export function formatLevelArabic(level) {
  if (!level) return null
  const key = String(level).trim()
  return LEVEL_LABELS[key] || LEVEL_LABELS[key.toLowerCase()] || key
}

const FORM_BADGE_MAP = {
  W: { label: 'فوز', short: 'ف', cls: 'bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889] border-[#179955]/30 dark:border-[#42D889]/35' },
  D: { label: 'تعادل', short: 'ت', cls: 'bg-[#D9822B]/15 text-[#D9822B] dark:bg-[#FFC857]/20 dark:text-[#FFC857] border-[#D9822B]/30 dark:border-[#FFC857]/35' },
  L: { label: 'خسارة', short: 'خ', cls: 'bg-[#D93636]/15 text-[#D93636] dark:bg-[#FF6868]/20 dark:text-[#FF6868] border-[#D93636]/30 dark:border-[#FF6868]/35' },
}

export default function TeamHeader({ team, form = [], isPrivate = false, onShareClick }) {
  const { openManager } = useProfileModal()
  if (!team) return null

  const categoryLabel = formatCategoryArabic(team.category)
  const levelLabel = formatLevelArabic(team.level)
  const locationParts = [team.city, team.region].filter(Boolean)
  const uniqueLocation = [...new Set(locationParts)].join(' • ')

  const captainName = typeof team.captain === 'object' ? team.captain?.name : team.captain
  const captainId = typeof team.captain === 'object' ? team.captain?.id : null
  const captainNumber = typeof team.captain === 'object' ? team.captain?.number : null

  const hasPhoto = Boolean(team.cover_image_url)

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs">
      {hasPhoto ? (
        /* Top Header with Collective Photo Banner */
        <div className="relative w-full overflow-hidden bg-gradient-to-l from-[#10291B] via-[#173A26] to-[#111313] p-3 sm:p-5">
          {/* Top Corner Badges & Share Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/50 backdrop-blur-xs px-2.5 py-1 text-[11px] font-black text-white">
                  <Lock className="size-3 text-amber-300" />
                  <span>ملف خاص</span>
                </span>
              )}
              {team.primary_stadium?.name && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white max-w-[200px] sm:max-w-xs truncate">
                  <MapPin className="size-3 shrink-0 text-[#D0FF38]" />
                  <span className="truncate">{team.primary_stadium.name}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onShareClick}
              aria-label="مشاركة بطاقة الفريق"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] hover:brightness-105 px-3.5 py-2 text-xs font-black text-[#111313] shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              <Share2 className="size-3.5" />
              <span>مشاركة البطاقة</span>
            </button>
          </div>

          {/* Wide Collective Team Photograph (16:9 Aspect Ratio) */}
          <div className="mt-3 relative w-full aspect-[16/9] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 shadow-lg bg-slate-950">
            <img
              src={team.cover_image_url}
              alt={`الصورة الجماعية لفريق ${team.name}`}
              className="size-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      ) : (
        /* Subtle Top Stadium Cover Banner (when team has no collective photo) */
        <div className="relative h-24 sm:h-32 w-full overflow-hidden bg-gradient-to-l from-[#10291B] via-[#173A26] to-[#111313]">
          <div className="pointer-events-none absolute -top-12 -end-12 size-44 rounded-full bg-[#B8F000]/20 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#B8F000]/50 to-transparent" />

          {/* Top Corner Badges */}
          <div className="absolute inset-x-3 top-3 sm:inset-x-5 sm:top-4 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/50 backdrop-blur-xs px-2.5 py-1 text-[11px] font-black text-white">
                  <Lock className="size-3 text-amber-300" />
                  <span>ملف خاص</span>
                </span>
              )}
              {team.primary_stadium?.name && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white max-w-[200px] sm:max-w-xs truncate">
                  <MapPin className="size-3 shrink-0 text-[#D0FF38]" />
                  <span className="truncate">{team.primary_stadium.name}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onShareClick}
              aria-label="مشاركة بطاقة الفريق"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] hover:brightness-105 px-3.5 py-2 text-xs font-black text-[#111313] shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              <Share2 className="size-3.5" />
              <span>مشاركة البطاقة</span>
            </button>
          </div>
        </div>
      )}

      {/* Team Identity Body */}
      <div className="px-4 sm:px-7 pb-5 sm:pb-7">
        {hasPhoto ? (
          /* Approved Centered Structure (Overlapping 16:9 Collective Photo) */
          <div className="relative -mt-12 sm:-mt-14 flex flex-col items-center text-center">
            {/* Team Emblem Frame Overlapping Photo */}
            <div className="relative shrink-0 rounded-3xl bg-white dark:bg-[#1B201D] p-1.5 shadow-lg ring-1 ring-[#E1E5DF] dark:ring-[#303832]">
              <TeamLogo
                team={team}
                className="size-24 sm:size-28"
                rounded="rounded-2xl"
                fontSize="text-2xl sm:text-3xl"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {categoryLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#179955]/30 bg-[#179955]/10 dark:bg-[#42D889]/15 px-3 py-1 text-xs font-black text-[#179955] dark:text-[#42D889]">
                  <Shield className="size-3.5" />
                  <span>{categoryLabel}</span>
                </span>
              )}
              {levelLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2]">
                  <Sparkles className="size-3 text-[#179955] dark:text-[#D0FF38]" />
                  <span>المستوى: {levelLabel}</span>
                </span>
              )}
              {team.founded_year && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  <CalendarDays className="size-3" />
                  <span>تأسس {team.founded_year}</span>
                </span>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-center gap-2 min-w-0">
              <CheckCircle2
                className="size-6 shrink-0 text-[#179955] dark:text-[#D0FF38]"
                title="فريق مسجل في أجي نقصرو"
              />
              <h1 className="text-2xl sm:text-3xl font-black text-[#111313] dark:text-[#F5F7F2] tracking-tight break-words" dir="auto">
                {team.name}
              </h1>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
              {team.players_count != null && (
                <span className="inline-flex items-center gap-1">
                  <span>{team.players_count} لاعب في القائمة</span>
                  <Users className="size-3.5 shrink-0" />
                </span>
              )}
              {uniqueLocation && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-[#179955] dark:text-[#D0FF38] shrink-0" />
                  <span>{uniqueLocation}</span>
                </span>
              )}
              {team.association_name && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3.5 shrink-0" />
                  <span>{team.association_name}</span>
                </span>
              )}
            </div>

            {/* Recent Form Pills (Last 5 Finished Matches) */}
            {form.length > 0 && (
              <div className="mt-3.5 flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  الفورمة الأخيرة
                </span>
                <div className="flex items-center gap-1.5">
                  {form.slice(-5).map((res, idx) => {
                    const meta = FORM_BADGE_MAP[res] || FORM_BADGE_MAP.D
                    return (
                      <span
                        key={idx}
                        title={meta.label}
                        className={`grid size-7 place-items-center rounded-xl border text-xs font-black ${meta.cls}`}
                      >
                        {meta.short}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Original Layout for Teams without Photo */
          <div className="relative -mt-12 sm:-mt-14 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-start min-w-0">
              {/* Team Emblem Frame */}
              <div className="relative shrink-0 rounded-3xl bg-white dark:bg-[#1B201D] p-1.5 shadow-lg ring-1 ring-[#E1E5DF] dark:ring-[#303832]">
                <TeamLogo
                  team={team}
                  className="size-24 sm:size-28"
                  rounded="rounded-2xl"
                  fontSize="text-2xl sm:text-3xl"
                />
              </div>

              <div className="min-w-0 pt-1 pb-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-2">
                  {categoryLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#179955]/30 bg-[#179955]/10 dark:bg-[#42D889]/15 px-2.5 py-0.5 text-[11px] font-black text-[#179955] dark:text-[#42D889]">
                      <Shield className="size-3" />
                      <span>{categoryLabel}</span>
                    </span>
                  )}
                  {levelLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2]">
                      <Sparkles className="size-3 text-[#179955] dark:text-[#D0FF38]" />
                      <span>المستوى: {levelLabel}</span>
                    </span>
                  )}
                  {team.founded_year && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                      <CalendarDays className="size-3" />
                      <span>تأسس {team.founded_year}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#111313] dark:text-[#F5F7F2] tracking-tight break-words" dir="auto">
                    {team.name}
                  </h1>
                  <CheckCircle2
                    className="size-5 shrink-0 text-[#179955] dark:text-[#D0FF38]"
                    title="فريق مسجل في أجي نقصرو"
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  {uniqueLocation && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 text-[#179955] dark:text-[#D0FF38] shrink-0" />
                      <span>{uniqueLocation}</span>
                    </span>
                  )}
                  {team.association_name && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3.5 shrink-0" />
                      <span>{team.association_name}</span>
                    </span>
                  )}
                  {team.players_count != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5 shrink-0" />
                      <span>{team.players_count} لاعب في القائمة</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Form Pills (Last 5 Finished Matches) */}
            {form.length > 0 && (
              <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0">
                <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  الفورمة الأخيرة
                </span>
                <div className="flex items-center gap-1.5">
                  {form.slice(-5).map((res, idx) => {
                    const meta = FORM_BADGE_MAP[res] || FORM_BADGE_MAP.D
                    return (
                      <span
                        key={idx}
                        title={meta.label}
                        className={`grid size-7 place-items-center rounded-xl border text-xs font-black ${meta.cls}`}
                      >
                        {meta.short}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Description if provided */}
        {team.description && (
          <div className="mt-4 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
            <p className="text-xs sm:text-sm leading-relaxed text-[#111313] dark:text-[#F5F7F2] whitespace-pre-line">
              {team.description}
            </p>
          </div>
        )}

        {/* Secondary Info Row: Team Manager, Captain, Primary Stadium */}
        {(team.manager?.name || captainName || team.primary_stadium?.name) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 pt-4">
            {/* Manager Card */}
            {team.manager?.name && (
              <div
                onClick={
                  team.manager.id != null
                    ? () => openManager(team.manager.id, { name: team.manager.name })
                    : undefined
                }
                role={team.manager.id != null ? 'button' : undefined}
                tabIndex={team.manager.id != null ? 0 : undefined}
                onKeyDown={
                  team.manager.id != null
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openManager(team.manager.id, { name: team.manager.name })
                        }
                      }
                    : undefined
                }
                className={`flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 ${
                  team.manager.id != null
                    ? 'cursor-pointer transition-colors hover:border-[#B8F000] dark:hover:border-[#D0FF38]'
                    : ''
                }`}
              >
                {team.manager.avatar_url ? (
                  <img
                    src={team.manager.avatar_url}
                    alt={team.manager.name}
                    className="size-10 shrink-0 rounded-full object-cover ring-1 ring-[#E1E5DF] dark:ring-[#303832]"
                  />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-sm font-black text-[#111313] dark:text-[#D0FF38]">
                    {team.manager.name.trim().slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1 text-start">
                  <p className="flex items-center gap-1 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                    <Trophy className="size-3 text-[#179955] dark:text-[#D0FF38]" />
                    <span>مدير / مسير الفريق</span>
                  </p>
                  <p className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]" dir="auto">
                    {team.manager.name}
                  </p>
                  {team.manager.city && (
                    <p className="truncate text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                      {team.manager.city}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Captain Card */}
            {captainName && (
              captainId ? (
                <Link
                  to={`/players/${captainId}`}
                  className="flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 transition-colors hover:border-[#B8F000] dark:hover:border-[#D0FF38]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Crown className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">عميد الفريق</p>
                    <p className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]" dir="auto">
                      {captainName}
                      {captainNumber != null ? ` (#${captainNumber})` : ''}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Crown className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">عميد الفريق</p>
                    <p className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]" dir="auto">
                      {captainName}
                      {captainNumber != null ? ` (#${captainNumber})` : ''}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Primary Stadium Card */}
            {team.primary_stadium?.name && (
              <div className="flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#179955]/15 dark:bg-[#42D889]/20 text-[#179955] dark:text-[#42D889]">
                  <Landmark className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">الملعب الأساسي</p>
                  <p className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]" dir="auto">
                    {team.primary_stadium.name}
                  </p>
                  {team.primary_stadium.city && (
                    <p className="truncate text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                      {team.primary_stadium.city}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
