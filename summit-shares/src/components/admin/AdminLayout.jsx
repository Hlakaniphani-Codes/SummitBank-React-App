import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminRole');
    navigate('/');
  };

  // Get current page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin/dashboard') return 'Dashboard';
    if (path.includes('/admin/customers')) return 'Customer Management';
    if (path.includes('/admin/accounts')) return 'Account Management';
    if (path.includes('/admin/cards')) return 'Card Management';
    if (path.includes('/admin/transfers')) return 'Transfer Management';
    if (path.includes('/admin/notifications')) return 'Notifications';
    if (path.includes('/admin/audit')) return 'Audit & Security';
    return 'Administration';
  };

  return (
    <div className="admin-layout font-sans antialiased bg-[#0a0a0a] text-white min-h-screen">
      {/* Full Admin Styles */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Montserrat', system-ui, sans-serif; background: #0a0a0a; color: #fff; overflow-x: hidden; -webkit-font-smoothing: antialiased; font-size: 14px; }

        .admin-main { margin-left: 260px; min-height: 100vh; background: #111; }
        .admin-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 30px; background: #0d0d0d; border-bottom: 1px solid #1e1e1e; position: sticky; top: 0; z-index: 100; }
        .admin-header .page-title { font-size: 14px; font-weight: 600; color: #fff; }
        .admin-header .page-title span { color: #6b6b6b; }
        .admin-header .header-right { display: flex; align-items: center; gap: 16px; }
        .admin-header .admin-badge { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #2a2a2a; cursor: pointer; }
        .admin-header .admin-badge .avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #C9A84C, #A8893A); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #000; }
        .admin-header .admin-badge .info .name { font-size: 11px; font-weight: 600; color: #fff; }
        .admin-header .admin-badge .info .role { font-size: 9px; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.3px; }
        .admin-header .logout-btn { background: none; border: 1px solid #2a2a2a; color: #d94352; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .admin-header .logout-btn:hover { background: rgba(217,67,82,0.1); border-color: #d94352; }

        .admin-content { padding: 24px 30px 40px; }

        .admin-card { background: #151515; border-radius: 12px; border: 1px solid #1e1e1e; padding: 20px; }
        .admin-card .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .admin-card .card-header h3 { font-size: 14px; font-weight: 700; color: #fff; }
        .admin-card .card-header .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .admin-stat-card { background: #151515; border: 1px solid #1e1e1e; border-radius: 12px; padding: 18px 20px; transition: border-color 0.2s; }
        .admin-stat-card:hover { border-color: #C9A84C; }
        .admin-stat-card .stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b6b6b; }
        .admin-stat-card .stat-value { font-size: 28px; font-weight: 800; color: #fff; margin-top: 4px; }
        .admin-stat-card .stat-sub { font-size: 11px; color: #4a4a4a; margin-top: 2px; }
        .admin-stat-card .stat-sub.positive { color: #2D9B4E; }
        .admin-stat-card .stat-sub.negative { color: #D94352; }
        .admin-stat-card .stat-icon { float: right; font-size: 24px; color: #C9A84C; opacity: 0.5; }

        .admin-table-wrap { overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 700px; }
        .admin-table thead th { text-align: left; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; color: #6b6b6b; border-bottom: 1px solid #1e1e1e; white-space: nowrap; background: #111; position: sticky; top: 0; z-index: 2; }
        .admin-table tbody td { padding: 10px 12px; border-bottom: 1px solid #1a1a1a; color: #ccc; white-space: nowrap; }
        .admin-table tbody tr:hover { background: #1a1a1a; }
        .admin-table tbody tr:last-child td { border-bottom: none; }

        .admin-badge-status { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 20px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
        .admin-badge-status.active, .admin-badge-status.approved, .admin-badge-status.completed, .admin-badge-status.success { background: rgba(45,155,78,0.1); color: #2D9B4E; }
        .admin-badge-status.pending, .admin-badge-status.review { background: rgba(232,168,56,0.1); color: #E8A838; }
        .admin-badge-status.inactive, .admin-badge-status.blocked, .admin-badge-status.failed, .admin-badge-status.rejected { background: rgba(217,67,82,0.1); color: #D94352; }
        .admin-badge-status.sent { background: rgba(59,130,246,0.1); color: #3B82F6; }
        .admin-badge-status.hold { background: rgba(139,92,246,0.1); color: #8B5CF6; }
        .admin-badge-status .dot { width: 4px; height: 4px; border-radius: 50%; display: inline-block; }
        .admin-badge-status.active .dot, .admin-badge-status.approved .dot, .admin-badge-status.completed .dot { background: #2D9B4E; }
        .admin-badge-status.pending .dot, .admin-badge-status.review .dot { background: #E8A838; }
        .admin-badge-status.inactive .dot, .admin-badge-status.blocked .dot, .admin-badge-status.failed .dot { background: #D94352; }
        .admin-badge-status.sent .dot { background: #3B82F6; }
        .admin-badge-status.hold .dot { background: #8B5CF6; }

        .admin-btn { padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 4px; }
        .admin-btn-primary { background: #C9A84C; color: #000; }
        .admin-btn-primary:hover { background: #D9C06E; }
        .admin-btn-secondary { background: #1a1a1a; color: #fff; border: 1px solid #2a2a2a; }
        .admin-btn-secondary:hover { border-color: #C9A84C; color: #C9A84C; }
        .admin-btn-danger { background: #D94352; color: #fff; }
        .admin-btn-danger:hover { background: #c0392b; }
        .admin-btn-success { background: #2D9B4E; color: #fff; }
        .admin-btn-success:hover { background: #1e8449; }
        .admin-btn-warning { background: #E8A838; color: #000; }
        .admin-btn-warning:hover { background: #d4942e; }
        .admin-btn-sm { padding: 4px 10px; font-size: 10px; }
        .admin-btn-xs { padding: 2px 8px; font-size: 9px; }

        .admin-form-group { margin-bottom: 14px; }
        .admin-form-group label { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b6b6b; margin-bottom: 4px; }
        .admin-form-group input, .admin-form-group select, .admin-form-group textarea { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #2a2a2a; font-size: 12px; background: #1a1a1a; color: #fff; outline: none; transition: border 0.2s; font-family: inherit; }
        .admin-form-group input:focus, .admin-form-group select:focus, .admin-form-group textarea:focus { border-color: #C9A84C; }
        .admin-form-group textarea { resize: vertical; min-height: 60px; }

        .admin-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); z-index: 9999; align-items: center; justify-content: center; padding: 20px; }
        .admin-modal-overlay.active { display: flex; }
        .admin-modal { background: #151515; border-radius: 12px; max-width: 520px; width: 100%; padding: 28px; border: 1px solid #2a2a2a; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: modalIn 0.3s ease; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .admin-modal .modal-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .admin-modal .modal-sub { font-size: 12px; color: #6b6b6b; margin-bottom: 20px; }
        .admin-modal .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

        .admin-search-input { padding: 6px 12px; border-radius: 6px; border: 1px solid #2a2a2a; font-size: 11px; background: #1a1a1a; color: #fff; outline: none; transition: border 0.2s; width: 200px; }
        .admin-search-input:focus { border-color: #C9A84C; }
        .admin-select-input { padding: 6px 10px; border-radius: 6px; border: 1px solid #2a2a2a; font-size: 11px; background: #1a1a1a; color: #fff; outline: none; cursor: pointer; }
        .admin-select-input:focus { border-color: #C9A84C; }

        .admin-toast { position: fixed; bottom: 30px; right: 30px; background: #1a1a1a; color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 12px; font-weight: 500; box-shadow: 0 8px 30px rgba(0,0,0,0.3); z-index: 99999; display: flex; align-items: center; gap: 12px; transform: translateY(120px); opacity: 0; transition: all 0.4s ease; border-left: 3px solid #C9A84C; }
        .admin-toast.show { transform: translateY(0); opacity: 1; }
        .admin-toast i { font-size: 16px; color: #C9A84C; }

        .admin-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .admin-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

        .admin-activity-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
        .admin-activity-item:last-child { border-bottom: none; }
        .admin-activity-item .activity-icon { width: 28px; height: 28px; border-radius: 50%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #C9A84C; flex-shrink: 0; }
        .admin-activity-item .activity-content { flex: 1; }
        .admin-activity-item .activity-content .activity-desc { font-size: 11px; color: #ccc; }
        .admin-activity-item .activity-content .activity-time { font-size: 9px; color: #6b6b6b; }
        .admin-activity-item .activity-content .activity-user { font-size: 10px; font-weight: 600; color: #C9A84C; }

        .admin-empty-state { text-align: center; padding: 40px 20px; color: #6b6b6b; }
        .admin-empty-state i { font-size: 36px; margin-bottom: 12px; opacity: 0.3; }
        .admin-empty-state p { font-size: 12px; }

        @media (max-width: 992px) {
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-main { margin-left: 0; }
          .admin-content { padding: 16px; }
          .admin-header { padding: 12px 16px; }
          .admin-grid-2, .admin-grid-3 { grid-template-columns: 1fr; }
          .admin-stats-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .admin-stats-grid { grid-template-columns: 1fr; }
          .admin-table { min-width: 500px; font-size: 11px; }
        }
      `}</style>

      {/* Toast container */}
      <div id="adminToast" className="admin-toast">
        <i className="fas fa-check-circle"></i>
        <span id="adminToastText"></span>
      </div>

      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} onLogout={handleLogout} user={user} />

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="flex items-center gap-3">
            <button
              className="admin-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'none' }}
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="page-title">
              Administration <span>/ {getPageTitle()}</span>
            </div>
          </div>
          <div className="header-right">
            <div className="admin-badge">
              <div className="avatar">
                {(user?.firstName || 'A').charAt(0)}{(user?.lastName || 'D').charAt(0)}
              </div>
              <div className="info">
                <div className="name">{user?.firstName || 'Admin'} {user?.lastName || 'User'}</div>
                <div className="role">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-right-from-bracket"></i> Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
