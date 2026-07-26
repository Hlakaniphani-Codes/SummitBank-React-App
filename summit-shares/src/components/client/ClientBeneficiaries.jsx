import React from 'react';
import { useClient } from './ClientLayout';

const ClientBeneficiaries = () => {
  const {
    beneficiaries,
    renderBeneficiaries,
    setShowBeneficiaryModal,
  } = useClient();

  return (
    <div className="page-section active">
      <div className="page-header">
        <h2>Beneficiaries</h2>
        <p>Manage your trusted recipients for transfers</p>
      </div>
      <div className="card-box">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-brand-dark text-sm">Your Beneficiaries</h4>
          <button className="btn-primary text-xs py-1.5 px-3" onClick={() => setShowBeneficiaryModal(true)}>
            <i className="fas fa-plus"></i> Add Beneficiary
          </button>
        </div>
        {renderBeneficiaries()}
      </div>
    </div>
  );
};

export default ClientBeneficiaries;