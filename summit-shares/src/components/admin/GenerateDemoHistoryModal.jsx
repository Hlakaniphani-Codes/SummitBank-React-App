import React, { useState } from 'react';
import { generateDemoHistoryStream } from '../../api/admin';

const FINANCIAL_PROFILES = [
  { value: 'standard', label: 'Standard Customer' },
  { value: 'professional', label: 'Professional' },
  { value: 'businessOwner', label: 'Business Owner' },
  { value: 'wealthy', label: 'Wealthy Individual' },
  { value: 'highNetWorth', label: 'High Net Worth' },
  { value: 'ultraHighNetWorth', label: 'Ultra High Net Worth' },
];

const ACTIVITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'veryHigh', label: 'Very High' },
];

const PRESET_PERIODS = [
  { value: '1y', label: 'Last 1 Year' },
  { value: '3y', label: 'Last 3 Years' },
  { value: '5y', label: 'Last 5 Years' },
  { value: '10y', label: 'Last 10 Years' },
  { value: 'custom', label: 'Custom Period' },
];

const MODULES = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'cardPurchases', label: 'Card Purchases' },
  { value: 'wireTransfers', label: 'Wire Transfers' },
  { value: 'achTransfers', label: 'ACH Transfers' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'bills', label: 'Bills' },
  { value: 'scheduledPayments', label: 'Scheduled Payments' },
  { value: 'beneficiaries', label: 'Beneficiaries' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'statements', label: 'Monthly Statements' },
  { value: 'investments', label: 'Investments' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'loans', label: 'Loans' },
  { value: 'recurringPayments', label: 'Recurring Payments' },
  { value: 'businessPayments', label: 'Business Payments' },
];

