import React, { useState } from 'react';
import Modal from './Modal';
import { generateStatement } from '../api';

const GenerateStatementModal = ({ isOpen, onClose, onSuccess, accounts }) => {
  const [formData, setFormData] = useState({
    accountId: '',
    periodStart: '',
    periodEnd: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { accountId, periodStart, periodEnd } = formData;
    if (!accountId || !periodStart || !periodEnd) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await generateStatement({ accountId, periodStart, periodEnd });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Statement">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Account *</label>
          <select
            name="accountId"
            value={formData.accountId}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          >
            <option value="">Select an account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_type} – {acc.account_number} ({formatCurrency(acc.balance)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date *</label>
          <input
            type="date"
            name="periodStart"
            value={formData.periodStart}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date *</label>
          <input
            type="date"
            name="periodEnd"
            value={formData.periodEnd}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#C9A84C] text-black font-bold py-2 px-4 rounded-lg hover:bg-[#B8983A] transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Statement'}
        </button>
      </form>
    </Modal>
  );
};

// helper (if not already in scope)
const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format(Number(value || 0));

export default GenerateStatementModal;