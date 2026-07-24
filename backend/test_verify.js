const pool = require('./config/db');
const fs = require('fs');

async function main() {
  const results = [];
  
  // Check users
  const users = await pool.query('SELECT id, first_name, last_name, email FROM users WHERE role = $1 ORDER BY id', ['customer']);
  results.push('=== USERS ===');
  users.rows.forEach(u => results.push(JSON.stringify(u)));
  
  // Check accounts
  const accounts = await pool.query('SELECT id, user_id, account_type, balance FROM accounts ORDER BY id');
  results.push('\n=== ACCOUNTS ===');
  accounts.rows.forEach(a => results.push(`id=${a.id} user_id=${a.user_id} type=${a.account_type} balance=$${a.balance}`));
  
  // Check recent transfers
  const transfers = await pool.query('SELECT transaction_id, user_id, account_id, amount, description, balance_after FROM transactions ORDER BY id DESC LIMIT 3');
  results.push('\n=== RECENT TRANSACTIONS ===');
  transfers.rows.forEach(t => results.push(JSON.stringify(t)));
  
  // Now test getDashboardData for user 2 (sugar davido)
  const { getDashboardData } = require('./utils/postgresStore');
  const dash2 = await getDashboardData(2);
  results.push('\n=== DASHBOARD FOR USER 2 ===');
  results.push(`totalBalance=$${dash2.totalBalance}`);
  dash2.accounts.forEach(a => results.push(`  ${a.account_type}: $${a.balance}`));
  
  // Test getDashboardData for user 3
  const dash3 = await getDashboardData(3);
  results.push('\n=== DASHBOARD FOR USER 3 ===');
  results.push(`totalBalance=$${dash3.totalBalance}`);
  dash3.accounts.forEach(a => results.push(`  ${a.account_type}: $${a.balance}`));
  
  fs.writeFileSync('test_output.txt', results.join('\n'));
  console.log('Test output written to test_output.txt');
  process.exit(0);
}

main().catch(e => {
  fs.writeFileSync('test_output.txt', 'ERROR: ' + e.message + '\n' + e.stack);
  console.error(e);
  process.exit(1);
});
