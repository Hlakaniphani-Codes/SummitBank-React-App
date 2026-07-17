import React, { useState } from 'react';
import Modal from './Modal';
import { addPayee } from '../api';

const AddPayeeModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    accountIdentifier: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { name, category, accountIdentifier } = formData;
    if (!name || !category || !accountIdentifier) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await addPayee({ name, category, accountIdentifier });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add payee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Payee">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Payee Name *</label>
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
          <label className="block text-sm font-medium text-gray-700">Category *</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g. Utilities, Subscription"
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Identifier *</label>
          <input
            type="text"
            name="accountIdentifier"
            value={formData.accountIdentifier}
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
          {loading ? 'Adding...' : 'Add Payee'}
        </button>
      </form>
    </Modal>
  );
};

export default AddPayeeModal;