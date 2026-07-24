import React, { useState, useEffect } from 'react';
import {
  getAccounts,
  createAccount,
  updateAccount,
  creditAccount,
  debitAccount,
  editAccountBalance,
  activateAccount,
  deactivateAccount,
  closeAccount,
  reopenAccount,
  freezeAccount,
  unfreezeAccount,
  holdAccount,
  removeAccountHold,
  deleteAccount,
  getAccountTransactions,
  getAccountDetails,
  adjustAvailableBalance,
  adjustLedgerBalance,
  getCustomers,
} from '../../api/admin';

const AdminAccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState({ open: false, type: '', accountId: null });
  const [formData, setFormData] = useState({ amount: '', description: '', newBalance: '' });
  const [createModal, setCreateModal] = useState({ open: false });
  const [createForm, setCreateForm] = useState({ userId: '', accountType: 'checking', currency: 'USD', initialBalance: '0', routingNumber: '' });
  const [customers, setCustomers] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: '', accountId: null, accountNumber: '' });
  const [txModal, setTxModal] = useState({ open: false, accountId: null, transactions: [] });
  const [editModal, setEditModal] = useState({ open: false, accountId: null, formData: {} });
  const [detailModal, setDetailModal] = useState({ open: false, accountId: null, details: null });
  const [balModal, setBalModal] = useState({ open: false, type: '', accountId: null });
  const [balForm, setBalForm] = useState({ newBalance: '' });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadAccounts = async () => {
    try {
      const data = await getAccounts({ search, status: statusFilter, type: typeFilter });
      setAccounts(data.accounts || []);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, [search, statusFilter, typeFilter]);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers({});
      setCustomers(data.customers || []);
    } catch (err) {
      showToast(err.message);
    }
  };

  const openModal = (type, accountId, currentBalance = '') => {
    setModal({ open: true, type, accountId });
    setFormData({ amount: '', description: '', newBalance: currentBalance });
  };

  const openConfirmModal = (action, account) => {
    setConfirmModal({ open: true, action, accountId: account.id, accountNumber: account.account_number });
  };

  const openTxModal = async (accountId) => {
    try {
      const data = await getAccountTransactions(accountId);
      setTxModal({ open: true, accountId, transactions: data.transactions || [] });
    } catch (err) {
      showToast(err.message);
    }
  };

  const openEditModal = (account) => {
    setEditModal({ open: true, accountId: account.id, formData: { account_type: account.account_type, currency: account.currency, routing_number: account.routing_number || '' } });
  };

  const openDetailModal = async (accountId) => {
    try {
      const data = await getAccountDetails(accountId);
      setDetailModal({ open: true, accountId, details: data.details || data });
    } catch (err) {
      showToast(err.message);
    }
  };

  const openBalModal = (type, accountId, currentBalance = '') => {
    setBalModal({ open: true, type, accountId });
    setBalForm({ newBalance: currentBalance });
  };

  const handleBalSubmit = async (e) => {
    e.preventDefault();
    const { accountId, type } = balModal;
    try {
      if (type === 'available') {
        await adjustAvailableBalance(accountId, balForm.newBalance);
        showToast('Available balance adjusted successfully');
      } else if (type === 'ledger') {
        await adjustLedgerBalance(accountId, balForm.newBalance);
        showToast('Ledger balance adjusted successfully');
      }
      setBalModal({ open: false, type: '', accountId: null });
      setBalForm({ newBalance: '' });
      loadAccounts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await createAccount(createForm);
      showToast('Account created successfully');
      setCreateModal({ open: false });
      loadAccounts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleEditAccount = async (e) => {
    e.preventDefault();
    try {
      await updateAccount(editModal.accountId, editModal.formData);
      showToast('Account updated successfully');
      setEditModal({ open: false, accountId: null, formData: {} });
      loadAccounts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleConfirmAction = async () => {
    const { action, accountId } = confirmModal;
    try {
      if (action === 'activate') await activateAccount(accountId);
      else if (action === 'deactivate') await deactivateAccount(accountId);
      else if (action === 'close') await closeAccount(accountId);
      else if (action === 'reopen') await reopenAccount(accountId);
      else if (action === 'freeze') await freezeAccount(accountId);
      else if (action === 'unfreeze') await unfreezeAccount(accountId);
      else if (action === 'delete') await deleteAccount(accountId);
      showToast(`Account ${action}d successfully`);
      setConfirmModal({ open: false, action: '', accountId: null, accountNumber: '' });
      loadAccounts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { accountId, type } = modal;
    try {
      if (type === 'credit') {
        await creditAccount(accountId, formData.amount, formData.description);
        showToast('Account credited successfully');
      } else if (type === 'debit') {
        await debitAccount(accountId, formData.amount, formData.description);
        showToast('Account debited successfully');
      } else if (type === 'balance') {
        await editAccountBalance(accountId, formData.newBalance);
        showToast('Balance updated successfully');
      } else if (type === 'hold') {
        await holdAccount(accountId);
        showToast('Account placed on hold');
      } else if (type === 'unhold') {
        await removeAccountHold(accountId);
        showToast('Hold removed from account');
      }
      setModal({ open: false, type: '', accountId: null });
      loadAccounts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const cls = status === 'active' ? 'active' : status === 'inactive' ? 'inactive' : status === 'closed' ? 'inactive' : '';
    return <span className={`admin-badge-status ${cls}`}><span className="dot"></span>{status}</span>;
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 12, zIndex: 99999, borderLeft: '3px solid #C9A84C' }}>{toast}</div>
      )}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Account Management</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Manage all customer accounts</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="admin-search-input" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="admin-select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
        <select className="admin-select-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="checking">Checking</option>
          <option value="savings">Savings</option>
        </select>
      </div>

      <div className="admin-card">
        <div className="card-header">
          <h3>All Accounts</h3>
          <span style={{ fontSize: 11, color: '#6b6b6b' }}>{accounts.length} accounts</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Customer</th><th>Type</th><th>Number</th><th>Balance</th><th>Currency</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20, color: '#6b6b6b' }}>No accounts found</td></tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.account_type}</td>
                    <td>{a.account_number}</td>
                    <td style={{ fontWeight: 700 }}>${Number(a.balance).toLocaleString()}</td>
                    <td>{a.currency}</td>
                    <td>{getStatusBadge(a.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openDetailModal(a.id)} title="View Details"><i className="fas fa-eye"></i></button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openEditModal(a)} title="Edit"><i className="fas fa-pen"></i></button>
                        <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openModal('credit', a.id)} title="Credit"><i className="fas fa-plus"></i></button>
                        <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openModal('debit', a.id)} title="Debit"><i className="fas fa-minus"></i></button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openModal('balance', a.id, a.balance)} title="Edit Balance"><i className="fas fa-dollar-sign"></i></button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openBalModal('available', a.id, a.balance)} title="Adjust Available"><i className="fas fa-hand"></i></button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openBalModal('ledger', a.id, a.balance)} title="Adjust Ledger"><i className="fas fa-book"></i></button>
                        <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirmModal('activate', a)} title="Activate"><i className="fas fa-check-circle"></i></button>
                        <button className="admin-btn admin-btn-warning admin-btn-xs" onClick={() => openConfirmModal('deactivate', a)} title="Deactivate"><i className="fas fa-pause-circle"></i></button>
                        <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openConfirmModal('close', a)} title="Close"><i className="fas fa-times-circle"></i></button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openConfirmModal('reopen', a)} title="Reopen"><i className="fas fa-undo-alt"></i></button>
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openConfirmModal('freeze', a)} title="Freeze"><i className="fas fa-snowflake"></i></button>
                        <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openConfirmModal('unfreeze', a)} title="Unfreeze"><i className="fas fa-fire"></i></button>
                        {a.status === 'active' ? (
                          <button className="admin-btn admin-btn-warning admin-btn-xs" onClick={() => openModal('hold', a.id)} title="Hold"><i className="fas fa-pause"></i></button>
                        ) : (
                          <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openModal('unhold', a.id)} title="Remove Hold"><i className="fas fa-play"></i></button>
                        )}
                        <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => openTxModal(a.id)} title="View Transactions"><i className="fas fa-list"></i></button>
                        <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openConfirmModal('delete', a)} title="Delete"><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Button */}
      <div style={{ marginBottom: 16 }}>
        <button className="admin-btn admin-btn-primary" onClick={() => { setCreateModal({ open: true }); loadCustomers(); }}><i className="fas fa-plus"></i> Create Account</button>
      </div>

      {/* Create Account Modal */}
      <div className={`admin-modal-overlay ${createModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setCreateModal({ open: false }); }}>
        <div className="admin-modal" style={{ maxWidth: 500 }}>
          <div className="modal-title">Create Account</div>
          <form onSubmit={handleCreateAccount}>
            <div className="admin-form-group">
              <label>Customer</label>
              <select value={createForm.userId} onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })} required>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>)}
              </select>
            </div>
            <div className="admin-grid-2">
              <div className="admin-form-group">
                <label>Account Type</label>
                <select value={createForm.accountType} onChange={(e) => setCreateForm({ ...createForm, accountType: e.target.value })}>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Currency</label>
                <select value={createForm.currency} onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Initial Balance ($)</label>
                <input type="number" step="0.01" min="0" value={createForm.initialBalance} onChange={(e) => setCreateForm({ ...createForm, initialBalance: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Routing Number</label>
                <input type="text" value={createForm.routingNumber} onChange={(e) => setCreateForm({ ...createForm, routingNumber: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setCreateModal({ open: false })}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary"><i className="fas fa-save"></i> Create Account</button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirm Action Modal */}
      <div className={`admin-modal-overlay ${confirmModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal({ open: false, action: '', accountId: null, accountNumber: '' }); }}>
        <div className="admin-modal" style={{ maxWidth: 400 }}>
          <div className="modal-title" style={{ textTransform: 'capitalize' }}>{confirmModal.action} Account</div>
          <div className="modal-sub">Are you sure you want to {confirmModal.action} account <strong>{confirmModal.accountNumber}</strong>?</div>
          <div className="modal-actions">
            <button className="admin-btn admin-btn-secondary" onClick={() => setConfirmModal({ open: false, action: '', accountId: null, accountNumber: '' })}>Cancel</button>
            <button className={`admin-btn ${['close','deactivate','delete','freeze'].includes(confirmModal.action) ? 'admin-btn-danger' : 'admin-btn-success'}`} onClick={handleConfirmAction}>
              <i className={`fas ${confirmModal.action === 'activate' ? 'fa-check-circle' : confirmModal.action === 'deactivate' ? 'fa-pause-circle' : confirmModal.action === 'close' ? 'fa-times-circle' : confirmModal.action === 'reopen' ? 'fa-undo-alt' : confirmModal.action === 'freeze' ? 'fa-snowflake' : confirmModal.action === 'unfreeze' ? 'fa-fire' : 'fa-trash'}`}></i>
              {' '}{confirmModal.action.charAt(0).toUpperCase() + confirmModal.action.slice(1)}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Account Modal */}
      <div className={`admin-modal-overlay ${editModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setEditModal({ open: false, accountId: null, formData: {} }); }}>
        <div className="admin-modal" style={{ maxWidth: 450 }}>
          <div className="modal-title">Edit Account</div>
          <div className="modal-sub">Account #{editModal.accountId}</div>
          <form onSubmit={handleEditAccount}>
            <div className="admin-form-group">
              <label>Account Type</label>
              <select value={editModal.formData.account_type || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, account_type: e.target.value } })}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Currency</label>
              <select value={editModal.formData.currency || 'USD'} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, currency: e.target.value } })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Routing Number</label>
              <input type="text" value={editModal.formData.routing_number || ''} onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, routing_number: e.target.value } })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditModal({ open: false, accountId: null, formData: {} })}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary"><i className="fas fa-save"></i> Save</button>
            </div>
          </form>
        </div>
      </div>

      {/* Transactions Modal */}
      <div className={`admin-modal-overlay ${txModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setTxModal({ open: false, accountId: null, transactions: [] }); }}>
        <div className="admin-modal" style={{ maxWidth: 700 }}>
          <div className="modal-title">Account Transactions</div>
          <div className="modal-sub">Account #{txModal.accountId}</div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {txModal.transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b6b6b', padding: 20 }}>No transactions found</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Amount</th><th>Type</th><th>Description</th><th>Date</th></tr></thead>
                  <tbody>
                    {txModal.transactions.map((tx, idx) => (
                      <tr key={tx.transaction_id || idx}>
                        <td style={{ fontSize: 10 }}>{tx.transaction_id?.slice(0, 16) || '—'}</td>
                        <td style={{ fontWeight: 700, color: tx.amount > 0 ? '#2D9B4E' : '#D94352' }}>${Number(tx.amount).toLocaleString()}</td>
                        <td style={{ textTransform: 'capitalize' }}>{tx.type}</td>
                        <td>{tx.description}</td>
                        <td>{tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="admin-btn admin-btn-secondary" onClick={() => setTxModal({ open: false, accountId: null, transactions: [] })}>Close</button>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      <div className={`admin-modal-overlay ${detailModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setDetailModal({ open: false, accountId: null, details: null }); }}>
        <div className="admin-modal" style={{ maxWidth: 600 }}>
          <div className="modal-title">Account Details</div>
          <div className="modal-sub">Detailed view of account #{detailModal.accountId}</div>
          {detailModal.details && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="admin-form-group">
                <label>Account Number</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6, color: '#C9A84C', fontWeight: 600 }}>{detailModal.details.account_number}</div>
              </div>
              <div className="admin-form-group">
                <label>Account Type</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6, textTransform: 'capitalize' }}>{detailModal.details.account_type}</div>
              </div>
              <div className="admin-form-group">
                <label>Customer Name</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.first_name} {detailModal.details.last_name}</div>
              </div>
              <div className="admin-form-group">
                <label>Email</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.email}</div>
              </div>
              <div className="admin-form-group">
                <label>Phone</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.phone || '—'}</div>
              </div>
              <div className="admin-form-group">
                <label>Balance</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6, fontWeight: 700, color: '#C9A84C' }}>${Number(detailModal.details.balance).toLocaleString()}</div>
              </div>
              <div className="admin-form-group">
                <label>Currency</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.currency}</div>
              </div>
              <div className="admin-form-group">
                <label>Routing Number</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.routing_number || '—'}</div>
              </div>
              <div className="admin-form-group">
                <label>Status</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6, textTransform: 'capitalize' }}>{detailModal.details.status}</div>
              </div>
              <div className="admin-form-group">
                <label>Opened At</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.opened_at ? new Date(detailModal.details.opened_at).toLocaleDateString() : '—'}</div>
              </div>
              <div className="admin-form-group">
                <label>Customer Active</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6 }}>{detailModal.details.user_active ? 'Yes' : 'No'}</div>
              </div>
              <div className="admin-form-group">
                <label>Account ID</label>
                <div style={{ background: '#1a1a1a', padding: '8px 12px', borderRadius: 6, fontSize: 10 }}>#{detailModal.details.id}</div>
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button className="admin-btn admin-btn-secondary" onClick={() => setDetailModal({ open: false, accountId: null, details: null })}>Close</button>
          </div>
        </div>
      </div>

      {/* Balance Adjustment Modal (Available/Ledger) */}
      <div className={`admin-modal-overlay ${balModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setBalModal({ open: false, type: '', accountId: null }); }}>
        <div className="admin-modal" style={{ maxWidth: 400 }}>
          <div className="modal-title">
            {balModal.type === 'available' ? 'Adjust Available Balance' : 'Adjust Ledger Balance'}
          </div>
          <div className="modal-sub">Account #{balModal.accountId}</div>
          <form onSubmit={handleBalSubmit}>
            <div className="admin-form-group">
              <label>New {balModal.type === 'available' ? 'Available' : 'Ledger'} Balance ($)</label>
              <input type="number" step="0.01" min="0" value={balForm.newBalance} onChange={(e) => setBalForm({ ...balForm, newBalance: e.target.value })} required />
            </div>
            <p style={{ fontSize: 11, color: '#6b6b6b', marginTop: -8, marginBottom: 16 }}>
              {balModal.type === 'available' 
                ? 'Sets the available balance (funds accessible for withdrawal/use).' 
                : 'Sets the ledger balance (total book balance including pending transactions).'}
            </p>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setBalModal({ open: false, type: '', accountId: null })}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary"><i className="fas fa-save"></i> Update</button>
            </div>
          </form>
        </div>
      </div>

      {/* Action Modal */}
      <div className={`admin-modal-overlay ${modal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModal({ open: false, type: '', accountId: null }); }}>
        <div className="admin-modal">
          <div className="modal-title">
            {modal.type === 'credit' ? 'Credit Account' : modal.type === 'debit' ? 'Debit Account' : modal.type === 'balance' ? 'Edit Balance' : modal.type === 'hold' ? 'Hold Account' : 'Remove Hold'}
          </div>
          <div className="modal-sub">Account #{modal.accountId}</div>
          <form onSubmit={handleSubmit}>
            {(modal.type === 'credit' || modal.type === 'debit') && (
              <>
                <div className="admin-form-group">
                  <label>Amount ($)</label>
                  <input type="number" step="0.01" min="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required />
                </div>
                <div className="admin-form-group">
                  <label>Description</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Reason for transaction" />
                </div>
              </>
            )}
            {modal.type === 'balance' && (
              <div className="admin-form-group">
                <label>New Balance ($)</label>
                <input type="number" step="0.01" min="0" value={formData.newBalance} onChange={(e) => setFormData({ ...formData, newBalance: e.target.value })} required />
              </div>
            )}
            {modal.type === 'hold' && <p style={{ fontSize: 12, color: '#E8A838' }}>This will temporarily disable the account.</p>}
            {modal.type === 'unhold' && <p style={{ fontSize: 12, color: '#2D9B4E' }}>This will re-activate the account.</p>}
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setModal({ open: false, type: '', accountId: null })}>Cancel</button>
              <button type="submit" className={`admin-btn ${modal.type === 'debit' ? 'admin-btn-danger' : modal.type === 'credit' || modal.type === 'unhold' ? 'admin-btn-success' : modal.type === 'hold' ? 'admin-btn-warning' : 'admin-btn-primary'}`}>
                <i className={`fas ${modal.type === 'credit' ? 'fa-plus' : modal.type === 'debit' ? 'fa-minus' : modal.type === 'balance' ? 'fa-save' : modal.type === 'hold' ? 'fa-pause' : 'fa-play'}`}></i>
                {modal.type === 'credit' ? ' Credit' : modal.type === 'debit' ? ' Debit' : modal.type === 'balance' ? ' Update' : modal.type === 'hold' ? ' Hold' : ' Remove Hold'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAccountsPage;
