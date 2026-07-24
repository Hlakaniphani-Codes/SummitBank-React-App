// ============================================
// UNIFIED API CLIENT
// Works in Local Development & Production
// ============================================

// ----- API Base URL (OR-fallback pattern for dev & production) -----
// Priority:
//   1. VITE_APP_API_URL env var (set in production / .env.local)
//   2. '/api' — uses Vite's dev proxy in development (see vite.config.js)
//   3. Direct localhost as final fallback
const API_BASE = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_API_URL) {
    return import.meta.env.VITE_APP_API_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return '/api';
})();

// Helper functions
const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ============================================
// API ENDPOINTS
// ============================================

// ---- AUTH ----
export const register = (payload) =>
  fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handleResponse);

export const login = (email, password) =>
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

// ---- DASHBOARD ----
export const getDashboard = () =>
  fetch(`${API_BASE}/dashboard`, { headers: headers() }).then(handleResponse);

// ---- TRANSACTIONS ----
export const getTransactions = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return fetch(`${API_BASE}/transactions?${params}`, { headers: headers() }).then(handleResponse);
};

export const transferFunds = (payload) =>
  fetch(`${API_BASE}/transactions/transfer`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

// ---- CARDS ----
export const blockCard = (cardId) =>
  fetch(`${API_BASE}/cards/${cardId}/block`, { 
    method: 'POST', 
    headers: headers() 
  }).then(handleResponse);

export const activateCard = (cardId) =>
  fetch(`${API_BASE}/cards/${cardId}/activate`, { 
    method: 'POST', 
    headers: headers() 
  }).then(handleResponse);

export const requestNewCard = (payload) =>
  fetch(`${API_BASE}/cards`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

// ---- BENEFICIARIES ----
export const getBeneficiaries = () =>
  fetch(`${API_BASE}/beneficiaries`, { headers: headers() }).then(handleResponse);

export const addBeneficiary = (payload) =>
  fetch(`${API_BASE}/beneficiaries`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

export const deleteBeneficiary = (id) =>
  fetch(`${API_BASE}/beneficiaries/${id}`, { 
    method: 'DELETE', 
    headers: headers() 
  }).then(handleResponse);

// ---- PAYEES & BILLS ----
export const getPayees = () =>
  fetch(`${API_BASE}/payments/payees`, { headers: headers() }).then(handleResponse);

export const addPayee = (payload) =>
  fetch(`${API_BASE}/payments/payees`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

export const getBills = () =>
  fetch(`${API_BASE}/payments/bills`, { headers: headers() }).then(handleResponse);

export const addBill = (payload) =>
  fetch(`${API_BASE}/payments/bills`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

export const payBill = (billId, payload) =>
  fetch(`${API_BASE}/payments/bills/${billId}/pay`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

// ---- DOCUMENTS / STATEMENTS ----
export const getDocuments = () =>
  fetch(`${API_BASE}/payments/documents`, { headers: headers() }).then(handleResponse);

export const generateStatement = (payload) =>
  fetch(`${API_BASE}/payments/documents/statements`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

// ---- NOTIFICATIONS ----
export const getNotifications = () =>
  fetch(`${API_BASE}/notifications`, { headers: headers() }).then(handleResponse);

export const markNotificationRead = (id) =>
  fetch(`${API_BASE}/notifications/${id}/read`, { 
    method: 'PUT', 
    headers: headers() 
  }).then(handleResponse);

// ---- USER PROFILE & PASSWORD ----
export const getProfile = () =>
  fetch(`${API_BASE}/user/profile`, { headers: headers() }).then(handleResponse);

export const updateProfile = (payload) =>
  fetch(`${API_BASE}/user/profile`, { 
    method: 'PUT', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

export const changePassword = (payload) =>
  fetch(`${API_BASE}/user/profile/change-password`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

// ---- SUPPORT ----
export const submitSupportTicket = (payload) =>
  fetch(`${API_BASE}/support`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  }).then(handleResponse);

// ---- WIRE TRANSFERS ----
export const getWires = () =>
  fetch(`${API_BASE}/wires`, { headers: headers() }).then(handleResponse);

export const createWire = (payload) =>
  fetch(`${API_BASE}/wires`, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  }).then(handleResponse);

export const getWireDetails = (wireId) =>
  fetch(`${API_BASE}/wires/${wireId}`, { headers: headers() }).then(handleResponse);

// ---- CHEQUE DEPOSITS ----
export const getChequeDeposits = () =>
  fetch(`${API_BASE}/cheques`, { headers: headers() }).then(handleResponse);

export const depositCheque = (formData) =>
  fetch(`${API_BASE}/cheques/deposit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then(handleResponse);

// ---- EXPORTS ----
export { API_BASE };