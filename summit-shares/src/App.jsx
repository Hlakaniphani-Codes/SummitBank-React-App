import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EnrollPage from './pages/EnrollPage';
import DashboardPage from './pages/DashboardPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin imports
import AdminLayout from './components/admin/AdminLayout';
import AdminRoute from './components/admin/AdminRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import AdminCardsPage from './pages/admin/AdminCardsPage';
import AdminTransfersPage from './pages/admin/AdminTransfersPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';

// NEW: Pending Applications component
import PendingApplications from './components/admin/PendingApplications';

const ProtectedRoute = ({ children }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/enroll" element={<EnrollPage />} />

        {/* Customer Portal */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />

        {/* Admin Portal */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          
          {/* Existing applications route – kept for backward compatibility */}
          <Route path="applications" element={<AdminCustomersPage />} />
          {/* NEW: dedicated pending applications route */}
          <Route path="applications/pending" element={<PendingApplications />} />
          
          <Route path="accounts" element={<AdminAccountsPage />} />
          <Route path="cards" element={<AdminCardsPage />} />
          <Route path="transfers" element={<AdminTransfersPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        {/* Admin Login - standalone page outside Layout */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}