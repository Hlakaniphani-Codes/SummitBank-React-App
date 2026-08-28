import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EnrollPage from './pages/EnrollPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyOtpPage from './pages/VerifyOtpPage';

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
import PendingApplications from './components/admin/PendingApplications';

// Client imports
import ClientLayout from './components/client/ClientLayout';
import ClientDashboard from './components/client/ClientDashboard';
import ClientTransfer from './components/client/ClientTransfer';
import ClientWires from './components/client/ClientWires';
import ClientCheques from './components/client/ClientCheques';
import ClientCards from './components/client/ClientCards';
import ClientTransactions from './components/client/ClientTransactions';
import ClientBills from './components/client/ClientBills';
import ClientBeneficiaries from './components/client/ClientBeneficiaries';
import ClientStatements from './components/client/ClientStatements';
import ClientNotifications from './components/client/ClientNotifications';
import ClientSecurity from './components/client/ClientSecurity';
import ClientSupport from './components/client/ClientSupport';

const ProtectedRoute = ({ children }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return <Navigate to="/" replace />;

  // A valid token alone isn't enough - it must belong to a customer account.
  // Without this, an admin/super_admin's own token (still valid after they
  // navigate here directly, via back button, a stale tab, etc.) would render
  // the client dashboard shell for their admin account instead of being sent
  // to the admin portal where that role actually belongs.
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }
  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default function App() {
  const [showServiceNotice, setShowServiceNotice] = useState(() => {
    // Show on each new browser session (new tab/window), not on every refresh
    const dismissed = sessionStorage.getItem('serviceNoticeDismissed');
    return !dismissed;
  });

  const dismissServiceNotice = () => {
    sessionStorage.setItem('serviceNoticeDismissed', 'true');
    setShowServiceNotice(false);
  };

  return (
    <BrowserRouter>
      {/* Service Notice Popup */}
      {showServiceNotice && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-fadeIn"
            style={{
              animation: 'modalIn 0.3s ease',
              maxWidth: '480px',
              width: '100%',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              background: '#fff',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#FDFBF7',
                  border: '2px solid #C9A84C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#C9A84C" strokeWidth="2"/>
                  <path d="M12 8V12" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 16H12.01" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0B0B0B',
                  margin: '0 0 4px',
                  letterSpacing: '-0.3px',
                }}
              >
                Service Notice
              </h2>
            </div>
            <div
              style={{
                color: '#5a5a5a',
                fontSize: '13px',
                lineHeight: '1.7',
                textAlign: 'center',
                marginBottom: '24px',
                padding: '0 8px',
              }}
            >
              <p style={{ margin: '0 0 12px' }}>
                We've moved and everything is running smoothly. Due to unexpected technical difficulties with our primary servers, we've temporarily migrated to our secure backup infrastructure to keep your experience uninterrupted.
              </p>
              <p style={{ margin: '0' }}>
                Our team is actively working to resolve the issue. All your data and services remain fully intact — you're in safe hands.
              </p>
            </div>
            <button
              onClick={dismissServiceNotice}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#0B0B0B',
                color: '#C9A84C',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseOver={(e) => { e.target.style.background = '#1A1A1A'; }}
              onMouseOut={(e) => { e.target.style.background = '#0B0B0B'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#C9A84C" strokeWidth="2"/>
              </svg>
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/enroll" element={<EnrollPage />} />

        {/* Client Portal - NEW STRUCTURE */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ClientLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="transfer" element={<ClientTransfer />} />
          <Route path="wires" element={<ClientWires />} />
          <Route path="cheques" element={<ClientCheques />} />
          <Route path="cards" element={<ClientCards />} />
          <Route path="transactions" element={<ClientTransactions />} />
          <Route path="bills" element={<ClientBills />} />
          <Route path="beneficiaries" element={<ClientBeneficiaries />} />
          <Route path="statements" element={<ClientStatements />} />
          <Route path="notifications" element={<ClientNotifications />} />
          <Route path="security" element={<ClientSecurity />} />
          <Route path="support" element={<ClientSupport />} />
        </Route>

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
          <Route path="applications" element={<AdminCustomersPage />} />
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