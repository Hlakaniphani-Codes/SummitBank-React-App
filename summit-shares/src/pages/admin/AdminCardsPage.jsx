import React, { useState, useEffect } from 'react';
import {
  getCards,
  activateCard,
  deactivateCard,
  blockCard,
  unblockCard,
  toggleCardVisibility,
  approveCardRequest,
  rejectCardRequest,
  replaceCard,
  cancelCard,
  issueCard,
  getCustomers,
  getCustomer,
} from '../../api/admin';

const AdminCardsPage = () => {
  const [cards, setCards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, action: '', cardId: null, last4: '' });
  const [issueModal, setIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    userId: '',
    accountId: '',
    cardType: 'debit',
    cardNetwork: 'visa',
    cardholderName: '',
  });
  const [selectedCustomerAccounts, setSelectedCustomerAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  // Tracks whichever mutating action is currently in flight, so the button
  // that was clicked shows it's working instead of the UI just sitting there
  // looking frozen, and a second click can't fire the same action twice.
  const [submitting, setSubmitting] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadCards = async () => {
    try {
      const data = await getCards({ search, status: statusFilter });
      setCards(data.cards || []);
    } catch (err) { showToast(err.message); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => {
    try {
      const data = await getCustomers({});
      setCustomers(data.customers || []);
    } catch (err) { showToast(err.message); }
  };

  useEffect(() => { loadCards(); }, [search, statusFilter]);

  const handleAction = async () => {
    if (submitting) return;
    setSubmitting('confirm');
    const { action, cardId } = confirmModal;
    try {
      if (action === 'activate') await activateCard(cardId);
      else if (action === 'deactivate') await deactivateCard(cardId);
      else if (action === 'block') await blockCard(cardId);
      else if (action === 'unblock') await unblockCard(cardId);
      else if (action === 'approve') await approveCardRequest(cardId);
      else if (action === 'reject') await rejectCardRequest(cardId);
      else if (action === 'replace') await replaceCard(cardId);
      else if (action === 'cancel') await cancelCard(cardId);
      showToast(`Card ${action}d successfully`);
      setConfirmModal({ open: false, action: '', cardId: null, last4: '' });
      loadCards();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleToggleVisibility = async (id, hidden) => {
    if (submitting) return;
    setSubmitting(`visibility-${id}`);
    try {
      await toggleCardVisibility(id, hidden);
      showToast(hidden ? 'Card hidden' : 'Card shown');
      loadCards();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const openModal = (action, card) => {
    setConfirmModal({ open: true, action, cardId: card.id, last4: card.last4 });
  };

  const handleIssueCard = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting('issue');
    try {
      await issueCard(issueForm);
      showToast('Card issued successfully');
      setIssueModal(false);
      setIssueForm({ userId: '', accountId: '', cardType: 'debit', cardNetwork: 'visa', cardholderName: '' });
      loadCards();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleCustomerChange = (userId) => {
    setIssueForm(prev => ({ ...prev, userId, accountId: '' }));
    setSelectedCustomerAccounts([]);
    setAccountsError('');
    if (!userId) return;
    // Always fetch accounts for the selected customer directly from the API
    // This avoids race conditions where the local customers array may not be loaded yet
    fetchCustomerAccounts(userId);
  };

  const fetchCustomerAccounts = async (userId) => {
    setLoadingAccounts(true);
    setAccountsError('');
    setSelectedCustomerAccounts([]);
    try {
      console.log(`[AdminCardsPage] Fetching accounts for customer userId=${userId}`);
      const data = await getCustomer(userId);
      console.log('[AdminCardsPage] getCustomer response:', data);
      if (data.customer) {
        // Auto-fill cardholder name from the API response (always the most up-to-date data)
        const fullName = `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim();
        if (fullName) {
          setIssueForm(prev => ({ ...prev, cardholderName: fullName }));
        }
        if (data.customer.accounts && data.customer.accounts.length > 0) {
          console.log(`[AdminCardsPage] Found ${data.customer.accounts.length} accounts:`, data.customer.accounts);
          setSelectedCustomerAccounts(data.customer.accounts);
        } else {
          console.warn('[AdminCardsPage] No accounts found for customer. Accounts field:', data.customer.accounts);
          setSelectedCustomerAccounts([]);
          setAccountsError('This customer has no accounts linked');
        }
      } else {
        console.warn('[AdminCardsPage] No customer data returned. Full response keys:', Object.keys(data));
        setSelectedCustomerAccounts([]);
        setAccountsError('Customer not found');
      }
    } catch (err) {
      console.error('[AdminCardsPage] Error fetching customer accounts:', err);
      setSelectedCustomerAccounts([]);
      setAccountsError(`Error loading accounts: ${err.message}`);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const getStatusBadge = (status) => {
    const cls = status === 'active' ? 'active' : status === 'pending' ? 'pending' : status === 'blocked' || status === 'expired' ? 'inactive' : '';
    return <span className={`admin-badge-status ${cls}`}><span className="dot"></span>{status}</span>;
  };

  return (
    <div>
      {toast && <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 12, zIndex: 99999, borderLeft: '3px solid #C9A84C' }}>{toast}</div>}

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Card Management</h2>
      <p style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 24 }}>Manage all banking cards</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="admin-search-input" placeholder="Search cards..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="admin-select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
          <option value="expired">Expired</option>
        </select>
        <button className="admin-btn admin-btn-primary" onClick={() => { setIssueModal(true); loadCustomers(); }}>
          <i className="fas fa-plus"></i> Issue New Card
        </button>
      </div>

      <div className="admin-card">
        <div className="card-header">
          <h3>All Cards</h3>
          <span style={{ fontSize: 11, color: '#6b6b6b' }}>{cards.length} cards</span>
        </div>
        <div className="admin-table-wrap responsive">
          <table className="admin-table">
            <thead>
              <tr><th>Customer</th><th>Type</th><th>Network</th><th>Last4</th><th>Account</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20, color: '#6b6b6b' }}>No cards found</td></tr>
              ) : (
                cards.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Customer" style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                    <td data-label="Type" style={{ textTransform: 'capitalize' }}>{c.card_type}</td>
                    <td data-label="Network" style={{ textTransform: 'uppercase' }}>{c.card_network}</td>
                    <td data-label="Last4">**** {c.last4}</td>
                    <td data-label="Account">{c.account_type || '—'}</td>
                    <td data-label="Status">{getStatusBadge(c.status)}</td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {c.status === 'pending' && (
                          <>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openModal('approve', c)}>Approve</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openModal('reject', c)}>Reject</button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openModal('deactivate', c)}>Deactivate</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openModal('block', c)}>Block</button>
                            <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleToggleVisibility(c.id, true)} disabled={submitting === `visibility-${c.id}`}>{submitting === `visibility-${c.id}` ? <i className="fas fa-spinner fa-spin"></i> : 'Hide'}</button>
                            <button className="admin-btn admin-btn-warning admin-btn-xs" onClick={() => openModal('replace', c)}>Replace</button>
                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => openModal('cancel', c)}>Cancel</button>
                          </>
                        )}
                        {c.status === 'blocked' && (
                          <>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openModal('unblock', c)}>Unblock</button>
                            <button className="admin-btn admin-btn-success admin-btn-xs" onClick={() => openModal('activate', c)}>Activate</button>
                          </>
                        )}
                        {c.status === 'expired' && <span style={{ fontSize: 10, color: '#6b6b6b' }}>Expired</span>}
                        {(c.status === 'active' || c.status === 'blocked') && (
                          <button className="admin-btn admin-btn-secondary admin-btn-xs" onClick={() => handleToggleVisibility(c.id, true)}>Hide</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue New Card Modal */}
      <div className={`admin-modal-overlay ${issueModal ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setIssueModal(false); }}>
        <div className="admin-modal" style={{ maxWidth: 500 }}>
          <div className="modal-title">Issue New Card</div>
          <div className="modal-sub">Create a new card for a customer</div>
          <form onSubmit={handleIssueCard}>
            <div className="admin-form-group">
              <label>Customer</label>
              <select value={issueForm.userId} onChange={(e) => { handleCustomerChange(e.target.value); }} required>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>)}
              </select>
            </div>
            <div className="admin-form-group">
              <label>Account</label>
              {loadingAccounts ? (
                <div style={{ padding: '8px 12px', color: '#6b6b6b', fontSize: 12, background: '#1a1a1a', borderRadius: 6, border: '1px solid #2a2a2a' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading accounts...
                </div>
              ) : accountsError ? (
                <div style={{ padding: '8px 12px', color: '#D94352', fontSize: 12, background: '#1a1a1a', borderRadius: 6, border: '1px solid #D94352' }}>
                  <i className="fas fa-exclamation-triangle"></i> {accountsError}
                </div>
              ) : (
                <select value={issueForm.accountId} onChange={(e) => setIssueForm({ ...issueForm, accountId: e.target.value })} required>
                  <option value="">Select account...</option>
                  {selectedCustomerAccounts.length === 0 ? (
                    <option value="" disabled>No accounts available for this customer</option>
                  ) : (
                    selectedCustomerAccounts.map(a => <option key={a.id} value={a.id}>{a.account_type} - {a.account_number}</option>)
                  )}
                </select>
              )}
            </div>
            <div className="admin-grid-2">
              <div className="admin-form-group">
                <label>Card Type</label>
                <select value={issueForm.cardType} onChange={(e) => setIssueForm({ ...issueForm, cardType: e.target.value })}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Card Network</label>
                <select value={issueForm.cardNetwork} onChange={(e) => setIssueForm({ ...issueForm, cardNetwork: e.target.value })}>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">Amex</option>
                  <option value="discover">Discover</option>
                </select>
              </div>
            </div>
            <div className="admin-form-group">
              <label>Cardholder Name</label>
              <input type="text" value={issueForm.cardholderName} onChange={(e) => setIssueForm({ ...issueForm, cardholderName: e.target.value })} placeholder="Full name on card" required />
            </div>
            <div className="modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={submitting === 'issue'} onClick={() => setIssueModal(false)}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting === 'issue'}><i className={`fas ${submitting === 'issue' ? 'fa-spinner fa-spin' : 'fa-credit-card'}`}></i> {submitting === 'issue' ? 'Issuing…' : 'Issue Card'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirm Action Modal */}
      <div className={`admin-modal-overlay ${confirmModal.open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal({ open: false, action: '', cardId: null, last4: '' }); }}>
        <div className="admin-modal" style={{ maxWidth: 400 }}>
          <div className="modal-title" style={{ textTransform: 'capitalize' }}>{confirmModal.action} Card</div>
          <div className="modal-sub">Are you sure you want to {confirmModal.action} card ending in <strong>****{confirmModal.last4}</strong>?</div>
          <div className="modal-actions">
            <button className="admin-btn admin-btn-secondary" disabled={submitting === 'confirm'} onClick={() => setConfirmModal({ open: false, action: '', cardId: null, last4: '' })}>Cancel</button>
            <button className={`admin-btn ${['deactivate','block','reject','cancel'].includes(confirmModal.action) ? 'admin-btn-danger' : 'admin-btn-success'}`} disabled={submitting === 'confirm'} onClick={handleAction}>
              <i className={`fas ${submitting === 'confirm' ? 'fa-spinner fa-spin' : confirmModal.action === 'unblock' ? 'fa-unlock' : 'fa-check'}`}></i>
              {' '}{submitting === 'confirm' ? 'Working…' : confirmModal.action.charAt(0).toUpperCase() + confirmModal.action.slice(1)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCardsPage;