import React, { useState, useEffect } from 'react';
import {
  getCustomers,
  getCustomer,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
  suspendCustomer,
  reinstateCustomer,
  deleteCustomer,
  getCustomerActivity,
  getApplications,
  approveApplication,
  rejectApplication,
  reviewApplication,
  sendCustomerEmail,
  getApplicationDetails,
  toggleLoginEnabled,
} from '../../api/admin';

const AdminCustomersPage = () => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [emailModal, setEmailModal] = useState({ open: false, customerId: null });
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [reviewModal, setReviewModal] = useState({ open: false, appId: null, action: '' });
  const [reviewNotes, setReviewNotes] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, action: '', customerId: null, customerName: '' });
  const [editModal, setEditModal] = useState({ open: false, customerId: null, formData: {} });
  const [activityModal, setActivityModal] = useState({ open: false, customerId: null, activity: [] });
  const [appDetailModal, setAppDetailModal] = useState({ open: false, appId: null, data: null });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadCustomers = async () => {
    try {
      const data = await getCustomers({ search, status: statusFilter });
      setCustomers(data.customers || []);
    } catch (err) {
      showToast(err.message);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await getApplications({ status: appStatusFilter });
      setApplications(data.applications || []);
    } catch (err) {
      showToast(err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'customers') {
      loadCustomers().finally(() => setLoading(false));
    } else {
      loadApplications().finally(() => setLoading(false));
    }
  }, [activeTab, search, statusFilter, appStatusFilter]);

  const handleViewCustomer = async (id) => {
    try {
      const data = await getCustomer(id);
      setSelectedCustomer(data.customer);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleViewApplication = async (id) => {
    try {
      const data = await getApplicationDetails(id);
      setSelectedApplication(data.application);
      setAppDetailModal({ open: true, appId: id, data: data.application });
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveApplication(id, reviewNotes);
      showToast('Application approved');
      setReviewModal({ open: false, appId: null, action: '' });
      setReviewNotes('');
      loadApplications();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectApplication(id, reviewNotes);
      showToast('Application rejected');
      setReviewModal({ open: false, appId: null, action: '' });
      setReviewNotes('');
      loadApplications();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleReview = async (id) => {
    try {
      await reviewApplication(id, reviewNotes);
      showToast('Application placed under review');
      setReviewModal({ open: false, appId: null, action: '' });
      setReviewNotes('');
      loadApplications();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    try {
      await sendCustomerEmail(emailModal.customerId, emailForm.subject, emailForm.message);
      showToast('Email sent successfully');
      setEmailModal({ open: false, customerId: null });
      setEmailForm({ subject: '', message: '' });
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCustomerAction = async () => {
    const { action, customerId } = confirmModal;
    try {
      if (action === 'activate') await activateCustomer(customerId);
      else if (action === 'deactivate') await deactivateCustomer(customerId);
      else if (action === 'suspend') await suspendCustomer(customerId);
      else if (action === 'reinstate') await reinstateCustomer(customerId);
      else if (action === 'delete') await deleteCustomer(customerId);
      showToast(`Customer ${action}d successfully`);
      setConfirmModal({ open: false, action: '', customerId: null, customerName: '' });
      loadCustomers();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      await updateCustomer(editModal.customerId, editModal.formData);
      showToast('Customer updated successfully');
      setEditModal({ open: false, customerId: null, formData: {} });
      loadCustomers();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleLogin = async (customerId, currentStatus) => {
    try {
      await toggleLoginEnabled(customerId, !currentStatus);
      showToast(`Online banking ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      loadCustomers();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleViewActivity = async (id) => {
    try {
      const data = await getCustomerActivity(id);
      setActivityModal({ open: true, customerId: id, activity: data.activity || [] });
    } catch (err) {
      showToast(err.message);
    }
  };

  const openConfirmModal = (action, customer) => {
    setConfirmModal({ open: true, action, customerId: customer.id, customerName: `${customer.first_name} ${customer.last_name}` });
  };

  const openEditModal = (customer) => {
    setEditModal({
      open: true,
      customerId: customer.id,
      formData: {
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        street: customer.street || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || '',
        country: customer.country || 'US',
        occupation: customer.occupation || '',
        login_enabled: customer.login_enabled || false,
      }
    });
  };

  const getStatusBadge = (status) => {
    const cls = status === 'approved' || status === 'active' ? 'active' :
                status === 'pending' ? 'pending' :
                status === 'rejected' || status === 'inactive' ? 'inactive' :
                status === 'review' ? 'review' : '';
    return <span className={`admin-badge-status ${cls}`}><span className="dot"></span>{status}</span>;
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 12, zIndex: 99999, borderLeft: '3px solid #C9A84C' }}>
          {toast}
        </div>
      )}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Customer Management</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Manage customers and applications</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e1e1e', paddingBottom: 0 }}>
        {['customers', 'applications'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedCustomer(null); }}
            style={{
              padding: '8px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab ? '#151515' : 'transparent',
              color: activeTab === tab ? '#C9A84C' : '#6b6b6b',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              borderBottom: activeTab === tab ? '2px solid #C9A84C' : '2px solid transparent',
            }}
          >
            {tab === 'customers' ? 'Customers' : 'Applications'}
          </button>
        ))}
      </div>

      {activeTab === 'customers' ? (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input className="admin-search-input" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="admin-select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="admin-card">
            <div className="card-header">
              <h3>All Customers</h3>
              <span style={{ fontSize: 11, color: '#6b6b6b' }}>{customers.length} customers</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20, color: '#6b6b6b' }}>No customers found</td></tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                        <td>{c.email}</td>
                        <td>{c.phone || '—'}</td>
                        <td>
                          {getStatusBadge(c.is_active ? 'active' : 'inactive')}
                          <span style={{ fontSize: 9, marginLeft: 6, color: c.login_enabled ? '#2D9B4E' : '#D94352' }}>
                            (Online Banking: {c.login_enabled ? 'ON' : 'OFF'})
                          </span>
                        </td>
                        <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleViewCustomer(c.id)} title="View Details"><i className="fas fa-eye"></i></button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openEditModal(c)} title="Edit"><i className="fas fa-pen"></i></button>
                            {c.is_active ? (
                              <>
                                <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirmModal('activate', c)} title="Activate"><i className="fas fa-check-circle"></i></button>
                                <button className="admin-btn admin-btn-warning admin-btn-xs" onClick={() => openConfirmModal('deactivate', c)} title="Deactivate"><i className="fas fa-pause-circle"></i></button>
                                <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openConfirmModal('suspend', c)} title="Suspend"><i className="fas fa-ban"></i></button>
                              </>
                            ) : (
                              <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirmModal('reinstate', c)} title="Reinstate"><i className="fas fa-undo"></i></button>
                            )}
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleViewActivity(c.id)} title="Activity"><i className="fas fa-history"></i></button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => setEmailModal({ open: true, customerId: c.id })} title="Email"><i className="fas fa-envelope"></i></button>
                            <button className="admin-btn admin-btn-primary admin-btn-xs" onClick={() => handleToggleLogin(c.id, c.login_enabled)} title="Toggle Online Banking">
                              {c.login_enabled ? <i className="fas fa-lock"></i> : <i className="fas fa-unlock"></i>}
                            </button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openConfirmModal('delete', c)} title="Delete"><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Existing modals (selectedCustomer, confirm, edit, activity, email) remain the same */}
          {selectedCustomer && (
            <div className="admin-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCustomer(null); }}>
              <div className="admin-modal" style={{ maxWidth: 700 }}>
                <div className="modal-title">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                <div className="modal-sub">{selectedCustomer.email} • {selectedCustomer.phone || 'No phone'}</div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <div className="admin-grid-2" style={{ marginBottom: 16 }}>
                    <div><span style={{ color: '#6b6b6b', fontSize: 10 }}>Status:</span> {getStatusBadge(selectedCustomer.is_active ? 'active' : 'inactive')}</div>
                    <div><span style={{ color: '#6b6b6b', fontSize: 10 }}>Role:</span> {selectedCustomer.role}</div>
                    <div><span style={{ color: '#6b6b6b', fontSize: 10 }}>Joined:</span> {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : '—'}</div>
                    <div><span style={{ color: '#6b6b6b', fontSize: 10 }}>Last Login:</span> {selectedCustomer.last_login_at ? new Date(selectedCustomer.last_login_at).toLocaleString() : 'Never'}</div>
                    <div><span style={{ color: '#6b6b6b', fontSize: 10 }}>Online Banking:</span> {selectedCustomer.login_enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 8 }}>Accounts ({selectedCustomer.accounts?.length || 0})</h4>
                  <div className="admin-table-wrap" style={{ marginBottom: 16 }}>
                    <table className="admin-table">
                      <thead><tr><th>Type</th><th>Number</th><th>Balance</th><th>Status</th></tr></thead>
                      <tbody>
                        {selectedCustomer.accounts?.map(a => (
                          <tr key={a.id}>
                            <td style={{ textTransform: 'capitalize' }}>{a.account_type}</td>
                            <td>{a.account_number}</td>
                            <td>${Number(a.balance).toLocaleString()}</td>
                            <td>{getStatusBadge(a.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 8 }}>Cards ({selectedCustomer.cards?.length || 0})</h4>
                  <div className="admin-table-wrap" style={{ marginBottom: 16 }}>
                    <table className="admin-table">
                      <thead><tr><th>Type</th><th>Last4</th><th>Network</th><th>Status</th></tr></thead>
                      <tbody>
                        {selectedCustomer.cards?.map(c => (
                          <tr key={c.id}>
                            <td style={{ textTransform: 'capitalize' }}>{c.card_type}</td>
                            <td>**** {c.last4}</td>
                            <td style={{ textTransform: 'uppercase' }}>{c.card_network}</td>
                            <td>{getStatusBadge(c.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="admin-btn admin-btn-secondary" onClick={() => setSelectedCustomer(null)}>Close</button>
                  <button className="admin-btn admin-btn-primary" onClick={() => { setEmailModal({ open: true, customerId: selectedCustomer.id }); setSelectedCustomer(null); }}>Email Customer</button>
                  <button className="admin-btn admin-btn-primary" onClick={() => handleToggleLogin(selectedCustomer.id, selectedCustomer.login_enabled)}>
                    {selectedCustomer.login_enabled ? 'Disable' : 'Enable'} Online Banking
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Action Modal */}
          <div className={`admin-modal-overlay ${confirmModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal({ open: false, action: '', customerId: null, customerName: '' }); }}>
            <div className="admin-modal" style={{ maxWidth: 400 }}>
              <div className="modal-title" style={{ textTransform: 'capitalize' }}>{confirmModal.action} Customer</div>
              <div className="modal-sub">Are you sure you want to {confirmModal.action} <strong>{confirmModal.customerName}</strong>?</div>
              <div className="modal-actions">
                <button className="admin-btn admin-btn-secondary" onClick={() => setConfirmModal({ open: false, action: '', customerId: null, customerName: '' })}>Cancel</button>
                <button className={`admin-btn ${confirmModal.action === 'delete' || confirmModal.action === 'suspend' || confirmModal.action === 'deactivate' ? 'admin-btn-danger' : 'admin-btn-success'}`} onClick={handleCustomerAction}>
                  <i className={`fas ${confirmModal.action === 'delete' ? 'fa-trash' : confirmModal.action === 'suspend' ? 'fa-ban' : confirmModal.action === 'deactivate' ? 'fa-pause' : 'fa-check'}`}></i>
                  {' '}{confirmModal.action.charAt(0).toUpperCase() + confirmModal.action.slice(1)}
                </button>
              </div>
            </div>
          </div>

          {/* Edit Customer Modal */}
          <div className={`admin-modal-overlay ${editModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setEditModal({ open: false, customerId: null, formData: {} }); }}>
            <div className="admin-modal" style={{ maxWidth: 600 }}>
              <div className="modal-title">Edit Customer</div>
              <div className="modal-sub">Customer ID: {editModal.customerId}</div>
              <form onSubmit={handleEditCustomer}>
                <div className="admin-grid-2">
                  <div className="admin-form-group">
                    <label>First Name</label>
                    <input type="text" value={editModal.formData.first_name || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, first_name: e.target.value } })} required />
                  </div>
                  <div className="admin-form-group">
                    <label>Last Name</label>
                    <input type="text" value={editModal.formData.last_name || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, last_name: e.target.value } })} required />
                  </div>
                  <div className="admin-form-group">
                    <label>Email</label>
                    <input type="email" value={editModal.formData.email || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, email: e.target.value } })} required />
                  </div>
                  <div className="admin-form-group">
                    <label>Phone</label>
                    <input type="text" value={editModal.formData.phone || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, phone: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Street</label>
                    <input type="text" value={editModal.formData.street || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, street: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>City</label>
                    <input type="text" value={editModal.formData.city || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, city: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>State</label>
                    <input type="text" value={editModal.formData.state || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, state: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>ZIP</label>
                    <input type="text" value={editModal.formData.zip || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, zip: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Country</label>
                    <input type="text" value={editModal.formData.country || 'US'} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, country: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Occupation</label>
                    <input type="text" value={editModal.formData.occupation || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, occupation: e.target.value } })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Online Banking Access</label>
                    <select value={editModal.formData.login_enabled ? 'true' : 'false'} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, login_enabled: e.target.value === 'true' } })}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditModal({ open: false, customerId: null, formData: {} })}>Cancel</button>
                  <button type="submit" className="admin-btn admin-btn-primary"><i className="fas fa-save"></i> Save Changes</button>
                </div>
              </form>
            </div>
          </div>

          {/* Activity Modal */}
          <div className={`admin-modal-overlay ${activityModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setActivityModal({ open: false, customerId: null, activity: [] }); }}>
            <div className="admin-modal" style={{ maxWidth: 700 }}>
              <div className="modal-title">Customer Activity</div>
              <div className="modal-sub">Customer ID: {activityModal.customerId}</div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {activityModal.activity.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b6b6b', padding: 20 }}>No activity found</p>
                ) : (
                  activityModal.activity.map((log, idx) => (
                    <div key={log.id || idx} className="admin-activity-item">
                      <div className="activity-icon" style={{ background: '#C9A84C15', color: '#C9A84C' }}>
                        <i className="fas fa-circle"></i>
                      </div>
                      <div className="activity-content">
                        <div className="activity-desc">{log.description || log.action}</div>
                        <div className="activity-time">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="modal-actions">
                <button className="admin-btn admin-btn-secondary" onClick={() => setActivityModal({ open: false, customerId: null, activity: [] })}>Close</button>
              </div>
            </div>
          </div>

          <div className={`admin-modal-overlay ${emailModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setEmailModal({ open: false, customerId: null }); }}>
            <div className="admin-modal">
              <div className="modal-title">Send Email to Customer</div>
              <div className="modal-sub">Customer ID: {emailModal.customerId}</div>
              <form onSubmit={handleSendEmail}>
                <div className="admin-form-group">
                  <label>Subject</label>
                  <input type="text" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject" required />
                </div>
                <div className="admin-form-group">
                  <label>Message</label>
                  <textarea value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} placeholder="Type your message..." required rows={4}></textarea>
                </div>
                <div className="modal-actions">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEmailModal({ open: false, customerId: null })}>Cancel</button>
                  <button type="submit" className="admin-btn admin-btn-primary"><i className="fas fa-paper-plane"></i> Send</button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="admin-select-input" value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="review">Under Review</option>
            </select>
          </div>

          <div className="admin-card">
            <div className="card-header">
              <h3>Applications</h3>
              <span style={{ fontSize: 11, color: '#6b6b6b' }}>{applications.length} applications</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>ID</th><th>Customer</th><th>Type</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20, color: '#6b6b6b' }}>No applications found</td></tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id}>
                        <td>#{app.id}</td>
                        <td style={{ fontWeight: 600 }}>{app.first_name} {app.last_name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{app.application_type}</td>
                        <td>{getStatusBadge(app.status)}</td>
                        <td>{app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleViewApplication(app.id)} title="View Details"><i className="fas fa-eye"></i></button>
                          {app.status === 'pending' && (
                            <>
                              <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => setReviewModal({ open: true, appId: app.id, action: 'approve' })}>Approve</button>
                              <button className="admin-btn admin-btn-warning admin-btn-xs" style={{ marginLeft: 4 }} onClick={() => setReviewModal({ open: true, appId: app.id, action: 'review' })}>Review</button>
                              <button className="admin-btn admin-btn-danger admin-btn-xs" style={{ marginLeft: 4 }} onClick={() => setReviewModal({ open: true, appId: app.id, action: 'reject' })}>Reject</button>
                            </>
                          )}
                          {app.status !== 'pending' && <span style={{ fontSize: 10, color: '#6b6b6b' }}>Processed</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Application Detail Modal */}
          <div className={`admin-modal-overlay ${appDetailModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setAppDetailModal({ open: false, appId: null, data: null }); }}>
            <div className="admin-modal" style={{ maxWidth: 700 }}>
              <div className="modal-title">Application Details</div>
              <div className="modal-sub">Application #{appDetailModal.appId}</div>
              {appDetailModal.data && (
                <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                  <div className="admin-grid-2">
                    <div className="admin-form-group"><label>First Name</label><div>{appDetailModal.data.first_name}</div></div>
                    <div className="admin-form-group"><label>Last Name</label><div>{appDetailModal.data.last_name}</div></div>
                    <div className="admin-form-group"><label>Email</label><div>{appDetailModal.data.email}</div></div>
                    <div className="admin-form-group"><label>Phone</label><div>{appDetailModal.data.phone || '—'}</div></div>
                    <div className="admin-form-group"><label>Date of Birth</label><div>{appDetailModal.data.date_of_birth ? new Date(appDetailModal.data.date_of_birth).toLocaleDateString() : '—'}</div></div>
                    <div className="admin-form-group"><label>SSN (encrypted)</label><div>•••••••••</div></div>
                    <div className="admin-form-group"><label>Address</label><div>{appDetailModal.data.street}, {appDetailModal.data.city}, {appDetailModal.data.state} {appDetailModal.data.zip}, {appDetailModal.data.country}</div></div>
                    <div className="admin-form-group"><label>Occupation</label><div>{appDetailModal.data.occupation || '—'}</div></div>
                    <div className="admin-form-group"><label>Employer</label><div>{appDetailModal.data.employer || '—'}</div></div>
                    <div className="admin-form-group"><label>Income</label><div>{appDetailModal.data.income_range || '—'}</div></div>
                    <div className="admin-form-group"><label>Source of Funds</label><div>{appDetailModal.data.source_of_funds || '—'}</div></div>
                    <div className="admin-form-group"><label>Doc Type</label><div>{appDetailModal.data.doc_type || '—'}</div></div>
                  </div>
                  {appDetailModal.data.metadata && (
                    <div className="admin-form-group">
                      <label>Additional Metadata</label>
                      <pre style={{ background: '#1a1a1a', padding: 10, borderRadius: 6, fontSize: 11, color: '#C9A84C' }}>
                        {JSON.stringify(appDetailModal.data.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              <div className="modal-actions">
                <button className="admin-btn admin-btn-secondary" onClick={() => setAppDetailModal({ open: false, appId: null, data: null })}>Close</button>
                {appDetailModal.data?.status === 'pending' && (
                  <>
                    <button className="admin-btn admin-btn-success" onClick={() => { handleApprove(appDetailModal.appId); setAppDetailModal({ open: false, appId: null, data: null }); }}>Approve</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => { handleReject(appDetailModal.appId); setAppDetailModal({ open: false, appId: null, data: null }); }}>Reject</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Review Modal */}
          <div className={`admin-modal-overlay ${reviewModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setReviewModal({ open: false, appId: null, action: '' }); }}>
            <div className="admin-modal">
              <div className="modal-title">{reviewModal.action === 'approve' ? 'Approve' : reviewModal.action === 'reject' ? 'Reject' : 'Review'} Application</div>
              <div className="modal-sub">Application #{reviewModal.appId}</div>
              <div className="admin-form-group">
                <label>Notes (optional)</label>
                <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes about this decision..." rows={3}></textarea>
              </div>
              <div className="modal-actions">
                <button className="admin-btn admin-btn-secondary" onClick={() => setReviewModal({ open: false, appId: null, action: '' })}>Cancel</button>
                {reviewModal.action === 'approve' && <button className="admin-btn admin-btn-success" onClick={() => handleApprove(reviewModal.appId)}><i className="fas fa-check"></i> Approve</button>}
                {reviewModal.action === 'reject' && <button className="admin-btn admin-btn-danger" onClick={() => handleReject(reviewModal.appId)}><i className="fas fa-times"></i> Reject</button>}
                {reviewModal.action === 'review' && <button className="admin-btn admin-btn-warning" onClick={() => handleReview(reviewModal.appId)}><i className="fas fa-search"></i> Place Under Review</button>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCustomersPage;