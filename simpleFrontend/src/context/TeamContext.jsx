import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { invalidateManager, useManagerTeams } from '../api/queries'
import { useAuth } from './AuthContext'
import { useToast } from '../components/ui/Toast'
import { toastApiError } from '../lib/errors'

const TeamContext = createContext(null)

export function TeamProvider({ children }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const isManager = user?.role === 'manager'

  const { data, isLoading, refetch } = useManagerTeams({
    enabled: Boolean(isManager),
  })

  const teams = useMemo(() => data?.teams || [], [data])
  const backendCurrentTeamId = data?.current_team_id

  const [activeTeamId, setActiveTeamId] = useState(() => {
    const saved = localStorage.getItem('active_team_id')
    return saved ? Number(saved) : null
  })

  // Sync active team when teams data loads
  useEffect(() => {
    if (!teams.length) return

    const saved = localStorage.getItem('active_team_id')
    const savedNum = saved ? Number(saved) : null

    // Check if current stored team exists in user's managed teams
    const validSaved = savedNum && teams.some((t) => t.id === savedNum)

    if (validSaved) {
      if (activeTeamId !== savedNum) {
        setActiveTeamId(savedNum)
      }
    } else if (backendCurrentTeamId && teams.some((t) => t.id === backendCurrentTeamId)) {
      setActiveTeamId(backendCurrentTeamId)
      localStorage.setItem('active_team_id', String(backendCurrentTeamId))
    } else {
      const firstId = teams[0].id
      setActiveTeamId(firstId)
      localStorage.setItem('active_team_id', String(firstId))
    }
  }, [teams, backendCurrentTeamId, activeTeamId])

  const currentTeam = useMemo(() => {
    if (!activeTeamId || !teams.length) {
      return data?.current_team || teams[0] || user?.team || null
    }
    return teams.find((t) => t.id === activeTeamId) || teams[0] || null
  }, [activeTeamId, teams, data?.current_team, user?.team])

  const switchTeam = useCallback(
    async (teamId) => {
      try {
        const res = await api.post('/manager/teams/switch', { team_id: teamId })
        const targetId = res.data?.current_team_id || teamId
        localStorage.setItem('active_team_id', String(targetId))
        setActiveTeamId(targetId)
        await invalidateManager()
        await refetch()
        toast.success(res.data?.message || 'تم تبديل الفريق بنجاح')
        return res.data?.current_team
      } catch (e) {
        toastApiError(e)
        throw e
      }
    },
    [refetch, toast],
  )

  const createTeam = useCallback(
    async (payload) => {
      try {
        const res = await api.post('/manager/teams', payload)
        const newTeam = res.data?.team
        if (newTeam?.id) {
          localStorage.setItem('active_team_id', String(newTeam.id))
          setActiveTeamId(newTeam.id)
        }
        await invalidateManager()
        await refetch()
        toast.success(res.data?.message || 'تم إنشاء الفريق بنجاح')
        return newTeam
      } catch (e) {
        toastApiError(e)
        throw e
      }
    },
    [refetch, toast],
  )

  const value = useMemo(
    () => ({
      teams,
      currentTeam,
      activeTeamId,
      loading: isLoading,
      switchTeam,
      createTeam,
      refetchTeams: refetch,
    }),
    [teams, currentTeam, activeTeamId, isLoading, switchTeam, createTeam, refetch],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam() {
  const ctx = useContext(TeamContext)
  if (!ctx) {
    return {
      teams: [],
      currentTeam: null,
      activeTeamId: null,
      loading: false,
      switchTeam: async () => {},
      createTeam: async () => {},
      refetchTeams: async () => {},
    }
  }
  return ctx
}

export default TeamContext
