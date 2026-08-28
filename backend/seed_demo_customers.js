/**
 * Seed Demo Customer Profiles
 * 
 * Creates pre-populated demo customer profiles that can be used for
 * training, demos, and testing purposes.
 * 
 * Run: node seed_demo_customers.js
 * 
 * Available profiles:
 *   - Standard Customer (user@demo.com / Demo@123)
 *   - High Net Worth (wealthy@demo.com / Demo@123)
 *   - Business Owner (business@demo.com / Demo@123)
 */
const bcrypt = require('bcrypt');
const pool = require('./config/db');
const { fmt, rand, randf, txId, distribDates, monthDiff } = require('./services/demoHistoryGenerator/utils');

// ============================================================
// DEMO CUSTOMER PROFILES
// ============================================================
const DEMO_PROFILES = [
  {
    email: 'user@demo.com',
    password: 'Demo@123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1 (555) 100-2000',
    street: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'US',
    dateOfBirth: '1985-06-15',
    occupation: 'Software Engineer',
    employer: 'Tech Corp Inc.',
    incomeRange: '120000-150000',
    creditScore: 720,
    accountType: 'checking',
    initialBalance: 35000,
    profile: {
      income: { min: 5000, max: 8000 },
      mortgage: { min: 1800, max: 2500 },
      grocery: 150,
      dining: 60,
      fuel: 55,
      subscriptions: 80,
      utilities: 220,
      luxuryThreshold: 500,
      investFreq: 'yearly',
      investAmount: { min: 2000, max: 5000 },
      loanAmount: { min: 400, max: 700 },
      businessPayments: false,
    },
    activity: { m: 1.0, c: 1.0, w: 0.8, b: 1.0, i: 0.5, bp: 0 },
  },
  {
    email: 'wealthy@demo.com',
    password: 'Demo@123',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1 (555) 200-3000',
    street: '500 Park Avenue',
    city: 'New York',
    state: 'NY',
    zip: '10022',
    country: 'US',
    dateOfBirth: '1978-03-22',
    occupation: 'Investment Banker',
    employer: 'Goldman Sachs',
    incomeRange: '500000+',
    creditScore: 810,
    accountType: 'checking',
    initialBalance: 250000,
    profile: {
      income: { min: 35000, max: 60000 },
      mortgage: { min: 6000, max: 12000 },
      grocery: 500,
      dining: 180,
      fuel: 120,
      subscriptions: 500,
      utilities: 800,
      luxuryThreshold: 5000,
      investFreq: 'monthly',
      investAmount: { min: 10000, max: 50000 },
      loanAmount: { min: 1500, max: 3000 },
      businessPayments: false,
    },
    activity: { m: 1.5, c: 1.5, w: 2.0, b: 1.2, i: 1.5, bp: 0 },
  },
  {
    email: 'business@demo.com',
    password: 'Demo@123',
    firstName: 'Mike',
    lastName: 'Johnson',
    phone: '+1 (555) 300-4000',
    street: '800 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'US',
    dateOfBirth: '1982-11-08',
    occupation: 'CEO',
    employer: 'Johnson Enterprises LLC',
    incomeRange: '300000-500000',
    creditScore: 780,
    accountType: 'checking',
    initialBalance: 120000,
    profile: {
      income: { min: 15000, max: 30000 },
      mortgage: { min: 4000, max: 7000 },
      grocery: 350,
      dining: 120,
      fuel: 100,
      subscriptions: 300,
      utilities: 500,
      luxuryThreshold: 3000,
      investFreq: 'quarterly',
      investAmount: { min: 5000, max: 20000 },
      loanAmount: { min: 800, max: 2000 },
      businessPayments: true,
    },
    activity: { m: 1.5, c: 1.5, w: 2.0, b: 1.3, i: 1.0, bp: 1.5 },
  },
];

// ============================================================
// HELPER: Generate account number
// ============================================================
const genAcctNum = (type, userId) => {
  const prefix = type === 'checking' ? 'CHK' : 'SAV';
  return `${prefix}${String(userId).padStart(5, '0')}${rand(10000, 99999)}`;
};