const GenerateDemoHistoryModal = ({ customerId, customerName, onClose, onSuccess, showToast }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [config, setConfig] = useState({
    periodType: '1y',
    startDate: '',
    endDate: '',
    openingBalance: 10000000,
    targetEndingBalance: 2300000,
    annualIncome: 120000,
    annualGrowth: 3,
    financialProfile: 'standard',
    activityLevel: 'normal',
    country: 'US',
    modules: ['transactions', 'cardPurchases', 'wireTransfers', 'deposits', 'bills', 'beneficiaries', 'notifications', 'statements'],
  });

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleModule = (module) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter(m => m !== module)
        : [...prev.modules, module],
    }));
  };

  const getDateRange = () => {
    const now = new Date();
    let end = now.toISOString().slice(0, 10);
    let start;
    switch (config.periodType) {
      case '1y': start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10); break;
      case '3y': start = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString().slice(0, 10); break;
      case '5y': start = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()).toISOString().slice(0, 10); break;
      case '10y': start = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().slice(0, 10); break;
      case 'custom': start = config.startDate; end = config.endDate; break;
      default: start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    }
    return { startDate: start, endDate: end };
  };

  const handleGenerate = async () => {
    setLoading(true);
    setProgress({ step: 'starting', message: 'Starting generation...', percent: 0 });
    try {
      const dateRange = getDateRange();
      const payload = {
        ...config,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
      const result = await generateDemoHistoryStream(customerId, payload, (update) => {
        setProgress(update);
      });
      setProgress({ step: 'complete', message: 'Financial history generated successfully!', percent: 100 });
      if (onSuccess) onSuccess(result);
      if (showToast) showToast('Financial history generated successfully!');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setProgress({ step: 'error', message: err.message, percent: 0 });
      if (showToast) showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 8 }}>1. History Period</h4>
      <div className="admin-grid-2" style={{ gap: 8 }}>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Period</label>
          <select value={config.periodType} onChange={(e) => updateConfig('periodType', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
            {PRESET_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      {config.periodType === 'custom' && (
        <div className="admin-grid-2" style={{ gap: 8 }}>
          <div className="admin-form-group" style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11 }}>Start Date</label>
            <input type="date" value={config.startDate} onChange={(e) => updateConfig('startDate', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
          </div>
          <div className="admin-form-group" style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11 }}>End Date</label>
            <input type="date" value={config.endDate} onChange={(e) => updateConfig('endDate', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
          </div>
        </div>
      )}

      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', margin: '8px 0' }}>2. Financial Settings</h4>
      <div className="admin-grid-2" style={{ gap: 8 }}>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Opening Balance ($)</label>
          <input type="number" value={config.openingBalance} onChange={(e) => updateConfig('openingBalance', Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px' }} />
        </div>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Target Ending Balance ($)</label>
          <input type="number" value={config.targetEndingBalance} onChange={(e) => updateConfig('targetEndingBalance', Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px' }} />
        </div>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Annual Income ($)</label>
          <input type="number" value={config.annualIncome} onChange={(e) => updateConfig('annualIncome', Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px' }} />
        </div>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Annual Growth (%)</label>
          <select value={config.annualGrowth} onChange={(e) => updateConfig('annualGrowth', Number(e.target.value))} style={{ fontSize: 12, padding: '4px 8px' }}>
            <option value={0}>0%</option>
            <option value={3}>3%</option>
            <option value={5}>5%</option>
            <option value={10}>10%</option>
          </select>
        </div>
      </div>

      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button className="admin-btn admin-btn-secondary" onClick={onClose} style={{ fontSize: 11, padding: '4px 12px' }}>Cancel</button>
        <button className="admin-btn admin-btn-primary" onClick={() => setStep(2)} style={{ fontSize: 11, padding: '4px 12px' }}>Next: Profile & Activity</button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', marginBottom: 8 }}>3. Customer Financial Profile</h4>
      <div className="admin-grid-2" style={{ gap: 8 }}>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Financial Profile</label>
          <select value={config.financialProfile} onChange={(e) => updateConfig('financialProfile', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
            {FINANCIAL_PROFILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Activity Level</label>
          <select value={config.activityLevel} onChange={(e) => updateConfig('activityLevel', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
            {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="admin-form-group" style={{ marginBottom: 4 }}>
          <label style={{ fontSize: 11 }}>Country</label>
          <select value={config.country} onChange={(e) => updateConfig('country', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
            <option value="US">United States</option>
          </select>
        </div>
      </div>

      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#C9A84C', margin: '8px 0' }}>4. Select Modules to Populate</h4>
      <div className="admin-grid-2" style={{ gap: 4 }}>
        {MODULES.map(m => (
          <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.modules.includes(m.value)}
              onChange={() => toggleModule(m.value)}
              style={{ accentColor: '#C9A84C', width: 12, height: 12 }}
            />
            {m.label}
          </label>
        ))}
      </div>

      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button className="admin-btn admin-btn-secondary" onClick={() => setStep(1)} style={{ fontSize: 11, padding: '4px 12px' }}>Back</button>
        <button className="admin-btn admin-btn-primary" onClick={handleGenerate} disabled={loading} style={{ fontSize: 11, padding: '4px 12px' }}>
          {loading ? 'Generating...' : 'Generate Demo Financial History'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="admin-modal" style={{ maxWidth: 520, padding: 16 }}>
        <div className="modal-title" style={{ fontSize: 14, marginBottom: 4 }}>Generate Demo Financial History</div>
        <div className="modal-sub" style={{ fontSize: 11, marginBottom: 8 }}>
          Customer: <strong>{customerName}</strong> (ID: {customerId})
        </div>

        {progress && (
          <div style={{ marginBottom: 8, padding: 8, background: '#1a1a1a', borderRadius: 6, border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: progress.step === 'error' ? '#D94352' : '#C9A84C' }}>{progress.message}</span>
              <span style={{ color: '#6b6b6b' }}>{progress.percent}%</span>
            </div>
            <div style={{ height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress.percent}%`,
                background: progress.step === 'error' ? '#D94352' : 'linear-gradient(90deg, #C9A84C, #e6c86a)',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>
    </div>
  );
};

export default GenerateDemoHistoryModal;  // <-- THIS IS THE FIX