import React from 'react';
import { useClient } from './ClientLayout';

const ClientCheques = () => {
  const {
    dashboardData,
    formatCurrency,
    showToast,
    chequeDeposits,
    loadingCheques,
    chequeFormOpen,
    setChequeFormOpen,
    handleDepositCheque,
  } = useClient();

  // Generate demo cheque deposits if none exist
  const displayDeposits = chequeDeposits.length > 0 ? chequeDeposits : [
    {
      id: 'demo-1',
      amount: 2500.00,
      status: 'completed',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      description: 'Payroll Cheque Deposit',
      account_number: '••••4521',
      account_type: 'checking',
    },
    {
      id: 'demo-2',
      amount: 150.75,
      status: 'pending',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      description: 'Personal Cheque Deposit',
      account_number: '••••4521',
      account_type: 'checking',
    },
    {
      id: 'demo-3',
      amount: 5000.00,
      status: 'completed',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      description: 'Business Cheque Deposit',
      account_number: '••••7890',
      account_type: 'savings',
    },
  ];

  return (
    <div className="page-section active">
      <div className="page-header">
        <h2>Deposit Cheques</h2>
        <p>Deposit cheques using your mobile device or view deposit history</p>
      </div>
      <div className="transfer-form-grid">
        <div className="card-box">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-brand-dark text-sm">Deposit History</h4>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setChequeFormOpen(!chequeFormOpen)}>
              <i className="fas fa-plus"></i> New Deposit
            </button>
          </div>
          {loadingCheques ? (
            <div className="text-slate-400 text-sm py-6">Loading deposits...</div>
          ) : (
            displayDeposits.map(d => (
              <div key={d.id} className="transfer-item">
                <div className="transfer-details">
                  <div className="desc">{d.description || 'Cheque Deposit'}</div>
                  <div className="meta">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''} • 
                    <span style={{
                      color: d.status === 'completed' ? '#2D9B4E' : d.status === 'pending' ? '#E8A838' : '#D94352',
                      fontWeight: 600, marginLeft: 4
                    }}>
                      {d.status}
                    </span>
                    {d.account_number ? ` • ${d.account_number}` : ''}
                  </div>
                </div>
                <div className="transfer-amount in">
                  {formatCurrency(d.amount)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="card-box">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">
            {chequeFormOpen ? 'Deposit a Cheque' : 'Cheque Deposit'}
          </h4>
          {chequeFormOpen ? (
            <form onSubmit={handleDepositCheque} encType="multipart/form-data">
              <div className="space-y-4">
                <div className="form-group">
                  <label>Deposit To Account</label>
                  <select name="accountId" required>
                    {dashboardData?.accounts?.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_type} - {formatCurrency(acc.balance)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input type="number" step="0.01" min="0.01" name="amount" placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Cheque Front Image</label>
                  <input type="file" name="front" accept="image/*" capture="environment" />
                </div>
                <div className="form-group">
                  <label>Cheque Back Image</label>
                  <input type="file" name="back" accept="image/*" capture="environment" />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input type="text" name="description" placeholder="e.g., Birthday cheque" />
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  By depositing this cheque, you agree to our terms and confirm that the cheque is payable to you.
                </p>
                <button type="submit" className="btn-gold w-full justify-center">
                  <i className="fas fa-circle-dollar-to-slot"></i> Submit Deposit
                </button>
              </div>
            </form>
          ) : (
            <div className="text-slate-400 text-sm py-6 text-center">
              Click "New Deposit" to deposit a cheque. Take a photo of the front and back of your endorsed cheque.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientCheques;
