// ============================================================
// DEMO HISTORY GENERATOR - MAIN ENGINE (FIXED)
// ============================================================

const pool = require('../../config/db');
const { MERCHANTS, BENEFICIARIES, PROFILES, ACTIVITY, EXPENSE_CATEGORIES } = require('./data');
const { rand, randf, pick, txId, fmt, distribDates, monthDiff } = require('./utils');

async function generateDemoHistory(customerId, config, onProgress) {
  const client = await pool.connect();
  try {
    const startDate = config.startDate || fmt(new Date(Date.now() - 365 * 86400000));
    const endDate = config.endDate || fmt(new Date());
    const openingBalance = Number(config.openingBalance) || 10000000;
    const targetEndingBalance = Number(config.targetEndingBalance) || 2300000;
    const annualIncome = Number(config.annualIncome) || 120000;
    const annualGrowth = (Number(config.annualGrowth) || 0) / 100;
    const profileKey = config.financialProfile || 'standard';
    const activityKey = config.activityLevel || 'normal';
    const country = config.country || 'US';
    const modules = config.modules || ['transactions', 'cardPurchases', 'wireTransfers', 'achTransfers', 'deposits', 'bills', 'scheduledPayments', 'beneficiaries', 'notifications', 'statements', 'investments', 'invoices', 'loans', 'recurringPayments', 'businessPayments'];

    const profile = PROFILES[profileKey] || PROFILES.standard;
    const act = ACTIVITY[activityKey] || ACTIVITY.normal;
    const merchants = MERCHANTS[country] || MERCHANTS.US;
    const beneficiaries = BENEFICIARIES[country] || BENEFICIARIES.US;

    onProgress({ step: 'init', message: 'Initializing...', percent: 5 });

    let accountId, accountNumber;

    // Get or create account - FIXED: account_number column name
    const accRes = await client.query(
      "SELECT id, account_number, balance FROM accounts WHERE user_id = $1 AND status = 'active'",
      [customerId]
    );
    
    if (accRes.rows.length > 0) {
      accountId = accRes.rows[0].id;
      accountNumber = accRes.rows[0].account_number;
    } else {
      // Auto-create a checking account if none exists
      accountNumber = `CHK${String(customerId).padStart(4, '0')}${String(rand(100000, 999999))}`;
      const createRes = await client.query(
        `INSERT INTO accounts (user_id, account_number, account_type, balance, status, opened_at, created_at)
         VALUES ($1, $2, 'checking', $3, 'active', CURRENT_DATE, NOW())
         RETURNING id`,
        [customerId, accountNumber, openingBalance]
      );
      accountId = createRes.rows[0].id;
    }

    onProgress({ step: 'cleaning', message: 'Clearing existing demo data...', percent: 10 });
    await client.query('BEGIN');
    try {
      // Clear existing data
      await client.query('DELETE FROM transactions WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM wire_transfers WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM beneficiaries WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM payees WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM bills WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM invoice_payments WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM notifications WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM documents WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM login_history WHERE user_id = $1', [customerId]);
      await client.query('DELETE FROM cards WHERE user_id = $1', [customerId]);

      let balance = openingBalance;
      let totalCredits = 0, totalDebits = 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalMonths = monthDiff(start, end);
      const totalYears = Math.max(1, totalMonths / 12);

      // ============================================================
      // 1. CARDS - Create actual card records first
      // ============================================================
      if (modules.includes('cardPurchases')) {
        onProgress({ step: 'cards', message: 'Creating cards...', percent: 12 });
        
        const cardNetworks = ['visa', 'mastercard', 'amex', 'discover'];
        const cardTypes = ['debit', 'credit'];
        const numCards = rand(1, 3);
        
        for (let i = 0; i < numCards; i++) {
          const last4 = String(rand(1000, 9999));
          const expiryMonth = rand(1, 12);
          const expiryYear = new Date().getFullYear() + rand(1, 5);
          const cardNetwork = pick(cardNetworks);
          const cardType = pick(cardTypes);
          
          const userRes = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [customerId]);
          const user = userRes.rows[0] || { first_name: 'Card', last_name: 'Holder' };
          const cardholderName = `${user.first_name} ${user.last_name}`;
          
          await client.query(
            `INSERT INTO cards (user_id, account_id, card_type, card_network, last4, expiry_month, expiry_year, cardholder_name, status, is_visible, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true, NOW())`,
            [customerId, accountId, cardType, cardNetwork, last4, expiryMonth, expiryYear, cardholderName]
          );
        }
      }

      // ============================================================
      // 2. TRANSACTIONS
      // ============================================================
      if (modules.includes('transactions')) {
        onProgress({ step: 'transactions', message: 'Generating transactions...', percent: 15 });
        const allTx = [];

        // Monthly income (2x per month - 1st and 15th)
        for (let m = 0; m < totalMonths; m++) {
          const yearIdx = Math.floor(m / 12);
          const monthlyGross = Math.round(annualIncome / 12 * Math.pow(1 + annualGrowth, yearIdx) * 100) / 100;
          const paycheck = monthlyGross / 2;

          const d1 = new Date(start.getFullYear(), start.getMonth() + m, 1);
          if (d1 >= start && d1 <= end) {
            balance += paycheck; totalCredits += paycheck;
            allTx.push({ 
              transaction_id: txId('INC'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: paycheck, 
              description: 'Payroll Deposit - Direct Deposit', 
              type: 'credit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d1) 
            });
          }
          const d2 = new Date(start.getFullYear(), start.getMonth() + m, 15);
          if (d2 >= start && d2 <= end) {
            balance += paycheck; totalCredits += paycheck;
            allTx.push({ 
              transaction_id: txId('INC'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: paycheck, 
              description: 'Payroll Deposit - Direct Deposit', 
              type: 'credit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d2) 
            });
          }
        }

        // Monthly mortgage/rent
        for (let m = 0; m < totalMonths; m++) {
          const d = new Date(start.getFullYear(), start.getMonth() + m, rand(1, 5));
          if (d >= start && d <= end) {
            const amt = -randf(profile.mortgage.min, profile.mortgage.max);
            balance += amt; totalDebits += Math.abs(amt);
            allTx.push({ 
              transaction_id: txId('MTG'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: amt, 
              description: `Mortgage Payment - ${pick(['Chase', 'Wells Fargo', 'Bank of America'])}`, 
              type: 'debit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d) 
            });
          }
        }

        // Monthly utilities
        for (let m = 0; m < totalMonths; m++) {
          const d = new Date(start.getFullYear(), start.getMonth() + m, rand(10, 20));
          if (d >= start && d <= end) {
            const amt = -randf(profile.utilities * 0.7, profile.utilities * 1.3);
            balance += amt; totalDebits += Math.abs(amt);
            allTx.push({ 
              transaction_id: txId('UTL'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: amt, 
              description: `${pick(merchants.utilities)} - ${pick(['Electric', 'Internet', 'Phone', 'Water'])}`, 
              type: 'debit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d) 
            });
          }
        }

        // Monthly subscriptions
        for (let m = 0; m < totalMonths; m++) {
          const d = new Date(start.getFullYear(), start.getMonth() + m, rand(5, 25));
          if (d >= start && d <= end) {
            const amt = -randf(profile.subscriptions * 0.5, profile.subscriptions * 1.5);
            balance += amt; totalDebits += Math.abs(amt);
            allTx.push({ 
              transaction_id: txId('SUB'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: amt, 
              description: `${pick(merchants.subscriptions)} - Monthly Subscription`, 
              type: 'debit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d) 
            });
          }
        }

        // Quarterly insurance
        for (let m = 0; m < totalMonths; m += 3) {
          const d = new Date(start.getFullYear(), start.getMonth() + m, rand(1, 10));
          if (d >= start && d <= end) {
            const amt = -randf(300, 1500);
            balance += amt; totalDebits += Math.abs(amt);
            allTx.push({ 
              transaction_id: txId('INS'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: amt, 
              description: `${pick(merchants.insurance)} - Quarterly Premium`, 
              type: 'debit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d) 
            });
          }
        }

        // Yearly property tax
        for (let y = 0; y < totalYears; y++) {
          const d = new Date(start.getFullYear() + y, 3, rand(1, 15));
          if (d >= start && d <= end) {
            const amt = -randf(2000, 10000);
            balance += amt; totalDebits += Math.abs(amt);
            allTx.push({ 
              transaction_id: txId('TAX'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: amt, 
              description: `${pick(merchants.utilities)} - Property Tax`, 
              type: 'debit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: fmt(d) 
            });
          }
        }

        // Weekly expenses (groceries, dining, fuel)
        const weeklyCount = Math.floor(totalMonths * 4.33 * act.m);
        const weeklyDates = distribDates(startDate, endDate, weeklyCount);
        for (const date of weeklyDates) {
          const cat = pick(EXPENSE_CATEGORIES);
          const merchant = pick(merchants[cat] || merchants.misc);
          const baseAmt = profile[cat] || 50;
          const amt = -Math.round(baseAmt * (0.7 + Math.random() * 0.6) * 100) / 100;
          balance += amt; totalDebits += Math.abs(amt);
          allTx.push({ 
            transaction_id: txId('EXP'), 
            user_id: customerId, 
            account_id: accountId, 
            amount: amt, 
            description: merchant, 
            type: 'debit', 
            balance_after: Math.round(balance * 100) / 100, 
            status: 'completed', 
            transaction_date: date 
          });
        }

        // Occasional luxury/travel purchases
        const luxuryCount = Math.floor(totalMonths * 0.5 * act.m);
        const luxuryDates = distribDates(startDate, endDate, luxuryCount);
        for (const date of luxuryDates) {
          const cat = pick(['airlines', 'hotels', 'entertainment', 'onlineRetail']);
          const merchant = pick(merchants[cat] || merchants.misc);
          const amt = -randf(100, profile.luxuryThreshold);
          balance += amt; totalDebits += Math.abs(amt);
          allTx.push({ 
            transaction_id: txId('LUX'), 
            user_id: customerId, 
            account_id: accountId, 
            amount: amt, 
            description: `Travel/Luxury - ${merchant}`, 
            type: 'debit', 
            balance_after: Math.round(balance * 100) / 100, 
            status: 'completed', 
            transaction_date: date 
          });
        }

        // Card purchases (separate from regular transactions)
        if (modules.includes('cardPurchases')) {
          const cardCount = Math.floor(totalMonths * 8 * act.c);
          const cardDates = distribDates(startDate, endDate, cardCount);
          for (const date of cardDates) {
            const cat = pick(EXPENSE_CATEGORIES);
            const merchant = pick(merchants[cat] || merchants.misc);
            const baseAmt = profile[cat] || 50;
            const amt = -Math.round(baseAmt * (0.5 + Math.random() * 1.0) * 100) / 100;
            balance += amt; totalDebits += Math.abs(amt);
            allTx.push({ 
              transaction_id: txId('CARD'), 
              user_id: customerId, 
              account_id: accountId, 
              amount: amt, 
              description: `Card Purchase - ${merchant}`, 
              type: 'debit', 
              balance_after: Math.round(balance * 100) / 100, 
              status: 'completed', 
              transaction_date: date 
            });
          }
        }

        // Insert all transactions
        for (const tx of allTx) {
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [tx.transaction_id, tx.user_id, tx.account_id, tx.amount, tx.description, tx.type, tx.balance_after, tx.status, tx.transaction_date]
          );
        }
      }

      // ============================================================
      // 3. WIRE TRANSFERS
      // ============================================================
      if (modules.includes('wireTransfers')) {
        onProgress({ step: 'wires', message: 'Generating wire transfers...', percent: 35 });
        const wireCount = Math.max(1, Math.floor(totalMonths * 0.5 * act.w));
        const wireDates = distribDates(startDate, endDate, wireCount);
        const wireBeneficiaries = [
          { name: 'Family Member Transfer', bank: 'Chase Bank' },
          { name: 'Investment Account - Fidelity', bank: 'Fidelity Investments' },
          { name: 'Business Partner LTD', bank: 'Bank of America' },
          { name: 'International Vendor', bank: 'HSBC' },
          { name: 'Real Estate Investment', bank: 'Wells Fargo' },
          { name: 'Stock Purchase - Vanguard', bank: 'Vanguard' },
          { name: 'International Transfer', bank: 'Citibank' },
          { name: 'Trust Fund Payment', bank: 'Morgan Stanley' },
        ];
        
        for (const date of wireDates) {
          const wt = pick(wireBeneficiaries);
          const amt = randf(500, 5000) * Math.min(act.w, 2);
          const fee = randf(15, 45);
          const statuses = ['sent', 'sent', 'sent', 'approved', 'pending'];
          const status = pick(statuses);
          
          await client.query(
            `INSERT INTO wire_transfers (
              user_id, from_account_id, beneficiary_name, beneficiary_bank, 
              beneficiary_account, beneficiary_routing, amount, currency, fee, 
              description, status, is_sent, sent_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              customerId, accountId, 
              wt.name, wt.bank, 
              `WB${rand(10000000, 99999999)}`, 
              `${rand(100000000, 999999999)}`, 
              amt, 'USD', fee, 
              `Wire Transfer to ${wt.name}`, 
              status, 
              status === 'sent' ? true : false, 
              status === 'sent' ? new Date(date + 'T12:00:00Z') : null, 
              new Date(date + 'T10:00:00Z')
            ]
          );
          
          const totalAmount = -(amt + fee);
          balance += totalAmount; 
          totalDebits += (amt + fee);
          
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('WIRE'), customerId, accountId, totalAmount, `Wire Transfer to ${wt.name}`, 'debit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 4. ACH TRANSFERS
      // ============================================================
      if (modules.includes('achTransfers')) {
        onProgress({ step: 'ach', message: 'Generating ACH transfers...', percent: 40 });
        const achCount = Math.max(1, Math.floor(totalMonths * 1.5 * act.m));
        const achDates = distribDates(startDate, endDate, achCount);
        const achTypes = [
          { name: 'ACH Deposit - Payroll', type: 'credit', min: 2000, max: 8000 },
          { name: 'ACH Transfer to Savings', type: 'debit', min: 500, max: 3000 },
          { name: 'ACH Payment - Vendor', type: 'debit', min: 200, max: 2000 },
          { name: 'ACH Refund', type: 'credit', min: 50, max: 500 },
          { name: 'ACH Transfer from External', type: 'credit', min: 1000, max: 5000 },
          { name: 'ACH Bill Payment', type: 'debit', min: 100, max: 1500 },
          { name: 'ACH Dividend Deposit', type: 'credit', min: 100, max: 2000 },
        ];
        for (const date of achDates) {
          const ach = pick(achTypes);
          const amt = randf(ach.min, ach.max) * Math.min(act.m, 2);
          const amount = ach.type === 'credit' ? amt : -amt;
          balance += amount; 
          if (ach.type === 'credit') {
            totalCredits += amt;
          } else {
            totalDebits += amt;
          }
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('ACH'), customerId, accountId, amount, ach.name, ach.type === 'credit' ? 'credit' : 'debit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 5. INVESTMENTS
      // ============================================================
      if (modules.includes('investments')) {
        onProgress({ step: 'investments', message: 'Generating investments...', percent: 45 });
        const investFreqMap = { yearly: 1, quarterly: 4, monthly: 12 };
        const investPerYear = investFreqMap[profile.investFreq] || 1;
        const totalInvestments = Math.max(1, Math.floor(totalYears * investPerYear * act.i));
        const investDates = distribDates(startDate, endDate, totalInvestments);
        const investTypes = ['Buy', 'Dividend', 'Sell', 'Contribution', 'Distribution'];
        const investDescriptions = [
          'Vanguard Total Stock Market Index Fund',
          'Fidelity S&P 500 Index Fund',
          'Schwab Total Stock Market Index',
          'Apple Inc. Stock Purchase',
          'Microsoft Corporation Stock',
          'Amazon.com Inc. Stock',
          'Berkshire Hathaway Class B',
          'SPDR S&P 500 ETF Trust',
          'iShares Core US Aggregate Bond ETF',
          'Invesco QQQ Trust',
          'Vanguard International Stock Index',
          'Fidelity Growth Company Fund',
        ];
        for (const date of investDates) {
          const amt = randf(profile.investAmount.min, profile.investAmount.max);
          const investType = pick(investTypes);
          const desc = `${investType} - ${pick(investDescriptions)}`;
          const isCredit = investType === 'Dividend' || investType === 'Distribution';
          const amount = isCredit ? amt : -amt;
          balance += amount; 
          if (isCredit) {
            totalCredits += amt;
          } else {
            totalDebits += amt;
          }
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('INV'), customerId, accountId, amount, desc, isCredit ? 'credit' : 'debit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 6. DEPOSITS
      // ============================================================
      if (modules.includes('deposits')) {
        onProgress({ step: 'deposits', message: 'Generating deposits...', percent: 50 });
        const depositCount = Math.max(1, Math.floor(totalMonths * 2 * act.m));
        const depositDates = distribDates(startDate, endDate, depositCount);
        const depositTypes = [
          'Deposit - Cash',
          'Deposit - Check',
          'Deposit - Transfer',
          'Deposit - Interest',
          'Deposit - Refund',
          'Deposit - Dividend',
          'Deposit - Reimbursement',
          'Deposit - Gift',
        ];
        for (const date of depositDates) {
          const amt = randf(500, 10000);
          balance += amt; 
          totalCredits += amt;
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('DEP'), customerId, accountId, amt, pick(depositTypes), 'credit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 7. INVOICES
      // ============================================================
      if (modules.includes('invoices')) {
        onProgress({ step: 'invoices', message: 'Generating invoices...', percent: 55 });
        const invoiceCount = Math.max(1, Math.floor(totalMonths * 0.5 * act.b));
        const invoiceDates = distribDates(startDate, endDate, invoiceCount);
        const invoiceNames = [
          'Invoice #INV-2024-001 - Consulting Services',
          'Invoice #INV-2024-002 - Web Development',
          'Invoice #INV-2024-003 - Design Services',
          'Invoice #INV-2024-004 - Marketing Campaign',
          'Invoice #INV-2024-005 - IT Support',
          'Invoice #INV-2024-006 - Professional Services',
          'Invoice #INV-2024-007 - Software Licensing',
          'Invoice #INV-2024-008 - Maintenance Services',
          'Invoice #INV-2024-009 - Training Services',
          'Invoice #INV-2024-010 - Project Management',
        ];
        const invoiceStatuses = ['paid', 'paid', 'paid', 'pending', 'overdue'];
        
        for (const date of invoiceDates) {
          const amt = randf(500, 5000);
          const status = pick(invoiceStatuses);
          
          await client.query(
            `INSERT INTO invoice_payments (
              user_id, amount, description, status, payment_date, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [customerId, amt, pick(invoiceNames), status, date, new Date(date + 'T12:00:00Z')]
          );
          
          if (status === 'paid') {
            balance += amt; 
            totalCredits += amt;
            await client.query(
              `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [txId('INV'), customerId, accountId, amt, `Invoice Payment - ${pick(invoiceNames)}`, 'credit', Math.round(balance * 100) / 100, 'completed', date]
            );
          }
        }
      }

      // ============================================================
      // 8. LOANS
      // ============================================================
      if (modules.includes('loans')) {
        onProgress({ step: 'loans', message: 'Generating loan payments...', percent: 60 });
        const loanCount = Math.max(1, Math.floor(totalMonths * 0.8 * act.m));
        const loanDates = distribDates(startDate, endDate, loanCount);
        const loanTypes = [
          'Personal Loan Payment',
          'Car Loan Payment',
          'Student Loan Payment',
          'Home Equity Loan',
          'Business Loan Payment',
        ];
        for (const date of loanDates) {
          const amt = -randf(profile.loanAmount.min, profile.loanAmount.max);
          balance += amt; 
          totalDebits += Math.abs(amt);
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('LOAN'), customerId, accountId, amt, pick(loanTypes), 'debit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 9. RECURRING PAYMENTS
      // ============================================================
      if (modules.includes('recurringPayments')) {
        onProgress({ step: 'recurring', message: 'Generating recurring payments...', percent: 62 });
        const recurringPayments = [
          { name: 'Netflix Subscription', amount: 15.99, day: 5 },
          { name: 'Spotify Premium', amount: 9.99, day: 10 },
          { name: 'iCloud Storage', amount: 2.99, day: 15 },
          { name: 'Microsoft 365', amount: 99.99, day: 1, freq: 'yearly', month: 0 },
          { name: 'Amazon Prime', amount: 139.99, day: 1, freq: 'yearly', month: 6 },
          { name: 'YouTube Premium', amount: 13.99, day: 20 },
          { name: 'Dropbox Plus', amount: 11.99, day: 25 },
          { name: 'Zoom Pro', amount: 19.99, day: 28 },
        ];
        for (let m = 0; m < totalMonths; m++) {
          for (const rp of recurringPayments) {
            if (rp.freq === 'yearly' && m % 12 !== 0) continue;
            const d = rp.freq === 'yearly'
              ? new Date(start.getFullYear() + Math.floor(m / 12), rp.month || 0, rp.day)
              : new Date(start.getFullYear(), start.getMonth() + m, rp.day);
            if (d >= start && d <= end) {
              const amt = -rp.amount;
              balance += amt; 
              totalDebits += Math.abs(amt);
              await client.query(
                `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [txId('REC'), customerId, accountId, amt, `${rp.name} - Recurring Payment`, 'debit', Math.round(balance * 100) / 100, 'completed', fmt(d)]
              );
            }
          }
        }
      }

      // ============================================================
      // 10. SCHEDULED PAYMENTS
      // ============================================================
      if (modules.includes('scheduledPayments')) {
        onProgress({ step: 'scheduled', message: 'Generating scheduled payments...', percent: 65 });
        const scheduledTypes = [
          { name: 'Scheduled Payment - Rent', amount: randf(1500, 3000) },
          { name: 'Scheduled Payment - Car Loan', amount: randf(300, 800) },
          { name: 'Scheduled Payment - Insurance', amount: randf(100, 500) },
          { name: 'Scheduled Transfer to Savings', amount: randf(200, 1000) },
          { name: 'Scheduled Payment - Credit Card', amount: randf(100, 1000) },
          { name: 'Scheduled Payment - Tuition', amount: randf(500, 2000) },
        ];
        const schCount = Math.max(1, Math.floor(totalMonths * 1.5 * act.b));
        const schDates = distribDates(startDate, endDate, schCount);
        for (const date of schDates) {
          const sp = pick(scheduledTypes);
          const amt = -sp.amount;
          balance += amt; 
          totalDebits += Math.abs(amt);
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('SCH'), customerId, accountId, amt, sp.name, 'debit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 11. BUSINESS PAYMENTS
      // ============================================================
      if (modules.includes('businessPayments') && profile.businessPayments) {
        onProgress({ step: 'business', message: 'Generating business payments...', percent: 70 });
        const bizCount = Math.max(1, Math.floor(totalMonths * 3 * act.bp));
        const bizDates = distribDates(startDate, endDate, bizCount);
        const bizDescriptions = [
          'Supplier Payment - Raw Materials',
          'Vendor Payment - Office Supplies',
          'Contractor Payment - Project Alpha',
          'Freelancer Payment - Web Design',
          'Software License - Annual Renewal',
          'Marketing Services - Monthly Retainer',
          'Cloud Infrastructure - AWS Services',
          'Domain Registration - Renewal',
          'Legal Services - Retainer',
          'Accounting Services - Monthly',
          'IT Support - Managed Services',
          'Equipment Lease - Monthly',
        ];
        for (const date of bizDates) {
          const amt = -randf(500, 10000) * Math.min(act.bp, 2);
          balance += amt; 
          totalDebits += Math.abs(amt);
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('BIZ'), customerId, accountId, amt, pick(bizDescriptions), 'debit', Math.round(balance * 100) / 100, 'completed', date]
          );
        }
      }

      // ============================================================
      // 12. BILLS & PAYEES
      // ============================================================
      if (modules.includes('bills')) {
        onProgress({ step: 'bills', message: 'Generating bills and payees...', percent: 75 });
        const billTemplates = [
          { name: 'Electric Bill', category: 'utilities', amount: randf(80, 300), freq: 'monthly' },
          { name: 'Internet Service', category: 'utilities', amount: randf(50, 150), freq: 'monthly' },
          { name: 'Phone Bill', category: 'utilities', amount: randf(40, 120), freq: 'monthly' },
          { name: 'Water Bill', category: 'utilities', amount: randf(30, 80), freq: 'monthly' },
          { name: 'Mortgage Payment', category: 'mortgage', amount: randf(1200, 5000), freq: 'monthly' },
          { name: 'Car Insurance', category: 'insurance', amount: randf(100, 300), freq: 'monthly' },
          { name: 'Health Insurance', category: 'insurance', amount: randf(200, 800), freq: 'monthly' },
          { name: 'Netflix', category: 'subscriptions', amount: 15.99, freq: 'monthly' },
          { name: 'Spotify Premium', category: 'subscriptions', amount: 9.99, freq: 'monthly' },
          { name: 'Gym Membership', category: 'subscriptions', amount: randf(30, 100), freq: 'monthly' },
          { name: 'Property Tax', category: 'tax', amount: randf(2000, 10000), freq: 'yearly' },
          { name: 'Car Payment', category: 'loan', amount: randf(300, 800), freq: 'monthly' },
          { name: 'Student Loan', category: 'loan', amount: randf(200, 600), freq: 'monthly' },
        ];
        
        // Create payees
        for (const tpl of billTemplates) {
          await client.query(
            `INSERT INTO payees (user_id, name, category, account_identifier) 
             VALUES ($1, $2, $3, $4)`,
            [customerId, tpl.name, tpl.category, `PAY${rand(100000, 999999)}`]
          );
        }
        
        const payeeRes = await client.query('SELECT id, name FROM payees WHERE user_id = $1', [customerId]);
        const payees = payeeRes.rows;
        
        let cur = new Date(start);
        while (cur <= end) {
          for (const tpl of billTemplates) {
            const shouldGenerate = tpl.freq === 'monthly' || 
              (tpl.freq === 'yearly' && cur.getMonth() === 0);
            
            if (shouldGenerate) {
              const dueDay = rand(1, 28);
              const dueDate = new Date(cur.getFullYear(), cur.getMonth(), dueDay);
              if (dueDate >= start && dueDate <= end) {
                const payee = payees.find(p => p.name === tpl.name) || payees[0];
                const status = Math.random() > 0.2 ? 'paid' : 'pending';
                
                await client.query(
                  `INSERT INTO bills (user_id, payee_id, name, description, amount, due_date, frequency, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [customerId, payee?.id || null, tpl.name, `${tpl.name} - ${cur.toLocaleString('default', { month: 'long', year: 'numeric' })}`, tpl.amount, fmt(dueDate), tpl.freq, status]
                );
                
                if (status === 'paid') {
                  balance -= tpl.amount; 
                  totalDebits += tpl.amount;
                  await client.query(
                    `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [txId('BILL'), customerId, accountId, -tpl.amount, `Bill Payment - ${tpl.name}`, 'debit', Math.round(balance * 100) / 100, 'completed', fmt(dueDate)]
                  );
                  
                  await client.query(
                    `INSERT INTO invoice_payments (user_id, bill_id, payee_id, amount, description, status, payment_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [customerId, null, payee?.id || null, tpl.amount, `Payment for ${tpl.name}`, 'paid', fmt(dueDate)]
                  );
                }
              }
            }
          }
          cur.setMonth(cur.getMonth() + 1);
        }
      }

      // ============================================================
      // 13. BENEFICIARIES
      // ============================================================
      if (modules.includes('beneficiaries')) {
        onProgress({ step: 'beneficiaries', message: 'Generating beneficiaries...', percent: 85 });
        const benCategories = ['utilities', 'mortgage', 'investment', 'insurance', 'family', 'business', 'payroll'];
        const benNames = [
          'John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 
          'David Brown', 'Emily Davis', 'Robert Miller', 'Jessica Wilson',
          'William Moore', 'Elizabeth Taylor', 'James Anderson', 'Patricia Thomas',
          'Charles Jackson', 'Jennifer White', 'Thomas Harris', 'Linda Martin',
        ];
        
        for (const cat of benCategories) {
          const names = beneficiaries[cat] || benNames;
          const numToCreate = rand(1, 3);
          for (let i = 0; i < numToCreate; i++) {
            const name = pick(names);
            await client.query(
              `INSERT INTO beneficiaries (user_id, name, bank_name, account_identifier)
               VALUES ($1, $2, $3, $4)`,
              [customerId, name, pick(merchants.banks || ['Chase', 'Bank of America', 'Wells Fargo']), `BN${rand(10000000, 99999999)}`]
            );
          }
        }
      }

      // ============================================================
      // 14. NOTIFICATIONS
      // ============================================================
      if (modules.includes('notifications')) {
        onProgress({ step: 'notifications', message: 'Generating notifications...', percent: 90 });
        const notifTemplates = [
          { title: 'Wire Transfer Completed', desc: 'Your wire transfer has been completed successfully' },
          { title: 'Bill Paid', desc: 'Your monthly bill has been paid successfully' },
          { title: 'Card Transaction', desc: 'Your card transaction has been approved' },
          { title: 'Monthly Statement', desc: 'Your monthly statement is now available' },
          { title: 'Deposit Received', desc: 'A deposit has been received into your account' },
          { title: 'Beneficiary Added', desc: 'A new beneficiary has been added to your account' },
          { title: 'Scheduled Payment', desc: 'Your scheduled payment has been executed' },
          { title: 'Account Balance Update', desc: 'Your account balance has been updated' },
          { title: 'Security Alert', desc: 'New device login detected from your account' },
          { title: 'Direct Deposit Received', desc: 'Your direct deposit has been received' },
          { title: 'Loan Payment Reminder', desc: 'Your loan payment is due soon' },
          { title: 'Statement Generated', desc: 'Your account statement has been generated' },
          { title: 'Card Issued', desc: 'Your new card has been issued and is on the way' },
          { title: 'Welcome to SummitBank', desc: 'Welcome to SummitBank! Your account is now active' },
        ];
        
        const notifCount = Math.max(5, Math.floor(totalMonths * 3 * act.m));
        const notifDates = distribDates(startDate, endDate, notifCount);
        for (const date of notifDates) {
          const notif = pick(notifTemplates);
          const notifHour = String(rand(8, 18)).padStart(2, '0');
          const isRead = Math.random() > 0.3;
          await client.query(
            `INSERT INTO notifications (user_id, title, description, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [customerId, notif.title, notif.desc, isRead, new Date(`${date}T${notifHour}:00:00Z`)]
          );
        }
      }

      // ============================================================
      // 15. MONTHLY STATEMENTS
      // ============================================================
      if (modules.includes('statements')) {
        onProgress({ step: 'statements', message: 'Generating statements...', percent: 93 });
        let stmtBalance = openingBalance;
        let cur = new Date(start);
        while (cur <= end) {
          const monthStart = fmt(cur);
          const monthEnd = fmt(new Date(cur.getFullYear(), cur.getMonth() + 1, 0));
          const monthTx = await client.query(
            `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as credits,
                    COALESCE(SUM(CASE WHEN type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as debits
             FROM transactions WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date <= $3`,
            [customerId, monthStart, monthEnd]
          );
          const credits = Number(monthTx.rows[0]?.credits || 0);
          const debits = Number(monthTx.rows[0]?.debits || 0);
          const closingBalance = stmtBalance + credits - debits;
          
          await client.query(
            `INSERT INTO documents (user_id, doc_type, title, period_start, period_end, file_size_bytes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              customerId, 
              'bank_statement', 
              `Monthly Statement - ${cur.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 
              monthStart, 
              monthEnd, 
              rand(50000, 200000),
              new Date(monthEnd + 'T23:59:59Z')
            ]
          );
          stmtBalance = closingBalance;
          cur.setMonth(cur.getMonth() + 1);
        }
      }

      // ============================================================
      // 16. LOGIN HISTORY
      // ============================================================
      if (modules.includes('notifications')) {
        onProgress({ step: 'logins', message: 'Generating login history...', percent: 96 });
        const loginCount = Math.max(5, Math.floor(totalMonths * 5 * act.m));
        const loginDates = distribDates(startDate, endDate, loginCount);
        const devices = ['Chrome Windows', 'Safari Mac', 'Firefox Linux', 'Chrome Android', 'Safari iOS', 'Edge Windows'];
        const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'San Francisco, CA', 'Miami, FL', 'Denver, CO', 'Seattle, WA', 'Boston, MA'];
        
        for (const date of loginDates) {
          const loginHour = String(rand(6, 23)).padStart(2, '0');
          const status = Math.random() > 0.1 ? 'success' : 'failed';
          await client.query(
            `INSERT INTO login_history (user_id, status, ip_address, user_agent, device_name, location, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              customerId, 
              status, 
              `${rand(10, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`, 
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
              pick(devices), 
              pick(locations), 
              new Date(`${date}T${loginHour}:00:00Z`)
            ]
          );
          
          if (status === 'success') {
            await client.query(
              `INSERT INTO user_sessions (user_id, device_name, ip_address, location, user_agent, is_current, last_seen_at, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                customerId, 
                pick(devices), 
                `${rand(10, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`, 
                pick(locations), 
                'Mozilla/5.0',
                false,
                new Date(`${date}T${loginHour}:30:00Z`),
                new Date(`${date}T${loginHour}:00:00Z`)
              ]
            );
          }
        }
      }

      // ============================================================
      // 17. BALANCE RECONCILIATION
      // ============================================================
      onProgress({ step: 'reconciling', message: 'Reconciling balance...', percent: 98 });
      const currentBalance = Math.round(balance * 100) / 100;
      const diff = targetEndingBalance - currentBalance;

      if (Math.abs(diff) > 0.01) {
        if (diff > 0) {
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('ADJ'), customerId, accountId, diff, 'Balance Reconciliation - Credit Adjustment', 'credit', targetEndingBalance, 'completed', fmt(end)]
          );
        } else {
          await client.query(
            `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [txId('ADJ'), customerId, accountId, diff, 'Balance Reconciliation - Debit Adjustment', 'debit', targetEndingBalance, 'completed', fmt(end)]
          );
        }
      }

      await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [targetEndingBalance, accountId]);

      await client.query('COMMIT');

      onProgress({ step: 'complete', message: 'Financial history generated successfully!', percent: 100 });

      return {
        success: true,
        message: 'Financial history generated successfully',
        stats: {
          totalMonths,
          totalYears,
          openingBalance,
          targetEndingBalance,
          totalCredits: Math.round(totalCredits * 100) / 100,
          totalDebits: Math.round(totalDebits * 100) / 100,
          netChange: Math.round((totalCredits - totalDebits) * 100) / 100,
          accountId,
          accountNumber
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { generateDemoHistory };