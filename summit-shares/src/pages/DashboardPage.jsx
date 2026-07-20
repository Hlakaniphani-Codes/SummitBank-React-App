import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ---- Import Modal Components ----
import AddBeneficiaryModal from '../components/AddBeneficiaryModal';
import AddPayeeModal from '../components/AddPayeeModal';
import AddBillModal from '../components/AddBillModal';
import GenerateStatementModal from '../components/GenerateStatementModal';

// ----- Import all API functions -----
import {
  getDashboard,
  getTransactions,
  getNotifications,
  markNotificationRead,
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
} from '../api';

console.log('✅ API functions imported successfully');

const DashboardPage = () => {
  const navigate = useNavigate();
  console.log('🟢 DashboardPage rendering');

  // ----- STATES -----
  const [activePage, setActivePage] = useState('dashboard');
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
  const [invoiceExpanded, setInvoiceExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Data for other pages
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payees, setPayees] = useState([]);
  const [bills, setBills] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  // Modal states
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showPayeeModal, setShowPayeeModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [accountSettingsModalOpen, setAccountSettingsModalOpen] = useState(false);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Dropdowns
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Transaction filters
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('all');

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

  // ---- NAVIGATION ----
  const navigateTo = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
    setProfileDropdownOpen(false);
    setNotifDropdownOpen(false);
    document.getElementById('breadcrumbCurrent')?.scrollIntoView({ behavior: 'smooth' });
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
    showToast('Signed out successfully. Redirecting...');
    setTimeout(() => navigate('/'), 1500);
  };

  // ---- TOGGLE 2FA (dummy) ----
  const toggle2FA = (e) => {
    e.currentTarget.classList.toggle('active');
    showToast('Two-factor authentication setting updated');
  };

  // ---- REFRESH DASHBOARD ----
  const refreshDashboard = async () => {
    console.log('🔄 Refreshing dashboard...');
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await getDashboard();
      console.log('📊 Dashboard data refreshed:', data);
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
      console.error('❌ Refresh error:', err);
      showToast(err.message || 'Unable to refresh dashboard');
    }
  };

  // ---- CARD ACTIONS ----
  const updateCardStatus = async (cardId, action) => {
    console.log(`🃏 Updating card ${cardId} with action: ${action}`);
    try {
      const result = action === 'block' ? await blockCard(cardId) : await activateCard(cardId);
      console.log('✅ Card update result:', result);
      showToast(result.message || 'Card updated');
      await refreshDashboard();
    } catch (err) {
      console.error('❌ Card action failed:', err);
      showToast(err.message || 'Card action failed');
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
      console.log('✅ New card requested:', result);
      showToast('Card requested successfully');
      await refreshDashboard();
    } catch (err) {
      console.error('❌ Request card failed:', err);
      showToast(err.message);
    }
  };

  // ---- TRANSFER ----
  const handleTransfer = async (e) => {
    e.preventDefault();
    console.log('💸 Initiating transfer...');
    const form = e.target;
    const data = new FormData(form);
    const payload = {
      fromAccountId: data.get('fromAccount'),
      toAccountId: data.get('toAccount'),
      amount: Number(data.get('amount')),
      description: data.get('description'),
      date: data.get('date'),
    };
    console.log('📦 Transfer payload:', payload);
    try {
      const result = await transferFunds(payload);
      console.log('✅ Transfer result:', result);
      showToast('Transfer successful');
      form.reset();
      await refreshDashboard();
    } catch (err) {
      console.error('❌ Transfer failed:', err);
      showToast(err.message);
    }
  };

  // ---- PAY BILL ----
  const handlePayBill = async (e) => {
    e.preventDefault();
    console.log('💳 Paying bill...');
    const form = e.target;
    const data = new FormData(form);
    const billId = data.get('billId');
    const payload = {
      amount: Number(data.get('amount')),
      paymentDate: data.get('dueDate'),
      description: data.get('description'),
      fromAccountId: data.get('fromAccount'),
    };
    console.log('📦 PayBill payload:', { billId, ...payload });
    try {
      const result = await payBill(billId, payload);
      console.log('✅ PayBill result:', result);
      showToast('Bill paid successfully');
      form.reset();
      await refreshDashboard();
    } catch (err) {
      console.error('❌ PayBill failed:', err);
      showToast(err.message);
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
      console.error('❌ Delete beneficiary failed:', err);
      showToast(err.message);
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
      console.error('❌ Add bill failed:', err);
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
      console.log('👥 Beneficiaries loaded:', data);
      setBeneficiaries(data.beneficiaries || []);
    } catch (err) {
      console.error('❌ Load beneficiaries failed:', err);
      setBeneficiaries([]);
    }
  };

  const loadPayees = async () => {
    try {
      const data = await getPayees();
      console.log('👤 Payees loaded:', data);
      setPayees(data.payees || []);
    } catch (err) {
      console.error('❌ Load payees failed:', err);
      setPayees([]);
    }
  };

  const loadBills = async () => {
    try {
      const data = await getBills();
      console.log('📄 Bills loaded:', data);
      setBills(data.bills || []);
    } catch (err) {
      console.error('❌ Load bills failed:', err);
      setBills([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await getDocuments();
      console.log('📁 Documents loaded:', data);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('❌ Load documents failed:', err);
      setDocuments([]);
    }
  };

  // ---- NOTIFICATIONS LOAD (used by markRead) ----
  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      console.log('🔔 Notifications loaded:', data);
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
      console.error('❌ Notifications load error:', e);
      setNotifications([]);
    }
  };

  // ---- EFFECTS ----
  // Dashboard
  useEffect(() => {
    const loadDashboard = async () => {
      console.log('🔄 Loading dashboard...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⛔ No token, redirecting to login');
        navigate('/');
        return;
      }
      setLoadingDashboard(true);
      try {
        const data = await getDashboard();
        console.log('📊 Dashboard data received:', data);
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
        console.error('❌ Dashboard load error:', err);
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
  }, [navigate]);

  // Transactions
  useEffect(() => {
    const loadTransactions = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      setLoadingTransactions(true);
      try {
        const data = await getTransactions({ type: txFilter, search: txSearch });
        console.log('📋 Transactions loaded:', data);
        setTransactions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('❌ Transactions load error:', e);
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };
    loadTransactions();
  }, [txSearch, txFilter]);

  // Notifications (initial load)
  useEffect(() => {
    loadNotifications();
  }, []);

  // Load data for other pages when active
  useEffect(() => {
    if (activePage === 'beneficiaries') loadBeneficiaries();
    if (activePage === 'bills') { loadPayees(); loadBills(); }
    if (activePage === 'statements') loadDocuments();
  }, [activePage]);

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
      console.error('❌ Mark read failed:', e);
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

  // ---- RENDER HELPERS (using real data) ----
  const renderInvoices = () => <div className="text-slate-400 text-sm py-6">No invoices found.</div>;
  const renderBudget = () => <div className="text-slate-400 text-sm py-6">No budget data.</div>;
  const renderDevices = () => <div className="text-slate-400 text-sm py-6">No devices found.</div>;
  const renderFAQ = () => <div className="text-slate-400 text-sm py-6">No FAQs found.</div>;
  const renderModalInvoices = () => <tr><td colSpan="4" className="text-center py-8 text-slate-400">No invoices found.</td></tr>;

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
        <div className="benef-actions">
          <button onClick={() => handleDeleteBeneficiary(b.id)}><i className="fas fa-trash"></i></button>
        </div>
      </div>
    ));
  };

  const renderPayees = () => {
    if (payees.length === 0) {
      return <div className="text-slate-400 text-sm py-6">No payees found.</div>;
    }
    return payees.map(p => (
      <div key={p.id} className="payee-item">
        <div className="payee-info">
          <div className="initial">{p.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="name">{p.name}</div>
            <div className="acct">{p.category} • {p.account_identifier}</div>
          </div>
        </div>
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

  const renderStatements = () => {
    const stmts = documents.filter(d => d.doc_type === 'statement');
    if (stmts.length === 0) {
      return <div className="text-slate-400 text-sm py-6">No statements found.</div>;
    }
    return stmts.map(d => (
      <div key={d.id} className="statement-item">
        <div className="stmt-info">
          <div className="stmt-icon"><i className="fas fa-file-pdf"></i></div>
          <div className="stmt-details">
            <div className="stmt-name">{d.title}</div>
            <div className="stmt-date">{d.period_start} – {d.period_end}</div>
          </div>
        </div>
        <div className="stmt-actions">
          <button onClick={() => showToast('Downloading...')}><i className="fas fa-download"></i> Download</button>
        </div>
      </div>
    ));
  };

  const renderTaxStatements = () => {
    const taxDocs = documents.filter(d => d.doc_type === 'tax');
    if (taxDocs.length === 0) {
      return <div className="text-slate-400 text-sm py-6">No tax documents found.</div>;
    }
    return taxDocs.map(d => (
      <div key={d.id} className="statement-item">
        <div className="stmt-info">
          <div className="stmt-icon"><i className="fas fa-file-invoice"></i></div>
          <div className="stmt-details">
            <div className="stmt-name">{d.title}</div>
            <div className="stmt-date">{d.period_start} – {d.period_end}</div>
          </div>
        </div>
        <div className="stmt-actions">
          <button onClick={() => showToast('Downloading...')}><i className="fas fa-download"></i> Download</button>
        </div>
      </div>
    ));
  };

  const renderNotifications = () => {
    const unreadCount = getUnreadCount();
    if (notifications.length === 0) {
      return <div className="text-slate-400 text-sm py-6">No notifications.</div>;
    }
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-slate-500"><span className="font-bold text-brand-dark">{unreadCount}</span> unread notifications</span>
          <div className="flex gap-2">
            <button className="btn-outline text-xs py-1.5 px-3" onClick={markAllRead}><i className="fas fa-check-double"></i> Mark all read</button>
            <button className="btn-outline text-xs py-1.5 px-3" onClick={() => showToast('Notifications cleared')}><i className="fas fa-trash"></i> Clear all</button>
          </div>
        </div>
        {notifications.map(n => (
          <div key={n.id} className={`notification-item ${n.unread ? 'unread' : ''}`}>
            <div className={`notif-icon ${n.icon}`}><i className={n.iconClass}></i></div>
            <div className="notif-content">
              <div className="title">{n.title}</div>
              <div className="desc">{n.desc}</div>
              <div className="time">{n.time}</div>
            </div>
            <div className="notif-actions">
              {n.unread && <button onClick={() => markRead(n.id)} title="Mark as read"><i className="fas fa-check"></i></button>}
              <button onClick={() => showToast('Notification deleted')} title="Delete"><i className="fas fa-trash"></i></button>
            </div>
          </div>
        ))}
      </>
    );
  };

  // ---- NAV ITEMS ----
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
    { id: 'transfer', label: 'Fund Transfer', icon: 'fa-arrow-right-arrow-left' },
    { id: 'cards', label: 'Cards', icon: 'fa-credit-card', badge: dashboardData?.cards?.length || 0 },
    { id: 'transactions', label: 'Transactions', icon: 'fa-receipt' },
    { id: 'bills', label: 'Pay Bills', icon: 'fa-file-invoice-dollar' },
    { id: 'beneficiaries', label: 'Beneficiaries', icon: 'fa-users' },
    { id: 'statements', label: 'Statements', icon: 'fa-file-pdf' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell', badge: getUnreadCount() },
    { id: 'security', label: 'Security', icon: 'fa-shield-halved' },
    { id: 'support', label: 'Support', icon: 'fa-headset' },
  ];

  const getNavBadge = (id) => {
    if (id === 'notifications') return getUnreadCount();
    if (id === 'cards') return dashboardData?.cards?.length || 0;
    return null;
  };

  // =============================================================
  // RENDER
  // =============================================================
  console.log('🎨 Rendering DashboardPage JSX');
  return (
    <div className="font-sans antialiased bg-[#f4f2ef] text-[#1A1A1A] min-h-screen" style={{ overflowX: 'hidden' }}>
      {/* ---- FULL STYLES (refined for a premium, trustworthy look) ---- */}
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

        /* --- Refined card styling --- */
        .card-box {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.05);
          padding: 20px 22px 22px;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03);
        }
        .card-box:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
          border-color: #d5cdc0;
        }
        .card-box .card-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #7a7a7a;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .card-box .card-label i { color: #C9A84C; font-size: 12px; }
        .card-box .card-number { font-size: 12px; font-weight: 500; color: #4a4a4a; margin-top: 2px; letter-spacing: 0.5px; }
        .card-box .card-balance {
          font-size: 26px;
          font-weight: 800;
          color: #0B0B0B;
          margin-top: 2px;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .card-box .card-balance .currency { font-size: 16px; font-weight: 600; color: #5a5a5a; }
        .card-box .card-balance .hidden-balance { font-size: 20px; letter-spacing: 4px; color: #5a5a5a; }
        .card-box .card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0ede8;
          flex-wrap: wrap;
        }
        .card-box .card-actions span { font-size: 10px !important; }
        .card-box .card-actions button {
          background: none;
          border: none;
          font-size: 11px;
          font-weight: 500;
          color: #5a5a5a;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .card-box .card-actions button:hover { background: #f4f2ef; color: #C9A84C; }
        .card-box .card-actions button i { font-size: 11px; }
        .card-box .card-actions .copy-btn { color: #C9A84C; }
        .card-box .card-actions .copy-btn:hover { background: rgba(201,168,76,0.08); }

        /* Total balance card - premium gradient */
        .total-balance-card {
          background: linear-gradient(135deg, #0B0B0B 0%, #1A1A1A 100%);
          border-radius: 20px;
          padding: 24px 28px;
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          border: 1px solid #2a2a2a;
          box-shadow: 0 6px 24px rgba(0,0,0,0.08);
        }
        .total-balance-card .balance-left .label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.5); }
        .total-balance-card .balance-left .amount { font-size: 34px; font-weight: 800; letter-spacing: -0.5px; margin-top: 2px; }
        .total-balance-card .balance-left .amount .currency { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.5); }
        .total-balance-card .balance-right { display: flex; gap: 24px; }
        .total-balance-card .balance-right .stat { text-align: right; }
        .total-balance-card .balance-right .stat .stat-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.4); }
        .total-balance-card .balance-right .stat .stat-value { font-size: 14px; font-weight: 700; }
        .total-balance-card .balance-right .stat .stat-value.positive { color: #2D9B4E; }
        .total-balance-card .balance-right .stat .stat-value.negative { color: #D94352; }

        /* Debit card preview - always inactive */
        .debit-card-preview {
          background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
          border-radius: 18px;
          padding: 20px 24px 24px;
          color: #fff;
          position: relative;
          overflow: hidden;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid #2a2a2a;
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
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
        .debit-card-preview .card-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #8a8a8a;
          background: #e8e2d9;
          padding: 2px 10px;
          border-radius: 20px;
          margin-top: 4px;
          position: relative;
          z-index: 1;
          width: fit-content;
        }
        .debit-card-preview .card-status .dot { width: 5px; height: 5px; border-radius: 50%; background: #8a8a8a; display: inline-block; }

        .cards-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .dashboard-stack { display: flex; flex-direction: column; gap: 24px; margin-top: 24px; }
        .widgets-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        .widget-box { background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); padding: 18px 20px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .widget-box .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .widget-box .widget-header h4 { font-size: 13px; font-weight: 700; color: #0B0B0B; }
        .widget-box .widget-header a { font-size: 11px; font-weight: 600; color: #C9A84C; text-decoration: none; transition: color 0.2s; cursor: pointer; }
        .widget-box .widget-header a:hover { color: #A8893A; }

        .credit-score-ring { display: flex; align-items: center; gap: 20px; }
        .credit-score-ring .ring { width: 80px; height: 80px; border-radius: 50%; position: relative; flex-shrink: 0; }
        .credit-score-ring .ring .inner { position: absolute; inset: 6px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #0B0B0B; }
        .credit-score-ring .ring .inner span { font-size: 9px; font-weight: 500; color: #8a8a8a; }
        .credit-score-ring .score-details { flex: 1; }
        .credit-score-ring .score-details .score-label { font-size: 11px; font-weight: 600; color: #1A1A1A; }
        .credit-score-ring .score-details .score-sub { font-size: 10px; color: #8a8a8a; }
        .credit-score-ring .score-details .score-factors { margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap; }
        .credit-score-ring .score-details .score-factors .factor { font-size: 9px; font-weight: 500; color: #5a5a5a; }
        .credit-score-ring .score-details .score-factors .factor i { color: #C9A84C; margin-right: 2px; }

        .budget-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f4f2ef; font-size: 12px; flex-wrap: wrap; gap: 4px 8px; }
        .budget-item:last-child { border-bottom: none; }
        .budget-item .budget-info { flex: 1 1 120px; display: flex; flex-direction: column; }
        .budget-item .budget-info .name { font-weight: 600; color: #1A1A1A; }
        .budget-item .budget-info .progress-track { width: 100%; height: 4px; background: #f0ede8; border-radius: 4px; margin-top: 2px; max-width: 140px; }
        .budget-item .budget-info .progress-track .fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .budget-item .budget-amount { font-weight: 700; color: #0B0B0B; font-size: 12px; }

        .invoice-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; font-size: 12px; flex-wrap: wrap; gap: 4px 8px; }
        .invoice-item:last-child { border-bottom: none; }
        .invoice-item .invoice-info { flex: 1 1 120px; display: flex; flex-direction: column; gap: 1px; }
        .invoice-item .invoice-info .inv-number { font-weight: 600; color: #1A1A1A; }
        .invoice-item .invoice-info .inv-date { color: #8a8a8a; font-size: 10px; }
        .invoice-item .invoice-amount { font-weight: 700; color: #0B0B0B; }
        .invoice-item .invoice-actions { display: flex; gap: 4px; }
        .invoice-item .invoice-actions button { background: none; border: none; color: #8a8a8a; cursor: pointer; padding: 2px 6px; border-radius: 4px; font-size: 12px; transition: all 0.2s; }
        .invoice-item .invoice-actions button:hover { background: #f4f2ef; color: #C9A84C; }
        .invoice-show-more { text-align: center; padding-top: 8px; border-top: 1px solid #f4f2ef; margin-top: 2px; }
        .invoice-show-more button { background: none; border: none; color: #C9A84C; font-weight: 600; font-size: 11px; cursor: pointer; transition: color 0.2s; padding: 4px 12px; border-radius: 6px; }
        .invoice-show-more button:hover { color: #A8893A; background: rgba(201,168,76,0.06); }

        .insights-list { display: flex; flex-direction: column; gap: 10px; }
        .insight-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f4f2ef; }
        .insight-item:last-child { border-bottom: none; }
        .insight-item .insight-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(201,168,76,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #C9A84C; font-size: 14px; }
        .insight-item .insight-content { flex: 1; }
        .insight-item .insight-content .insight-title { font-weight: 600; font-size: 12px; color: #0B0B0B; }
        .insight-item .insight-content .insight-desc { font-size: 11px; color: #6a6a6a; margin-top: 1px; line-height: 1.5; }

        .quick-actions-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .quick-action-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 4px; border-radius: 12px; border: 1px solid #f0ede8; background: #faf9f7; transition: all 0.2s; cursor: pointer; text-decoration: none; color: #1A1A1A; gap: 4px; }
        .quick-action-btn:hover { border-color: #C9A84C; background: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .quick-action-btn i { font-size: 18px; color: #C9A84C; }
        .quick-action-btn span { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #5a5a5a; }

        /* Removed insights widget – we keep only the financial snapshot */
        .insights-widget {
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.04);
          padding: 20px 22px 22px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          width: 100%;
        }
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
        .stat-card .stat-change i { margin-right: 2px; }

        .bills-section { border-top: 1px solid #f0ede8; padding-top: 16px; }
        .bills-section .bills-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .bills-section .bills-header h4 { font-size: 12px; font-weight: 700; color: #0B0B0B; }
        .bills-section .bills-header a { font-size: 10px; font-weight: 600; color: #C9A84C; text-decoration: none; cursor: pointer; }
        .bills-section .bills-header a:hover { color: #A8893A; }
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

        /* Transaction table remains unchanged */
        .transactions-full-panel { background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); padding: 18px 20px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .transactions-full-panel .panel-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
        .transactions-full-panel .panel-header h3 { font-size: 16px; font-weight: 700; color: #0B0B0B; }
        .transactions-full-panel .panel-header .panel-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .transactions-full-panel .panel-header .panel-actions input { padding: 6px 12px; border-radius: 8px; border: 1px solid #e8e2d9; font-size: 11px; background: #faf9f7; outline: none; transition: border 0.2s; width: 160px; }
        .transactions-full-panel .panel-header .panel-actions input:focus { border-color: #C9A84C; }
        .transactions-full-panel .panel-header .panel-actions select { padding: 6px 10px; border-radius: 8px; border: 1px solid #e8e2d9; font-size: 11px; background: #faf9f7; outline: none; cursor: pointer; }
        .transactions-full-panel .panel-header .panel-actions select:focus { border-color: #C9A84C; }
        .transactions-full-panel .panel-header .panel-actions .export-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid #e8e2d9; background: #fff; font-size: 11px; font-weight: 600; color: #1A1A1A; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .transactions-full-panel .panel-header .panel-actions .export-btn:hover { border-color: #C9A84C; color: #C9A84C; }

        .full-table-wrap { overflow-x: auto; max-height: 500px; overflow-y: auto; margin-top: 4px; }
        .full-table-wrap::-webkit-scrollbar { width: 4px; }
        .full-table-wrap::-webkit-scrollbar-thumb { background: #C9A84C; border-radius: 4px; }

        .full-transactions-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 700px; }
        .full-transactions-table thead th { text-align: left; padding: 10px 10px; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; color: #8a8a8a; border-bottom: 1px solid #f0ede8; white-space: nowrap; position: sticky; top: 0; background: #fff; z-index: 2; }
        .full-transactions-table tbody td { padding: 10px 10px; border-bottom: 1px solid #f4f2ef; color: #1A1A1A; white-space: nowrap; }
        .full-transactions-table tbody tr:hover { background: #faf9f7; }
        .full-transactions-table tbody tr:last-child td { border-bottom: none; }
        .full-transactions-table .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
        .full-transactions-table .status-badge.completed { background: rgba(45,155,78,0.08); color: #2D9B4E; }
        .full-transactions-table .status-badge.pending { background: rgba(232,168,56,0.08); color: #E8A838; }
        .full-transactions-table .status-badge.failed { background: rgba(217,67,82,0.08); color: #D94352; }
        .full-transactions-table .status-badge .dot { width: 4px; height: 4px; border-radius: 50%; display: inline-block; }
        .full-transactions-table .status-badge.completed .dot { background: #2D9B4E; }
        .full-transactions-table .status-badge.pending .dot { background: #E8A838; }
        .full-transactions-table .status-badge.failed .dot { background: #D94352; }
        .full-transactions-table .tx-type { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
        .full-transactions-table .tx-type i { font-size: 11px; color: #8a8a8a; }
        .full-transactions-table .tx-type.credit i { color: #2D9B4E; }
        .full-transactions-table .tx-type.debit i { color: #D94352; }
        .full-transactions-table .amount-credit { color: #2D9B4E; font-weight: 600; }
        .full-transactions-table .amount-debit { color: #D94352; font-weight: 600; }
        .full-transactions-table .pagination-wrap { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f4f2ef; margin-top: 4px; flex-wrap: wrap; gap: 10px; }
        .full-transactions-table .pagination-wrap .info { font-size: 11px; color: #8a8a8a; }
        .full-transactions-table .pagination-wrap .pages { display: flex; gap: 4px; }
        .full-transactions-table .pagination-wrap .pages button { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e8e2d9; background: #fff; font-size: 11px; font-weight: 600; color: #1A1A1A; cursor: pointer; transition: all 0.2s; }
        .full-transactions-table .pagination-wrap .pages button:hover { border-color: #C9A84C; color: #C9A84C; }
        .full-transactions-table .pagination-wrap .pages button.active { background: #0B0B0B; color: #fff; border-color: #0B0B0B; }

        .transfer-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .transfer-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; font-size: 12px; flex-wrap: wrap; gap: 4px 8px; }
        .transfer-item:last-child { border-bottom: none; }
        .transfer-item .transfer-details { flex: 1 1 120px; }
        .transfer-item .transfer-details .desc { font-weight: 500; color: #1A1A1A; }
        .transfer-item .transfer-details .meta { font-size: 10px; color: #8a8a8a; }
        .transfer-item .transfer-amount { font-weight: 700; }
        .transfer-item .transfer-amount.out { color: #D94352; }
        .transfer-item .transfer-amount.in { color: #2D9B4E; }

        .card-list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; gap: 8px; }
        .card-list-item:last-child { border-bottom: none; }
        .card-list-item .card-icon { width: 40px; height: 40px; border-radius: 10px; background: #f4f2ef; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #C9A84C; flex-shrink: 0; }
        .card-list-item .card-details { flex: 1 1 120px; padding: 0 12px; }
        .card-list-item .card-details .name { font-weight: 600; color: #1A1A1A; font-size: 13px; }
        .card-list-item .card-details .meta { font-size: 11px; color: #8a8a8a; }
        .card-list-item .card-status-badge { font-size: 9px; font-weight: 600; text-transform: uppercase; padding: 2px 10px; border-radius: 20px; }
        /* Force inactive – we override via inline style in the render, so this class is not used for active/etc. */
        .card-list-item .card-status-badge.inactive { background: #e8e2d9; color: #8a8a8a; }

        .payee-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; gap: 8px; }
        .payee-item:last-child { border-bottom: none; }
        .payee-item .payee-info { flex: 1 1 150px; display: flex; align-items: center; gap: 10px; }
        .payee-item .payee-info .initial { width: 32px; height: 32px; border-radius: 50%; background: #f4f2ef; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #C9A84C; font-size: 12px; }
        .payee-item .payee-info .name { font-weight: 600; color: #1A1A1A; }
        .payee-item .payee-info .acct { font-size: 11px; color: #8a8a8a; }

        .beneficiary-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; gap: 6px; }
        .beneficiary-item:last-child { border-bottom: none; }
        .beneficiary-item .benef-info { display: flex; align-items: center; gap: 10px; }
        .beneficiary-item .benef-info .initial { width: 32px; height: 32px; border-radius: 50%; background: #f4f2ef; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #C9A84C; font-size: 12px; }
        .beneficiary-item .benef-info .details .name { font-weight: 600; color: #1A1A1A; font-size: 12px; }
        .beneficiary-item .benef-info .details .acct { font-size: 10px; color: #8a8a8a; }
        .beneficiary-item .benef-actions { display: flex; gap: 4px; }
        .beneficiary-item .benef-actions button { background: none; border: none; color: #8a8a8a; cursor: pointer; padding: 2px 6px; font-size: 12px; border-radius: 4px; transition: all 0.2s; }
        .beneficiary-item .benef-actions button:hover { background: #f4f2ef; color: #C9A84C; }

        .statement-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; gap: 4px 8px; }
        .statement-item:last-child { border-bottom: none; }
        .statement-item .stmt-info { display: flex; align-items: center; gap: 10px; }
        .statement-item .stmt-info .stmt-icon { font-size: 18px; color: #C9A84C; }
        .statement-item .stmt-info .stmt-details .stmt-name { font-weight: 600; color: #1A1A1A; font-size: 12px; }
        .statement-item .stmt-info .stmt-details .stmt-date { font-size: 10px; color: #8a8a8a; }
        .statement-item .stmt-actions button { background: none; border: none; color: #8a8a8a; cursor: pointer; padding: 2px 8px; font-size: 12px; border-radius: 4px; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
        .statement-item .stmt-actions button:hover { background: #f4f2ef; color: #C9A84C; }

        .notification-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; }
        .notification-item:last-child { border-bottom: none; }
        .notification-item .notif-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; }
        .notification-item .notif-icon.info { background: rgba(59,130,246,0.08); color: #3B82F6; }
        .notification-item .notif-icon.success { background: rgba(45,155,78,0.08); color: #2D9B4E; }
        .notification-item .notif-icon.warning { background: rgba(232,168,56,0.08); color: #E8A838; }
        .notification-item .notif-icon.danger { background: rgba(217,67,82,0.08); color: #D94352; }
        .notification-item .notif-content { flex: 1 1 150px; }
        .notification-item .notif-content .title { font-weight: 600; color: #1A1A1A; font-size: 12px; }
        .notification-item .notif-content .desc { font-size: 11px; color: #8a8a8a; }
        .notification-item .notif-content .time { font-size: 9px; color: #b0b0b0; }
        .notification-item .notif-actions { display: flex; gap: 4px; }
        .notification-item .notif-actions button { background: none; border: none; color: #8a8a8a; cursor: pointer; padding: 4px; font-size: 12px; transition: color 0.2s; }
        .notification-item .notif-actions button:hover { color: #C9A84C; }
        .notification-item.unread .notif-content .title { color: #0B0B0B; }

        .device-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f4f2ef; flex-wrap: wrap; }
        .device-item:last-child { border-bottom: none; }
        .device-item .device-icon { font-size: 20px; color: #8a8a8a; width: 36px; text-align: center; }
        .device-item .device-info { flex: 1 1 120px; }
        .device-item .device-info .name { font-weight: 600; color: #1A1A1A; font-size: 12px; }
        .device-item .device-info .meta { font-size: 11px; color: #8a8a8a; }
        .device-item .device-status { font-size: 9px; font-weight: 600; text-transform: uppercase; padding: 2px 10px; border-radius: 20px; }
        .device-item .device-status.current { background: rgba(45,155,78,0.08); color: #2D9B4E; }
        .device-item .device-status.other { background: #f4f2ef; color: #8a8a8a; }
        .toggle-switch { position: relative; width: 42px; height: 24px; background: #e8e2d9; border-radius: 13px; cursor: pointer; transition: background 0.3s; flex-shrink: 0; }
        .toggle-switch.active { background: #C9A84C; }
        .toggle-switch .toggle-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .toggle-switch.active .toggle-knob { transform: translateX(18px); }

        .faq-item { border-bottom: 1px solid #f4f2ef; padding: 10px 0; }
        .faq-item:last-child { border-bottom: none; }
        .faq-item .question { font-weight: 600; color: #1A1A1A; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .faq-item .question i { transition: transform 0.2s; color: #C9A84C; }
        .faq-item .question.open i { transform: rotate(180deg); }
        .faq-item .answer { font-size: 12px; color: #5a5a5a; padding-top: 4px; display: none; line-height: 1.6; }
        .faq-item .question.open + .answer { display: block; }

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

        .full-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); z-index: 9999; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity 0.3s ease; }
        .full-modal-overlay.active { display: flex; opacity: 1; }
        .full-modal-box { background: #f4f2ef; border-radius: 20px; max-width: 1200px; width: 100%; max-height: 90vh; padding: 24px 28px 28px; box-shadow: 0 30px 80px rgba(0,0,0,0.4); animation: slideUp 0.35s ease; display: flex; flex-direction: column; overflow: hidden; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .full-modal-box .modal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #e8e2d9; flex-wrap: wrap; gap: 12px; }
        .full-modal-box .modal-header h2 { font-size: 20px; font-weight: 700; color: #0B0B0B; }
        .full-modal-box .modal-header .close-modal-btn { background: none; border: none; font-size: 22px; color: #8a8a8a; cursor: pointer; transition: color 0.2s; padding: 4px 8px; border-radius: 8px; }
        .full-modal-box .modal-header .close-modal-btn:hover { color: #0B0B0B; background: #f4f2ef; }
        .full-modal-box .modal-body { flex: 1; overflow-y: auto; padding-top: 14px; margin-right: -6px; padding-right: 6px; }
        .full-modal-box .modal-body::-webkit-scrollbar { width: 4px; }
        .full-modal-box .modal-body::-webkit-scrollbar-thumb { background: #C9A84C; border-radius: 4px; }
        .modal-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; border: 1px solid #e8e2d9; padding: 4px; }
        .modal-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 700px; }
        .modal-table thead th { text-align: left; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; color: #8a8a8a; border-bottom: 2px solid #e8e2d9; white-space: nowrap; background: #faf9f7; position: sticky; top: 0; z-index: 2; }
        .modal-table tbody td { padding: 10px 12px; border-bottom: 1px solid #f4f2ef; color: #1A1A1A; white-space: nowrap; }
        .modal-table tbody tr:hover { background: #faf9f7; }
        .modal-table tbody tr:last-child td { border-bottom: none; }
        .modal-table .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
        .modal-table .status-badge.completed { background: rgba(45,155,78,0.08); color: #2D9B4E; }
        .modal-table .status-badge.pending { background: rgba(232,168,56,0.08); color: #E8A838; }
        .modal-table .status-badge.failed { background: rgba(217,67,82,0.08); color: #D94352; }
        .modal-table .status-badge .dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
        .modal-table .status-badge.completed .dot { background: #2D9B4E; }
        .modal-table .status-badge.pending .dot { background: #E8A838; }
        .modal-table .status-badge.failed .dot { background: #D94352; }
        .modal-table .tx-type { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
        .modal-table .tx-type i { font-size: 12px; color: #8a8a8a; }
        .modal-table .tx-type.credit i { color: #2D9B4E; }
        .modal-table .tx-type.debit i { color: #D94352; }
        .modal-table .amount-credit { color: #2D9B4E; font-weight: 700; }
        .modal-table .amount-debit { color: #D94352; font-weight: 700; }

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

        @media (max-width: 768px) {
          .profile-wrap .profile-name, .profile-wrap .profile-dropdown-label span, .profile-wrap .profile-dropdown-label i { display: none !important; }
          .profile-wrap { padding: 0 !important; gap: 0 !important; border-radius: 50% !important; width: 36px !important; height: 36px !important; justify-content: center !important; background: transparent !important; border: none !important; flex-wrap: nowrap !important; }
          .profile-avatar { width: 32px !important; height: 32px !important; font-size: 12px !important; }
          .notification-btn { width: 32px !important; height: 32px !important; font-size: 12px !important; }
          .notification-btn .count { width: 14px !important; height: 14px !important; font-size: 7px !important; border-width: 1.5px !important; }
          .top-nav-right { flex-wrap: nowrap !important; gap: 6px !important; }
          .notification-dropdown { width: 320px !important; right: -60px !important; }
          body { font-size: 13px; }
          .page-header h2 { font-size: 1.2rem !important; }
          .page-header p { font-size: 0.75rem !important; }
          .card-box .card-balance { font-size: 1.4rem !important; }
          .card-box .card-balance .currency { font-size: 0.85rem !important; }
          .card-box .card-label { font-size: 0.6rem !important; }
          .card-box .card-number { font-size: 0.7rem !important; }
          .insights-widget .insights-header h3 { font-size: 0.9rem !important; }
          .stat-card .stat-value { font-size: 1.1rem !important; }
          .stat-card .stat-label { font-size: 0.55rem !important; }
          .debit-card-preview .card-number-display { font-size: 0.85rem !important; }
          .debit-card-preview .card-holder, .debit-card-preview .card-expiry { font-size: 0.6rem !important; }
          .widget-box .widget-header h4 { font-size: 0.8rem !important; }
          .widget-box .widget-header a { font-size: 0.65rem !important; }
          .invoice-item, .bill-item, .transfer-item { font-size: 0.7rem !important; }
          .quick-action-btn span { font-size: 0.5rem !important; }
          .quick-action-btn i { font-size: 0.9rem !important; }
          .card-list-item .card-details .name { font-size: 0.75rem !important; }
          .card-list-item .card-details .meta { font-size: 0.6rem !important; }
          .notification-item .notif-content .title { font-size: 0.75rem !important; }
          .notification-item .notif-content .desc { font-size: 0.65rem !important; }
          .device-item .device-info .name { font-size: 0.75rem !important; }
          .device-item .device-info .meta { font-size: 0.6rem !important; }
          .faq-item .question { font-size: 0.8rem !important; }
          .faq-item .answer { font-size: 0.7rem !important; }
          .breadcrumb { font-size: 0.7rem !important; }
          .transactions-full-panel .panel-header h3 { font-size: 0.9rem !important; }
          .full-transactions-table { font-size: 0.65rem !important; }
          .top-nav { padding: 10px 0 12px !important; gap: 8px !important; }
          .main-content { padding: 0 12px 20px !important; }
          .card-box { padding: 14px 16px 16px !important; }
          .debit-card-preview { padding: 14px 16px 16px !important; min-height: 120px !important; }
          .insights-widget { padding: 14px 16px 16px !important; }
          .total-balance-card .balance-left .amount { font-size: 24px !important; }
          .total-balance-card .balance-right { gap: 12px !important; }
          .total-balance-card .balance-right .stat .stat-value { font-size: 12px !important; }
          .credit-score-ring .ring { width: 60px !important; height: 60px !important; }
          .credit-score-ring .ring .inner { font-size: 16px !important; }
          .credit-score-ring .score-details .score-factors { flex-direction: column; gap: 4px !important; }
        }
        @media (max-width: 480px) {
          body { font-size: 12px; }
          .page-header h2 { font-size: 1rem !important; }
          .card-box .card-balance { font-size: 1.2rem !important; }
          .card-box .card-balance .currency { font-size: 0.75rem !important; }
          .stat-card .stat-value { font-size: 0.95rem !important; }
          .debit-card-preview .card-number-display { font-size: 0.7rem !important; }
          .profile-wrap { width: 28px !important; height: 28px !important; }
          .profile-avatar { width: 24px !important; height: 24px !important; font-size: 10px !important; }
          .notification-btn { width: 28px !important; height: 28px !important; font-size: 10px !important; }
          .notification-btn .count { width: 12px !important; height: 12px !important; font-size: 6px !important; }
          .breadcrumb { font-size: 0.6rem !important; }
          .mobile-menu-toggle { font-size: 16px !important; }
          .quick-actions-grid { grid-template-columns: 1fr 1fr !important; }
          .insights-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .cards-row { gap: 12px !important; }
          .widgets-row { gap: 12px !important; }
          .notification-dropdown { width: 290px !important; right: -80px !important; }
          .total-balance-card { flex-direction: column !important; align-items: stretch !important; padding: 16px !important; }
          .total-balance-card .balance-right { justify-content: space-between !important; }
          .total-balance-card .balance-left .amount { font-size: 20px !important; }
        }
        @media (max-width: 1200px) {
          .cards-row { grid-template-columns: 1fr 1fr; }
          .widgets-row { grid-template-columns: 1fr 1fr; }
          .insights-grid { grid-template-columns: repeat(2, 1fr); }
          .transfer-form-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 992px) {
          .sidebar { transform: translateX(-100%); width: 280px; }
          .sidebar.open { transform: translateX(0); }
          .main-content { margin-left: 0; padding: 0 16px 30px; }
          .top-nav { padding: 14px 0 16px; }
          .mobile-menu-toggle { display: flex !important; }
          .cards-row { grid-template-columns: 1fr; }
          .widgets-row { grid-template-columns: 1fr; gap: 16px; }
          .quick-actions-grid { grid-template-columns: 1fr 1fr 1fr; }
          .insights-grid { grid-template-columns: repeat(2, 1fr); }
          .transfer-form-grid { grid-template-columns: 1fr; }
          .full-modal-box { padding: 20px; max-height: 95vh; }
        }
        @media (max-width: 640px) {
          .top-nav { flex-direction: column; align-items: stretch; gap: 10px; }
          .top-nav-right { justify-content: space-between; gap: 10px; }
          .quick-actions-grid { grid-template-columns: 1fr 1fr 1fr; }
          .quick-action-btn { padding: 10px 4px; }
          .quick-action-btn i { font-size: 16px; }
          .quick-action-btn span { font-size: 8px; }
          .insights-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .stat-card .stat-value { font-size: 16px; }
          .full-transactions-table { min-width: 500px; }
          .transactions-full-panel .panel-header .panel-actions input { width: 100%; }
          .transactions-full-panel .panel-header { flex-direction: column; align-items: stretch; }
          .transactions-full-panel .panel-header .panel-actions { flex-wrap: wrap; }
          .full-modal-box { padding: 16px; }
          .full-modal-box .modal-header h2 { font-size: 18px; }
        }
        @media (max-width: 480px) {
          .insights-grid { grid-template-columns: 1fr; }
          .quick-actions-grid { grid-template-columns: 1fr 1fr; }
          .quick-action-btn { padding: 10px 2px; }
          .quick-action-btn span { font-size: 8px; }
          .top-nav-right { gap: 8px; }
          .stat-card .stat-value { font-size: 14px; }
          .card-box .card-balance { font-size: 22px; }
          .debit-card-preview { min-height: 150px; }
          .debit-card-preview .card-number-display { font-size: 14px; }
          .modal-table { min-width: 500px; font-size: 11px; }
        }
      `}</style>

      {/* ---- SIDEBAR OVERLAY ---- */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      {/* ---- TOAST ---- */}
      <div className={`toast-message ${toastVisible ? 'show' : ''}`}>
        <i className="fas fa-check-circle"></i>
        <span id="toastText">{toastMessage}</span>
        <button className="close-toast" onClick={hideToast}><i className="fas fa-times"></i></button>
      </div>

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

      {/* ---- SIDEBAR ---- */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 30 L30 10 L50 30 L40 30 L30 18 L20 30 L10 30Z" fill="#C9A84C" />
            <path d="M70 30 L90 10 L110 30 L100 30 L90 18 L80 30 L70 30Z" fill="#C9A84C" />
            <rect x="32" y="24" width="2" height="6" fill="#C9A84C" />
            <rect x="34" y="26" width="2" height="4" fill="#C9A84C" />
            <rect x="36" y="28" width="2" height="2" fill="#C9A84C" />
            <text x="46" y="26" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" fill="#FFFFFF" letterSpacing="2">SUMMIT</text>
            <text x="46" y="36" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="8" fill="#6b6b6b" letterSpacing="3">SHARES</text>
            <circle cx="120" cy="20" r="4" fill="#C9A84C" opacity="0.3" />
          </svg>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Main Menu</div>
          {navItems.map(item => {
            const badge = getNavBadge(item.id);
            return (
              <a
                key={item.id}
                className={activePage === item.id ? 'active' : ''}
                onClick={() => navigateTo(item.id)}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
                {badge !== null && <span className="badge">{badge}</span>}
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
              <span className="current" id="breadcrumbCurrent">
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

            {/* PROFILE DROPDOWN */}
            <div className="profile-wrap" onClick={toggleProfileDropdown}>
              <div className="profile-avatar">{(currentUser?.firstName || 'U').charAt(0)}{(currentUser?.lastName || 'S').charAt(0)}</div>
              <span className="profile-name">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Guest User'}</span>
              <div className="profile-dropdown-label">
                <span>View Profile</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className={`profile-dropdown-menu ${profileDropdownOpen ? 'open' : ''}`}>
                <a className="menu-item" onClick={() => { setProfileModalOpen(true); setProfileDropdownOpen(false); }}><i className="fas fa-user"></i> My Profile</a>
                <a className="menu-item" onClick={() => { setAccountSettingsModalOpen(true); setProfileDropdownOpen(false); }}><i className="fas fa-sliders-h"></i> Account Settings</a>
                <a className="menu-item" onClick={() => { navigateTo('security'); setProfileDropdownOpen(false); }}><i className="fas fa-shield-halved"></i> Security</a>
                <a className="menu-item" onClick={() => { setPreferencesModalOpen(true); setProfileDropdownOpen(false); }}><i className="fas fa-cog"></i> Preferences</a>
                <div className="divider"></div>
                <a className="menu-item" onClick={() => { setHelpModalOpen(true); setProfileDropdownOpen(false); }}><i className="fas fa-question-circle"></i> Help & Support</a>
                <a className="menu-item danger" onClick={() => { setSignOutModalOpen(true); setProfileDropdownOpen(false); }}><i className="fas fa-right-from-bracket"></i> Sign Out</a>
              </div>
            </div>
          </div>
        </header>

        {/* ---- PAGE: DASHBOARD ---- */}
        <div className={`page-section ${activePage === 'dashboard' ? 'active' : ''}`}>
          {dashboardError ? (
            <div className="card-box text-sm text-red-600">{dashboardError}</div>
          ) : null}

          {!loadingDashboard && dashboardData ? (
            <>
              <div className="total-balance-card mb-5">
                <div className="balance-left">
                  <div className="label">Total Balance</div>
                  <div className="amount"><span className="currency">$</span> {Number(dashboardData.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Across {dashboardData.accounts?.length || 0} account{(dashboardData.accounts?.length || 0) === 1 ? '' : 's'}</div>
                </div>
                <div className="balance-right">
                  <div className="stat">
                    <div className="stat-label">Income (MTD)</div>
                    <div className="stat-value positive">+$0.00</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Expenses (MTD)</div>
                    <div className="stat-value negative">-$0.00</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Notifications</div>
                    <div className="stat-value" style={{ color: '#C9A84C' }}>{dashboardData.unreadNotifications || 0}</div>
                  </div>
                </div>
              </div>

              <div className="cards-row">
                {/* Welcome message */}
                <div className="card-box" style={{ gridColumn: '1 / -1', background: '#fff', borderColor: '#e8e2d9', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0B', letterSpacing: 0.3 }}>
                      {(() => {
                        // Auto-detect local time and choose greeting accordingly.
                        const now = new Date();
                        const hour = now.getHours();
                        const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
                        const name = currentUser?.firstName || 'there';
                        return `${greeting}, ${name}`;
                      })()}
                    </div>
                    <div style={{ fontSize: 11, color: '#8a8a8a', marginTop: 2 }}>
                      Here’s what’s happening in your account right now.
                    </div>
                  </div>
                  <div>
                    <button className="btn-outline" style={{ fontSize: 11, padding: '7px 12px' }} onClick={() => showToast('Welcome & trust settings updated')}>
                      <i className="fas fa-handshake-angle" style={{ color: '#C9A84C', marginRight: 6 }}></i>
                      Trust & Insights
                    </button>
                  </div>
                </div>

                {dashboardData.accounts?.map((account) => {
                  // Format account number to Chase/Wells Fargo style: extract last 4 digits, no hyphens
                  const rawNum = account.account_number || '';
                  const last4 = rawNum.replace(/[^0-9]/g, '').slice(-4);
                  const displayNum = last4 ? `...${last4}` : rawNum;
                  const label = account.account_type === 'savings' ? 'Savings' : 'Checking';
                  return (
                  <div key={account.id} className="card-box">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="card-label"><i className={`fas ${account.account_type === 'savings' ? 'fa-piggy-bank' : 'fa-wallet'}`}></i> {label} Account</div>
                        <div className="card-number">{displayNum}</div>
                      </div>
                      <button className="text-slate-400 hover:text-brand-gold text-sm" onClick={() => toggleBalance(account.account_type)}>
                        <i className={`fas ${balancesVisible[account.account_type] ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                      </button>
                    </div>
                    <div className="card-balance">
                      {balancesVisible[account.account_type] ? <><span className="currency">$</span> {Number(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</> : <span className="hidden-balance">••••••••</span>}
                    </div>
                    <div className="card-actions">
                      <span className="text-xs text-slate-400">{account.account_type === 'savings' ? `APY: ${account.apy || 0}%` : `Routing: ${account.routing_number || 'N/A'}`}</span>
                      <button className="copy-btn" onClick={() => copyText(account.account_number, 'Account number copied')}><i className="fas fa-copy"></i> Copy Acc.</button>
                    </div>
                  </div>
                );})}

                {dashboardData.cards?.length ? (
                  <div className="debit-card-preview">
                    <div className="card-top">
                      <div>
                        <div className="card-type">{dashboardData.cards[0].card_type === 'credit' ? 'Credit Card' : 'Debit Card'}</div>
                        {/* --- Force card status to "Inactive" (grey) as requested --- */}
                        <div className="card-status" style={{ color: '#8a8a8a', background: '#e8e2d9' }}>
                          <span className="dot" style={{ background: '#8a8a8a' }}></span> Inactive
                        </div>
                      </div>
                      <div className="card-network">
                        <span className="contactless"><i className="fas fa-wifi"></i></span>
                        <i className="fab fa-cc-visa"></i>
                      </div>
                    </div>
                    <div className="card-number-display">•••• •••• •••• {dashboardData.cards[0].last4}</div>
                    <div className="card-bottom">
                      <div>
                        <div className="card-holder">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Account Holder'}</div>
                        <div className="card-expiry">Status <strong>Inactive</strong></div>
                      </div>
                      <div className="text-right"><span className="text-[10px] text-white/30">{dashboardData.cards[0].card_network?.toUpperCase()}</span></div>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="card-box">Loading your dashboard…</div>
          )}

          <div className="dashboard-stack">
              <div className="widgets-row">
                <div className="widget-box">
                  <div className="widget-header">
                    <h4><i className="fas fa-file-invoice text-brand-gold mr-2"></i> Recent Invoices</h4>
                    <a onClick={() => setInvoiceModalOpen(true)}>View All</a>
                  </div>
                  {renderInvoices()}
                </div>
                <div className="widget-box">
                  <div className="widget-header">
                    <h4><i className="fas fa-lightbulb text-brand-gold mr-2"></i> Smart Insights</h4>
                    <a onClick={() => showToast('Smart insights refreshed')}>Refresh</a>
                  </div>

                  <div className="insights-list">
                    <div className="insight-item">
                      <div className="insight-icon"><i className="fas fa-wallet"></i></div>
                      <div className="insight-content">
                        <div className="insight-title">Spending Focus</div>
                        <div className="insight-desc">Today's check-in: try keeping discretionary spend under 15%.</div>
                      </div>
                    </div>

                    <div className="insight-item">
                      <div className="insight-icon"><i className="fas fa-piggy-bank"></i></div>
                      <div className="insight-content">
                        <div className="insight-title">Savings Boost</div>
                        <div className="insight-desc">Set a weekly goal—small deposits compound fast.</div>
                      </div>
                    </div>

                    <div className="insight-item">
                      <div className="insight-icon"><i className="fas fa-gift"></i></div>
                      <div className="insight-content">
                        <div className="insight-title">Rewards Reminder</div>
                        <div className="insight-desc">Use your card for eligible categories to maximize points.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            <div className="widgets-row">
              <div className="widget-box">
                <div className="widget-header"><h4><i className="fas fa-bolt text-brand-gold mr-2"></i> Quick Actions</h4></div>
                <div className="quick-actions-grid">
                  <a className="quick-action-btn" onClick={() => navigateTo('transfer')}><i className="fas fa-arrow-right-arrow-left"></i><span>Transfers</span></a>
                  <a className="quick-action-btn" onClick={() => showToast('Wire Transfer opened')}><i className="fas fa-building-columns"></i><span>Wire</span></a>
                  <a className="quick-action-btn" onClick={() => navigateTo('bills')}><i className="fas fa-file-invoice-dollar"></i><span>Pay Bills</span></a>
                  <a className="quick-action-btn" onClick={() => showToast('Loan Request opened')}><i className="fas fa-hand-holding-dollar"></i><span>Loan</span></a>
                  <a className="quick-action-btn" onClick={() => showToast('Deposit opened')}><i className="fas fa-circle-dollar-to-slot"></i><span>Deposit</span></a>
                  <a className="quick-action-btn" onClick={() => showToast('Rewards opened')}><i className="fas fa-gift"></i><span>Rewards</span></a>
                </div>
              </div>
              {/* Removed extra widget; we keep only two columns */}
            </div>

            <div className="insights-widget">
              <div className="insights-header">
                <h3><i className="fas fa-chart-pie text-brand-gold mr-2"></i> Financial Snapshot</h3>
                <a onClick={() => showToast('Viewing detailed analytics')}>View Details</a>
              </div>
              <div className="insights-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Balance</div>
                  <div className="stat-value"><span className="currency">$</span> {dashboardData ? Number(dashboardData.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Accounts</div>
                  <div className="stat-value" style={{ color: '#2D9B4E' }}>{dashboardData?.accounts?.length || 0}</div>
                  <div className="stat-change positive"><i className="fas fa-arrow-up"></i> Active accounts on file</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Cards</div>
                  <div className="stat-value" style={{ color: '#D94352' }}>{dashboardData?.cards?.length || 0}</div>
                  <div className="stat-change negative"><i className="fas fa-arrow-down"></i> Linked card{(dashboardData?.cards?.length || 0) === 1 ? '' : 's'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Notifications</div>
                  <div className="stat-value" style={{ color: '#C9A84C' }}>{dashboardData?.unreadNotifications || 0}</div>
                  <div className="stat-change positive"><i className="fas fa-arrow-up"></i> Pending alerts</div>
                </div>
              </div>
              <div className="bills-section">
                <div className="bills-header">
                  <h4><i className="fas fa-clock text-brand-gold mr-1"></i> Upcoming Bills & Payments</h4>
                  <a onClick={() => navigateTo('bills')}>Manage Bills</a>
                </div>
                {renderBills()}
              </div>
            </div>
          </div>
        </div>

        {/* ---- PAGE: FUND TRANSFER ---- */}
        <div className={`page-section ${activePage === 'transfer' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Fund Transfer</h2>
            <p>Transfer money between accounts or to external recipients</p>
          </div>
          <div className="transfer-form-grid">
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">New Transfer</h4>
              <form id="transferForm" onSubmit={handleTransfer}>
                <div className="space-y-4">
                  <div className="form-group">
                    <label>From Account</label>
                    <select name="fromAccount" required>
                      {dashboardData?.accounts?.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_type === 'savings' ? 'Savings' : 'Checking'} ({acc.account_number}) - {formatCurrency(acc.balance)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>To Account</label>
                    <select name="toAccount" required>
                      {dashboardData?.accounts?.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_type === 'savings' ? 'Savings' : 'Checking'} ({acc.account_number})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input type="number" step="0.01" min="1" name="amount" placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input type="text" name="description" placeholder="Transfer description" required />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" name="date" required />
                  </div>
                  <button type="submit" className="btn-gold w-full justify-center"><i className="fas fa-paper-plane"></i> Send Transfer</button>
                </div>
              </form>
            </div>
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Recent Transfers</h4>
              {(() => {
                const recentTx = (transactions || [])
                  .filter(tx => tx.type === 'transfer')
                  .slice(0, 4);
                if (recentTx.length === 0) {
                  return <div className="text-slate-400 text-sm py-6">No recent transfers.</div>;
                }
                return recentTx.map((t, idx) => (
                  <div key={t.id || idx} className="transfer-item">
                    <div className="transfer-details">
                      <div className="desc">{t.description || 'Transfer'}</div>
                      <div className="meta">{t.transaction_date || ''} • {t.status || ''}</div>
                    </div>
                    <div className={`transfer-amount ${t.amount < 0 ? 'out' : 'in'}`}>
                      {formatCurrency(t.amount)}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* ---- PAGE: CARDS ---- */}
        <div className={`page-section ${activePage === 'cards' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Your Cards</h2>
            <p>Manage your credit and debit cards</p>
          </div>
          <div className="card-box">
            {(() => {
              const source = dashboardData?.cards || [];
              if (source.length === 0) {
                return <div className="text-slate-400 text-sm py-6">No cards found.</div>;
              }
              return source.map((card, idx) => (
                <div key={card.id || idx} className="card-list-item">
                  <div className="card-icon"><i className="fas fa-credit-card"></i></div>
                  <div className="card-details">
                    <div className="name">{card.cardholder_name || 'Card'}</div>
                    <div className="meta">**** {card.last4} • {card.card_type}</div>
                  </div>
                  {/* --- Force inactive status --- */}
                  <span className="card-status-badge" style={{ background: '#e8e2d9', color: '#8a8a8a' }}>Inactive</span>
                  <div className="card-actions">
                    <button className="btn-outline text-xs py-1 px-3" onClick={() => updateCardStatus(card.id, 'view')}>View</button>
                    <button className="btn-outline text-xs py-1 px-3" onClick={() => card.status === 'active' ? updateCardStatus(card.id, 'block') : updateCardStatus(card.id, 'activate')}>
                      {card.status === 'active' ? 'Block' : 'Activate'}
                    </button>
                  </div>
                </div>
              ));
            })()}
            <div className="mt-4 pt-4 border-t border-brand-border">
              <button className="btn-primary text-xs py-1.5 px-4" onClick={handleRequestNewCard}><i className="fas fa-plus"></i> Request New Card</button>
            </div>
          </div>
        </div>

        {/* ---- PAGE: TRANSACTIONS ---- */}
        <div className={`page-section ${activePage === 'transactions' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Transaction History</h2>
            <p>Complete view of all your transactions</p>
          </div>
          <div className="transactions-full-panel">
            <div className="panel-header">
              <h3>All Transactions</h3>
              <div className="panel-actions">
                <input type="text" placeholder="Search transactions..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} />
                <select value={txFilter} onChange={(e) => setTxFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                  <option value="transfer">Transfer</option>
                  <option value="payment">Payment</option>
                </select>
                <button className="export-btn" onClick={exportCSV}>
                  <i className="fas fa-download"></i> Export
                </button>
              </div>
            </div>
            <div className="full-table-wrap">
              <table className="full-transactions-table">
                <thead><tr><th>Date</th><th>ID</th><th>Description</th><th>Type</th><th>Debit</th><th>Credit</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {(() => {
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
                      return <tr><td colSpan="9" className="text-center py-8 text-slate-400">No transactions found</td></tr>;
                    }
                    return filtered.map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.transaction_date}</td>
                        <td className="font-mono text-xs text-slate-500">{tx.transaction_id}</td>
                        <td className="font-medium">{tx.description}</td>
                        <td className={`tx-type ${tx.type}`}>
                          <i className={`fas ${tx.type === 'credit' ? 'fa-arrow-down' : tx.type === 'debit' ? 'fa-arrow-up' : 'fa-arrow-right-arrow-left'}`}></i>
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </td>
                        <td>—</td>
                        <td>—</td>
                        <td className={tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td>{tx.balance_after !== null && tx.balance_after !== undefined ? formatCurrency(tx.balance_after) : '—'}</td>
                        <td><span className={`status-badge ${tx.status}`}><span className="dot"></span>{tx.status}</span></td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            <div className="full-transactions-table">
              <div className="pagination-wrap">
                <span className="info">
                  Showing 1–{(transactions || []).filter(tx => {
                    const matchType = txFilter === 'all' || tx.type === txFilter;
                    const matchSearch = !txSearch ? true : (
                      (tx.description || '').toLowerCase().includes(txSearch.toLowerCase()) ||
                      String(tx.transaction_id || '').toLowerCase().includes(txSearch.toLowerCase()) ||
                      String(tx.transaction_date || '').includes(txSearch)
                    );
                    return matchType && matchSearch;
                  }).length} of {(transactions || []).length} transactions
                </span>
                <div className="pages">
                  <button className="active">1</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- PAGE: PAY BILLS ---- */}
        <div className={`page-section ${activePage === 'bills' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Pay Bills</h2>
            <p>Manage and pay your bills</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-box">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-brand-dark text-sm">Payees</h4>
                <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setShowPayeeModal(true)}>
                  <i className="fas fa-plus"></i> Add Payee
                </button>
              </div>
              {renderPayees()}
              <hr className="my-4" />
              <h4 className="font-bold text-brand-dark text-sm mb-2">All Bills</h4>
              <div className="max-h-60 overflow-y-auto">
                {renderBills()}
              </div>
            </div>
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Pay a Bill</h4>
              <form onSubmit={handlePayBill}>
                <div className="space-y-4">
                  <div className="form-group">
                    <label>Select Bill</label>
                    <select name="billId" required>
                      {bills.length === 0 ? (
                        <option value="" disabled>No bills found – add one below</option>
                      ) : (
                        <>
                          <option value="" disabled selected>Select a bill</option>
                          {bills.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} – {formatCurrency(b.amount)} (due {b.due_date})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input type="number" step="0.01" name="amount" placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" name="dueDate" required />
                  </div>
                  <div className="form-group">
                    <label>Payment Description</label>
                    <input type="text" name="description" placeholder="e.g., Electricity bill" />
                  </div>
                  <div className="form-group">
                    <label>From Account</label>
                    <select name="fromAccount" required>
                      {dashboardData?.accounts?.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_type} – {formatCurrency(acc.balance)}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-gold w-full justify-center"><i className="fas fa-paper-plane"></i> Pay Now</button>
                </div>
              </form>
              <div className="mt-4 pt-4 border-t border-brand-border">
                <h4 className="font-bold text-brand-dark text-sm mb-2">Add New Bill</h4>
                <form onSubmit={handleAddBill} className="space-y-3">
                  <div className="form-group">
                    <label>Bill Name</label>
                    <input type="text" name="name" placeholder="e.g., Internet" required />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input type="number" step="0.01" name="amount" placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" name="dueDate" required />
                  </div>
                  <div className="form-group">
                    <label>Frequency</label>
                    <select name="frequency">
                      <option value="one-time">One-time</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status">
                      <option value="upcoming">Upcoming</option>
                      <option value="due">Due</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payee (optional)</label>
                    <select name="payeeId">
                      <option value="">None</option>
                      {payees.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full justify-center"><i className="fas fa-plus"></i> Add Bill</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* ---- PAGE: BENEFICIARIES ---- */}
        <div className={`page-section ${activePage === 'beneficiaries' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Beneficiaries</h2>
            <p>Manage your trusted recipients for transfers</p>
          </div>
          <div className="card-box">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-brand-dark text-sm">Your Beneficiaries</h4>
              <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setShowBeneficiaryModal(true)}>
                <i className="fas fa-plus"></i> Add Beneficiary
              </button>
            </div>
            {renderBeneficiaries()}
          </div>
        </div>

        {/* ---- PAGE: STATEMENTS ---- */}
        <div className={`page-section ${activePage === 'statements' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Statements & Documents</h2>
            <p>Access your account statements and tax documents</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-box">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-brand-dark text-sm">Account Statements</h4>
                <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setShowStatementModal(true)}>
                  <i className="fas fa-plus"></i> Generate
                </button>
              </div>
              {renderStatements()}
            </div>
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Tax Documents</h4>
              {renderTaxStatements()}
            </div>
          </div>
        </div>

        {/* ---- PAGE: NOTIFICATIONS ---- */}
        <div className={`page-section ${activePage === 'notifications' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Notifications</h2>
            <p>Stay updated with your account activity</p>
          </div>
          <div className="card-box">
            {renderNotifications()}
          </div>
        </div>

        {/* ---- PAGE: SECURITY ---- */}
        <div className={`page-section ${activePage === 'security' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Security Settings</h2>
            <p>Manage your account security and privacy</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Change Password</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const data = new FormData(form);
                const oldPassword = data.get('currentPassword');
                const newPassword = data.get('newPassword');
                const confirm = data.get('confirmPassword');
                if (newPassword !== confirm) {
                  showToast('Passwords do not match');
                  return;
                }
                try {
                  await changePassword({ oldPassword, newPassword });
                  showToast('Password changed successfully');
                  form.reset();
                } catch (err) {
                  console.error('❌ Password change failed:', err);
                  showToast(err.message);
                }
              }}>
                <div className="space-y-4">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" name="currentPassword" placeholder="Enter current password" required />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" name="newPassword" placeholder="Enter new password" required />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" name="confirmPassword" placeholder="Confirm new password" required />
                  </div>
                  <button type="submit" className="btn-primary w-full justify-center"><i className="fas fa-key"></i> Update Password</button>
                </div>
              </form>
            </div>
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Two-Factor Authentication</h4>
              <div className="flex items-center justify-between py-3 border-b border-brand-border">
                <div>
                  <p className="font-semibold text-sm">Authenticator App</p>
                  <p className="text-xs text-slate-400">Use Google Authenticator or similar</p>
                </div>
                <div className="toggle-switch active" onClick={toggle2FA}><div className="toggle-knob"></div></div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-brand-border">
                <div>
                  <p className="font-semibold text-sm">SMS Verification</p>
                  <p className="text-xs text-slate-400">Receive codes via SMS</p>
                </div>
                <div className="toggle-switch" onClick={toggle2FA}><div className="toggle-knob"></div></div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-sm">Email Verification</p>
                  <p className="text-xs text-slate-400">Receive codes via email</p>
                </div>
                <div className="toggle-switch active" onClick={toggle2FA}><div className="toggle-knob"></div></div>
              </div>
              <button className="btn-gold w-full justify-center mt-4" onClick={() => showToast('2FA settings updated')}><i className="fas fa-save"></i> Save Settings</button>
            </div>
            <div className="card-box md:col-span-2">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Devices & Sessions</h4>
              {renderDevices()}
              <button className="btn-outline text-xs py-1.5 px-3 mt-4" onClick={() => showToast('All other devices signed out')}><i className="fas fa-sign-out-alt"></i> Sign out all other devices</button>
            </div>
          </div>
        </div>

        {/* ---- PAGE: SUPPORT ---- */}
        <div className={`page-section ${activePage === 'support' ? 'active' : ''}`}>
          <div className="page-header">
            <h2>Support Center</h2>
            <p>Get help with your Summit Shares account</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Frequently Asked Questions</h4>
              {renderFAQ()}
            </div>
            <div className="card-box">
              <h4 className="font-bold text-brand-dark mb-4 text-sm">Contact Support</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const data = new FormData(form);
                const payload = {
                  name: data.get('fullName'),
                  email: data.get('email'),
                  subject: data.get('subject'),
                  message: data.get('message'),
                };
                try {
                  await submitSupportTicket(payload);
                  showToast('Support ticket submitted! We\'ll respond within 24 hours.');
                  form.reset();
                } catch (err) {
                  console.error('❌ Support ticket failed:', err);
                  showToast(err.message || 'Failed to submit ticket');
                }
              }}>
                <div className="space-y-4">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="fullName" placeholder="John Doe" required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" placeholder="john@example.com" required />
                  </div>
                  <div className="form-group">
                    <label>Subject</label>
                    <select name="subject" required>
                      <option value="Account Issue">Account Issue</option>
                      <option value="Transaction Inquiry">Transaction Inquiry</option>
                      <option value="Card Support">Card Support</option>
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea name="message" placeholder="Describe your issue..." required></textarea>
                  </div>
                  <button type="submit" className="btn-gold w-full justify-center">
                    <i className="fas fa-paper-plane"></i> Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </main>

      {/* ---- INVOICE MODAL ---- */}
      <div className={`full-modal-overlay ${invoiceModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setInvoiceModalOpen(false); }}>
        <div className="full-modal-box">
          <div className="modal-header">
            <h2><i className="fas fa-file-invoice text-brand-gold mr-2"></i> All Invoices</h2>
            <button className="close-modal-btn" onClick={() => setInvoiceModalOpen(false)}><i className="fas fa-times"></i></button>
          </div>
          <div className="modal-body">
            <div className="modal-table-wrap">
              <table className="modal-table">
                <thead><tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Action</th></tr></thead>
                <tbody>{renderModalInvoices()}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ---- PROFILE MODAL: My Profile ---- */}
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

      {/* ---- PROFILE MODAL: Account Settings ---- */}
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
            <div className="flex items-center justify-between py-2 border-b border-brand-border">
              <div>
                <p className="font-semibold text-sm">Paperless Statements</p>
                <p className="text-xs text-slate-400">Receive statements electronically</p>
              </div>
              <div className="toggle-switch active"><div className="toggle-knob"></div></div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-outline" onClick={() => setAccountSettingsModalOpen(false)}>Cancel</button>
            <button className="btn-gold" onClick={() => { setAccountSettingsModalOpen(false); showToast('Account settings saved'); }}><i className="fas fa-save"></i> Save Settings</button>
          </div>
        </div>
      </div>

      {/* ---- PROFILE MODAL: Preferences ---- */}
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
            <div className="flex items-center justify-between py-2 border-b border-brand-border">
              <div>
                <p className="font-semibold text-sm">Push Notifications</p>
                <p className="text-xs text-slate-400">Browser push notifications</p>
              </div>
              <div className="toggle-switch active"><div className="toggle-knob"></div></div>
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

      {/* ---- PROFILE MODAL: Help & Support ---- */}
      <div className={`modal-overlay ${helpModalOpen ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setHelpModalOpen(false); }}>
        <div className="modal-box">
          <div className="modal-title"><i className="fas fa-question-circle text-brand-gold mr-2"></i> Help & Support</div>
          <div className="modal-sub">How can we help you today? Call us at <strong>+1 276 257 6174</strong></div>
          <div className="space-y-4" style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I reset my password?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Go to Security Settings and use the Change Password form. You will need your current password to set a new one. If you have forgotten your password, please email <a href="mailto:support@summitshares.com" style={{color: '#C9A84C', fontWeight: 600}}>support@summitshares.com</a> or call <strong>+1 276 257 6174</strong> for assistance.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I report a lost or stolen card?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Call our fraud team immediately at <strong>+1 276 257 6174</strong> or email <a href="mailto:fraud@summitshares.com" style={{color: '#C9A84C', fontWeight: 600}}>fraud@summitshares.com</a>. We monitor accounts 24/7 and will block your card instantly to prevent unauthorized use.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I check my account balance?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Your account balance is displayed at the top of the Dashboard. You can also view individual checking and savings account balances with the show/hide toggle. For recent transactions, visit the Transactions page.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I transfer funds between accounts?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Go to Fund Transfer in the sidebar. Select the source and destination accounts, enter the amount, and click Send Transfer. Internal transfers between your Summit Shares accounts are processed instantly.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I add a beneficiary?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Navigate to the Beneficiaries page and click Add Beneficiary. Fill in the required details and save. For international wires, email <a href="mailto:wires@summitshares.com" style={{color: '#C9A84C', fontWeight: 600}}>wires@summitshares.com</a> or call <strong>+1 276 257 6174</strong>.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I pay bills through Summit Shares?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Go to Pay Bills in the sidebar. You can add a payee, set up a new bill, and make payments directly from your checking or savings account. Schedule one-time or recurring payments for utilities, subscriptions, and more.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I block or activate my card?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Visit the Cards page to view all your cards. Click Block to temporarily disable a card or Activate to re-enable it. You can also request a new card from the same page. For immediate assistance, call <strong>+1 276 257 6174</strong>.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I download account statements?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Go to Statements & Documents in the sidebar. You can view and download account statements and tax documents. Use the Generate button to create a new statement for a custom date range.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I update my contact information?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Click your profile avatar in the top-right corner and select My Profile. Edit your name, email, or phone number and save. To update your email address, email <a href="mailto:accounts@summitshares.com" style={{color: '#C9A84C', fontWeight: 600}}>accounts@summitshares.com</a> with your request.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I enable two-factor authentication?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">Go to Security Settings in the sidebar. Under Two-Factor Authentication, toggle on Authenticator App, SMS Verification, or Email Verification. We recommend using at least one method for enhanced account security.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I export my transactions?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">On the Transactions page, use the search and filter options to find specific transactions, then click the Export button to download a CSV file. The file includes date, description, type, amount, balance, and status for each transaction.</div>
            </div>
            <div className="faq-item">
              <div className="question" onClick={(e) => e.currentTarget.classList.toggle('open')}>
                How do I contact customer support?
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="answer">You can reach us at <a href="mailto:info@summitshares.com" style={{color: '#C9A84C', fontWeight: 600}}>info@summitshares.com</a> or call <strong>+1 276 257 6174</strong>. Our team typically responds within 24 hours. For urgent fraud concerns, email <a href="mailto:fraud@summitshares.com" style={{color: '#C9A84C', fontWeight: 600}}>fraud@summitshares.com</a> or call the same number.</div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-outline" onClick={() => setHelpModalOpen(false)}>Close</button>
            <button className="btn-gold" onClick={() => { navigateTo('support'); setHelpModalOpen(false); }}><i className="fas fa-headset"></i> Contact Support</button>
          </div>
        </div>
      </div>

      {/* ---- NEW MODALS ---- */}
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
    </div>
  );
};

export default DashboardPage;
