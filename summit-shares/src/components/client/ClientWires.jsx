import React from 'react';
import { useClient } from './ClientLayout';

const ClientWires = () => {
  const {
    dashboardData,
    formatCurrency,
    showToast,
    wires,
    loadingWires,
    wireFormOpen,
    setWireFormOpen,
    handleCreateWire,
  } = useClient();

  return (
    <div className="page-section active">
      <div className="page-header">
        <h2>Wire Transfers</h2>
        <p>Send international and domestic wire transfers</p>
      </div>
      <div className="transfer-form-grid">
        <div className="card-box">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-brand-dark text-sm">Wire Transfer History</h4>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setWireFormOpen(!wireFormOpen)}>
              <i className="fas fa-plus"></i> New Wire
            </button>
          </div>
          {loadingWires ? (
            <div className="text-slate-400 text-sm py-6">Loading wires...</div>
          ) : wires.length === 0 ? (
            <div className="text-slate-400 text-sm py-6">No wire transfers found.</div>
          ) : (
            wires.map(w => (
              <div key={w.id} className="transfer-item">
                <div className="transfer-details">
                  <div className="desc">{w.beneficiary_name}</div>
                  <div className="meta">{w.beneficiary_bank} • {w.status}</div>
                </div>
                <div className={`transfer-amount ${w.status === 'completed' ? 'in' : 'out'}`}>
                  {formatCurrency(w.amount)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="card-box">
          <h4 className="font-bold text-brand-dark mb-4 text-sm">
            {wireFormOpen ? 'New Wire Transfer' : 'Wire Transfer Form'}
          </h4>
          {wireFormOpen ? (
            <form onSubmit={handleCreateWire}>
              <div className="space-y-4">
                <div className="form-group">
                  <label>From Account</label>
                  <select name="fromAccount" required>
                    {dashboardData?.accounts?.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_type} - {formatCurrency(acc.balance)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Beneficiary Name</label>
                  <input type="text" name="beneficiaryName" placeholder="John Doe" required />
                </div>
                <div className="form-group">
                  <label>Beneficiary Bank</label>
                  <input type="text" name="beneficiaryBank" placeholder="Bank of America" required />
                </div>
                <div className="form-group">
                  <label>Beneficiary Account Number</label>
                  <input type="text" name="beneficiaryAccount" placeholder="123456789" required />
                </div>
                <div className="form-group">
                  <label>Routing Number</label>
                  <input type="text" name="beneficiaryRouting" placeholder="021000021" />
                </div>
                <div className="form-group">
                  <label>SWIFT Code (International)</label>
                  <input type="text" name="swiftCode" placeholder="BOFAUS3N" />
                </div>
                <div className="form-group">
                  <label>Beneficiary Address</label>
                  <input type="text" name="beneficiaryAddress" placeholder="123 Main St, City, Country" />
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input type="number" step="0.01" min="1" name="amount" placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select name="currency">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="MXN">MXN - Mexican Peso</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fee ($)</label>
                  <input type="number" step="0.01" name="fee" defaultValue="25" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" name="description" placeholder="Invoice payment" />
                </div>
                <button type="submit" className="btn-gold w-full justify-center">
                  <i className="fas fa-paper-plane"></i> Submit Wire Transfer
                </button>
              </div>
            </form>
          ) : (
            <div className="text-slate-400 text-sm py-6 text-center">
              Click "New Wire" to initiate a wire transfer. Wire transfers are subject to review and may take 1-3 business days to process.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientWires;