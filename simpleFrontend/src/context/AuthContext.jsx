import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { queryClient } from '../api/queryClient'

const AuthContext = createContext(null)

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user')) || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('auth_token')))

  const persist = useCallback((tok, usr) => {
    if (tok) localStorage.setItem('auth_token', tok)
    else localStorage.removeItem('auth_token')
    if (usr) localStorage.setItem('auth_user', JSON.stringify(usr))
    else localStorage.removeItem('auth_user')
    setToken(tok)
    setUser(usr)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/me')
      persist(token, data.user)
    } catch {
      persist(null, null)
    } finally {
      setLoading(false)
    }
  }, [token, persist])

  useEffect(() => {
    if (token) refresh()
    else setLoading(false)
  }, [token, refresh])

  const login = useCallback(async (loginValue, password) => {
    const { data } = await api.post('/login', { login: loginValue, password })
    persist(data.token, data.user)
    return data.user
  }, [persist])

  const loginWithToken = useCallback(async (authToken) => {
    localStorage.setItem('auth_token', authToken)
    const { data } = await api.get('/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    persist(authToken, data.user)
    return data.user
  }, [persist])

  const register = useCallback(async (role, payload) => {
    const url =
      role === 'manager' ? '/register'
        : role === 'terrain_owner' ? '/register-terrain-owner'
        : role === 'player' ? '/register-player'
        : '/register-committee'
    const { data } = await api.post(url, payload)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // ignore
    }
    persist(null, null)
    try {
      queryClient.clear()
    } catch {}
  }, [persist])

  const updateUser = useCallback((usr) => persist(token, usr), [persist, token])

  const value = useMemo(
    () => ({ user, token, loading, login, loginWithToken, register, logout, updateUser }),
    [user, token, loading, login, loginWithToken, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function usePermission() {
  const { user } = useContext(AuthContext)
  return useCallback(
    (slug) => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (user.role !== 'sub_admin') return false
      return user.permissions?.includes(slug) ?? false
    },
    [user],
  )
}

export function homeForRole(role) {
  if (role === 'admin' || role === 'sub_admin') return '/admin'
  if (role === 'terrain_owner') return '/terrain'
  if (role === 'player') return '/player'
  if (role === 'committee') return '/committee'
  return '/dashboard'
}

export function useActivityLock() {
  const { user } = useContext(AuthContext)
  return useMemo(() => {
    if (!user) return { locked: false, reason: null, lockedAt: null }
    return {
      locked: Boolean(user.activity_locked),
      reason: user.activity_lock_reason || null,
      lockedAt: user.activity_locked_at || null,
    }
  }, [user])
}
