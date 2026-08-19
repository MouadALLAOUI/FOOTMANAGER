import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import PendingApproval from './pages/Auth/PendingApproval';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ManagerLayout from './layouts/ManagerLayout';
import ManagerDashboard from './pages/Manager/Dashboard';
import ManagerReservations from './pages/Manager/Reservations';
import MatchFeed from './pages/Manager/MatchFeed';
import TerrainBrowse from './pages/Manager/TerrainBrowse';
import TeamProfile from './pages/Manager/TeamProfile';
import Leaderboard from './pages/Manager/Leaderboard';
import AdminLayout from './layouts/AdminLayout';
import AdminOverview from './pages/Admin/AdminOverview';
import ManagerApprovals from './pages/Admin/ManagerApprovals';
import AdminFacilities from './pages/Admin/AdminFacilities';
import AdminPlans from './pages/Admin/AdminPlans';
import TerrainOwnerLayout from './layouts/TerrainOwnerLayout';
import TerrainOwnerDashboard from './pages/TerrainOwner/Dashboard';
import MyTerrains from './pages/TerrainOwner/MyTerrains';
import TerrainDetail from './pages/TerrainOwner/TerrainDetail';
import CalendarDashboard from './pages/TerrainOwner/CalendarDashboard';
import LandingPage from './pages/Landing/LandingPage';
import AboutUsPage from './pages/Landing/AboutUsPage';
import FAQPage from './pages/Landing/FAQPage';

function HtmlDir() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);
  return null;
}

function ProtectedRoute({ children, requireApproved = false, requireAdmin = false }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (requireApproved && user.status !== 'approved') return <Navigate to="/pending" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.status !== 'approved') return <Navigate to="/pending" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'terrain_owner') return <Navigate to="/terrain" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutUsPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/pending" element={<PendingApproval />} />

      {/* Manager Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute requireApproved>
          <ManagerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<ManagerDashboard />} />
        <Route path="my-requests" element={<ManagerDashboard />} />
        <Route path="my-reservations" element={<ManagerReservations />} />
        <Route path="terrains" element={<TerrainBrowse />} />
        <Route path="browse" element={<MatchFeed />} />
        <Route path="profile" element={<TeamProfile />} />
        <Route path="leaderboard" element={<Leaderboard />} />
      </Route>

      {/* Terrain Owner Routes */}
      <Route path="/terrain" element={
        <ProtectedRoute requireApproved>
          <TerrainOwnerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<TerrainOwnerDashboard />} />
        <Route path="my-terrains" element={<MyTerrains />} />
        <Route path="my-terrains/:id" element={<TerrainDetail />} />
        <Route path="calendar" element={<CalendarDashboard />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminOverview />} />
        <Route path="managers" element={<ManagerApprovals />} />
        <Route path="terrain-owners" element={<ManagerApprovals />} />
        <Route path="facilities" element={<AdminFacilities />} />
        <Route path="plans" element={<AdminPlans />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HtmlDir />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
