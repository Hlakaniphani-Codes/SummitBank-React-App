import React, { useEffect, useState } from 'react';
import { sendPopupNotification, emailCustomer, broadcastNotification, getCustomers, getEmailNotifications, retryFailedEmailNotification } from '../../api/admin';

const AdminNotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('popup');
  const [toast, setToast] = useState('');
  const [popupForm, setPopupForm] = useState({ userId: '', title: '', description: '' });
  const [emailForm, setEmailForm] = useState({ userId: '', subject: '', message: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', description: '', role: 'customer' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [emailLog, setEmailLog] = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadEmailLog = async () => {
    try {
      const data = await getEmailNotifications();
      setEmailLog(data.notifications || []);
    } catch (err) {
      console.error('Failed to load email log', err);
    }
  };

  useEffect(() => {
    loadEmailLog();
  }, []);

  const searchCustomers = async (search) => {
    setCustomerSearch(search);
    if (search.length < 2) { setCustomerResults([]); return; }
    try {
      const data = await getCustomers({ search });
      setCustomerResults(data.customers || []);
    } catch (err) { setCustomerResults([]); }
  };

  const handleSendPopup = async (e) => {
    e.preventDefault();
    try {
      await sendPopupNotification(popupForm.userId, popupForm.title, popupForm.description);
      showToast('Popup notification sent');
      setPopupForm({ userId: '', title: '', description: '' });
    } catch (err) { showToast(err.message); }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    try {
      await emailCustomer(emailForm.userId, emailForm.subject, emailForm.message);
      showToast('Email sent to customer');
      setEmailForm({ userId: '', subject: '', message: '' });
    } catch (err) { showToast(err.message); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      const data = await broadcastNotification(broadcastForm.title, broadcastForm.description, broadcastForm.role);
      showToast(`Broadcast sent to ${data.recipients} recipients`);
      setBroadcastForm({ title: '', description: '', role: 'customer' });
    } catch (err) { showToast(err.message); }
  };

  const handleRetryEmail = async (id) => {
    try {
      const result = await retryFailedEmailNotification(id);
      showToast(result.message || 'Retry attempted');
      await loadEmailLog();
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 12, zIndex: 99999, borderLeft: '3px solid #C9A84C' }}>{toast}</div>}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Notifications</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Send notifications to customers</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e1e1e' }}>
        {[
          { id: 'popup', label: 'Popup Notification' },
          { id: 'email', label: 'Email Customer' },
          { id: 'broadcast', label: 'Broadcast' },
        ].map(tab => (
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

      <div className="admin-grid-3">
        {/* Popup Notification */}
        <div className="admin-card" style={{ display: activeTab === 'popup' ? 'block' : 'none' }}>
          <div className="card-header"><h3>Send Popup Notification</h3></div>
          <form onSubmit={handleSendPopup}>
            <div className="admin-form-group">
              <label>Customer ID</label>
              <input type="number" value={popupForm.userId} onChange={(e) => setPopupForm({ ...popupForm, userId: e.target.value })} placeholder="Enter customer ID" required />
            </div>
            <div className="admin-form-group">
              <label>Title</label>
              <input type="text" value={popupForm.title} onChange={(e) => setPopupForm({ ...popupForm, title: e.target.value })} placeholder="Notification title" required />
            </div>
            <div className="admin-form-group">
              <label>Description</label>
              <textarea value={popupForm.description} onChange={(e) => setPopupForm({ ...popupForm, description: e.target.value })} placeholder="Notification message..." rows={3} required></textarea>
            </div>
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="fas fa-paper-plane"></i> Send Popup
            </button>
          </form>
        </div>

        {/* Email Customer */}
        <div className="admin-card" style={{ display: activeTab === 'email' ? 'block' : 'none' }}>
          <div className="card-header"><h3>Email Customer</h3></div>
          <form onSubmit={handleSendEmail}>
            <div className="admin-form-group">
              <label>Customer ID</label>
              <input type="number" value={emailForm.userId} onChange={(e) => setEmailForm({ ...emailForm, userId: e.target.value })} placeholder="Enter customer ID" required />
            </div>
            <div className="admin-form-group">
              <label>Subject</label>
              <input type="text" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject" required />
            </div>
            <div className="admin-form-group">
              <label>Message</label>
              <textarea value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} placeholder="Type your message..." rows={4} required></textarea>
            </div>
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="fas fa-envelope"></i> Send Email
            </button>
          </form>
        </div>

        {/* Broadcast */}
        <div className="admin-card" style={{ display: activeTab === 'broadcast' ? 'block' : 'none' }}>
          <div className="card-header"><h3>Broadcast Announcement</h3></div>
          <form onSubmit={handleBroadcast}>
            <div className="admin-form-group">
              <label>Title</label>
              <input type="text" value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} placeholder="Announcement title" required />
            </div>
            <div className="admin-form-group">
              <label>Description</label>
              <textarea value={broadcastForm.description} onChange={(e) => setBroadcastForm({ ...broadcastForm, description: e.target.value })} placeholder="Announcement message..." rows={3} required></textarea>
            </div>
            <div className="admin-form-group">
              <label>Target Role</label>
              <select value={broadcastForm.role} onChange={(e) => setBroadcastForm({ ...broadcastForm, role: e.target.value })}>
                <option value="customer">All Customers</option>
                <option value="admin">All Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
            <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="fas fa-bullhorn"></i> Broadcast
            </button>
          </form>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3>Email Delivery Log</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Event</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Recipient</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Retry</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {emailLog.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 12, color: '#6b6b6b' }}>No email activity yet.</td></tr>
              ) : emailLog.map(item => (
                <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{item.event_type}</td>
                  <td style={{ padding: 8 }}>{item.recipient_email}</td>
                  <td style={{ padding: 8 }}>{item.status}</td>
                  <td style={{ padding: 8 }}>
                    {item.status === 'failed' ? (
                      <button type="button" onClick={() => handleRetryEmail(item.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #1d4ed8', background: '#dbeafe', color: '#1e3a8a', cursor: 'pointer' }}>
                        Retry
                      </button>
                    ) : (
                      item.retry_count || 0
                    )}
                  </td>
                  <td style={{ padding: 8 }}>{item.error_message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
