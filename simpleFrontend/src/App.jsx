import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout'
import { ProtectedRoute, GuestRoute, OnboardingRoute } from './components/auth'
import { ToastContainer } from './components/ui/Toast'
import { ErrorBoundary, NotFound } from './components/errors'
import MaintenanceGate from './components/system/MaintenanceGate'
import PageMaintenanceGate from './components/system/PageMaintenanceGate'
import ActivityLockBanner from './components/system/ActivityLockBanner'
import PageSkeleton from './components/system/PageSkeleton'
import { ProfileModalProvider } from './components/profile/ProfileModalContext'
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications'
import PwaUpdatePrompt from './components/pwa/PwaUpdatePrompt'
import SmartGenieModal from './components/mascot/SmartGenieModal'
import TopNewsTicker from './components/system/TopNewsTicker'

const Landing = lazy(() => import('./pages/landing'))
const About = lazy(() => import('./pages/about'))
const Contact = lazy(() => import('./pages/contact'))
const Terms = lazy(() => import('./pages/terms'))
const Privacy = lazy(() => import('./pages/privacy'))
const Help = lazy(() => import('./pages/help'))
const Faq = lazy(() => import('./pages/faq'))
const Pricing = lazy(() => import('./pages/pricing'))
const Fields = lazy(() => import('./pages/fields'))
const Matches = lazy(() => import('./pages/matches'))
const MatchInvitePage = lazy(() => import('./pages/matches/invite'))
const DelegatedMatchEntryPage = lazy(() => import('./pages/matches/delegatedEntry'))
const PublicLiveMatchPage = lazy(() => import('./pages/matches/live'))
const PublicTournaments = lazy(() => import('./pages/tournaments'))
const PublicTournamentDetail = lazy(() => import('./pages/tournaments/detail'))
const TournamentJoinPage = lazy(() => import('./pages/tournaments/join'))
const PublicPlayerDetail = lazy(() => import('./pages/players/detail'))
const Login = lazy(() => import('./pages/auth/login'))
const Register = lazy(() => import('./pages/auth/register'))
const RegisterPlayer = lazy(() => import('./pages/player/register'))
const Pending = lazy(() => import('./pages/auth/pending'))
const Onboarding = lazy(() => import('./pages/onboarding'))
const ForgotPassword = lazy(() => import('./pages/auth/forgot-password'))
const ResetPassword = lazy(() => import('./pages/auth/reset-password'))
const RecoveryApply = lazy(() => import('./pages/auth/recovery'))
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback'))
const ManagerDashboard = lazy(() => import('./pages/manager'))
const TerrainDashboard = lazy(() => import('./pages/terrain'))
const AdminDashboard = lazy(() => import('./pages/admin'))
const PlayerDashboard = lazy(() => import('./pages/player'))
const PlayerOnboarding = lazy(() => import('./pages/player/onboarding'))
const CommitteeDashboard = lazy(() => import('./pages/committee'))

function RouteFallback() {
  return <PageSkeleton full />
}

