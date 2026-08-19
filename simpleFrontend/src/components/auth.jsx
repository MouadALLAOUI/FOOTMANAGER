import { Navigate } from 'react-router-dom'
import { useAuth, homeForRole } from '../context/AuthContext'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a101a]">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        <p className="text-sm font-semibold text-white/60">...جارِ التحميل</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    if (!(role === 'admin' && user.role === 'sub_admin')) {
      return <Navigate to={homeForRole(user.role)} replace />
    }
  }
  if (user.status !== 'approved') return <Navigate to="/pending" replace />

  return children
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user) {
    if (user.status !== 'approved') return <Navigate to="/pending" replace />
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return children
}
