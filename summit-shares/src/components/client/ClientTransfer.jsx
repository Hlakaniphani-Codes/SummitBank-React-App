import React from 'react';
import { useClient } from './ClientLayout';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

const ClientTransfer = () => {
  const {
    dashboardData,
    formatCurrency,
    handleTransfer,
    selectedFromAccount,
    setSelectedFromAccount,
    transactions,
  } = useClient();

  const [transferring, onTransferSubmit] = useSubmitGuard(handleTransfer);

  return (
    <div className="page-section active">
      <div className="page-header">
        <h2>Fund Transfer</h2>
        <p>Move money between your own accounts. For sending to another bank, use Wire Transfers.</p>
      </div>
      <div className="transfer-form-grid">
        <div className="card-box">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">New Transfer</h4>
          <form onSubmit={onTransferSubmit}>
            <div className="space-y-4">
              <div className="form-group">
                <label>From Account</label>
                <select name="fromAccount" required onChange={(e) => setSelectedFromAccount(e.target.value)}>
                  <option value="">Select account...</option>
                  {dashboardData?.accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_type === 'savings' ? 'Savings' : 'Checking'} ({acc.account_number}) - {formatCurrency(acc.balance)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>To Account</label>
                <select name="toAccount" required>
                  <option value="">Select account...</option>
                  {dashboardData?.accounts?.filter(acc => String(acc.id) !== String(selectedFromAccount)).map(acc => (
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
              <button type="submit" disabled={transferring} className="btn-gold w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
                <i className="fas fa-paper-plane"></i> {transferring ? 'Sending…' : 'Send Transfer'}
              </button>
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
  );
};

export default ClientTransfer;