import React, { useState, useEffect } from 'react';
import { getAdminDashboard } from '../../api/admin';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminDashboard();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="admin-empty-state"><i className="fas fa-spinner fa-spin"></i><p>Loading dashboard...</p></div>;
  if (error) return <div className="admin-empty-state"><i className="fas fa-exclamation-triangle"></i><p>{error}</p></div>;
  if (!stats) return null;

  const statCards = [
    { label: 'Total Customers', value: stats.totalCustomers, icon: 'fa-users', sub: 'Registered users', color: '#3B82F6' },
    { label: 'Pending Applications', value: stats.pendingApplications, icon: 'fa-file-circle-check', sub: 'Awaiting review', color: '#E8A838' },
    { label: 'Pending Transfers', value: stats.pendingTransfers, icon: 'fa-arrow-right-arrow-left', sub: 'Wire transfers', color: '#8B5CF6' },
    { label: 'Card Requests', value: stats.pendingCardRequests, icon: 'fa-credit-card', sub: 'Awaiting approval', color: '#D94352' },
    { label: 'Total Accounts', value: stats.totalAccounts, icon: 'fa-wallet', sub: 'Across all customers', color: '#2D9B4E' },
  ];

  const getActionColor = (action) => {
    const colors = {
      login: '#3B82F6', logout: '#6b6b6b', create: '#2D9B4E', update: '#E8A838',
      delete: '#D94352', approve: '#2D9B4E', reject: '#D94352', credit: '#2D9B4E',
      debit: '#D94352', hold: '#8B5CF6', unhold: '#2D9B4E', activate: '#2D9B4E',
      deactivate: '#D94352', send_email: '#3B82F6', broadcast: '#E8A838',
    };
    return colors[action] || '#6b6b6b';
  };

  const getActionIcon = (action) => {
    const icons = {
      login: 'fa-right-to-bracket', logout: 'fa-right-from-bracket', create: 'fa-plus',
      update: 'fa-pen', delete: 'fa-trash', approve: 'fa-check', reject: 'fa-times',
      credit: 'fa-arrow-up', debit: 'fa-arrow-down', hold: 'fa-pause', unhold: 'fa-play',
      activate: 'fa-toggle-on', deactivate: 'fa-toggle-off', send_email: 'fa-envelope',
      broadcast: 'fa-bullhorn',
    };
    return icons[action] || 'fa-circle';
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Dashboard</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Overview of your banking system</p>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {statCards.map((card, idx) => (
          <div key={idx} className="admin-stat-card">
            <i className={`fas ${card.icon} stat-icon`} style={{ color: card.color }}></i>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        {/* Recent Activity */}
        <div className="admin-card">
          <div className="card-header">
            <h3><i className="fas fa-clock" style={{ color: '#C9A84C', marginRight: 8 }}></i> Recent Activity</h3>
          </div>
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div>
              {stats.recentActivity.slice(0, 10).map((log, idx) => (
                <div key={log.id || idx} className="admin-activity-item">
                  <div className="activity-icon" style={{ background: `${getActionColor(log.action)}15`, color: getActionColor(log.action) }}>
                    <i className={`fas ${getActionIcon(log.action)}`}></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-desc">
                      <span className="activity-user">{log.first_name || 'System'}</span> - {log.description || log.action}
                    </div>
                    <div className="activity-time">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state"><i className="fas fa-clock"></i><p>No recent activity</p></div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="admin-card">
          <div className="card-header">
            <h3><i className="fas fa-bolt" style={{ color: '#C9A84C', marginRight: 8 }}></i> Quick Actions</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <a href="/admin/customers" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', padding: '12px 8px', textDecoration: 'none' }}>
              <i className="fas fa-users"></i> Customers
            </a>
            <a href="/admin/applications" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', padding: '12px 8px', textDecoration: 'none' }}>
              <i className="fas fa-file-circle-check"></i> Applications
            </a>
            <a href="/admin/accounts" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', padding: '12px 8px', textDecoration: 'none' }}>
              <i className="fas fa-wallet"></i> Accounts
            </a>
            <a href="/admin/transfers" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', padding: '12px 8px', textDecoration: 'none' }}>
              <i className="fas fa-arrow-right-arrow-left"></i> Transfers
            </a>
            <a href="/admin/cards" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', padding: '12px 8px', textDecoration: 'none' }}>
              <i className="fas fa-credit-card"></i> Cards
            </a>
            <a href="/admin/notifications" className="admin-btn admin-btn-secondary" style={{ justifyContent: 'center', padding: '12px 8px', textDecoration: 'none' }}>
              <i className="fas fa-bell"></i> Notifications
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
