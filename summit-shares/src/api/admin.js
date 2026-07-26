// ----- Admin API Base URL (OR-fallback pattern) -----
// Uses the same logic as src/api.js but scoped to /admin
const API_BASE = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_API_URL) {
    return `${import.meta.env.VITE_APP_API_URL}/admin`;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api/admin';
  }
  return '/api/admin';
})();

const getToken = () => localStorage.getItem('token');

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ---- AUTH ----
export const adminLogin = async (email, password) => {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('adminRole', data.user.role);
  }
  return data;
};

export const adminLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('adminRole');
  window.location.href = '/admin/login';
};

// ---- DASHBOARD ----
export const getAdminDashboard = async () => {
  const res = await fetch(`${API_BASE}/dashboard`, { headers: headers() });
  return handleResponse(res);
};

// ---- CUSTOMERS ----
export const getCustomers = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/customers?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const getCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, { headers: headers() });
  return handleResponse(res);
};

export const updateCustomer = async (id, data) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

// NEW: Toggle online banking access (convenience wrapper around updateCustomer)
export const toggleLoginEnabled = async (id, enabled) => {
  return updateCustomer(id, { login_enabled: enabled });
};

export const activateCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}/activate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const deactivateCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}/deactivate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const suspendCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}/suspend`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const reinstateCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}/reinstate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const deleteCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/customers/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse(res);
};

export const getCustomerActivity = async (id, filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/customers/${id}/activity?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const getApplications = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/applications?${params}`, { headers: headers() });
  return handleResponse(res);
};

// NEW: Get detailed application data
export const getApplicationDetails = async (id) => {
  const res = await fetch(`${API_BASE}/applications/${id}`, { headers: headers() });
  return handleResponse(res);
};

export const approveApplication = async (id, notes = '') => {
  const res = await fetch(`${API_BASE}/applications/${id}/approve`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ notes }),
  });
  return handleResponse(res);
};

export const rejectApplication = async (id, notes = '') => {
  const res = await fetch(`${API_BASE}/applications/${id}/reject`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ notes }),
  });
  return handleResponse(res);
};

export const reviewApplication = async (id, notes = '') => {
  const res = await fetch(`${API_BASE}/applications/${id}/review`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ notes }),
  });
  return handleResponse(res);
};

export const updateCreditScore = async (id, creditScore) => {
  const res = await fetch(`${API_BASE}/customers/${id}/credit-score`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ creditScore }),
  });
  return handleResponse(res);
};

export const sendCustomerEmail = async (id, subject, message) => {
  const res = await fetch(`${API_BASE}/customers/${id}/send-email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject, message }),
  });
  return handleResponse(res);
};

// ---- DEMO HISTORY GENERATION ----
export const generateDemoHistory = async (customerId, config) => {
  const res = await fetch(`${API_BASE}/customers/${customerId}/generate-history`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(config),
  });
  return handleResponse(res);
};

// ---- ACCOUNTS ----
export const getAccounts = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/accounts?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const createAccount = async (data) => {
  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const updateAccount = async (id, data) => {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const creditAccount = async (id, amount, description = '') => {
  const res = await fetch(`${API_BASE}/accounts/${id}/credit`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount, description }),
  });
  return handleResponse(res);
};

export const debitAccount = async (id, amount, description = '') => {
  const res = await fetch(`${API_BASE}/accounts/${id}/debit`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount, description }),
  });
  return handleResponse(res);
};

export const editAccountBalance = async (id, newBalance) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/balance`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ newBalance }),
  });
  return handleResponse(res);
};

export const activateAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/activate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const deactivateAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/deactivate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const closeAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/close`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const reopenAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/reopen`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const freezeAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/freeze`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const unfreezeAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/unfreeze`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const holdAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/hold`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const removeAccountHold = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/remove-hold`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const deleteAccount = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse(res);
};

export const getAccountTransactions = async (id, filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/accounts/${id}/transactions?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const getAccountDetails = async (id) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/details`, { headers: headers() });
  return handleResponse(res);
};

export const adjustAvailableBalance = async (id, newBalance) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/available-balance`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ newBalance }),
  });
  return handleResponse(res);
};

export const adjustLedgerBalance = async (id, newBalance) => {
  const res = await fetch(`${API_BASE}/accounts/${id}/ledger-balance`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ newBalance }),
  });
  return handleResponse(res);
};

// ---- CARDS ----
export const getCards = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/cards?${params}`, { headers: headers() });
  return handleResponse(res);
};

// NEW: Issue a new card (admin only)
export const issueCard = async (data) => {
  const res = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const activateCard = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/activate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const deactivateCard = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/deactivate`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const blockCard = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/block`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const unblockCard = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/unblock`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const toggleCardVisibility = async (id, hidden) => {
  const res = await fetch(`${API_BASE}/cards/${id}/visibility`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ hidden }),
  });
  return handleResponse(res);
};

export const approveCardRequest = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/approve`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const rejectCardRequest = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/reject`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const replaceCard = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/replace`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const cancelCard = async (id) => {
  const res = await fetch(`${API_BASE}/cards/${id}/cancel`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

// ---- TRANSFERS ----
export const getTransfers = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/transfers?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const approveTransfer = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/approve`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const blockTransfer = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/block`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const holdTransfer = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/hold`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const rejectTransfer = async (id, reason = '') => {
  const res = await fetch(`${API_BASE}/transfers/${id}/reject`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
};

export const unblockTransfer = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/unblock`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const removeTransferHold = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/remove-hold`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const markTransferSent = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/mark-sent`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const markTransferCompleted = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/mark-completed`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

export const markTransferFailed = async (id, errorMessage = '') => {
  const res = await fetch(`${API_BASE}/transfers/${id}/mark-failed`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ errorMessage }),
  });
  return handleResponse(res);
};

export const setTransferErrorMessage = async (id, errorMessage) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/error-message`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ errorMessage }),
  });
  return handleResponse(res);
};

export const notifyCustomer = async (id) => {
  const res = await fetch(`${API_BASE}/transfers/${id}/notify`, {
    method: 'POST',
    headers: headers(),
  });
  return handleResponse(res);
};

// ---- NOTIFICATIONS ----
export const sendPopupNotification = async (userId, title, description) => {
  const res = await fetch(`${API_BASE}/notifications/popup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ userId, title, description }),
  });
  return handleResponse(res);
};

export const emailCustomer = async (userId, subject, message) => {
  const res = await fetch(`${API_BASE}/notifications/email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ userId, subject, message }),
  });
  return handleResponse(res);
};

export const broadcastNotification = async (title, description, role = 'customer') => {
  const res = await fetch(`${API_BASE}/notifications/broadcast`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title, description, role }),
  });
  return handleResponse(res);
};

// ---- AUDIT ----
export const getLoginHistory = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/audit/login-history?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const getUserActivity = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/audit/user-activity?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const getAdminActivity = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/audit/admin-activity?${params}`, { headers: headers() });
  return handleResponse(res);
};

export const getAuditLogs = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/audit/logs?${params}`, { headers: headers() });
  return handleResponse(res);
};