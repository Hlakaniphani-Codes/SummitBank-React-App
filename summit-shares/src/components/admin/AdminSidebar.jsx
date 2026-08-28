import React from 'react';
import { Link } from 'react-router-dom';

const AdminSidebar = ({ isOpen, onClose, currentPath, onLogout, user }) => {
  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { path: '/admin/customers', label: 'Customers', icon: 'fa-users' },
    { path: '/admin/accounts', label: 'Accounts', icon: 'fa-wallet' },
    { path: '/admin/cards', label: 'Cards', icon: 'fa-credit-card' },
    { path: '/admin/transfers', label: 'Transfers', icon: 'fa-arrow-right-arrow-left' },
    { path: '/admin/notifications', label: 'Notifications', icon: 'fa-bell' },
    { path: '/admin/audit', label: 'Audit & Security', icon: 'fa-shield-halved' },
  ];

  const isActive = (path) => currentPath === path || currentPath.startsWith(path + '/');

  return (
    <>
      {/* Overlay */}
      <div
        className={`admin-sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          backdropFilter: 'blur(4px)',
        }}
      ></div>

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 260,
          height: '100vh',
          background: '#0a0a0a',
          zIndex: 1000,
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
          padding: '24px 16px 30px',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1a1a1a',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 28, borderBottom: '1px solid #1a1a1a', marginBottom: 24 }}>
          <svg viewBox="0 0 170 40" fill="none" style={{ height: 34, width: 'auto', flexShrink: 0 }}>
            <path d="M10 30 L30 10 L50 30 L40 30 L30 18 L20 30 L10 30Z" fill="#C9A84C" />
            <rect x="32" y="24" width="2" height="6" fill="#C9A84C" />
            <rect x="34" y="26" width="2" height="4" fill="#C9A84C" />
            <rect x="36" y="28" width="2" height="2" fill="#C9A84C" />
            <text x="46" y="26" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" fill="#FFFFFF" letterSpacing="2">SUMMIT</text>
            <text x="46" y="36" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="8" fill="#6b6b6b" letterSpacing="3">SHARES</text>
          </svg>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</div>
            <div style={{ fontSize: 9, color: '#6b6b6b' }}>Control Center</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#4a4a4a', padding: '12px 14px 6px' }}>
            Management
          </div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                color: isActive(item.path) ? '#fff' : '#8a8a8a',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                background: isActive(item.path) ? 'rgba(201,168,76,0.12)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#8a8a8a';
                }
              }}
            >
              <i className={`fas ${item.icon}`} style={{ width: 18, fontSize: 14, textAlign: 'center', flexShrink: 0, color: isActive(item.path) ? '#C9A84C' : '#6a6a6a' }}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 16, marginTop: 8 }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              color: '#8a8a8a',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8a8a'; }}
          >
            <i className="fas fa-arrow-left" style={{ width: 18, fontSize: 14, textAlign: 'center', flexShrink: 0, color: '#6a6a6a' }}></i>
            <span>Back to Portal</span>
          </Link>
          <div
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              color: '#d94352',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              marginTop: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(217,67,82,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <i className="fas fa-right-from-bracket" style={{ width: 18, fontSize: 14, textAlign: 'center', flexShrink: 0, color: '#d94352' }}></i>
            <span>Sign Out</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
