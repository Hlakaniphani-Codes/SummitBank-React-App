import React from 'react';
import { useClient } from './ClientLayout';

const ClientDashboard = () => {
  const {
    currentUser,
    dashboardData,
    loadingDashboard,
    dashboardError,
    balancesVisible,
    toggleBalance,
    formatCurrency,
    copyText,
    navigateTo,
    renderBills,
  } = useClient();

  if (dashboardError) {
    return <div className="card-box text-sm text-red-600">{dashboardError}</div>;
  }

  if (loadingDashboard || !dashboardData) {
    return <div className="card-box">Loading your dashboard…</div>;
  }

  return (
    <div className="page-section active">
      {/* No dashboard-wide restriction banner - a restricted account is marked
          with a status chip on its own card, and any blocked money movement is
          explained in a dialog at the point the customer attempts it. */}

      {/* Total Balance Card */}
      <div className="total-balance-card mb-5">
        <div className="balance-left">
          <div className="label">Total Balance</div>
          <div className="amount">
            <span className="currency">$</span> {Number(dashboardData.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            Across {dashboardData.accounts?.length || 0} account{(dashboardData.accounts?.length || 0) === 1 ? '' : 's'}
          </div>
        </div>
        <div className="balance-right">
          <div className="stat">
            <div className="stat-label">Income (MTD)</div>
            <div className="stat-value positive">+{formatCurrency(dashboardData.monthlyIncome || 0)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Expenses (MTD)</div>
            <div className="stat-value negative">-{formatCurrency(dashboardData.monthlyExpenses || 0)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Notifications</div>
            <div className="stat-value" style={{ color: '#C9A84C' }}>{dashboardData.unreadNotifications || 0}</div>
          </div>
        </div>
      </div>

      {/* Cards Row */}
      <div className="cards-row">
        {/* Welcome message */}
        <div className="card-box" style={{ gridColumn: '1 / -1', background: '#fff', borderColor: '#e8e2d9', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0B', letterSpacing: 0.3 }}>
              {(() => {
                const now = new Date();
                const hour = now.getHours();
                const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
                const name = currentUser?.firstName || 'there';
                return `${greeting}, ${name}`;
              })()}
            </div>
            <div style={{ fontSize: 11, color: '#8a8a8a', marginTop: 2 }}>
              {dashboardData.lastLogin ? (
                <>
                  <i className="fas fa-shield-halved" style={{ color: '#2D9B4E', marginRight: 4 }}></i>
                  Last login {new Date(dashboardData.lastLogin.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  {dashboardData.lastLogin.ipAddress ? ` from ${dashboardData.lastLogin.ipAddress}` : ''}
                  {' · '}
                  <span
                    style={{ color: '#C9A84C', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigateTo('security')}
                  >
                    Not you?
                  </span>
                </>
              ) : (
                "Here's what's happening in your account right now."
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {dashboardData.creditScore !== null && dashboardData.creditScore !== undefined && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: dashboardData.creditScore >= 700 ? 'rgba(45,155,78,0.1)' : dashboardData.creditScore >= 600 ? 'rgba(232,168,56,0.1)' : 'rgba(217,67,82,0.1)',
                borderRadius: 8, padding: '6px 12px', fontSize: 11
              }}>
                <i className="fas fa-chart-line" style={{
                  color: dashboardData.creditScore >= 700 ? '#2D9B4E' : dashboardData.creditScore >= 600 ? '#E8A838' : '#D94352'
                }}></i>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 10, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Credit Score</div>
                  <div style={{ fontWeight: 700, color: dashboardData.creditScore >= 700 ? '#2D9B4E' : dashboardData.creditScore >= 600 ? '#E8A838' : '#D94352' }}>
                    {dashboardData.creditScore}
                    <span style={{ fontWeight: 400, color: '#8a8a8a', marginLeft: 4, fontSize: 10 }}>
                      {dashboardData.creditScore >= 750 ? 'Excellent' : dashboardData.creditScore >= 700 ? 'Good' : dashboardData.creditScore >= 650 ? 'Fair' : dashboardData.creditScore >= 600 ? 'Average' : 'Needs Work'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <button className="btn-outline" style={{ fontSize: 11, padding: '7px 12px' }} onClick={() => navigateTo('security')}>
              <i className="fas fa-shield-halved" style={{ color: '#C9A84C', marginRight: 6 }}></i>
              Security Center
            </button>
          </div>
        </div>

        {/* Account Cards */}
        {dashboardData.accounts?.map((account) => {
          const rawNum = account.account_number || '';
          const last4 = rawNum.replace(/[^0-9]/g, '').slice(-4);
          const displayNum = last4 ? `...${last4}` : rawNum;
          const label = account.account_type === 'savings' ? 'Savings' : 'Checking';
          return (
            <div key={account.id} className="card-box">
              <div className="flex items-start justify-between">
                <div>
                  <div className="card-label"><i className={`fas ${account.account_type === 'savings' ? 'fa-piggy-bank' : 'fa-wallet'}`}></i> {label} Account</div>
                  <div className="card-number">{displayNum}</div>
                </div>
                <button className="text-slate-400 hover:text-brand-gold text-sm" onClick={() => toggleBalance(account.account_type)}>
                  <i className={`fas ${balancesVisible[account.account_type] ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                </button>
              </div>
              <div className="card-balance">
                {balancesVisible[account.account_type] ? <><span className="currency">$</span> {Number(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</> : <span className="hidden-balance">••••••••</span>}
              </div>
              <div className="card-actions">
                <span className="text-xs text-slate-400">{account.account_type === 'savings' ? `APY: ${account.apy || 0}%` : `Routing: ${account.routing_number || 'N/A'}`}</span>
                <button className="copy-btn" onClick={() => copyText(account.account_number, 'Account number copied')}><i className="fas fa-copy"></i> Copy Acc.</button>
              </div>
            </div>
          );
        })}

        {/* Card Preview */}
        {dashboardData.cards?.length ? (
          <div className="debit-card-preview">
            <div className="card-top">
              <div>
                <div className="card-type">{dashboardData.cards[0].card_type === 'credit' ? 'Credit Card' : 'Debit Card'}</div>
                <div className="card-status" style={{
                  color: dashboardData.cards[0].status === 'active' ? '#2D9B4E' : '#8a8a8a',
                  background: dashboardData.cards[0].status === 'active' ? 'rgba(45,155,78,0.12)' : '#e8e2d9'
                }}>
                  <span className="dot" style={{
                    background: dashboardData.cards[0].status === 'active' ? '#2D9B4E' : '#8a8a8a'
                  }}></span>
                  {dashboardData.cards[0].status.charAt(0).toUpperCase() + dashboardData.cards[0].status.slice(1)}
                </div>
              </div>
              <div className="card-network">
                <span className="contactless"><i className="fas fa-wifi"></i></span>
                <i className="fab fa-cc-visa"></i>
              </div>
            </div>
            <div className="card-number-display">•••• •••• •••• {dashboardData.cards[0].last4}</div>
            <div className="card-bottom">
              <div>
                <div className="card-holder">{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Account Holder'}</div>
                <div className="card-expiry">Status <strong style={{
                  color: dashboardData.cards[0].status === 'active' ? '#2D9B4E' : '#8a8a8a'
                }}>{dashboardData.cards[0].status.charAt(0).toUpperCase() + dashboardData.cards[0].status.slice(1)}</strong></div>
              </div>
              <div className="text-right"><span className="text-[10px] text-white/30">{dashboardData.cards[0].card_network?.toUpperCase()}</span></div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dashboard Stack */}
      <div className="dashboard-stack">
        <div className="widgets-row">
          <div className="widget-box">
            <div className="widget-header">
              <h4><i className="fas fa-arrow-right-arrow-left text-brand-gold mr-2"></i> Recent Activity</h4>
              <a onClick={() => navigateTo('transactions')}>View All</a>
            </div>
            {dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
              <div>
                {dashboardData.recentTransactions.slice(0, 3).map((tx, idx) => (
                  <div key={tx.transaction_id || idx} className="transfer-item">
                    <div className="transfer-details">
                      <div className="desc">{tx.description || 'Transfer'}</div>
                      <div className="meta">{tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : ''} • {tx.type}</div>
                    </div>
                    <div className={`transfer-amount ${Number(tx.amount) < 0 ? 'out' : 'in'}`}>
                      {Number(tx.amount) < 0 ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-sm py-6">No recent transfers.</div>
            )}
          </div>
          <div className="widget-box">
            <div className="widget-header">
              <h4><i className="fas fa-lightbulb text-brand-gold mr-2"></i> Smart Insights</h4>
            </div>
            <div className="insights-list">
              <div className="insight-item">
                <div className="insight-icon"><i className="fas fa-wallet"></i></div>
                <div className="insight-content">
                  <div className="insight-title">Spending Focus</div>
                  <div className="insight-desc">Today's check-in: try keeping discretionary spend under 15%.</div>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-icon"><i className="fas fa-piggy-bank"></i></div>
                <div className="insight-content">
                  <div className="insight-title">Savings Boost</div>
                  <div className="insight-desc">Set a weekly goal: small deposits compound fast.</div>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-icon"><i className="fas fa-gift"></i></div>
                <div className="insight-content">
                  <div className="insight-title">Rewards Reminder</div>
                  <div className="insight-desc">Use your card for eligible categories to maximize points.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="widgets-row">
          <div className="widget-box">
            <div className="widget-header"><h4><i className="fas fa-bolt text-brand-gold mr-2"></i> Quick Actions</h4></div>
            <div className="quick-actions-grid">
              <a className="quick-action-btn" onClick={() => navigateTo('transfer')}><i className="fas fa-arrow-right-arrow-left"></i><span>Transfers</span></a>
              <a className="quick-action-btn" onClick={() => navigateTo('wires')}><i className="fas fa-building-columns"></i><span>Wire</span></a>
              <a className="quick-action-btn" onClick={() => navigateTo('bills')}><i className="fas fa-file-invoice-dollar"></i><span>Pay Bills</span></a>
              <a className="quick-action-btn" onClick={() => navigateTo('cheques')}><i className="fas fa-circle-dollar-to-slot"></i><span>Deposit</span></a>
              <a className="quick-action-btn" onClick={() => navigateTo('cards')}><i className="fas fa-credit-card"></i><span>Cards</span></a>
              <a className="quick-action-btn" onClick={() => navigateTo('beneficiaries')}><i className="fas fa-users"></i><span>Beneficiaries</span></a>
            </div>
          </div>
        </div>

        <div className="insights-widget">
          <div className="insights-header">
            <h3><i className="fas fa-chart-pie text-brand-gold mr-2"></i> Financial Snapshot</h3>
            <a onClick={() => navigateTo('transactions')}>View Details</a>
          </div>
          <div className="insights-grid">
            <div className="stat-card">
              <div className="stat-label">Total Balance</div>
              <div className="stat-value"><span className="currency">$</span> {Number(dashboardData.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Accounts</div>
              <div className="stat-value" style={{ color: '#2D9B4E' }}>{dashboardData?.accounts?.length || 0}</div>
              <div className="stat-change positive"><i className="fas fa-arrow-up"></i> Active accounts on file</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cards</div>
              <div className="stat-value" style={{ color: '#0B0B0B' }}>{dashboardData?.cards?.length || 0}</div>
              <div className="stat-change" style={{ color: '#8a8a8a' }}><i className="fas fa-credit-card"></i> Linked card{(dashboardData?.cards?.length || 0) === 1 ? '' : 's'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Notifications</div>
              <div className="stat-value" style={{ color: '#C9A84C' }}>{dashboardData?.unreadNotifications || 0}</div>
              <div className="stat-change" style={{ color: '#8a8a8a' }}><i className="fas fa-bell"></i> Pending alerts</div>
            </div>
          </div>
          <div className="bills-section">
            <div className="bills-header">
              <h4><i className="fas fa-clock text-brand-gold mr-1"></i> Upcoming Bills & Payments</h4>
              <a onClick={() => navigateTo('bills')}>Manage Bills</a>
            </div>
            {renderBills()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;