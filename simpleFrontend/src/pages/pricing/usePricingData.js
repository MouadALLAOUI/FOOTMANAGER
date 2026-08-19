import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

export default function usePricingData() {
  const { user } = useAuth()
  const isAuthenticated = Boolean(user)

  const plans = useApi(() => api.get('/v1/plans').then((r) => r.data), [])

  const subscription = useApi(
    () => api.get('/me/subscription').then((r) => r.data),
    [user?.id],
    { enabled: isAuthenticated },
  )

  return {
    plans: plans.data?.plans ?? [],
    plansLoading: plans.loading,
    plansError: plans.error,
    plansRefetch: plans.refetch,
    subscription: subscription.data ?? null,
    subscriptionLoading: subscription.loading,
    isAuthenticated,
    user,
  }
}
