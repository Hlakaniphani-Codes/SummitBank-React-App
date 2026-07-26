import React from 'react';
import { useClient } from './ClientLayout';

const ClientStatements = () => {
  const {
    documents,
    formatCurrency,
    showToast,
    setShowStatementModal,
  } = useClient();

  const statements = documents.filter(d => d.doc_type === 'statement');
  const taxDocs = documents.filter(d => d.doc_type === 'tax');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Statements & Documents</h2>
        <p className="text-sm text-gray-500 mt-1">Access your account statements and tax documents</p>
      </div>

      {/* Grid of two cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Statements Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-file-pdf text-amber-500"></i> Account Statements
            </h3>
            <button
              onClick={() => setShowStatementModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition shadow-sm"
            >
              <i className="fas fa-plus text-[10px]"></i> Generate
            </button>
          </div>

          {statements.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <i className="fas fa-file-circle-exclamation text-3xl mb-2 block"></i>
              <p className="text-sm">No statements generated yet.</p>
              <button
                onClick={() => setShowStatementModal(true)}
                className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-700 transition"
              >
                Create your first statement
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {statements.map(doc => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <i className="fas fa-file-pdf"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.period_start} — {doc.period_end}</p>
                  </div>
                  <button
                    onClick={() => showToast('Downloading...')}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-100 transition"
                    title="Download"
                  >
                    <i className="fas fa-download text-sm"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tax Documents Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
            <i className="fas fa-file-invoice text-emerald-500"></i> Tax Documents
          </h3>

          {taxDocs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <i className="fas fa-file-circle-exclamation text-3xl mb-2 block"></i>
              <p className="text-sm">No tax documents available.</p>
              <p className="text-xs text-gray-400 mt-1">They will appear here once issued.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {taxDocs.map(doc => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <i className="fas fa-file-invoice"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.period_start} — {doc.period_end}</p>
                  </div>
                  <button
                    onClick={() => showToast('Downloading...')}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-100 transition"
                    title="Download"
                  >
                    <i className="fas fa-download text-sm"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientStatements;