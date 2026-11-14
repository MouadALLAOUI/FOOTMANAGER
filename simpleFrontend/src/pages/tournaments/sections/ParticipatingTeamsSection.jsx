import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shield, Users } from 'lucide-react'
import { Skeleton } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'
import { getGroupColor } from '../../../lib/groupColors'
import { formatGroupName } from '../../../lib/groupNames'

export default function ParticipatingTeamsSection({ teams, standings, loading = false }) {
  const { t } = useTranslation()

  const list = useMemo(() => {
    const raw = (teams || []).filter((p) => (p.status === 'registered' || !p.status) && p.team)
    const seen = new Set()
    const result = []
    for (const item of raw) {
      const tid = item.team?.id ?? item.team_id ?? item.id
      if (tid != null && seen.has(tid)) continue
      if (tid != null) seen.add(tid)
      result.push(item)
    }

    return result.sort((a, b) => {
      const gNameA = a.group?.name || ''
      const gNameB = b.group?.name || ''
      if (gNameA && gNameB && gNameA !== gNameB) {
        return gNameA.localeCompare(gNameB, 'ar', { numeric: true })
      }
      if (gNameA && !gNameB) return -1
      if (!gNameA && gNameB) return 1
      return (a.team?.name || '').localeCompare(b.team?.name || '', 'ar')
    })
  }, [teams])

  const orderedGroups = useMemo(() => {
    const map = new Map()
    if (Array.isArray(standings?.groups)) {
      for (const g of standings.groups) {
        const id = g.group_id ?? g.id
        const name = g.name
        if (id != null || name) {
          const key = id ?? name
          if (!map.has(key)) map.set(key, { id, name })
        }
      }
    }
    for (const p of list) {
      if (p.group?.id != null || p.group?.name) {
        const key = p.group.id ?? p.group.name
        if (!map.has(key)) map.set(key, { id: p.group.id, name: p.group.name })
      }
    }
    return [...map.values()]
  }, [standings, list])

  const hasAnyGroup = list.some((p) => p.group?.id != null || p.group?.name)

  if (loading || teams == null) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 sm:size-10 rounded-xl sm:rounded-2xl" />
            <Skeleton className="h-6 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-between rounded-2xl sm:rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 sm:p-5 text-center shadow-2xs min-h-[170px]"
            >
              <Skeleton className="size-16 sm:size-20 rounded-2xl" />
              <Skeleton className="mt-3 h-4 w-24 rounded-md" />
              <Skeleton className="mt-2 h-5 w-18 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div
        dir="rtl"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center shadow-2xs"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
          <Users className="size-6" />
        </span>
        <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">
          {t('public.tournamentPage.noTeams', 'لا توجد فرق مشاركة مسجلة حتى الآن')}
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4" dir="rtl" aria-label="الفرق المشاركة">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 sm:size-10 place-items-center rounded-xl sm:rounded-2xl bg-[#10291B] dark:bg-[#10291B] text-[#D0FF38] shadow-xs shrink-0">
            <Users className="size-5 stroke-[2.2]" />
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            الفرق المشاركة
          </h2>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300">
          <span>{list.length} فريقاً</span>
          <Shield className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
      </div>

      {/* Grid of Participating Teams */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {list.map((item) => {
          const team = item.team
          if (!team) return null

          const group = item.group
          const hasAssignedGroup = Boolean(group && (group.id != null || group.name))
          const gColor = hasAssignedGroup ? getGroupColor(group, orderedGroups) : null
          const groupName = gColor?.label || formatGroupName(group?.name, { groupId: group?.id })

          return (
            <Link
              key={item.id ?? team.id}
              to={team.id ? `/teams/${team.id}` : '#'}
              aria-label={`عرض ملف فريق ${team.name}`}
              className="group relative flex flex-col items-center justify-between rounded-2xl sm:rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 sm:p-5 text-center shadow-2xs hover:shadow-md hover:border-[#179955]/40 dark:hover:border-[#D0FF38]/40 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] cursor-pointer min-h-[160px] sm:min-h-[180px]"
            >
              {/* Prominent Centered Logo */}
              <div className="flex size-18 sm:size-24 items-center justify-center p-1 shrink-0">
                <TeamLogo
                  team={team}
                  className="size-16 sm:size-20 object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
                  rounded="rounded-2xl"
                  fontSize="text-lg sm:text-xl font-black"
                />
              </div>

              {/* Team Name */}
              <span className="mt-2.5 sm:mt-3 line-clamp-1 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover:text-[#179955] dark:group-hover:text-[#D0FF38] transition-colors w-full px-1">
                {team.name}
              </span>

              {/* Group Badge (Only when tournament uses groups) */}
              {hasAnyGroup && (
                gColor && groupName ? (
                  <span
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold border transition-colors ${gColor.badgeCls}`}
                  >
                    <Shield className="size-3 sm:size-3.5 shrink-0" />
                    <span className="truncate max-w-[120px]">{groupName}</span>
                  </span>
                ) : (
                  <div className="mt-2 h-6" />
                )
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
