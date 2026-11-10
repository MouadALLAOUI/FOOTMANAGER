import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Skeleton } from '../../../components/dashboard/ui'
import { DrawGroups, TeamAvatar } from '../shared'

export default function TeamsSection({ teams, loading = false }) {
  const { t } = useTranslation()

  if (loading || teams == null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-7 w-44 rounded-xl" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    )
  }

  const list = (teams || []).filter((p) => p.status === 'registered' && p.team)
  const hasAssignedGroups = list.some((p) => p.group?.id != null || p.group?.name)

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
          <Users className="size-6" />
        </span>
        <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">{t('public.tournamentPage.noTeams')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
            <Users className="size-4" />
          </span>
          <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
            {hasAssignedGroups ? 'المجموعات والفرق المشاركة' : t('public.tournamentPage.registeredTeams', { count: list.length })}
          </h3>
        </div>
        <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-1 text-xs font-black text-[#111313] dark:text-[#D0FF38] border border-[#E1E5DF] dark:border-[#303832]">
          {list.length} فريقاً
        </span>
      </div>

      {/* Expandable Group Cards (Matches Master Reference Screen 3) */}
      {hasAssignedGroups ? (
        <DrawGroups teams={list} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] divide-y divide-[#E1E5DF]/70 dark:divide-[#303832]/70 px-3 py-1.5 shadow-2xs">
          {list.map((p) => {
            const team = p.team
            if (team?.id != null) {
              return (
                <Link
                  key={p.id}
                  to={`/teams/${team.id}`}
                  className="group flex w-full items-center justify-between gap-3 py-2.5 px-1.5 rounded-xl text-start transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamAvatar team={team} className="size-8 shrink-0" />
                    <span className="min-w-0 truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover:text-[#179955] dark:group-hover:text-[#D0FF38] transition-colors">
                      {team.name}
                    </span>
                  </div>
                  {team.city && (
                    <span className="shrink-0 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                      {team.city}
                    </span>
                  )}
                </Link>
              )
            }
            return (
              <div
                key={p.id}
                className="flex w-full items-center justify-between gap-3 py-2.5 px-1.5 rounded-xl text-start"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TeamAvatar team={team} className="size-8 shrink-0" />
                  <span className="min-w-0 truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                    {team.name}
                  </span>
                </div>
                {team.city && (
                  <span className="shrink-0 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                    {team.city}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
