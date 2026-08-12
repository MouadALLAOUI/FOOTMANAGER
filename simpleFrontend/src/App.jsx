import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './layout'
import { ProtectedRoute, GuestRoute } from './components/auth'
import { ToastContainer } from './components/ui/Toast'

const Landing = lazy(() => import('./pages/landing'))
const Fields = lazy(() => import('./pages/fields'))
const Matches = lazy(() => import('./pages/matches'))
const PublicTournaments = lazy(() => import('./pages/tournaments'))
const PublicTournamentDetail = lazy(() => import('./pages/tournaments/detail'))
const Login = lazy(() => import('./pages/auth/login'))
const Register = lazy(() => import('./pages/auth/register'))
const Pending = lazy(() => import('./pages/auth/pending'))
const ManagerDashboard = lazy(() => import('./pages/manager'))
const TerrainDashboard = lazy(() => import('./pages/terrain'))
const AdminDashboard = lazy(() => import('./pages/admin'))
const PlayerDashboard = lazy(() => import('./pages/player'))
const CommitteeDashboard = lazy(() => import('./pages/committee'))

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7fb]">
      <div className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500" />
    </div>
  )
}

function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
    document.documentElement.dir = dir
  }, [i18n.language])

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/fields" element={<Fields />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/tournaments" element={<PublicTournaments />} />
            <Route path="/tournaments/:id" element={<PublicTournamentDetail />} />
          </Route>

          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/pending" element={<Pending />} />

          <Route path="/dashboard/*" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/terrain/*" element={<ProtectedRoute role="terrain_owner"><TerrainDashboard /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/player/*" element={<ProtectedRoute role="player"><PlayerDashboard /></ProtectedRoute>} />
          <Route path="/committee/*" element={<ProtectedRoute role="committee"><CommitteeDashboard /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
