import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useRealtime } from '../../hooks/useRealtime';
import { isRestrictionError } from '../../utils/accountStatus';
import AlertDialog from '../../components/AlertDialog';

// ---- Import Modal Components ----
import AddBeneficiaryModal from '../../components/AddBeneficiaryModal';
import AddPayeeModal from '../../components/AddPayeeModal';
import AddBillModal from '../../components/AddBillModal';
import GenerateStatementModal from '../../components/GenerateStatementModal';

// ----- Import all API functions -----
import {
  getDashboard,
  getTransactions,
  getNotifications,
  markNotificationRead,
  deleteNotification,
  clearAllNotifications,
  viewCard,
  blockCard,
  activateCard,
  requestNewCard,
  transferFunds,
  getBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
  getPayees,
  addPayee,
  getBills,
  addBill,
  payBill,
  getDocuments,
  generateStatement,
  changePassword,
  submitSupportTicket,
  getWires,
  createWire,
  getChequeDeposits,
  depositCheque,
  getSessions,
  signOutSession,
} from '../../api';

// ---- Create Context ----
export const ClientContext = createContext(null);

export const useClient = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientLayout');
  return ctx;
};

const ClientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ----- STATES -----
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balancesVisible, setBalancesVisible] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payees, setPayees] = useState([]);
  const [bills, setBills] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  // Account-restriction failures (frozen / on hold / suspended destination or
  // sender) get a modal with the real reason from the API, not a fleeting toast.
  const [restrictionModal, setRestrictionModal] = useState(null); // { title, message } | null

  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showPayeeModal, setShowPayeeModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accountSettingsModalOpen, setAccountSettingsModalOpen] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('all');
  const [selectedFromAccount, setSelectedFromAccount] = useState('');

  const [wires, setWires] = useState([]);
  const [wireFormOpen, setWireFormOpen] = useState(false);
  const [loadingWires, setLoadingWires] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [chequeDeposits, setChequeDeposits] = useState([]);
  const [chequeFormOpen, setChequeFormOpen] = useState(false);
  const [loadingCheques, setLoadingCheques] = useState(false);

  // ---- TOAST ----
  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 3000);
  };

  const hideToast = () => {
    setToastVisible(false);
    clearTimeout(toastTimeoutRef.current);
  };

  // Central handler for a failed action. If the backend says the failure is an
  // account restriction (frozen / on hold / closed / suspended), surface the
  // exact reason in a dismiss-to-acknowledge dialog rather than a fleeting
  // toast. `title` tailors the dialog heading per action ("Transfer Error").
  const reportActionError = (err, { title = 'Action Unavailable' } = {}) => {
    const message = (err && err.message) || 'Something went wrong. Please try again.';
    if (isRestrictionError(err)) {
      setRestrictionModal({ title, message });
    } else {
      showToast(message);
    }
  };

  // ---- NAVIGATION ----
  const navigateTo = (page) => {
    navigate(`/dashboard/${page}`);
    setSidebarOpen(false);
    setProfileDropdownOpen(false);
    setNotifDropdownOpen(false);
  };

  // ---- TOGGLES ----
  const toggleBalance = (accountType) => {
    setBalancesVisible(prev => ({ ...prev, [accountType]: !prev[accountType] }));
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(prev => !prev);
    setNotifDropdownOpen(false);
  };

  const toggleNotifDropdown = () => {
    setNotifDropdownOpen(prev => !prev);
    setProfileDropdownOpen(false);
  };

  // ---- COPY ----
  const copyText = (text, msg) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || 'Copied to clipboard');
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast(msg || 'Copied to clipboard');
    });
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format(Number(value || 0));

  // ---- SIGN OUT ----
  const confirmSignOut = () => {
    setSignOutModalOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ---- TWO-FACTOR AUTH ----
  // Not implemented on the backend yet (no TOTP/SMS verification flow exists) -
  // don't let the UI claim a setting was saved when nothing persists anywhere.
  const toggle2FA = () => {
    showToast('Two-factor authentication is not available yet');
  };

  // ---- REFRESH DASHBOARD ----
  const refreshDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await getDashboard();
      setDashboardData(data);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
      }
      if (data.accounts) {
        const vis = {};
        data.accounts.forEach(acc => { vis[acc.account_type] = true; });
        setBalancesVisible(vis);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      showToast(err.message || 'Unable to refresh dashboard');
    }
  }, []);

  // ---- CARD ACTIONS ----
  const [cardDetailModal, setCardDetailModal] = useState({ open: false, card: null });

  const handleViewCard = async (cardId) => {
    try {
      const result = await viewCard(cardId);
      setCardDetailModal({ open: true, card: result.card });
    } catch (err) {
      showToast(err.message || 'Unable to load card details');
    }
  };

  const updateCardStatus = async (cardId, action) => {
    try {
      const result = action === 'block' ? await blockCard(cardId) : await activateCard(cardId);
      showToast(result.message || 'Card updated');
      await refreshDashboard();
    } catch (err) {
      reportActionError(err, { title: 'Card Action Failed' });
    }
  };

  const handleRequestNewCard = async () => {
    const accountId = dashboardData?.accounts?.[0]?.id;
    if (!accountId) {
      showToast('No account found to link card');
      return;
    }
    try {
      const result = await requestNewCard({ accountId });
      showToast('Card requested successfully');
      await refreshDashboard();
    } catch (err) {
      reportActionError(err, { title: 'Card Request Failed' });
    }
  };

  // ---- TRANSFER ----
  const handleTransfer = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      fromAccountId: data.get('fromAccount'),
      toAccountId: data.get('toAccount'),
      amount: Number(data.get('amount')),
      description: data.get('description'),
      date: data.get('date'),
    };
    try {
      const result = await transferFunds(payload);
      showToast('Transfer successful');
      form.reset();
      await refreshDashboard();
    } catch (err) {
      reportActionError(err, { title: 'Transfer Error' });
    }
  };

  // ---- PAY BILL ----
  const handlePayBill = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const billId = data.get('billId');
    const payload = {
      amount: Number(data.get('amount')),
      paymentDate: data.get('dueDate'),
      description: data.get('description'),
      fromAccountId: data.get('fromAccount'),
    };
    try {
      const result = await payBill(billId, payload);
      showToast('Bill paid successfully');
      form.reset();
      await refreshDashboard();
    } catch (err) {
      reportActionError(err, { title: 'Bill Payment Error' });
    }
  };

  // ---- DELETE BENEFICIARY ----
  const handleDeleteBeneficiary = async (id) => {
    if (!window.confirm('Delete this beneficiary?')) return;
    try {
      await deleteBeneficiary(id);
      showToast('Beneficiary deleted');
      loadBeneficiaries();
    } catch (err) {
      reportActionError(err, { title: 'Beneficiary Error' });
    }
  };

  // ---- ADD BILL (inline form) ----
  const handleAddBill = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      payeeId: data.get('payeeId') || null,
      name: data.get('name'),
      description: data.get('description'),
      amount: Number(data.get('amount')),
      dueDate: data.get('dueDate'),
      frequency: data.get('frequency'),
      status: data.get('status'),
    };
    try {
      await addBill(payload);
      showToast('Bill added');
      form.reset();
      loadBills();
    } catch (err) {
      showToast(err.message);
    }
  };

  // ---- CSV EXPORT ----
  const exportCSV = () => {
    const filtered = (transactions || []).filter(tx => {
      const matchType = txFilter === 'all' || tx.type === txFilter;
      const matchSearch = !txSearch ? true : (
        (tx.description || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        String(tx.transaction_id || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        String(tx.transaction_date || '').includes(txSearch)
      );
      return matchType && matchSearch;
    });

    if (filtered.length === 0) {
      showToast('No transactions to export');
      return;
    }

    const headers = ['Date', 'ID', 'Description', 'Type', 'Amount', 'Balance', 'Status'];
    const rows = filtered.map(tx => [
      tx.transaction_date,
      tx.transaction_id,
      tx.description,
      tx.type,
      tx.amount,
      tx.balance_after || '',
      tx.status,
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  };

  // ---- LOAD DATA FUNCTIONS ----
  const loadBeneficiaries = async () => {
    try {
      const data = await getBeneficiaries();
      setBeneficiaries(data.beneficiaries || []);
    } catch (err) {
      setBeneficiaries([]);
    }
  };

  const loadPayees = async () => {
    try {
      const data = await getPayees();
      setPayees(data.payees || []);
    } catch (err) {
      setPayees([]);
    }
  };

  const loadBills = async () => {
    try {
      const data = await getBills();
      setBills(data.bills || []);
    } catch (err) {
      setBills([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      setDocuments([]);
    }
  };

  // Opens a real printable/downloadable document for a statement or tax document,
  // built from the customer's actual transactions for that period - not a fake toast.
  const handleDownloadDocument = async (doc) => {
    // Open the window synchronously, inside the click's user-activation window -
    // opening it after the await below loses that window in Safari/Chrome and
    // window.open silently returns null even though the click was legitimate.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow pop-ups to download this document');
      return;
    }

    let periodTx = [];
    try {
      const data = await getTransactions({ startDate: doc.period_start, endDate: doc.period_end });
      periodTx = Array.isArray(data) ? data : [];
    } catch (err) {
      // fall through with an empty transaction list rather than blocking the download
    }

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const rows = periodTx.map(tx => `
      <tr>
        <td>${tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : ''}</td>
        <td>${escapeHtml(tx.description)}</td>
        <td style="text-transform:capitalize">${escapeHtml(tx.type)}</td>
        <td style="text-align:right; color:${Number(tx.amount) < 0 ? '#D94352' : '#2D9B4E'}">${Number(tx.amount) < 0 ? '-' : '+'}${formatCurrency(Math.abs(Number(tx.amount)))}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(doc.title)}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; background: #fff; padding: 40px; color: #1A1A1A; }
            .doc { max-width: 700px; margin: 0 auto; }
            .doc-header { text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 20px; }
            .doc-header h2 { font-size: 20px; font-weight: 800; margin: 0; }
            .doc-header p { font-size: 11px; color: #8a8a8a; margin: 4px 0 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #e8e2d9; color: #8a8a8a; text-transform: uppercase; font-size: 10px; }
            td { padding: 8px; border-bottom: 1px solid #f4f2ef; }
            .doc-footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e8e2d9; font-size: 10px; color: #8a8a8a; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="doc">
            <div class="doc-header">
              <h2>SUMMIT SHARES</h2>
              <p>${escapeHtml(doc.title)}</p>
              <p>${escapeHtml(doc.period_start)} — ${escapeHtml(doc.period_end)}</p>
            </div>
            ${periodTx.length > 0 ? `
              <table>
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            ` : `<p style="text-align:center; color:#8a8a8a; font-size:12px;">No transactions recorded for this period.</p>`}
            <div class="doc-footer">
              <p>This document was generated by Summit Shares Banking.</p>
              <p>For questions, contact support@summitshares.com</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      const formatted = data.notifications?.map(n => ({
        id: n.id,
        title: n.title,
        desc: n.description,
        time: new Date(n.created_at).toLocaleString(),
        unread: !n.is_read,
        icon: 'info',
        iconClass: 'fa-bell',
      })) || [];
      setNotifications(formatted);
    } catch (e) {
      setNotifications([]);
    }
  };

  const loadWires = async () => {
    setLoadingWires(true);
    try {
      const data = await getWires();
      setWires(data.wires || []);
    } catch (err) {
      setWires([]);
    } finally {
      setLoadingWires(false);
    }
  };

  const loadChequeDeposits = async () => {
    setLoadingCheques(true);
    try {
      const data = await getChequeDeposits();
      setChequeDeposits(data.deposits || []);
    } catch (err) {
      setChequeDeposits([]);
    } finally {
      setLoadingCheques(false);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSignOutSession = async (sessionId) => {
    try {
      await signOutSession(sessionId);
      showToast('Session signed out');
      loadSessions();
    } catch (err) {
      showToast(err.message || 'Failed to sign out session');
    }
  };

  const handleSignOutAllSessions = async () => {
    const others = sessions.filter(s => !s.is_current);
    if (others.length === 0) {
      showToast('No other active sessions');
      return;
    }
    const results = await Promise.allSettled(others.map(s => signOutSession(s.id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === 0) {
      showToast('All other devices signed out');
    } else if (failed === others.length) {
      showToast('Failed to sign out other devices');
    } else {
      showToast(`Signed out ${others.length - failed} of ${others.length} devices`);
    }
    loadSessions();
  };

  const handleCreateWire = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      fromAccountId: data.get('fromAccount'),
      beneficiaryName: data.get('beneficiaryName'),
      beneficiaryBank: data.get('beneficiaryBank'),
      beneficiaryAccount: data.get('beneficiaryAccount'),
      beneficiaryRouting: data.get('beneficiaryRouting'),
      beneficiaryAddress: data.get('beneficiaryAddress'),
      swiftCode: data.get('swiftCode'),
      amount: Number(data.get('amount')),
      currency: data.get('currency'),
      fee: Number(data.get('fee')) || 25,
      description: data.get('description'),
    };
    try {
      const result = await createWire(payload);
      showToast(result.message || 'Wire transfer initiated');
      form.reset();
      setWireFormOpen(false);
      loadWires();
    } catch (err) {
      reportActionError(err, { title: 'Wire Transfer Error' });
    }
  };

  const handleDepositCheque = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    try {
      const result = await depositCheque(formData);
      showToast(result.message || 'Cheque deposited successfully');
      form.reset();
      setChequeFormOpen(false);
      loadChequeDeposits();
    } catch (err) {
      reportActionError(err, { title: 'Cheque Deposit Error' });
    }
  };

  // ---- MARK NOTIFICATION READ ----
  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, unread: false } : n
      ));
      await loadNotifications();
      showToast('Marked as read');
    } catch (e) {
      showToast('Could not mark as read');
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => n.unread).map(n => n.id);
    for (const id of unreadIds) {
      try { await markNotificationRead(id); } catch (e) {}
    }
    await loadNotifications();
    showToast('All notifications marked as read');
  };

  const getUnreadCount = () => notifications.filter(n => n.unread).length;

  const deleteOneNotification = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast('Notification deleted');
    } catch (err) {
      showToast(err.message || 'Could not delete notification');
    }
  };

  const clearAllNotificationsHandler = async () => {
    if (notifications.length === 0) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
      showToast('Notifications cleared');
    } catch (err) {
      showToast(err.message || 'Could not clear notifications');
    }
  };

  // ---- EFFECTS ----
  useEffect(() => {
    const loadDashboard = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      setLoadingDashboard(true);
      try {
        const data = await getDashboard();
        setDashboardData(data);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setCurrentUser(data.user);
        }
        if (data.accounts) {
          const vis = {};
          data.accounts.forEach(acc => { vis[acc.account_type] = true; });
          setBalancesVisible(vis);
        }
      } catch (err) {
        setDashboardError(err.message);
        showToast(err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } finally {
        setLoadingDashboard(false);
      }
    };
    loadDashboard();
    loadNotifications();
  }, [navigate]);

  useEffect(() => {
    const loadTransactions = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      setLoadingTransactions(true);
      try {
        const data = await getTransactions({ type: txFilter, search: txSearch });
        setTransactions(Array.isArray(data) ? data : []);
      } catch (e) {
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };
    loadTransactions();
  }, [txSearch, txFilter]);

  // ---- WebSocket Real-time ----
  const { connected, onEvent } = useRealtime();

  useEffect(() => {
    const unsub = onEvent('new-notification', (notification) => {
      setNotifications(prev => [{
        id: notification.id,
        title: notification.title,
        desc: notification.description,
        time: new Date(notification.created_at || Date.now()).toLocaleString(),
        unread: true,
        icon: 'info',
        iconClass: 'fa-bell',
      }, ...prev]);
    });
    return unsub;
  }, [onEvent]);

  useEffect(() => {
    const unsub = onEvent('balance-update', (data) => {
      if (data.accounts) {
        setDashboardData(prev => {
          if (!prev) return prev;
          const updatedAccounts = prev.accounts?.map(acc => {
            const updated = data.accounts.find(u => u.id === acc.id);
            return updated ? { ...acc, balance: updated.balance } : acc;
          });
          const newTotal = updatedAccounts?.reduce((sum, acc) => sum + Number(acc.balance || 0), 0) || 0;
          return { ...prev, accounts: updatedAccounts, totalBalance: newTotal };
        });
      }
    });
    return unsub;
  }, [onEvent]);

  useEffect(() => {
    const unsub = onEvent('new-transaction', (transaction) => {
      setTransactions(prev => [transaction, ...prev]);
      refreshDashboard();
    });
    return unsub;
  }, [onEvent, refreshDashboard]);

  useEffect(() => {
    const unsub = onEvent('card-update', () => {
      refreshDashboard();
    });
    return unsub;
  }, [onEvent, refreshDashboard]);

  // An admin froze / held / closed / reopened one of this customer's accounts -
  // pull the authoritative status straight away so the dashboard badge, banner
  // and transfer screen reflect it without a manual refresh.
  useEffect(() => {
    const unsub = onEvent('account-update', () => {
      refreshDashboard();
    });
    return unsub;
  }, [onEvent, refreshDashboard]);

  useEffect(() => {
    const POLL_INTERVAL = 30000;
    let intervalId = setInterval(() => {
      if (!connected) {
        refreshDashboard();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [connected, refreshDashboard]);

  // ---- Load data based on route ----
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/beneficiaries')) loadBeneficiaries();
    if (path.includes('/bills')) { loadPayees(); loadBills(); }
    if (path.includes('/statements')) loadDocuments();
    if (path.includes('/wires')) loadWires();
    if (path.includes('/cheques')) loadChequeDeposits();
    if (path.includes('/security')) loadSessions();
  }, [location.pathname]);

  // ---- NAV ITEMS ----
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { id: 'transfer', label: 'Fund Transfer', icon: 'fa-arrow-right-arrow-left' },
    { id: 'wires', label: 'Wire Transfers', icon: 'fa-building-columns' },
    { id: 'cheques', label: 'Deposit Cheques', icon: 'fa-circle-dollar-to-slot' },
    { id: 'cards', label: 'Cards', icon: 'fa-credit-card' },
    { id: 'transactions', label: 'Transactions', icon: 'fa-receipt' },
    { id: 'bills', label: 'Pay Bills', icon: 'fa-file-invoice-dollar' },
    { id: 'beneficiaries', label: 'Beneficiaries', icon: 'fa-users' },
    { id: 'statements', label: 'Statements', icon: 'fa-file-pdf' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell', badge: getUnreadCount() },
    { id: 'security', label: 'Security', icon: 'fa-shield-halved' },
    { id: 'support', label: 'Support', icon: 'fa-headset' },
  ];

  const getActivePage = () => {
    const path = location.pathname;
    for (const item of navItems) {
      if (path.includes(`/dashboard/${item.id}`)) return item.id;
    }
    return 'dashboard';
  };

  const activePage = getActivePage();

  // ---- RENDER HELPERS ----
  const renderBeneficiaries = () => {
    if (beneficiaries.length === 0) {
      return <div className="text-slate-400 text-sm py-6">No beneficiaries found.</div>;
    }
    return beneficiaries.map(b => (
      <div key={b.id} className="beneficiary-item">
        <div className="benef-info">
          <div className="initial">{b.name.charAt(0).toUpperCase()}</div>
          <div className="details">
            <div className="name">{b.name}</div>
            <div className="acct">{b.bank_name} • {b.account_identifier}</div>
          </div>
        </div>
        <button
          className="text-slate-400 hover:text-red-500 text-sm px-2"
          title="Remove beneficiary"
          onClick={() => handleDeleteBeneficiary(b.id)}
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    ));
  };

  const renderBills = () => {
    if (bills.length === 0) {
      return <div className="text-slate-400 text-sm py-6">No bills found.</div>;
    }
    return bills.map(b => (
      <div key={b.id} className="bill-item">
        <div className="bill-info">
          <div className="bill-icon utilities"><i className="fas fa-file-invoice"></i></div>
          <div className="bill-details">
            <div className="bill-name">{b.name}</div>
            <div className="bill-date">Due {b.due_date} • {b.frequency}</div>
          </div>
        </div>
        <div className="bill-amount">{formatCurrency(b.amount)}</div>
        <span className={`bill-status ${b.status}`}>{b.status}</span>
      </div>
    ));
  };

  // ---- Context Value ----
  const contextValue = {
    currentUser,
    dashboardData,
    loadingDashboard,
    dashboardError,
    refreshDashboard,
    showToast,
    reportActionError,
    formatCurrency,
    copyText,
    toggleBalance,
    balancesVisible,
    notifications,
    loadNotifications,
    markRead,
    markAllRead,
    getUnreadCount,
    deleteOneNotification,
    clearAllNotificationsHandler,
    beneficiaries,
    loadBeneficiaries,
    payees,
    loadPayees,
    bills,
    loadBills,
    documents,
    loadDocuments,
    handleDownloadDocument,
    wires,
    loadWires,
    chequeDeposits,
    loadChequeDeposits,
    sessions,
    loadingSessions,
    handleSignOutSession,
    handleSignOutAllSessions,
    setShowBeneficiaryModal,
    setShowPayeeModal,
    setShowBillModal,
    setShowStatementModal,
    handleTransfer,
    handlePayBill,
    handleRequestNewCard,
    updateCardStatus,
    handleViewCard,
    cardDetailModal,
    setCardDetailModal,
    handleCreateWire,
    handleDepositCheque,
    handleDeleteBeneficiary,
    handleAddBill,
    exportCSV,
    transactions,
    loadingTransactions,
    txSearch,
    setTxSearch,
    txFilter,
    setTxFilter,
    selectedFromAccount,
    setSelectedFromAccount,
    wireFormOpen,
    setWireFormOpen,
    chequeFormOpen,
    setChequeFormOpen,
    loadingWires,
    loadingCheques,
    renderBeneficiaries,
    renderBills,
    navigateTo,
    toggleProfileDropdown,
    toggleNotifDropdown,
    profileDropdownOpen,
    notifDropdownOpen,
    setProfileModalOpen,
    setAccountSettingsModalOpen,
    setPreferencesModalOpen,
    setHelpModalOpen,
    setSignOutModalOpen,
    signOutModalOpen,
    confirmSignOut,
    toggle2FA,
    navItems,
    activePage,
  };

  // ---- RENDER ----
  return (
    <ClientContext.Provider value={contextValue}>
      <div className="font-sans antialiased bg-[#f4f2ef] text-[#1A1A1A] min-h-screen" style={{ overflowX: 'hidden' }}>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Montserrat', system-ui, sans-serif; background: #f4f2ef; color: #1A1A1A; overflow-x: hidden; -webkit-font-smoothing: antialiased; font-size: 14px; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: #f0ede8; }
          ::-webkit-scrollbar-thumb { background: #C9A84C; border-radius: 4px; }
          .sidebar { position: fixed; top: 0; left: 0; width: 260px; height: 100vh; background: #0B0B0B; z-index: 1000; transition: transform 0.3s ease; overflow-y: auto; padding: 24px 16px 30px; display: flex; flex-direction: column; }
          .sidebar::-webkit-scrollbar { width: 2px; }
          .sidebar::-webkit-scrollbar-thumb { background: #C9A84C; border-radius: 4px; }
          .sidebar-logo { display: flex; align-items: center; gap: 12px; padding-bottom: 28px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 24px; }
          .sidebar-logo svg { height: 34px; width: auto; flex-shrink: 0; }
          .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
          .sidebar-nav .nav-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #4a4a4a; padding: 12px 14px 6px; margin-top: 4px; }
          .sidebar-nav a { display: flex; align-items: center; gap: 14px; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; color: #8a8a8a; text-decoration: none; transition: all 0.2s ease; cursor: pointer; }
          .sidebar-nav a i { width: 18px; font-size: 14px; text-align: center; flex-shrink: 0; color: #6a6a6a; }
          .sidebar-nav a:hover { background: rgba(255,255,255,0.05); color: #fff; }
          .sidebar-nav a:hover i { color: #C9A84C; }
          .sidebar-nav a.active { background: rgba(201,168,76,0.12); color: #fff; }
          .sidebar-nav a.active i { color: #C9A84C; }
          .sidebar-nav a .badge { margin-left: auto; background: #C9A84C; color: #0B0B0B; font-size: 8px; font-weight: 700; padding: 1px 6px; border-radius: 20px; min-width: 18px; text-align: center; }
          .sidebar-footer { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; margin-top: 8px; }
          .sidebar-footer a { display: flex; align-items: center; gap: 14px; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; color: #8a8a8a; text-decoration: none; transition: all 0.2s ease; cursor: pointer; }
          .sidebar-footer a i { width: 18px; font-size: 14px; text-align: center; flex-shrink: 0; color: #6a6a6a; }
          .sidebar-footer a:hover { background: rgba(255,255,255,0.05); color: #fff; }
          .sidebar-footer a:hover i { color: #C9A84C; }
          .sidebar-footer .sign-out { color: #d94352; }
          .sidebar-footer .sign-out i { color: #d94352; }
          .sidebar-footer .sign-out:hover { background: rgba(217,67,82,0.08); color: #d94352; }
          .main-content { margin-left: 260px; min-height: 100vh; padding: 0 30px 40px; background: #f4f2ef; }
          .top-nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px; border-bottom: 1px solid #e8e2d9; flex-wrap: wrap; gap: 12px; position: relative; }
          .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8a8a8a; font-weight: 500; }
          .breadcrumb a { color: #8a8a8a; text-decoration: none; transition: color 0.2s; }
          .breadcrumb a:hover { color: #C9A84C; }
          .breadcrumb .current { color: #1A1A1A; font-weight: 600; }
          .breadcrumb i { font-size: 8px; color: #b0b0b0; }
          .top-nav-right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
          .profile-wrap { position: relative; display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 10px 2px 2px; border-radius: 30px; background: #fff; border: 1px solid #e8e2d9; transition: all 0.2s; flex-wrap: wrap; }
          .profile-wrap:hover { border-color: #C9A84C; }
          .profile-dropdown-menu { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border-radius: 12px; border: 1px solid #e8e2d9; box-shadow: 0 12px 40px rgba(0,0,0,0.12); min-width: 220px; padding: 6px 0; display: none; z-index: 999; animation: fadeIn 0.2s ease; }
          .profile-dropdown-menu.open { display: block; }
          .profile-dropdown-menu .menu-item { display: flex; align-items: center; gap: 12px; padding: 8px 16px; font-size: 12px; font-weight: 500; color: #1A1A1A; transition: all 0.15s; cursor: pointer; text-decoration: none; }
          .profile-dropdown-menu .menu-item:hover { background: #f4f2ef; }
          .profile-dropdown-menu .menu-item i { width: 18px; font-size: 14px; color: #8a8a8a; }
          .profile-dropdown-menu .divider { height: 1px; background: #f0ede8; margin: 4px 12px; }
          .profile-dropdown-menu .menu-item.danger { color: #D94352; }
          .profile-dropdown-menu .menu-item.danger i { color: #D94352; }
          .notification-wrap { position: relative; }
          .notification-btn { position: relative; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e8e2d9; background: #fff; display: flex; align-items: center; justify-content: center; color: #4a4a4a; font-size: 14px; cursor: pointer; transition: all 0.2s; }
          .notification-btn:hover { border-color: #C9A84C; color: #C9A84C; }
          .notification-btn .count { position: absolute; top: -4px; right: -4px; background: #D94352; color: #fff; font-size: 8px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #f4f2ef; }
          .notification-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border-radius: 12px; border: 1px solid #e8e2d9; box-shadow: 0 12px 40px rgba(0,0,0,0.12); width: 380px; max-height: 460px; display: none; z-index: 999; overflow: hidden; animation: fadeIn 0.2s ease; flex-direction: column; }
          .notification-dropdown.open { display: flex; }
          .notification-dropdown .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0ede8; }
          .notification-dropdown .notif-header h4 { font-size: 13px; font-weight: 700; color: #0B0B0B; }
          .notification-dropdown .notif-header a { font-size: 11px; color: #C9A84C; text-decoration: none; font-weight: 600; cursor: pointer; }
          .notification-dropdown .notif-header a:hover { color: #A8893A; }
          .notification-dropdown .notif-list { overflow-y: auto; padding: 4px 0; flex: 1; }
          .notification-dropdown .notif-list .notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #f4f2ef; transition: background 0.15s; cursor: pointer; }
          .notification-dropdown .notif-list .notif-item:hover { background: #faf9f7; }
          .notification-dropdown .notif-list .notif-item:last-child { border-bottom: none; }
          .notification-dropdown .notif-list .notif-item .n-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; }
          .notification-dropdown .notif-list .notif-item .n-icon.info { background: rgba(59,130,246,0.08); color: #3B82F6; }
          .notification-dropdown .notif-list .notif-item .n-icon.success { background: rgba(45,155,78,0.08); color: #2D9B4E; }
          .notification-dropdown .notif-list .notif-item .n-icon.warning { background: rgba(232,168,56,0.08); color: #E8A838; }
          .notification-dropdown .notif-list .notif-item .n-icon.danger { background: rgba(217,67,82,0.08); color: #D94352; }
          .notification-dropdown .notif-list .notif-item .n-content { flex: 1; min-width: 0; }
          .notification-dropdown .notif-list .notif-item .n-content .n-title { font-weight: 600; font-size: 12px; color: #1A1A1A; }
          .notification-dropdown .notif-list .notif-item .n-content .n-desc { font-size: 11px; color: #8a8a8a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .notification-dropdown .notif-list .notif-item .n-content .n-time { font-size: 9px; color: #b0b0b0; }
          .notification-dropdown .notif-footer { padding: 8px 16px; border-top: 1px solid #f0ede8; text-align: center; }
          .notification-dropdown .notif-footer button { background: none; border: none; color: #8a8a8a; font-size: 11px; font-weight: 500; cursor: pointer; padding: 4px 12px; border-radius: 6px; transition: all 0.2s; }
          .notification-dropdown .notif-footer button:hover { background: #f4f2ef; color: #C9A84C; }
          .profile-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #C9A84C, #A8893A); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; flex-shrink: 0; }
          .profile-name { font-size: 12px; font-weight: 600; color: #1A1A1A; }
          .profile-dropdown-label { font-size: 10px; color: #8a8a8a; display: flex; align-items: center; gap: 4px; }
          .profile-dropdown-label i { font-size: 8px; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .page-section { display: none; animation: fadeIn 0.3s ease; }
          .page-section.active { display: block; }
          .card-box { background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); padding: 20px 22px 22px; transition: all 0.25s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03); }
          .card-box:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); border-color: #d5cdc0; }
          .card-box .card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #7a7a7a; display: flex; align-items: center; gap: 6px; }
          .card-box .card-label i { color: #C9A84C; font-size: 12px; }
          .card-box .card-number { font-size: 12px; font-weight: 500; color: #4a4a4a; margin-top: 2px; letter-spacing: 0.5px; }
          .card-box .card-balance { font-size: 26px; font-weight: 800; color: #0B0B0B; margin-top: 2px; letter-spacing: -0.5px; line-height: 1.2; }
          .card-box .card-balance .currency { font-size: 16px; font-weight: 600; color: #5a5a5a; }
          .card-box .card-balance .hidden-balance { font-size: 20px; letter-spacing: 4px; color: #5a5a5a; }
          .card-box .card-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0ede8; flex-wrap: wrap; }
          .card-box .card-actions span { font-size: 10px !important; }
          .card-box .card-actions button { background: none; border: none; font-size: 11px; font-weight: 500; color: #5a5a5a; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; transition: all 0.2s; }
          .card-box .card-actions button:hover { background: #f4f2ef; color: #C9A84C; }
          .card-box .card-actions button i { font-size: 11px; }
          .card-box .card-actions .copy-btn { color: #C9A84C; }
          .card-box .card-actions .copy-btn:hover { background: rgba(201,168,76,0.08); }
          .total-balance-card { background: linear-gradient(135deg, #0B0B0B 0%, #1A1A1A 100%); border-radius: 20px; padding: 24px 28px; color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border: 1px solid #2a2a2a; box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
          .total-balance-card .balance-left .label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.5); }
          .total-balance-card .balance-left .amount { font-size: 34px; font-weight: 800; letter-spacing: -0.5px; margin-top: 2px; }
          .total-balance-card .balance-left .amount .currency { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.5); }
          .total-balance-card .balance-right { display: flex; gap: 24px; }
          .total-balance-card .balance-right .stat { text-align: right; }
          .total-balance-card .balance-right .stat .stat-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.4); }
          .total-balance-card .balance-right .stat .stat-value { font-size: 14px; font-weight: 700; }
          .total-balance-card .balance-right .stat .stat-value.positive { color: #2D9B4E; }
          .total-balance-card .balance-right .stat .stat-value.negative { color: #D94352; }
          .debit-card-preview { background: linear-gradient(145deg, #1a1a1a, #0f0f0f); border-radius: 18px; padding: 20px 24px 24px; color: #fff; position: relative; overflow: hidden; min-height: 160px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #2a2a2a; box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
          .debit-card-preview::before { content: ''; position: absolute; top: -60px; right: -60px; width: 180px; height: 180px; border-radius: 50%; background: rgba(201,168,76,0.05); }
          .debit-card-preview::after { content: ''; position: absolute; bottom: -40px; left: -40px; width: 120px; height: 120px; border-radius: 50%; background: rgba(201,168,76,0.03); }
          .debit-card-preview .card-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
          .debit-card-preview .card-top .card-type { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.5); }
          .debit-card-preview .card-top .card-network { display: flex; align-items: center; gap: 6px; }
          .debit-card-preview .card-top .card-network i { font-size: 24px; color: #C9A84C; }
          .debit-card-preview .card-top .contactless { font-size: 16px; color: rgba(255,255,255,0.3); transform: rotate(90deg); }
          .debit-card-preview .card-number-display { font-size: 18px; font-weight: 600; letter-spacing: 2px; color: #fff; margin-top: 6px; position: relative; z-index: 1; font-family: 'Inter', monospace; }
          .debit-card-preview .card-bottom { display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; margin-top: 8px; }
          .debit-card-preview .card-bottom .card-holder { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; }
          .debit-card-preview .card-bottom .card-expiry { font-size: 11px; color: rgba(255,255,255,0.5); }
          .debit-card-preview .card-bottom .card-expiry strong { color: rgba(255,255,255,0.8); }
          .debit-card-preview .card-status { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #8a8a8a; background: #e8e2d9; padding: 2px 10px; border-radius: 20px; margin-top: 4px; position: relative; z-index: 1; width: fit-content; }
          .debit-card-preview .card-status .dot { width: 5px; height: 5px; border-radius: 50%; background: #8a8a8a; display: inline-block; }
          .cards-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .dashboard-stack { display: flex; flex-direction: column; gap: 24px; margin-top: 24px; }
          .widgets-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .widget-box { background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); padding: 18px 20px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
          .widget-box .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
          .widget-box .widget-header h4 { font-size: 13px; font-weight: 700; color: #0B0B0B; }
          .widget-box .widget-header a { font-size: 11px; font-weight: 600; color: #C9A84C; text-decoration: none; transition: color 0.2s; cursor: pointer; }
          .widget-box .widget-header a:hover { color: #A8893A; }
          .quick-actions-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
          .quick-action-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 4px; border-radius: 12px; border: 1px solid #f0ede8; background: #faf9f7; transition: all 0.2s; cursor: pointer; text-decoration: none; color: #1A1A1A; gap: 4px; }
          .quick-action-btn:hover { border-color: #C9A84C; background: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
          .quick-action-btn i { font-size: 18px; color: #C9A84C; }
          .quick-action-btn span { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #5a5a5a; }
          .insights-widget { background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); padding: 20px 22px 22px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); width: 100%; }
          .insights-widget .insights-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
          .insights-widget .insights-header h3 { font-size: 16px; font-weight: 700; color: #0B0B0B; }
          .insights-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
          .stat-card { background: #faf9f7; border-radius: 12px; padding: 14px 16px; border: 1px solid #f0ede8; }
          .stat-card .stat-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #8a8a8a; }
          .stat-card .stat-value { font-size: 20px; font-weight: 800; color: #0B0B0B; margin-top: 2px; }
          .stat-card .stat-value .currency { font-size: 13px; font-weight: 600; color: #5a5a5a; }
          .stat-card .stat-change { font-size: 10px; font-weight: 600; margin-top: 2px; }
          .stat-card .stat-change.positive { color: #2D9B4E; }
          .stat-card .stat-change.negative { color: #D94352; }
          .bill-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f4f2ef; font-size: 12px; flex-wrap: wrap; gap: 4px 8px; }
          .bill-item:last-child { border-bottom: none; }
          .bill-item .bill-info { flex: 1 1 150px; display: flex; align-items: center; gap: 8px; min-width: 120px; }
          .bill-item .bill-info .bill-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; flex-shrink: 0; }
          .bill-item .bill-info .bill-icon.utilities { background: #E8A838; }
          .bill-item .bill-info .bill-icon.subscription { background: #3B82F6; }
          .bill-item .bill-info .bill-icon.housing { background: #C9A84C; }
          .bill-item .bill-info .bill-icon.credit { background: #D94352; }
          .bill-item .bill-info .bill-details .bill-name { font-weight: 600; color: #1A1A1A; }
          .bill-item .bill-info .bill-details .bill-date { font-size: 10px; color: #8a8a8a; }
          .bill-item .bill-amount { font-weight: 700; color: #0B0B0B; }
          .bill-item .bill-status { font-size: 9px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; }
          .bill-item .bill-status.upcoming { background: rgba(232,168,56,0.08); color: #E8A838; }
          .bill-item .bill-status.due { background: rgba(217,67,82,0.08); color: #D94352; }
          .beneficiary-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; gap: 6px; }
          .beneficiary-item:last-child { border-bottom: none; }
          .beneficiary-item .benef-info { display: flex; align-items: center; gap: 10px; }
          .beneficiary-item .benef-info .initial { width: 32px; height: 32px; border-radius: 50%; background: #f4f2ef; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #C9A84C; font-size: 12px; }
          .beneficiary-item .benef-info .details .name { font-weight: 600; color: #1A1A1A; font-size: 12px; }
          .beneficiary-item .benef-info .details .acct { font-size: 10px; color: #8a8a8a; }
          .transfer-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; font-size: 12px; flex-wrap: wrap; gap: 4px 8px; }
          .transfer-item:last-child { border-bottom: none; }
          .transfer-item .transfer-details { flex: 1 1 120px; }
          .transfer-item .transfer-details .desc { font-weight: 500; color: #1A1A1A; }
          .transfer-item .transfer-details .meta { font-size: 10px; color: #8a8a8a; }
          .transfer-item .transfer-amount { font-weight: 700; }
          .transfer-item .transfer-amount.out { color: #D94352; }
          .transfer-item .transfer-amount.in { color: #2D9B4E; }
          .form-group { margin-bottom: 14px; }
          .form-group label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #5a5a5a; margin-bottom: 4px; }
          .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #e8e2d9; font-size: 13px; background: #faf9f7; outline: none; transition: border 0.2s; font-family: inherit; }
          .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #C9A84C; ring: 2px solid rgba(201,168,76,0.2); }
          .form-group textarea { resize: vertical; min-height: 80px; }
          .btn-primary { background: #0B0B0B; color: #fff; padding: 8px 20px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
          .btn-primary:hover { background: #1A1A1A; }
          .btn-gold { background: #C9A84C; color: #0B0B0B; padding: 8px 20px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
          .btn-gold:hover { background: #D9C06E; }
          .btn-outline { background: transparent; color: #5a5a5a; padding: 8px 20px; border-radius: 8px; border: 1px solid #e8e2d9; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
          .btn-outline:hover { border-color: #C9A84C; color: #C9A84C; }
          .toast-message { position: fixed; bottom: 30px; right: 30px; background: #0B0B0B; color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 12px; font-weight: 500; box-shadow: 0 8px 30px rgba(0,0,0,0.15); z-index: 9999; display: flex; align-items: center; gap: 12px; transform: translateY(120px); opacity: 0; transition: all 0.4s ease; border-left: 3px solid #C9A84C; }
          .toast-message.show { transform: translateY(0); opacity: 1; }
          .toast-message i { font-size: 16px; color: #C9A84C; }
          .toast-message .close-toast { background: none; border: none; color: #6a6a6a; cursor: pointer; font-size: 14px; padding: 0 4px; }
          .toast-message .close-toast:hover { color: #fff; }
          .mobile-menu-toggle { display: none; background: none; border: none; font-size: 20px; color: #1A1A1A; cursor: pointer; padding: 4px; }
          .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 999; backdrop-filter: blur(4px); }
          .sidebar-overlay.active { display: block; }
          .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 9998; align-items: center; justify-content: center; padding: 20px; }
          .modal-overlay.active { display: flex; }
          .modal-box { background: #fff; border-radius: 16px; max-width: 480px; width: 100%; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: modalIn 0.3s ease; }
          @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .modal-box .modal-title { font-size: 20px; font-weight: 700; color: #0B0B0B; margin-bottom: 8px; }
          .modal-box .modal-sub { font-size: 14px; color: #5a5a5a; margin-bottom: 20px; }
          .modal-box .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
          .btn-danger { background: #D94352; color: #fff; padding: 10px 24px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
          .btn-danger:hover { background: #c0392b; }
          .page-header { margin-bottom: 24px; }
          .page-header h2 { font-size: 24px; font-weight: 700; color: #0B0B0B; }
          .page-header p { font-size: 13px; color: #8a8a8a; margin-top: 2px; }
          .transfer-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          @media (max-width: 992px) { .sidebar { transform: translateX(-100%); width: 280px; } .sidebar.open { transform: translateX(0); } .main-content { margin-left: 0; padding: 0 16px 30px; } .top-nav { padding: 14px 0 16px; } .mobile-menu-toggle { display: flex !important; } .cards-row { grid-template-columns: 1fr; } .widgets-row { grid-template-columns: 1fr; gap: 16px; } .quick-actions-grid { grid-template-columns: 1fr 1fr 1fr; } .insights-grid { grid-template-columns: repeat(2, 1fr); } .transfer-form-grid { grid-template-columns: 1fr; } }
          @media (max-width: 640px) {
            .quick-actions-grid { grid-template-columns: 1fr 1fr; }
            .insights-grid { grid-template-columns: 1fr; }
            .notification-dropdown { width: min(380px, calc(100vw - 32px)); }
            .total-balance-card { flex-direction: column; align-items: flex-start; }
            .total-balance-card .balance-right { width: 100%; flex-wrap: wrap; gap: 12px 20px; }
            .total-balance-card .balance-right .stat { text-align: left; }
            .top-nav-right { gap: 10px; }
            .profile-wrap .profile-name { display: none; }
            .profile-wrap .profile-dropdown-label span { display: none; }
          }
        `}</style>

        {/* ---- TOAST ---- */}
        <div className={`toast-message ${toastVisible ? 'show' : ''}`}>
          <i className="fas fa-check-circle"></i>
          <span id="toastText">{toastMessage}</span>
          <button className="close-toast" onClick={hideToast}><i className="fas fa-times"></i></button>
        </div>

        {/* ---- ACCOUNT RESTRICTION DIALOG ---- */}
        <AlertDialog
          open={!!restrictionModal}
          variant="error"
          title={restrictionModal?.title || 'Action Unavailable'}
          message={restrictionModal?.message}
          onClose={() => setRestrictionModal(null)}
        />

        {/* ---- SIGN OUT MODAL ---- */}
        <div className={`modal-overlay ${signOutModalOpen ? 'active' : ''}`}>
          <div className="modal-box">
            <div className="modal-title">Sign Out</div>
            <div className="modal-sub">Are you sure you want to sign out of your Summit Shares account?</div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setSignOutModalOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmSignOut}>Sign Out</button>
            </div>
          </div>
        </div>

        {/* ---- SIDEBAR OVERLAY (mobile tap-outside-to-close) ---- */}
        <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>

        {/* ---- SIDEBAR ---- */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <svg viewBox="0 0 170 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30 L30 10 L50 30 L40 30 L30 18 L20 30 L10 30Z" fill="#C9A84C" />
              <rect x="32" y="24" width="2" height="6" fill="#C9A84C" />
              <rect x="34" y="26" width="2" height="4" fill="#C9A84C" />
              <rect x="36" y="28" width="2" height="2" fill="#C9A84C" />
              <text x="46" y="26" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" fill="#FFFFFF" letterSpacing="2">SUMMIT</text>
              <text x="46" y="36" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="8" fill="#6b6b6b" letterSpacing="3">SHARES</text>
            </svg>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-label">Main Menu</div>
            {navItems.map(item => {
              const badge = item.id === 'notifications' ? getUnreadCount() : null;
              return (
                <a
                  key={item.id}
                  className={activePage === item.id ? 'active' : ''}
                  onClick={() => navigateTo(item.id)}
                >
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.label}</span>
                  {badge !== null && badge > 0 && <span className="badge">{badge}</span>}
                </a>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <a className="sign-out" onClick={() => setSignOutModalOpen(true)}>
              <i className="fas fa-right-from-bracket"></i>
              <span>Sign Out</span>
            </a>
          </div>
        </aside>

        {/* ---- MAIN CONTENT ---- */}
        <main className="main-content">

          {/* TOP NAV */}
          <header className="top-nav">
            <div className="flex items-center gap-3">
              <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>
                <i className="fas fa-bars"></i>
              </button>
              <div className="breadcrumb">
                <a href="#" onClick={(e) => e.preventDefault()}>Home</a>
                <i className="fas fa-chevron-right"></i>
                <span className="current">
                  {navItems.find(item => item.id === activePage)?.label || 'Dashboard'}
                </span>
              </div>
            </div>
            <div className="top-nav-right">
              {/* NOTIFICATION DROPDOWN */}
              <div className="notification-wrap">
                <button className="notification-btn" onClick={toggleNotifDropdown}>
                  <i className="fas fa-bell"></i>
                  <span className="count">{getUnreadCount()}</span>
                </button>
                <div className={`notification-dropdown ${notifDropdownOpen ? 'open' : ''}`}>
                  <div className="notif-header">
                    <h4>Notifications</h4>
                    <a onClick={markAllRead}>Mark all read</a>
                  </div>
                  <div className="notif-list">
                    {notifications.filter(n => n.unread).length > 0
                      ? notifications.filter(n => n.unread).slice(0, 3).map(n => (
                        <div key={n.id} className="notif-item" onClick={() => { markRead(n.id); setNotifDropdownOpen(false); }}>
                          <div className={`n-icon ${n.icon}`}><i className={n.iconClass}></i></div>
                          <div className="n-content">
                            <div className="n-title">{n.title}</div>
                            <div className="n-desc">{n.desc}</div>
                            <div className="n-time">{n.time}</div>
                          </div>
                        </div>
                      ))
                      : <div className="notif-item"><div className="n-content"><div className="n-title" style={{ color: '#8a8a8a' }}>No new notifications</div></div></div>
                    }
                  </div>
                  <div className="notif-footer">
                    <button onClick={() => { navigateTo('notifications'); setNotifDropdownOpen(false); }}>View all notifications</button>
                  </div>
                </div>
              </div>

              {/* ADMIN PORTAL BUTTON */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                <a
                  href="/admin/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#0B0B0B',
                    color: '#C9A84C',
                    fontSize: '11px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid #2a2a2a',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-shield-halved" style={{ fontSize: '12px' }}></i>
                  <span className="hidden sm:inline">Admin</span>
                </a>
              )}

              {/* PROFILE DROPDOWN */}
              <div className="profile-wrap" onClick={toggleProfileDropdown}>
                <div className="profile-avatar">
                  {(currentUser?.firstName || 'U').charAt(0)}
                  {(currentUser?.lastName || 'S').charAt(0)}
                </div>
                <span className="profile-name">
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Guest User'}
                </span>
                <div className="profile-dropdown-label">
                  <span>View Profile</span>
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className={`profile-dropdown-menu ${profileDropdownOpen ? 'open' : ''}`}>
                  <a className="menu-item" onClick={() => { setProfileModalOpen(true); setProfileDropdownOpen(false); }}>
                    <i className="fas fa-user"></i> My Profile
                  </a>
                  <a className="menu-item" onClick={() => { setAccountSettingsModalOpen(true); setProfileDropdownOpen(false); }}>
                    <i className="fas fa-sliders-h"></i> Account Settings
                  </a>
                  <a className="menu-item" onClick={() => { navigateTo('security'); setProfileDropdownOpen(false); }}>
                    <i className="fas fa-shield-halved"></i> Security
                  </a>
                  <a className="menu-item" onClick={() => { setPreferencesModalOpen(true); setProfileDropdownOpen(false); }}>
                    <i className="fas fa-cog"></i> Preferences
                  </a>
                  <div className="divider"></div>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                    <a className="menu-item" href="/admin/dashboard" style={{ color: '#C9A84C' }}>
                      <i className="fas fa-shield-halved" style={{ color: '#C9A84C' }}></i> Admin Portal
                    </a>
                  )}
                  <a className="menu-item" onClick={() => { setHelpModalOpen(true); setProfileDropdownOpen(false); }}>
                    <i className="fas fa-question-circle"></i> Help & Support
                  </a>
                  <a className="menu-item danger" onClick={() => { setSignOutModalOpen(true); setProfileDropdownOpen(false); }}>
                    <i className="fas fa-right-from-bracket"></i> Sign Out
                  </a>
                </div>
              </div>
            </div>
          </header>

          {/* ---- OUTLET (Renders child routes) ---- */}
          <Outlet />

        </main>

        {/* ---- MODALS ---- */}
        <AddBeneficiaryModal
          isOpen={showBeneficiaryModal}
          onClose={() => setShowBeneficiaryModal(false)}
          onSuccess={() => { loadBeneficiaries(); showToast('Beneficiary added'); }}
        />
        <AddPayeeModal
          isOpen={showPayeeModal}
          onClose={() => setShowPayeeModal(false)}
          onSuccess={() => { loadPayees(); showToast('Payee added'); }}
        />
        <AddBillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          onSuccess={() => { loadBills(); showToast('Bill added'); }}
          payees={payees}
        />
        <GenerateStatementModal
          isOpen={showStatementModal}
          onClose={() => setShowStatementModal(false)}
          onSuccess={() => { loadDocuments(); showToast('Statement generated'); }}
          accounts={dashboardData?.accounts || []}
        />

        {/* ---- PROFILE MODALS ---- */}
        <div className={`modal-overlay ${profileModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setProfileModalOpen(false); }}>
          <div className="modal-box">
            <div className="modal-title"><i className="fas fa-user text-brand-gold mr-2"></i> My Profile</div>
            <div className="modal-sub">Manage your personal information</div>
            <div className="space-y-4">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" defaultValue={currentUser?.firstName || ''} placeholder="First name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" defaultValue={currentUser?.lastName || ''} placeholder="Last name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" defaultValue={currentUser?.email || ''} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" defaultValue={currentUser?.phone || ''} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setProfileModalOpen(false)}>Cancel</button>
              <button className="btn-gold" onClick={() => { setProfileModalOpen(false); showToast('Profile updated successfully'); }}><i className="fas fa-save"></i> Save Changes</button>
            </div>
          </div>
        </div>

        <div className={`modal-overlay ${accountSettingsModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setAccountSettingsModalOpen(false); }}>
          <div className="modal-box">
            <div className="modal-title"><i className="fas fa-sliders-h text-brand-gold mr-2"></i> Account Settings</div>
            <div className="modal-sub">Configure your account preferences</div>
            <div className="space-y-4">
              <div className="form-group">
                <label>Default Account</label>
                <select>
                  {dashboardData?.accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_type} - {acc.account_number}</option>
                  ))}
                  {(!dashboardData?.accounts?.length) && <option>No accounts available</option>}
                </select>
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time Zone</label>
                <select>
                  <option value="America/New_York">Eastern Time (UTC-5)</option>
                  <option value="America/Chicago">Central Time (UTC-6)</option>
                  <option value="America/Denver">Mountain Time (UTC-7)</option>
                  <option value="America/Los_Angeles">Pacific Time (UTC-8)</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setAccountSettingsModalOpen(false)}>Cancel</button>
              <button className="btn-gold" onClick={() => { setAccountSettingsModalOpen(false); showToast('Account settings saved'); }}><i className="fas fa-save"></i> Save Settings</button>
            </div>
          </div>
        </div>

        <div className={`modal-overlay ${preferencesModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setPreferencesModalOpen(false); }}>
          <div className="modal-box">
            <div className="modal-title"><i className="fas fa-cog text-brand-gold mr-2"></i> Preferences</div>
            <div className="modal-sub">Customize your experience</div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-brand-border">
                <div>
                  <p className="font-semibold text-sm">Email Notifications</p>
                  <p className="text-xs text-slate-400">Receive alerts via email</p>
                </div>
                <div className="toggle-switch active"><div className="toggle-knob"></div></div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-brand-border">
                <div>
                  <p className="font-semibold text-sm">SMS Alerts</p>
                  <p className="text-xs text-slate-400">Receive text message alerts</p>
                </div>
                <div className="toggle-switch"><div className="toggle-knob"></div></div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold text-sm">Marketing Communications</p>
                  <p className="text-xs text-slate-400">Tips, offers, and product updates</p>
                </div>
                <div className="toggle-switch"><div className="toggle-knob"></div></div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setPreferencesModalOpen(false)}>Cancel</button>
              <button className="btn-gold" onClick={() => { setPreferencesModalOpen(false); showToast('Preferences saved'); }}><i className="fas fa-save"></i> Save Preferences</button>
            </div>
          </div>
        </div>

        <div className={`modal-overlay ${helpModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setHelpModalOpen(false); }}>
          <div className="modal-box">
            <div className="modal-title"><i className="fas fa-question-circle text-brand-gold mr-2"></i> Help & Support</div>
            <div className="modal-sub">How can we help you today?</div>
            <div className="space-y-4" style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="faq-item">
                <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                  How do I reset my password?
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="answer">Go to Security Settings and use the Change Password form. You will need your current password to set a new one.</div>
              </div>
              <div className="faq-item">
                <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                  How do I report a lost or stolen card?
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="answer">Contact our fraud team immediately via the Support page. We monitor accounts 24/7 and will block your card instantly.</div>
              </div>
              <div className="faq-item">
                <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                  How do I check my account balance?
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="answer">Your account balance is displayed at the top of the Dashboard. You can also view individual account balances with the show/hide toggle.</div>
              </div>
              <div className="faq-item">
                <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                  How do I transfer funds between accounts?
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="answer">Go to Fund Transfer in the sidebar. Select the source and destination accounts, enter the amount, and click Send Transfer.</div>
              </div>
              <div className="faq-item">
                <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                  How do I contact customer support?
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="answer">You can reach us via the Support page. Our team typically responds within 24 hours.</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setHelpModalOpen(false)}>Close</button>
              <button className="btn-gold" onClick={() => { navigateTo('support'); setHelpModalOpen(false); }}><i className="fas fa-headset"></i> Contact Support</button>
            </div>
          </div>
        </div>

      </div>
    </ClientContext.Provider>
  );
};

export default ClientLayout;