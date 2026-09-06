import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Plus, Shield, Users } from 'lucide-react'
import { useTeam } from '../../context/TeamContext'
import TeamLogo from '../profile/TeamLogo'
import CreateTeamModal from './CreateTeamModal'

const CATEGORY_NAMES = {
  adult: 'كبار',
  teenager: 'شباب',
  children: 'براعم',
}

export default function TeamSwitcher() {
  const { t } = useTranslation()
  const { teams, currentTeam, activeTeamId, switchTeam, loading } = useTeam()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (!teams || teams.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-green-300 bg-green-50/70 px-3 py-1.5 text-xs font-extrabold text-green-700 transition hover:bg-green-100"
        >
          <Plus className="size-3.5" />
          إنشاء فريق
        </button>
        <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 ps-1.5 pe-2.5 transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20"
        title="تبديل الفريق"
      >
        <TeamLogo
          team={currentTeam}
          src={currentTeam?.logo_thumbnail_url || currentTeam?.logo_url}
          className="size-8 rounded-lg shadow-sm"
          fontSize="text-xs"
        />
        <div className="max-w-[130px] text-start sm:max-w-[160px]">
          <p className="truncate text-xs font-black text-slate-800 leading-tight">
            {currentTeam?.name || 'الفريق'}
          </p>
          <p className="truncate text-[10px] font-semibold text-slate-400">
            {CATEGORY_NAMES[currentTeam?.category] || currentTeam?.category || 'فريق'}
            {currentTeam?.city ? ` · ${currentTeam.city}` : ''}
          </p>
        </div>
        <ChevronDown
          className={`size-3.5 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-green-600' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-extrabold text-slate-900">فِرقك المسجلة</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
              {teams.length}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {teams.map((team) => {
              const isSelected = team.id === (currentTeam?.id || activeTeamId)
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={async () => {
                    if (!isSelected) {
                      await switchTeam(team.id)
                    }
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition-colors ${
                    isSelected
                      ? 'bg-green-50/80 text-green-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <TeamLogo
                    team={team}
                    src={team.logo_thumbnail_url || team.logo_url}
                    className="size-8 shrink-0 rounded-lg"
                    fontSize="text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold">{team.name}</p>
                    <p className="truncate text-[10px] text-slate-400">
                      {CATEGORY_NAMES[team.category] || team.category}
                      {team.players_count !== undefined
                        ? ` · ${team.players_count} لاعب`
                        : ''}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="grid size-5 place-items-center rounded-full bg-green-500 text-white shadow-sm">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-t border-slate-100 pt-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setCreateOpen(true)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-green-600 transition hover:bg-green-50 hover:text-green-700"
            >
              <Plus className="size-3.5" />
              إنشاء فريق جديد
            </button>
          </div>
        </div>
      )}

      <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
