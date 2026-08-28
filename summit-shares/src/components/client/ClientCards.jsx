import React from 'react';
import { useClient } from './ClientLayout';

const ClientCards = () => {
  const {
    dashboardData,
    updateCardStatus,
    handleViewCard,
    cardDetailModal,
    setCardDetailModal,
    handleRequestNewCard,
    formatCurrency,
  } = useClient();

  const cards = dashboardData?.cards || [];

  // Local hyphen removal (works without context changes)
  const stripHyphens = (text) => {
    if (text == null) return '';
    return String(text).replace(/-/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Cards</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your credit and debit cards</p>
      </div>

      {/* Cards container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Empty state */}
        {cards.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <i className="fas fa-credit-card text-4xl mb-3 block"></i>
            <p className="text-sm">No cards linked to your account.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cards.map((card, idx) => (
              <li
                key={card.id || idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-gray-50 transition"
              >
                {/* Card icon & details */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <i className="fas fa-credit-card"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {stripHyphens(card.cardholder_name || 'Cardholder')}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      •••• {stripHyphens(String(card.last4 || '****'))} &middot;{' '}
                      {card.card_type?.charAt(0).toUpperCase() + card.card_type?.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      card.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        card.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    ></span>
                    {card.status}
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewCard(card.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                    >
                      <i className="fas fa-eye text-[10px]"></i> View
                    </button>
                    {card.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-600 bg-amber-50">
                        <i className="fas fa-clock text-[10px]"></i> Awaiting Approval
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          card.status === 'active'
                            ? updateCardStatus(card.id, 'block')
                            : updateCardStatus(card.id, 'activate')
                        }
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                          card.status === 'active'
                            ? 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                        }`}
                      >
                        <i
                          className={`fas ${
                            card.status === 'active' ? 'fa-ban' : 'fa-check'
                          } text-[10px]`}
                        ></i>
                        {card.status === 'active' ? 'Block' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Request New Card */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleRequestNewCard}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition shadow-sm"
          >
            <i className="fas fa-plus text-[10px]"></i> Request New Card
          </button>
        </div>
      </div>

      {/* Card Detail Modal */}
      {cardDetailModal.open && cardDetailModal.card && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCardDetailModal({ open: false, card: null }); }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Card Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Cardholder</span><span className="font-medium text-gray-900">{cardDetailModal.card.cardholder_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Card Number</span><span className="font-medium text-gray-900">•••• •••• •••• {cardDetailModal.card.last4}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium text-gray-900 capitalize">{cardDetailModal.card.card_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Network</span><span className="font-medium text-gray-900 uppercase">{cardDetailModal.card.card_network}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Expires</span><span className="font-medium text-gray-900">{String(cardDetailModal.card.expiry_month).padStart(2, '0')}/{cardDetailModal.card.expiry_year}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium text-gray-900 capitalize">{cardDetailModal.card.status}</span></div>
            </div>
            <button
              onClick={() => setCardDetailModal({ open: false, card: null })}
              className="mt-5 w-full py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCards;