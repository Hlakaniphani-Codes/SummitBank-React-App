import React, { useState } from 'react';
import { useClient } from './ClientLayout';
import GenerateReceiptModal from '../GenerateReceiptModal';

const ClientBills = () => {
  const {
    bills,
    payees,
    dashboardData,
    formatCurrency,
    showToast,
    handlePayBill,
    handleAddBill,
    setShowBillModal,
  } = useClient();

  const [receiptBill, setReceiptBill] = useState(null);

  // Generate demo bills if none exist
  const displayBills = bills.length > 0 ? bills : [
    {
      id: 'demo-bill-1',
      name: 'Electricity Bill',
      description: 'Monthly electricity payment',
      amount: 145.50,
      due_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
      frequency: 'monthly',
      status: 'due',
      payee_name: 'City Power Corp',
    },
    {
      id: 'demo-bill-2',
      name: 'Internet Service',
      description: 'Fiber internet plan',
      amount: 89.99,
      due_date: new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10),
      frequency: 'monthly',
      status: 'upcoming',
      payee_name: 'SpeedNet ISP',
    },
    {
      id: 'demo-bill-3',
      name: 'Water Utility',
      description: 'Monthly water bill',
      amount: 62.30,
      due_date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
      frequency: 'monthly',
      status: 'paid',
      payee_name: 'Metro Water Services',
    },
    {
      id: 'demo-bill-4',
      name: 'Rent Payment',
      description: 'Monthly apartment rent',
      amount: 1500.00,
      due_date: new Date(Date.now() + 86400000 * 20).toISOString().slice(0, 10),
      frequency: 'monthly',
      status: 'upcoming',
      payee_name: 'Haven Properties LLC',
    },
  ];

  return (
    <div className="page-section active">
      <div className="page-header">
        <h2>Pay Bills</h2>
        <p>Manage and pay your bills</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-box">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-brand-dark text-sm">All Bills</h4>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setShowBillModal(true)}>
              <i className="fas fa-plus"></i> Add Bill
            </button>
          </div>
          {displayBills.length === 0 ? (
            <div className="text-slate-400 text-sm py-6">No bills found.</div>
          ) : (
            displayBills.map(b => (
              <div key={b.id} className="bill-item">
                <div className="bill-info">
                  <div className={`bill-icon ${b.status === 'paid' ? 'credit' : b.status === 'due' ? 'utilities' : 'subscription'}`}>
                    <i className={`fas ${b.status === 'paid' ? 'fa-check-circle' : 'fa-file-invoice'}`}></i>
                  </div>
                  <div className="bill-details">
                    <div className="bill-name">{b.name}</div>
                    <div className="bill-date">
                      Due {b.due_date} • {b.frequency}
                      {b.payee_name ? ` • ${b.payee_name}` : ''}
                    </div>
                  </div>
                </div>
                <div className="bill-amount">{formatCurrency(b.amount)}</div>
                <span className={`bill-status ${b.status}`}>{b.status}</span>
                {b.status === 'paid' && (
                  <button
                    onClick={() => setReceiptBill(b)}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                    title="View Receipt"
                  >
                    <i className="fas fa-receipt"></i>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <div className="card-box">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">Pay a Bill</h4>
          <form onSubmit={handlePayBill}>
            <div className="space-y-4">
              <div className="form-group">
                <label>Select Bill</label>
                <select name="billId" required>
                  {displayBills.length === 0 ? (
                    <option value="" disabled>No bills found</option>
                  ) : (
                    <>
                      <option value="" disabled selected>Select a bill</option>
                      {displayBills.map(b => (
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
                  {dashboardData?.accounts?.length > 0 ? (
                    dashboardData.accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_type} - {acc.account_number ? `...${acc.account_number.slice(-4)}` : ''} ({formatCurrency(acc.balance)})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No accounts available</option>
                  )}
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
              <button type="submit" className="btn-primary w-full justify-center"><i className="fas fa-plus"></i> Add Bill</button>
            </form>
          </div>
        </div>
      </div>

      {/* Receipt Modal for Paid Bills */}
      <GenerateReceiptModal
        isOpen={!!receiptBill}
        onClose={() => setReceiptBill(null)}
        transaction={{
          id: receiptBill?.id,
          transaction_id: `BILL-${receiptBill?.id}`,
          description: `Payment for ${receiptBill?.name}`,
          amount: -(receiptBill?.amount || 0),
          type: 'payment',
          status: 'completed',
          transaction_date: receiptBill?.due_date,
          balance_after: null,
        }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

export default ClientBills;