function App() {
  const { i18n } = useTranslation()

  useRealtimeNotifications()

  useEffect(() => {
    const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
    document.documentElement.dir = dir
  }, [i18n.language])

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <ErrorBoundary>
          <ActivityLockBanner />
          <TopNewsTicker />
          <MaintenanceGate>
            <ProfileModalProvider>
              <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<PageMaintenanceGate><Landing /></PageMaintenanceGate>} />
                <Route path="/about" element={<PageMaintenanceGate><About /></PageMaintenanceGate>} />
                <Route path="/contact" element={<PageMaintenanceGate><Contact /></PageMaintenanceGate>} />
                <Route path="/terms" element={<PageMaintenanceGate><Terms /></PageMaintenanceGate>} />
                <Route path="/privacy" element={<PageMaintenanceGate><Privacy /></PageMaintenanceGate>} />
                <Route path="/help" element={<PageMaintenanceGate><Help /></PageMaintenanceGate>} />
                <Route path="/faq" element={<PageMaintenanceGate><Faq /></PageMaintenanceGate>} />
                <Route path="/pricing" element={<PageMaintenanceGate><Pricing /></PageMaintenanceGate>} />
                <Route path="/fields" element={<PageMaintenanceGate><Fields /></PageMaintenanceGate>} />
                <Route path="/terrains" element={<Navigate to="/fields" replace />} />
                <Route path="/stadiums" element={<Navigate to="/fields" replace />} />
                <Route path="/matches" element={<PageMaintenanceGate><Matches /></PageMaintenanceGate>} />
                <Route path="/live" element={<Navigate to="/matches" replace />} />
                <Route path="/matches/invite/:token" element={<PageMaintenanceGate><MatchInvitePage /></PageMaintenanceGate>} />
                <Route path="/tournaments" element={<PageMaintenanceGate><PublicTournaments /></PageMaintenanceGate>} />
                <Route path="/tournaments/:slug" element={<PageMaintenanceGate><PublicTournamentDetail /></PageMaintenanceGate>} />
                <Route path="/tournaments/:slug/join" element={<PageMaintenanceGate><TournamentJoinPage /></PageMaintenanceGate>} />
                <Route path="/players/:id" element={<PageMaintenanceGate><PublicPlayerDetail /></PageMaintenanceGate>} />
                <Route path="/p/:id" element={<PageMaintenanceGate><PublicPlayerDetail /></PageMaintenanceGate>} />
                {/* Short readable link aliases for quick sharing */}
                <Route path="/t/:slug" element={<PageMaintenanceGate><PublicTournamentDetail /></PageMaintenanceGate>} />
                <Route path="/j/:slug" element={<PageMaintenanceGate><TournamentJoinPage /></PageMaintenanceGate>} />
                <Route path="/join/:slug" element={<PageMaintenanceGate><TournamentJoinPage /></PageMaintenanceGate>} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Delegated match result entry (Secret link for referees/volunteers without login) */}
              <Route path="/match-entry/:token" element={<PageMaintenanceGate><DelegatedMatchEntryPage /></PageMaintenanceGate>} />

              {/* Public Live Match Viewing (Read-only live score & events without login) */}
              <Route path="/live/:token" element={<PageMaintenanceGate><PublicLiveMatchPage /></PageMaintenanceGate>} />

              <Route path="/login" element={<GuestRoute><PageMaintenanceGate><Login /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><PageMaintenanceGate><Register /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/register-player" element={<GuestRoute><PageMaintenanceGate><RegisterPlayer /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><PageMaintenanceGate><ForgotPassword /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/reset-password" element={<GuestRoute><PageMaintenanceGate><ResetPassword /></PageMaintenanceGate></GuestRoute>} />
              <Route path="/pending" element={<PageMaintenanceGate><Pending /></PageMaintenanceGate>} />
              <Route path="/onboarding" element={<OnboardingRoute><PageMaintenanceGate><Onboarding /></PageMaintenanceGate></OnboardingRoute>} />
              <Route path="/recovery" element={<PageMaintenanceGate><RecoveryApply /></PageMaintenanceGate>} />
              <Route path="/auth/callback" element={<OAuthCallback />} />

              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/terrain/*"
                element={
                  <ProtectedRoute allowedRoles={['terrain_owner']}>
                    <TerrainDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/player/onboarding"
                element={
                  <ProtectedRoute allowedRoles={['player']}>
                    <PlayerOnboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/player/*"
                element={
                  <ProtectedRoute allowedRoles={['player']}>
                    <PlayerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/committee/*"
                element={
                  <ProtectedRoute allowedRoles={['committee', 'manager', 'admin']}>
                    <CommitteeDashboard />
                  </ProtectedRoute>
                }
              />
              </Routes>
            </ProfileModalProvider>
          </MaintenanceGate>
        </ErrorBoundary>
      </Suspense>
      <SmartGenieModal />
      <PwaUpdatePrompt />
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App

