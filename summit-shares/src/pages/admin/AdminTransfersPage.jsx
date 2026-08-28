import React, { useState, useEffect } from 'react';
import {
  getTransfers,
  approveTransfer,
  blockTransfer,
  holdTransfer,
  rejectTransfer,
  unblockTransfer,
  removeTransferHold,
  markTransferSent,
  markTransferCompleted,
  markTransferFailed,
  setTransferErrorMessage,
  notifyCustomer,
} from '../../api/admin';

const AdminTransfersPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, action: '', transferId: null, transferLabel: '' });
  const [errorModal, setErrorModal] = useState({ open: false, transferId: null });
  const [errorMessage, setErrorMessage] = useState('');
  const [reasonModal, setReasonModal] = useState({ open: false, transferId: null });
  const [reason, setReason] = useState('');
  const [failedModal, setFailedModal] = useState({ open: false, transferId: null });
  const [failedMessage, setFailedMessage] = useState('');
  // Tracks whichever mutating action is currently in flight, so the button
  // that was clicked shows it's working instead of the UI just sitting there
  // looking frozen, and a second click can't fire the same action twice.
  const [submitting, setSubmitting] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadTransfers = async () => {
    try {
      const data = await getTransfers({ status: statusFilter });
      setTransfers(data.transfers || []);
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTransfers(); }, [statusFilter]);

  const handleConfirmAction = async () => {
    if (submitting) return;
    setSubmitting('confirm');
    const { action, transferId } = confirmModal;
    try {
      if (action === 'approve') await approveTransfer(transferId);
      else if (action === 'block') await blockTransfer(transferId);
      else if (action === 'hold') await holdTransfer(transferId);
      else if (action === 'mark-sent') await markTransferSent(transferId);
      else if (action === 'mark-completed') await markTransferCompleted(transferId);
      else if (action === 'unblock') await unblockTransfer(transferId);
      else if (action === 'remove-hold') await removeTransferHold(transferId);
      showToast(`Transfer ${action}d successfully`);
      setConfirmModal({ open: false, action: '', transferId: null, transferLabel: '' });
      loadTransfers();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting('reject');
    try {
      await rejectTransfer(reasonModal.transferId, reason);
      showToast('Transfer rejected');
      setReasonModal({ open: false, transferId: null });
      setReason('');
      loadTransfers();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleMarkFailed = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting('mark-failed');
    try {
      await markTransferFailed(failedModal.transferId, failedMessage);
      showToast('Transfer marked as failed');
      setFailedModal({ open: false, transferId: null });
      setFailedMessage('');
      loadTransfers();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleNotify = async (id) => {
    if (submitting) return;
    setSubmitting(`notify-${id}`);
    try {
      await notifyCustomer(id);
      showToast('Customer notified');
      loadTransfers();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleSetError = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting('set-error');
    try {
      await setTransferErrorMessage(errorModal.transferId, errorMessage);
      showToast('Error message set');
      setErrorModal({ open: false, transferId: null });
      setErrorMessage('');
      loadTransfers();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const openConfirm = (action, t) => {
    setConfirmModal({ open: true, action, transferId: t.id, transferLabel: `#${t.id} - $${Number(t.amount).toLocaleString()}` });
  };

  const getStatusBadge = (status) => {
    const cls = status === 'approved' || status === 'sent' ? 'active' :
                status === 'pending' ? 'pending' :
                status === 'blocked' || status === 'failed' ? 'inactive' :
                status === 'hold' ? 'hold' : '';
    return <span className={`admin-badge-status ${cls}`}><span className="dot"></span>{status}</span>;
  };

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 12, zIndex: 99999, borderLeft: '3px solid #C9A84C' }}>{toast}</div>}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Transfer Management</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Manage wire transfers and pending transactions</p>

      <div className="admin-card">
        <div className="card-header">
          <h3>Wire Transfers</h3>
          <span style={{ fontSize: 11, color: '#6b6b6b' }}>{transfers.length} transfers</span>
        </div>
        <div className="admin-table-wrap responsive">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Customer</th><th>Beneficiary</th><th>Bank</th><th>Amount</th><th>Currency</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20, color: '#6b6b6b' }}>No transfers found</td></tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id}>
                    <td data-label="ID">#{t.id}</td>
                    <td data-label="Customer" style={{ fontWeight: 600 }}>{t.first_name} {t.last_name}</td>
                    <td data-label="Beneficiary">{t.beneficiary_name}</td>
                    <td data-label="Bank">{t.beneficiary_bank}</td>
                    <td data-label="Amount" style={{ fontWeight: 700 }}>${Number(t.amount).toLocaleString()}</td>
                    <td data-label="Currency">{t.currency}</td>
                    <td data-label="Status">{getStatusBadge(t.status)}</td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {t.status === 'pending' && (
                          <>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirm('approve', t)}>Approve</button>
                            <button className="admin-btn admin-btn-warning admin-btn-xs" onClick={() => openConfirm('hold', t)}>Hold</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => setReasonModal({ open: true, transferId: t.id })}>Reject</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openConfirm('block', t)}>Block</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleNotify(t.id)} disabled={submitting === `notify-${t.id}`}>{submitting === `notify-${t.id}` ? <i className="fas fa-spinner fa-spin"></i> : 'Notify'}</button>
                          </>
                        )}
                        {t.status === 'approved' && (
                          <>
                            <button className="admin-btn admin-btn-primary admin-btn-xs" onClick={() => openConfirm('mark-sent', t)}>Mark Sent</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openConfirm('mark-completed', t)}>Mark Completed</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => setFailedModal({ open: true, transferId: t.id })}>Mark Failed</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleNotify(t.id)} disabled={submitting === `notify-${t.id}`}>{submitting === `notify-${t.id}` ? <i className="fas fa-spinner fa-spin"></i> : 'Notify'}</button>
                          </>
                        )}
                        {t.status === 'hold' && (
                          <>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirm('approve', t)}>Approve</button>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirm('remove-hold', t)}>Remove Hold</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => setErrorModal({ open: true, transferId: t.id })}>Set Error</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleNotify(t.id)} disabled={submitting === `notify-${t.id}`}>{submitting === `notify-${t.id}` ? <i className="fas fa-spinner fa-spin"></i> : 'Notify'}</button>
                          </>
                        )}
                        {t.status === 'blocked' && (
                          <>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirm('unblock', t)}>Unblock</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleNotify(t.id)} disabled={submitting === `notify-${t.id}`}>{submitting === `notify-${t.id}` ? <i className="fas fa-spinner fa-spin"></i> : 'Notify'}</button>
                          </>
                        )}
                        {t.status === 'sent' && (
                          <>
                            <span style={{ fontSize: 10, color: '#3B82F6' }}>Sent ✓</span>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openConfirm('mark-completed', t)}>Mark Completed</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleNotify(t.id)} disabled={submitting === `notify-${t.id}`}>{submitting === `notify-${t.id}` ? <i className="fas fa-spinner fa-spin"></i> : 'Notify'}</button>
                          </>
                        )}
                        {t.status === 'completed' && <span style={{ fontSize: 10, color: '#2D9B4E' }}>Completed ✓</span>}
                        {t.status === 'failed' && <span style={{ fontSize: 10, color: '#D94352' }}>Failed: {t.error_message || ''}</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="admin-select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="hold">On Hold</option>
          <option value="blocked">Blocked</option>
          <option value="sent">Sent</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Confirm Action Modal */}
      <div className={`admin-modal-overlay ${confirmModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal({ open: false, action: '', transferId: null, transferLabel: '' }); }}>
        <div className="admin-modal" style={{ maxWidth: 400 }}>
          <div className="modal-title" style={{ textTransform: 'capitalize' }}>
            {confirmModal.action === 'mark-sent' ? 'Mark Sent' : confirmModal.action === 'mark-completed' ? 'Mark Completed' : confirmModal.action === 'remove-hold' ? 'Remove Hold' : confirmModal.action} Transfer
          </div>
          <div className="modal-sub">Are you sure you want to {confirmModal.action} transfer {confirmModal.transferLabel}?</div>
          <div className="modal-actions">
            <button className="admin-btn admin-btn-secondary" disabled={submitting === 'confirm'} onClick={() => setConfirmModal({ open: false, action: '', transferId: null, transferLabel: '' })}>Cancel</button>
            <button className={`admin-btn ${['block','reject'].includes(confirmModal.action) ? 'admin-btn-danger' : 'admin-btn-success'}`} disabled={submitting === 'confirm'} onClick={handleConfirmAction}>
              <i className={`fas ${submitting === 'confirm' ? 'fa-spinner fa-spin' : confirmModal.action === 'approve' ? 'fa-check' : confirmModal.action === 'hold' ? 'fa-pause' : confirmModal.action === 'block' ? 'fa-ban' : confirmModal.action === 'unblock' ? 'fa-unlock' : confirmModal.action === 'remove-hold' ? 'fa-play' : confirmModal.action === 'mark-sent' ? 'fa-paper-plane' : 'fa-check-circle'}`}></i>
              {' '}{submitting === 'confirm' ? 'Working…' : confirmModal.action.charAt(0).toUpperCase() + confirmModal.action.slice(1)}
            </button>
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <div className={`admin-modal-overlay ${reasonModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setReasonModal({ open: false, transferId: null }); }}>
        <div className="admin-modal" style={{ maxWidth: 450 }}>
          <div className="modal-title">Reject Transfer</div>
          <div className="modal-sub">Transfer #{reasonModal.transferId}</div>
          <form onSubmit={handleReject}>
            <div className="admin-form-group">
              <label>Rejection Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this transfer is being rejected..." rows={3} required></textarea>
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={submitting === 'reject'} onClick={() => setReasonModal({ open: false, transferId: null })}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-danger" disabled={submitting === 'reject'}><i className={`fas ${submitting === 'reject' ? 'fa-spinner fa-spin' : 'fa-times'}`}></i> {submitting === 'reject' ? 'Rejecting…' : 'Reject'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Mark Failed Modal */}
      <div className={`admin-modal-overlay ${failedModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setFailedModal({ open: false, transferId: null }); }}>
        <div className="admin-modal" style={{ maxWidth: 450 }}>
          <div className="modal-title">Mark Transfer as Failed</div>
          <div className="modal-sub">Transfer #{failedModal.transferId}</div>
          <form onSubmit={handleMarkFailed}>
            <div className="admin-form-group">
              <label>Error Description</label>
              <textarea value={failedMessage} onChange={(e) => setFailedMessage(e.target.value)} placeholder="Describe what went wrong..." rows={3} required></textarea>
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={submitting === 'mark-failed'} onClick={() => setFailedModal({ open: false, transferId: null })}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-danger" disabled={submitting === 'mark-failed'}><i className={`fas ${submitting === 'mark-failed' ? 'fa-spinner fa-spin' : 'fa-exclamation-triangle'}`}></i> {submitting === 'mark-failed' ? 'Marking…' : 'Mark Failed'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Message Modal */}
      <div className={`admin-modal-overlay ${errorModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setErrorModal({ open: false, transferId: null }); }}>
        <div className="admin-modal">
          <div className="modal-title">Set Error Message</div>
          <div className="modal-sub">Transfer #{errorModal.transferId}</div>
          <form onSubmit={handleSetError}>
            <div className="admin-form-group">
              <label>Error Message</label>
              <textarea value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)} placeholder="Describe the error..." rows={3} required></textarea>
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={submitting === 'set-error'} onClick={() => setErrorModal({ open: false, transferId: null })}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-danger" disabled={submitting === 'set-error'}><i className={`fas ${submitting === 'set-error' ? 'fa-spinner fa-spin' : 'fa-exclamation-triangle'}`}></i> {submitting === 'set-error' ? 'Saving…' : 'Set Error'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminTransfersPage;
