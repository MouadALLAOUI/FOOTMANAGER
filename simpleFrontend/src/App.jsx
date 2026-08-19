import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './layout'
import { ProtectedRoute, GuestRoute } from './components/auth'
import { ToastContainer } from './components/ui/Toast'
import { ErrorBoundary, NotFound } from './components/errors'
import MaintenanceGate from './components/system/MaintenanceGate'
import PageMaintenanceGate from './components/system/PageMaintenanceGate'
import PageSkeleton from './components/system/PageSkeleton'

const Landing = lazy(() => import('./pages/landing'))
const About = lazy(() => import('./pages/about'))
const Contact = lazy(() => import('./pages/contact'))
const Terms = lazy(() => import('./pages/terms'))
const Privacy = lazy(() => import('./pages/privacy'))
const Pricing = lazy(() => import('./pages/pricing'))
const Fields = lazy(() => import('./pages/fields'))
const Matches = lazy(() => import('./pages/matches'))
const PublicTournaments = lazy(() => import('./pages/tournaments'))
const PublicTournamentDetail = lazy(() => import('./pages/tournaments/detail'))
const Login = lazy(() => import('./pages/auth/login'))
const Register = lazy(() => import('./pages/auth/register'))
const Pending = lazy(() => import('./pages/auth/pending'))
const RecoveryApply = lazy(() => import('./pages/auth/recovery'))
const ManagerDashboard = lazy(() => import('./pages/manager'))
const TerrainDashboard = lazy(() => import('./pages/terrain'))
const AdminDashboard = lazy(() => import('./pages/admin'))
const PlayerDashboard = lazy(() => import('./pages/player'))
const CommitteeDashboard = lazy(() => import('./pages/committee'))

function RouteFallback() {
  return <PageSkeleton full />
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
        <ErrorBoundary>
          <MaintenanceGate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<PageMaintenanceGate><Landing /></PageMaintenanceGate>} />
                <Route path="/about" element={<PageMaintenanceGate><About /></PageMaintenanceGate>} />
                <Route path="/contact" element={<PageMaintenanceGate><Contact /></PageMaintenanceGate>} />
                <Route path="/terms" element={<PageMaintenanceGate><Terms /></PageMaintenanceGate>} />
                <Route path="/privacy" element={<PageMaintenanceGate><Privacy /></PageMaintenanceGate>} />
                <Route path="/pricing" element={<PageMaintenanceGate><Pricing /></PageMaintenanceGate>} />
                <Route path="/fields" element={<PageMaintenanceGate><Fields /></PageMaintenanceGate>} />
                <Route path="/matches" element={<PageMaintenanceGate><Matches /></PageMaintenanceGate>} />
                <Route path="/tournaments" element={<PageMaintenanceGate><PublicTournaments /></PageMaintenanceGate>} />
                <Route path="/tournaments/:slug" element={<PageMaintenanceGate><PublicTournamentDetail /></PageMaintenanceGate>} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/login" element={<GuestRoute><PageMaintenanceGate><Login /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><PageMaintenanceGate><Register /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/pending" element={<PageMaintenanceGate><Pending /></PageMaintenanceGate>} />
              <Route path="/recovery" element={<PageMaintenanceGate><RecoveryApply /></PageMaintenanceGate>} />

              <Route path="/dashboard/*" element={<ProtectedRoute role="manager"><PageMaintenanceGate><ManagerDashboard /></PageMaintenanceGate></ProtectedRoute>} />
              <Route path="/terrain/*" element={<ProtectedRoute role="terrain_owner"><PageMaintenanceGate><TerrainDashboard /></PageMaintenanceGate></ProtectedRoute>} />
              <Route path="/admin/*" element={<ProtectedRoute role="admin"><PageMaintenanceGate><AdminDashboard /></PageMaintenanceGate></ProtectedRoute>} />
              <Route path="/player/*" element={<ProtectedRoute role="player"><PageMaintenanceGate><PlayerDashboard /></PageMaintenanceGate></ProtectedRoute>} />
              <Route path="/committee/*" element={<ProtectedRoute role="committee"><PageMaintenanceGate><CommitteeDashboard /></PageMaintenanceGate></ProtectedRoute>} />
            </Routes>
          </MaintenanceGate>
        </ErrorBoundary>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
