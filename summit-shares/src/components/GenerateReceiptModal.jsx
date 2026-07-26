import React, { useRef } from 'react';

const GenerateReceiptModal = ({ isOpen, onClose, transaction, formatCurrency }) => {
  const receiptRef = useRef(null);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const receiptContent = receiptRef.current?.innerHTML || '';
    printWindow.document.write(`
      <html>
        <head>
          <title>Transaction Receipt</title>
          <style>
            body { font-family: 'Inter', 'Montserrat', system-ui, sans-serif; background: #fff; padding: 40px; color: #1A1A1A; }
            .receipt { max-width: 500px; margin: 0 auto; border: 1px solid #e8e2d9; border-radius: 16px; padding: 32px; }
            .receipt-header { text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 20px; }
            .receipt-header h2 { font-size: 20px; font-weight: 800; color: #0B0B0B; margin: 0; }
            .receipt-header p { font-size: 11px; color: #8a8a8a; margin: 4px 0 0; }
            .receipt-body { padding: 0; }
            .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f2ef; font-size: 13px; }
            .receipt-row .label { color: #8a8a8a; font-weight: 500; }
            .receipt-row .value { font-weight: 600; color: #1A1A1A; }
            .receipt-amount { text-align: center; padding: 20px 0; }
            .receipt-amount .amount-label { font-size: 11px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.5px; }
            .receipt-amount .amount-value { font-size: 28px; font-weight: 800; color: #0B0B0B; margin-top: 4px; }
            .receipt-amount .amount-value.credit { color: #2D9B4E; }
            .receipt-amount .amount-value.debit { color: #D94352; }
            .receipt-footer { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e8e2d9; font-size: 10px; color: #8a8a8a; }
            .receipt-footer .stamp { margin-top: 8px; display: inline-block; border: 2px solid #C9A84C; color: #C9A84C; padding: 4px 16px; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
            .status-badge.completed { background: rgba(45,155,78,0.1); color: #2D9B4E; }
            .status-badge.pending { background: rgba(232,168,56,0.1); color: #E8A838; }
            .status-badge.failed { background: rgba(217,67,82,0.1); color: #D94352; }
            @media print { body { padding: 0; } .receipt { border: none; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="receipt-header">
              <h2>SUMMIT SHARES</h2>
              <p>Transaction Receipt</p>
            </div>
            <div class="receipt-body">
              <div class="receipt-amount">
                <div class="amount-label">Transaction Amount</div>
                <div class="amount-value ${transaction.type === 'credit' || transaction.type === 'in' || Number(transaction.amount) > 0 ? 'credit' : 'debit'}">
                  ${transaction.type === 'credit' || transaction.type === 'in' || Number(transaction.amount) > 0 ? '+' : ''}${formatCurrency ? formatCurrency(Math.abs(Number(transaction.amount))) : '$' + Math.abs(Number(transaction.amount)).toFixed(2)}
                </div>
              </div>
              <div class="receipt-row">
                <span class="label">Transaction ID</span>
                <span class="value">${transaction.transaction_id || transaction.id || 'N/A'}</span>
              </div>
              <div class="receipt-row">
                <span class="label">Description</span>
                <span class="value">${transaction.description || 'Transaction'}</span>
              </div>
              <div class="receipt-row">
                <span class="label">Type</span>
                <span class="value" style="text-transform:capitalize">${transaction.type || 'N/A'}</span>
              </div>
              <div class="receipt-row">
                <span class="label">Status</span>
                <span class="value"><span class="status-badge ${transaction.status || 'completed'}">${transaction.status || 'completed'}</span></span>
              </div>
              <div class="receipt-row">
                <span class="label">Date</span>
                <span class="value">${transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              ${transaction.balance_after ? `
              <div class="receipt-row">
                <span class="label">Balance After</span>
                <span class="value">${formatCurrency ? formatCurrency(transaction.balance_after) : '$' + Number(transaction.balance_after).toFixed(2)}</span>
              </div>` : ''}
            </div>
            <div class="receipt-footer">
              <p>This is an official receipt from Summit Shares Banking</p>
              <p style="margin-top:4px">For questions, contact support@summitshares.com</p>
              <div class="stamp">✓ Verified</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-title">
          <i className="fas fa-receipt text-brand-gold mr-2"></i> Transaction Receipt
        </div>
        <div className="modal-sub">Official receipt for this transaction</div>

        <div ref={receiptRef} style={{ background: '#faf9f7', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #e8e2d9' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #C9A84C', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0B0B0B', letterSpacing: 1 }}>SUMMIT SHARES</div>
            <div style={{ fontSize: 10, color: '#8a8a8a', marginTop: 2 }}>Transaction Receipt</div>
          </div>

          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 10, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Transaction Amount</div>
            <div style={{
              fontSize: 26, fontWeight: 800, marginTop: 4,
              color: (transaction.type === 'credit' || transaction.type === 'in' || Number(transaction.amount) > 0) ? '#2D9B4E' : '#D94352'
            }}>
              {(transaction.type === 'credit' || transaction.type === 'in' || Number(transaction.amount) > 0) ? '+' : ''}
              {formatCurrency ? formatCurrency(Math.abs(Number(transaction.amount))) : '$' + Math.abs(Number(transaction.amount)).toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8', fontSize: 12 }}>
            <span style={{ color: '#8a8a8a' }}>Transaction ID</span>
            <span style={{ fontWeight: 600 }}>{transaction.transaction_id || transaction.id || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8', fontSize: 12 }}>
            <span style={{ color: '#8a8a8a' }}>Description</span>
            <span style={{ fontWeight: 600 }}>{transaction.description || 'Transaction'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8', fontSize: 12 }}>
            <span style={{ color: '#8a8a8a' }}>Type</span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{transaction.type || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8', fontSize: 12 }}>
            <span style={{ color: '#8a8a8a' }}>Status</span>
            <span>
              <span style={{
                display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                background: transaction.status === 'completed' ? 'rgba(45,155,78,0.1)' : transaction.status === 'pending' ? 'rgba(232,168,56,0.1)' : 'rgba(217,67,82,0.1)',
                color: transaction.status === 'completed' ? '#2D9B4E' : transaction.status === 'pending' ? '#E8A838' : '#D94352'
              }}>
                {transaction.status || 'completed'}
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8', fontSize: 12 }}>
            <span style={{ color: '#8a8a8a' }}>Date</span>
            <span style={{ fontWeight: 600 }}>
              {transaction.transaction_date
                ? new Date(transaction.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          {transaction.balance_after ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0ede8', fontSize: 12 }}>
              <span style={{ color: '#8a8a8a' }}>Balance After</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency ? formatCurrency(transaction.balance_after) : '$' + Number(transaction.balance_after).toFixed(2)}</span>
            </div>
          ) : null}

          <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #e8e2d9', fontSize: 9, color: '#8a8a8a' }}>
            <p>This is an official receipt from Summit Shares Banking</p>
            <p style={{ marginTop: 2 }}>For questions, contact support@summitshares.com</p>
            <div style={{ marginTop: 8, display: 'inline-block', border: '2px solid #C9A84C', color: '#C9A84C', padding: '3px 14px', borderRadius: 4, fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
              ✓ Verified
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>
            <i className="fas fa-times"></i> Close
          </button>
          <button className="btn-gold" onClick={handlePrint}>
            <i className="fas fa-print"></i> Print / Download Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateReceiptModal;
