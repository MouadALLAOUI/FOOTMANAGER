import { useTranslation } from 'react-i18next'
import { MapPin, Users } from 'lucide-react'
import { TeamAvatar } from '../shared'

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((p) => {
        const team = p.team
        const row = rows.get(team.id)
        return (
          <div key={p.id} className="group rounded-3xl border border-slate-200/70 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
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
              {p.group?.name && (
                <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700 ring-1 ring-green-100">
                  {p.group.name}
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
  )
}