// ============================================================
// HELPER: Pick from array
// ============================================================
const pickArr = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
async function seedDemoCustomers() {
  const client = await pool.connect();
  try {
    console.log('Seeding demo customer profiles...\n');

    for (const demo of DEMO_PROFILES) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [demo.email]);
      if (existing.rows.length > 0) {
        console.log(`  ${demo.email} already exists (ID: ${existing.rows[0].id}), skipping creation`);
        continue;
      }

      console.log(`Creating profile: ${demo.firstName} ${demo.lastName} (${demo.email})`);

      const passwordHash = await bcrypt.hash(demo.password, 10);
      const pinHash = await bcrypt.hash('1234', 10);

      // 1. CREATE USER
      const userRes = await client.query(
        `INSERT INTO users (
          first_name, last_name, email, password_hash, pin_hash, role,
          phone, street, city, state, zip, country, date_of_birth,
          occupation, employer, income_range,
          terms_accepted, is_active, status, login_enabled,
          email_verified, credit_score,
          approved_at, created_at
        ) VALUES ($1,$2,$3,$4,$5,'customer',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
          true, true, 'approved', true,
          true, $16,
          NOW(), NOW())
        RETURNING id`,
        [
          demo.firstName, demo.lastName, demo.email, passwordHash, pinHash,
          demo.phone, demo.street, demo.city, demo.state, demo.zip,
          demo.country, demo.dateOfBirth,
          demo.occupation, demo.employer, demo.incomeRange,
          demo.creditScore,
        ]
      );
      const userId = userRes.rows[0].id;

      // 2. CREATE APPLICATION (approved)
      await client.query(
        `INSERT INTO applications (user_id, application_type, status, reviewed_by, reviewed_at, created_at)
         VALUES ($1, 'account', 'approved', 1, NOW(), NOW())`,
        [userId]
      );

      // 3. CREATE ACCOUNT
      const acctNum = genAcctNum(demo.accountType, userId);
      const acctRes = await client.query(
        `INSERT INTO accounts (user_id, account_number, account_type, balance, status, created_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())
         RETURNING id`,
        [userId, acctNum, demo.accountType, demo.initialBalance]
      );
      const accountId = acctRes.rows[0].id;
      console.log(`   Account #${acctNum} created with $${demo.initialBalance.toLocaleString()}`);

      // 4. CREATE BENEFICIARIES
      const benData = {
        utilities: ['Con Edison', 'National Grid', 'Verizon', 'Spectrum'],
        mortgage: ['Wells Fargo Mortgage', 'Chase Home Lending'],
        investment: ['Vanguard', 'Fidelity Investments'],
        insurance: ['State Farm', 'Geico', 'MetLife'],
        family: ['Sarah Doe', 'James Doe', 'Emily Doe'],
        business: ['Johnson Consulting', 'Tech Solutions Inc'],
        payroll: ['Paychex', 'ADP'],
        banks: ['Chase', 'Bank of America', 'Wells Fargo', 'Citi'],
      };
      const benCategories = ['utilities', 'mortgage', 'investment', 'insurance', 'family', 'business', 'payroll'];
      for (const cat of benCategories) {
        const names = benData[cat] || [];
        for (const name of names.slice(0, 2)) {
          await client.query(
            `INSERT INTO beneficiaries (user_id, name, bank_name, account_identifier)
             VALUES ($1, $2, $3, $4)`,
            [userId, name, pickArr(benData.banks), `BN${rand(10000000, 99999999)}`]
          );
        }
      }

      // 5. CREATE TRANSACTIONS (1 year of history)
      const startDate = fmt(new Date(Date.now() - 365 * 86400000));
      const endDate = fmt(new Date());
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalMonths = monthDiff(start, end);
      let balance = demo.initialBalance;
      const allTx = [];

      // Monthly income (1st and 15th)
      for (let m = 0; m < totalMonths; m++) {
        const monthlyGross = demo.profile.income.min + Math.random() * (demo.profile.income.max - demo.profile.income.min);
        const paycheck = Math.round(monthlyGross / 2 * 100) / 100;
        const d1 = new Date(start.getFullYear(), start.getMonth() + m, 1);
        if (d1 >= start && d1 <= end) {
          balance += paycheck;
          allTx.push({ tid: txId('INC'), uid: userId, aid: accountId, amt: paycheck, desc: 'Payroll Deposit', type: 'credit', bal: Math.round(balance * 100) / 100, date: fmt(d1) });
        }
        const d2 = new Date(start.getFullYear(), start.getMonth() + m, 15);
        if (d2 >= start && d2 <= end) {
          balance += paycheck;
          allTx.push({ tid: txId('INC'), uid: userId, aid: accountId, amt: paycheck, desc: 'Payroll Deposit', type: 'credit', bal: Math.round(balance * 100) / 100, date: fmt(d2) });
        }
      }

      // Monthly mortgage/rent
      for (let m = 0; m < totalMonths; m++) {
        const d = new Date(start.getFullYear(), start.getMonth() + m, rand(1, 5));
        if (d >= start && d <= end) {
          const amt = -randf(demo.profile.mortgage.min, demo.profile.mortgage.max);
          balance += amt;
          allTx.push({ tid: txId('MTG'), uid: userId, aid: accountId, amt, desc: 'Mortgage Payment', type: 'debit', bal: Math.round(balance * 100) / 100, date: fmt(d) });
        }
      }

      // Weekly expenses
      const weeklyCount = Math.floor(totalMonths * 4.33 * demo.activity.m);
      const weeklyDates = distribDates(startDate, endDate, weeklyCount);
      const cats = ['groceries', 'restaurants', 'fuel', 'entertainment', 'onlineRetail', 'misc'];
      for (const date of weeklyDates) {
        const cat = pickArr(cats);
        const merchant = pickArr(benData[cat] || ['Various Store']);
        const baseAmt = demo.profile[cat] || 50;
        const amt = -Math.round(baseAmt * (0.7 + Math.random() * 0.6) * 100) / 100;
        balance += amt;
        allTx.push({ tid: txId('EXP'), uid: userId, aid: accountId, amt, desc: merchant, type: 'debit', bal: Math.round(balance * 100) / 100, date });
      }

      // Luxury purchases
      const luxuryCount = Math.floor(totalMonths * demo.activity.m);
      const luxuryDates = distribDates(startDate, endDate, luxuryCount);
      const luxuryCats = ['airlines', 'hotels', 'entertainment', 'onlineRetail'];
      for (const date of luxuryDates) {
        const cat = pickArr(luxuryCats);
        const merchant = pickArr(benData[cat] || benData.misc || ['Premium Store']);
        const amt = -randf(100, demo.profile.luxuryThreshold);
        balance += amt;
        allTx.push({ tid: txId('LUX'), uid: userId, aid: accountId, amt, desc: merchant, type: 'debit', bal: Math.round(balance * 100) / 100, date });
      }

      // Subscriptions
      for (let m = 0; m < totalMonths; m++) {
        const d = new Date(start.getFullYear(), start.getMonth() + m, rand(5, 25));
        if (d >= start && d <= end) {
          const amt = -randf(demo.profile.subscriptions * 0.5, demo.profile.subscriptions * 1.5);
          balance += amt;
          allTx.push({ tid: txId('SUB'), uid: userId, aid: accountId, amt, desc: pickArr(['Netflix', 'Spotify', 'Apple', 'HBO', 'Disney+']) + ' - Monthly', type: 'debit', bal: Math.round(balance * 100) / 100, date: fmt(d) });
        }
      }

      // Utilities
      for (let m = 0; m < totalMonths; m++) {
        const d = new Date(start.getFullYear(), start.getMonth() + m, rand(10, 20));
        if (d >= start && d <= end) {
          const amt = -randf(demo.profile.utilities * 0.7, demo.profile.utilities * 1.3);
          balance += amt;
          allTx.push({ tid: txId('UTL'), uid: userId, aid: accountId, amt, desc: pickArr(benData.utilities) + ' - ' + pickArr(['Electric', 'Internet', 'Phone', 'Water']), type: 'debit', bal: Math.round(balance * 100) / 100, date: fmt(d) });
        }
      }

      // Quarterly insurance
      for (let m = 0; m < totalMonths; m += 3) {
        const d = new Date(start.getFullYear(), start.getMonth() + m, rand(1, 10));
        if (d >= start && d <= end) {
          const amt = -randf(300, 1500);
          balance += amt;
          allTx.push({ tid: txId('INS'), uid: userId, aid: accountId, amt, desc: pickArr(benData.insurance) + ' - Quarterly Premium', type: 'debit', bal: Math.round(balance * 100) / 100, date: fmt(d) });
        }
      }

      // Insert all transactions
      for (const tx of allTx) {
        await client.query(
          `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)`,
          [tx.tid, tx.uid, tx.aid, tx.amt, tx.desc, tx.type, tx.bal, tx.date]
        );
      }

      // 6. CREATE NOTIFICATIONS
      const notifTemplates = [
        'Welcome to SummitShares! Your account is now active.',
        'Your first direct deposit has been received.',
        'Monthly statement is now available.',
        'Card transaction approved - Thank you for your purchase.',
        'Security alert: New device login detected.',
        'Your account balance has been updated.',
        'Beneficiary added successfully.',
        'Scheduled payment executed successfully.',
      ];
      const notifCount = Math.floor(totalMonths * 2);
      const notifDates = distribDates(startDate, endDate, notifCount);
      for (const date of notifDates) {
        await client.query(
          `INSERT INTO notifications (user_id, title, description, is_read, created_at)
           VALUES ($1, 'System Notification', $2, $3, $4)`,
          [userId, pickArr(notifTemplates), Math.random() > 0.3, new Date(date + 'T' + rand(8, 18) + ':00:00')]
        );
      }

      // 7. CREATE LOGIN HISTORY
      const loginCount = Math.floor(totalMonths * 5 * demo.activity.m);
      const loginDates = distribDates(startDate, endDate, loginCount);
      for (const date of loginDates) {
        await client.query(
          `INSERT INTO login_history (user_id, status, ip_address, user_agent, device_name, location, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, Math.random() > 0.1 ? 'success' : 'failed', rand(10, 223) + '.' + rand(0, 255) + '.' + rand(0, 255) + '.' + rand(1, 254), 'Mozilla/5.0', pickArr(['Chrome Windows', 'Safari Mac', 'Firefox', 'Chrome Android', 'Safari iOS']), pickArr(['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ']), new Date(date + 'T' + rand(6, 23) + ':00:00')]
        );
      }

      // 8. CREATE MONTHLY STATEMENTS
      let stmtBalance = demo.initialBalance;
      let cur = new Date(start);
      while (cur <= end) {
        const monthStart = fmt(cur);
        const monthEnd = fmt(new Date(cur.getFullYear(), cur.getMonth() + 1, 0));
        const monthTx = await client.query(
          `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as credits,
                  COALESCE(SUM(CASE WHEN type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as debits
           FROM transactions WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date <= $3`,
          [userId, monthStart, monthEnd]
        );
        const credits = Number(monthTx.rows[0]?.credits || 0);
        const debits = Number(monthTx.rows[0]?.debits || 0);
        const closingBalance = stmtBalance + credits - debits;
        await client.query(
          `INSERT INTO documents (user_id, doc_type, title, period_start, period_end, file_size_bytes)
           VALUES ($1, 'statement', $2, $3, $4, $5)`,
          [userId, 'Monthly Statement - ' + cur.toLocaleString('default', { month: 'long', year: 'numeric' }), monthStart, monthEnd, rand(50000, 200000)]
        );
        stmtBalance = closingBalance;
        cur.setMonth(cur.getMonth() + 1);
      }

      console.log('   Profile created successfully with 1 year of transaction history\n');
    }

    console.log('========================================');
    console.log('Demo customer profiles created!');
    console.log('========================================');
    console.log('Login credentials:');
    console.log('  Standard:  user@demo.com / Demo@123');
    console.log('  Wealthy:   wealthy@demo.com / Demo@123');
    console.log('  Business:  business@demo.com / Demo@123');
    console.log('========================================');
  } catch (error) {
    console.error('Failed to seed demo customers:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoCustomers().catch(console.error);
