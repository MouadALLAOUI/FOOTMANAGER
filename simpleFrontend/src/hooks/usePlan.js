import { useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

export function usePlan() {
  const { user } = useAuth()

  return useMemo(() => {
    if (!user || !user.plan) {
      return { plan: null, subscription: null, features: [], loading: false }
    }

    return {
      plan: user.plan,
      subscription: user.subscription,
      features: user.plan.features || [],
      loading: false,
    }
  }, [user])
}

export function useFeature(featureKey) {
  const { plan, features } = usePlan()

  const feature = useMemo(() => {
    if (!features.length) return null
    return features.find((f) => f.key === featureKey || f.feature === featureKey) || null
  }, [features, featureKey])

  const enabled = Boolean(feature?.enabled)

  const value = useMemo(() => {
    if (!feature || !enabled) return null
    if (feature.is_unlimited) return null
    return feature.value ?? null
  }, [feature, enabled])

  const unlimited = Boolean(feature?.is_unlimited && enabled)

  return useMemo(() => ({
    enabled,
    value,
    unlimited,
    feature,
    planSlug: plan?.slug || null,
  }), [enabled, value, unlimited, feature, plan?.slug])
}

export function useCanAccess(featureKey) {
  const { enabled } = useFeature(featureKey)
  return enabled
}
