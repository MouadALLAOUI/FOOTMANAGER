import { useTranslation } from 'react-i18next'
import { MapPin, Users } from 'lucide-react'
import { TeamAvatar } from '../shared'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'

function statRows(standings) {
  const map = new Map()
  for (const group of standings?.groups || []) {
    for (const row of group.rows || []) {
      if (row.team_id) map.set(row.team_id, row)
    }
  }
  return map
}

export default function TeamsSection({ teams, standings }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const rows = statRows(standings)
  const list = (teams || []).filter((p) => p.status === 'registered' && p.team)

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Users className="size-6" /></span>
        <p className="text-sm font-bold text-slate-600">{t('public.tournamentPage.noTeams')}</p>
      </div>
    )
  }

return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-green-50 text-green-600">
          <Users className="size-4" />
        </span>
        <h3 className="text-sm font-black text-slate-900">{t('public.tournamentPage.registeredTeams', { count: list.length })}</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((p) => {
          const team = p.team
          const row = rows.get(team.id)
          return (
            <div
              key={p.id}
              onClick={() => openTeam(team)}
              className="group w-full cursor-pointer rounded-3xl border border-slate-200/70 bg-white p-5 text-start transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-[0_16px_36px_-16px_rgba(16,185,129,0.4)]"
            >
              <div className="flex items-center gap-3">
                <TeamAvatar team={team} className="size-12" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-extrabold text-slate-900">{team.name}</h4>
                  {team.city && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <MapPin className="size-3" />
                      {team.city}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {p.group?.name && (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700 ring-1 ring-green-100">
                    {p.group.name}
                  </span>
                )}
                {p.group_position != null && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    #{p.group_position}
                  </span>
                )}
              </div>
              {row && (
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center">
                  <div>
                    <p className="text-sm font-black text-slate-900">{row.played}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{t('public.tournamentPage.played')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{row.goals_for}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{t('public.tournamentPage.goals')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-600">{row.points}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{t('public.tournamentPage.points')}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
