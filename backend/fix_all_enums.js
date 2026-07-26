// ============================================================
// Comprehensive Enum Fix Script
// ============================================================
// This script:
// 1. Reads all enums from the database
// 2. Compares with expected values from the schema
// 3. Adds any missing values to each enum
// 4. Verifies all fixes
// ============================================================

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Expected enum values based on the schema and code usage
const EXPECTED_ENUMS = {
  user_role: ['customer', 'admin', 'super_admin'],
  account_status: ['active', 'inactive', 'frozen', 'closed'],
  account_type: ['checking', 'savings', 'money_market', 'cd', 'investment'],
  application_status: ['pending', 'approved', 'rejected', 'review'],
  application_type: ['account', 'card', 'loan', 'wire_transfer', 'other'],
  wire_status: ['pending', 'approved', 'sent', 'blocked', 'hold', 'failed'],
  audit_action: [
    'login', 'logout', 'create', 'update', 'delete', 'approve', 'reject',
    'credit', 'debit', 'hold', 'unhold', 'activate', 'deactivate',
    'hide', 'show', 'block', 'send_email', 'broadcast', 'send_popup',
    'mark_sent', 'error_message', 'view'
  ],
  login_status: ['success', 'failed', 'locked'],
  card_network: ['visa', 'mastercard', 'amex', 'discover'],
  card_type: ['debit', 'credit', 'prepaid'],
  card_status: ['active', 'inactive', 'frozen', 'closed', 'pending'],
  transaction_type: ['deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest'],
  transaction_status: ['pending', 'completed', 'failed', 'reversed'],
  bill_frequency: ['one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
  bill_status: ['pending', 'paid', 'overdue', 'cancelled'],
  invoice_payment_status: ['pending', 'paid', 'overdue', 'cancelled', 'completed', 'failed'],
  doc_type: ['passport', 'drivers_license', 'id_card', 'utility_bill', 'bank_statement', 'tax_return'],
  // Additional enums found in the database that also need values
  document_type: ['statement', 'tax', 'bank_statement', 'utility_bill', 'passport', 'drivers_license', 'id_card', 'tax_return'],
  user_doc_type: ['passport', 'stateid', 'driverslicense', 'drivers_license', 'id_card', 'utility_bill', 'bank_statement', 'tax_return'],
  cheque_status: ['pending', 'approved', 'rejected', 'completed', 'failed', 'cancelled'],
  transfer_status: ['pending', 'approved', 'blocked', 'hold', 'sent', 'cancelled', 'failed', 'completed'],
  txn_status: ['completed', 'pending', 'failed', 'reversed'],
  txn_type: ['transfer', 'credit', 'debit', 'payment', 'deposit', 'withdrawal', 'fee', 'interest'],
  ticket_status: ['open', 'in_progress', 'resolved', 'closed'],
};

async function getDatabaseEnums(client) {
  const res = await client.query(`
    SELECT t.typname as enum_name, 
           json_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  
  const enums = {};
  res.rows.forEach(r => {
    // json_agg returns a JSON array - parse it if it's a string
    const vals = typeof r.values === 'string' ? JSON.parse(r.values) : r.values;
    enums[r.enum_name] = vals;
  });
  return enums;
}

async function fixEnum(client, enumName, expectedValues, currentValues) {
  const missingValues = expectedValues.filter(v => !currentValues.includes(v));
  
  if (missingValues.length === 0) {
    console.log(`  ✓ ${enumName}: All values present (${currentValues.join(', ')})`);
    return { fixed: false, added: [] };
  }
  
  console.log(`  ⚠ ${enumName}: Missing values: ${missingValues.join(', ')}`);
  console.log(`    Current: ${currentValues.join(', ')}`);
  
  for (const value of missingValues) {
    try {
      await client.query(`ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS '${value}'`);
      console.log(`    → Added '${value}'`);
    } catch (err) {
      console.error(`    ✗ Failed to add '${value}': ${err.message}`);
    }
  }
  
  return { fixed: true, added: missingValues };
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('============================================');
    console.log('  COMPREHENSIVE ENUM FIX');
    console.log('============================================\n');
    
    // Step 1: Get current database enums
    console.log('=== Current Database Enums ===');
    const dbEnums = await getDatabaseEnums(client);
    
    for (const [name, values] of Object.entries(dbEnums)) {
      console.log(`  ${name}: ${values.join(', ')}`);
    }
    
    // Step 2: Compare and fix
    console.log('\n=== Checking & Fixing Enums ===');
    let totalFixed = 0;
    let totalMissing = 0;
    
    for (const [enumName, expectedValues] of Object.entries(EXPECTED_ENUMS)) {
      const currentValues = dbEnums[enumName];
      
      if (!currentValues) {
        console.log(`  ✗ ${enumName}: Does not exist in database!`);
        try {
          const valuesList = expectedValues.map(v => `'${v}'`).join(', ');
          await client.query(`CREATE TYPE ${enumName} AS ENUM (${valuesList})`);
          console.log(`    → Created with values: ${expectedValues.join(', ')}`);
          totalFixed++;
          totalMissing += expectedValues.length;
        } catch (err) {
          console.error(`    ✗ Failed to create: ${err.message}`);
        }
        continue;
      }
      
      const result = await fixEnum(client, enumName, expectedValues, currentValues);
      if (result.fixed) {
        totalFixed++;
        totalMissing += result.added.length;
      }
    }
    
    // Step 3: Verify all fixes
    console.log('\n=== Verification ===');
    const updatedEnums = await getDatabaseEnums(client);
    let allGood = true;
    
    for (const [enumName, expectedValues] of Object.entries(EXPECTED_ENUMS)) {
      const currentValues = updatedEnums[enumName];
      if (!currentValues) {
        console.log(`  ✗ ${enumName}: Still missing from database`);
        allGood = false;
        continue;
      }
      
      const missing = expectedValues.filter(v => !currentValues.includes(v));
      if (missing.length > 0) {
        console.log(`  ✗ ${enumName}: Still missing: ${missing.join(', ')}`);
        allGood = false;
      } else {
        console.log(`  ✓ ${enumName}: OK (${currentValues.join(', ')})`);
      }
    }
    
    console.log('\n============================================');
    console.log(`  Fixed ${totalFixed} enums, added ${totalMissing} values`);
    console.log(`  Status: ${allGood ? '✓ ALL ENUMS CORRECT' : '✗ SOME ISSUES REMAIN'}`);
    console.log('============================================');
    
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
