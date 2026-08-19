import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { rememberAction } from '../../lib/intent'

export function usePublicActions({ onBooking, onChallenge }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const guard = useCallback(
    (type, payload, open) => {
      if (!user) {
        rememberAction({ type, ...payload })
        toast.info(t('publicActions.loginRequired'))
        navigate('/login')
        return
      }
      if (user.role !== 'manager') {
        toast.error(t('publicActions.managersOnly'))
        return
      }
      if (user.status !== 'approved') {
        toast.error(t('publicActions.notApproved'))
        return
      }
      open(payload)
    },
    [user, navigate, toast, t],
  )

  const openBooking = useCallback(
    (field) => {
      guard('book', { id: field.id, name: field.name }, (p) => onBooking?.(p))
    },
    [guard, onBooking],
  )

  const openChallenge = useCallback(
    (team) => {
      guard(
        'challenge',
        { teamId: team.teamId ?? team.id, teamName: team.teamName ?? team.name ?? team.team },
        (p) => onChallenge?.(p),
      )
    },
    [guard, onChallenge],
  )

  return { openBooking, openChallenge }
}
