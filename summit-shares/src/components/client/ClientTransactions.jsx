import React, { useState, useMemo } from 'react';
import { useClient } from './ClientLayout';
import GenerateReceiptModal from '../GenerateReceiptModal';

const ITEMS_PER_PAGE = 10;

const ClientTransactions = () => {
  const {
    transactions,
    loadingTransactions,
    txSearch,
    setTxSearch,
    txFilter,
    setTxFilter,
    exportCSV,
    formatCurrency,
  } = useClient();

  const [receiptTx, setReceiptTx] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  const handleSearchChange = (e) => {
    setTxSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setTxFilter(e.target.value);
    setCurrentPage(1);
  };

  // Local helper – remove hyphens (safe to use without context changes)
  const stripHyphens = (text) => {
    if (text == null) return '';
    return String(text).replace(/-/g, ' ');
  };

  // Filter logic with useMemo for performance
  const filtered = useMemo(() => {
    return (transactions || []).filter(tx => {
      const matchType = txFilter === 'all' || tx.type === txFilter;
      const matchSearch = !txSearch ? true : (
        (tx.description || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        String(tx.transaction_id || '').toLowerCase().includes(txSearch.toLowerCase()) ||
        String(tx.transaction_date || '').includes(txSearch)
      );
      return matchType && matchSearch;
    });
  }, [transactions, txFilter, txSearch]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filtered.slice(startIndex, endIndex);

  // Generate page numbers to display with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 9;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      let start = Math.max(2, safeCurrentPage - 3);
      let end = Math.min(totalPages - 1, safeCurrentPage + 3);
      
      if (safeCurrentPage <= 4) {
        end = Math.min(maxVisiblePages - 2, totalPages - 1);
      }
      if (safeCurrentPage >= totalPages - 3) {
        start = Math.max(2, totalPages - maxVisiblePages + 3);
      }
      
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Icon helper
  const getTypeIcon = (type) => {
    const icons = {
      credit: 'fa-arrow-down text-emerald-500',
      debit: 'fa-arrow-up text-red-500',
      transfer: 'fa-arrow-right-arrow-left text-blue-500',
      payment: 'fa-file-invoice-dollar text-amber-500',
    };
    return icons[type] || 'fa-circle text-gray-400';
  };

  // Loading state
  if (loadingTransactions) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
          <p className="text-sm text-gray-500 mt-1">Loading transactions…</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <i className="fas fa-spinner fa-spin text-2xl mb-3"></i>
          <p className="text-sm">Fetching your transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        <p className="text-sm text-gray-500 mt-1">Complete view of all your transactions</p>
      </div>

      {/* Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-base font-semibold text-gray-900">All Transactions</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search transactions..."
                value={txSearch}
                onChange={handleSearchChange}
                className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 w-full sm:w-56 transition"
              />
            </div>
            <select
              value={txFilter}
              onChange={handleFilterChange}
              className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="transfer">Transfer</option>
              <option value="payment">Payment</option>
            </select>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition shadow-sm"
            >
              <i className="fas fa-download text-[10px]"></i> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Balance</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-400">
                    <i className="fas fa-receipt text-3xl mb-2 block"></i>
                    No transactions found
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition group">
                    <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                      {tx.transaction_date}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-gray-900">
                        {stripHyphens(tx.description || '—')}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">
                        {stripHyphens(String(tx.transaction_id || ''))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium capitalize">
                        <i className={`fas ${getTypeIcon(tx.type)}`}></i>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${
                      tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 hidden md:table-cell">
                      {tx.balance_after != null ? formatCurrency(tx.balance_after) : '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          tx.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === 'completed' ? 'bg-emerald-500' :
                            tx.status === 'pending' ? 'bg-amber-400' :
                            'bg-gray-400'
                          }`}
                        ></span>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setReceiptTx(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                        title="Generate Receipt"
                      >
                        <i className="fas fa-receipt text-[10px]"></i>
                        <span className="hidden sm:inline">Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
          <span>
            Showing <strong className="text-gray-900">{filtered.length > 0 ? startIndex + 1 : 0}</strong> to{' '}
            <strong className="text-gray-900">{Math.min(endIndex, filtered.length)}</strong> of{' '}
            <strong className="text-gray-900">{filtered.length}</strong> transactions
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
                  safeCurrentPage === 1
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-200'
                }`}
              >
                <i className="fas fa-chevron-left text-[9px]"></i>
              </button>

              {/* Page Numbers */}
              {pageNumbers.map((page, idx) => (
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-gray-400 select-none">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[30px] px-2 py-1.5 rounded-md border text-xs font-medium transition ${
                      safeCurrentPage === page
                        ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                        : 'border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-200'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
                  safeCurrentPage === totalPages
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-200'
                }`}
              >
                <i className="fas fa-chevron-right text-[9px]"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      <GenerateReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

export default ClientTransactions;
