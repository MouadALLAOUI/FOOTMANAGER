import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { TeamAvatar } from '../shared'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'

export default function TeamsSection({ teams }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
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

      <div className="flex flex-wrap justify-center gap-3">
        {list.map((p) => {
          const team = p.team
          return (
            <button
              key={p.id}
              type="button"
              aria-label={team.name}
              onClick={() => openTeam(team)}
              className="group relative size-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-2 transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_12px_24px_-12px_rgba(16,185,129,0.4)] sm:size-28"
            >
              <span className="grid h-full w-full place-items-center">
                <TeamAvatar team={team} className="size-14 transition-transform duration-300 group-hover:scale-105 sm:size-20" />
              </span>
              {p.group?.name && (
                <span className="absolute start-2.5 top-2.5 rounded-full bg-green-50/90 px-2 py-0.5 text-[9px] font-bold text-green-700 ring-1 ring-green-100 backdrop-blur">
                  {p.group.name}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent px-2 pb-2.5 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="block max-w-full truncate text-xs font-extrabold text-white">{team.name}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}