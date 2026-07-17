import React, { useState } from 'react';
import Modal from './Modal';
import { addBeneficiary } from '../api';

const AddBeneficiaryModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    accountIdentifier: '',
    ficaNumber: '',
    reference: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { name, bankName, accountIdentifier } = formData;
    if (!name || !bankName || !accountIdentifier) {
      setError('Name, bank, and account number are required.');
      return;
    }
    setLoading(true);
    try {
      await addBeneficiary({ name, bankName, accountIdentifier });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add beneficiary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Beneficiary">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bank Name *</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Number *</label>
          <input
            type="text"
            name="accountIdentifier"
            value={formData.accountIdentifier}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">FICA / ID Number (optional)</label>
          <input
            type="text"
            name="ficaNumber"
            value={formData.ficaNumber}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Reference (optional)</label>
          <input
            type="text"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#C9A84C] text-black font-bold py-2 px-4 rounded-lg hover:bg-[#B8983A] transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Beneficiary'}
        </button>
      </form>
    </Modal>
  );
};

export default AddBeneficiaryModal;