import React, { useState, useEffect } from 'react';
import { getLoginHistory, getUserActivity, getAdminActivity, getAuditLogs } from '../../api/admin';

const AdminAuditPage = () => {
  const [activeTab, setActiveTab] = useState('login-history');
  const [loginHistory, setLoginHistory] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [adminActivity, setAdminActivity] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '', action: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'login-history') {
        const data = await getLoginHistory({ startDate: filters.startDate, endDate: filters.endDate, status: filters.status });
        setLoginHistory(data.history || []);
      } else if (activeTab === 'user-activity') {
        const data = await getUserActivity({ startDate: filters.startDate, endDate: filters.endDate });
        setUserActivity(data.activity || []);
      } else if (activeTab === 'admin-activity') {
        const data = await getAdminActivity({ startDate: filters.startDate, endDate: filters.endDate, action: filters.action });
        setAdminActivity(data.activity || []);
      } else if (activeTab === 'audit-logs') {
        const data = await getAuditLogs({ startDate: filters.startDate, endDate: filters.endDate, action: filters.action });
        setAuditLogs(data.logs || []);
      }
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const getStatusBadge = (status) => {
    const cls = status === 'success' ? 'active' : status === 'failed' ? 'inactive' : status === 'locked' ? 'inactive' : '';
    return <span className={`admin-badge-status ${cls}`}><span className="dot"></span>{status}</span>;
  };

  const getActionColor = (action) => {
    const colors = { login: '#3B82F6', logout: '#6b6b6b', create: '#2D9B4E', update: '#E8A838', delete: '#D94352', approve: '#2D9B4E', reject: '#D94352', credit: '#2D9B4E', debit: '#D94352', hold: '#8B5CF6', unhold: '#2D9B4E', activate: '#2D9B4E', deactivate: '#D94352', send_email: '#3B82F6', broadcast: '#E8A838', view: '#6b6b6b' };
    return colors[action] || '#6b6b6b';
  };

  const tabs = [
    { id: 'login-history', label: 'Login History' },
    { id: 'user-activity', label: 'User Activity' },
    { id: 'admin-activity', label: 'Admin Activity' },
    { id: 'audit-logs', label: 'Audit Logs' },
  ];

  const renderTable = (data, columns) => (
    <div className="admin-table-wrap responsive">
      <table className="admin-table">
        <thead><tr>{columns.map((col, i) => <th key={i}>{col.label}</th>)}</tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 20, color: '#6b6b6b' }}>No data found</td></tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col, i) => (
                  <td key={i} data-label={col.label} style={col.style || {}}>
                    {col.render ? col.render(row) : row[col.key] || '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 12, zIndex: 99999, borderLeft: '3px solid #C9A84C' }}>{toast}</div>}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Audit & Security</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Monitor system activity and security logs</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e1e1e' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? '#151515' : 'transparent',
              color: activeTab === tab.id ? '#C9A84C' : '#6b6b6b',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #C9A84C' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="admin-search-input" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} placeholder="Start date" style={{ width: 140 }} />
        <input className="admin-search-input" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} placeholder="End date" style={{ width: 140 }} />
        {(activeTab === 'login-history') && (
          <select className="admin-select-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="locked">Locked</option>
          </select>
        )}
        {(activeTab === 'admin-activity' || activeTab === 'audit-logs') && (
          <select className="admin-select-input" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="hold">Hold</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="send_email">Send Email</option>
            <option value="broadcast">Broadcast</option>
          </select>
        )}
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={loadData}><i className="fas fa-search"></i> Filter</button>
      </div>

      <div className="admin-card">
        <div className="card-header">
          <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
        </div>
        {activeTab === 'login-history' && renderTable(loginHistory, [
          { label: 'User', key: 'email', render: (r) => <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span> },
          { label: 'Email', key: 'email' },
          { label: 'Status', render: (r) => getStatusBadge(r.status) },
          { label: 'IP Address', key: 'ip_address' },
          { label: 'Device', key: 'device_name' },
          { label: 'Location', key: 'location' },
          { label: 'Time', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
        ])}
        {activeTab === 'user-activity' && renderTable(userActivity, [
          { label: 'User', render: (r) => <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span> },
          { label: 'Action', render: (r) => <span style={{ color: getActionColor(r.action) }}>{r.action}</span> },
          { label: 'Entity', key: 'entity_type' },
          { label: 'Description', key: 'description' },
          { label: 'Time', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
        ])}
        {activeTab === 'admin-activity' && renderTable(adminActivity, [
          { label: 'Admin', render: (r) => <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span> },
          { label: 'Email', key: 'email' },
          { label: 'Action', render: (r) => <span style={{ color: getActionColor(r.action) }}>{r.action}</span> },
          { label: 'Entity', key: 'entity_type' },
          { label: 'Description', key: 'description' },
          { label: 'Time', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
        ])}
        {activeTab === 'audit-logs' && renderTable(auditLogs, [
          { label: 'Admin', render: (r) => <span style={{ fontWeight: 600 }}>{r.admin_first || 'System'} {r.admin_last || ''}</span> },
          { label: 'User', render: (r) => r.first_name ? `${r.first_name} ${r.last_name}` : '—' },
          { label: 'Action', render: (r) => <span style={{ color: getActionColor(r.action) }}>{r.action}</span> },
          { label: 'Entity', key: 'entity_type' },
          { label: 'Description', key: 'description' },
          { label: 'IP', key: 'ip_address' },
          { label: 'Time', render: (r) => r.created_at ? new Date(r.created_at).toLocaleString() : '—' },
        ])}
      </div>
    </div>
  );
};

export default AdminAuditPage;
