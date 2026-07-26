// ============================================================
// Script: Run invoice_payment_status enum fix
// ============================================================
// This script connects to the database and runs the
// fix_invoice_payment_status_enum.sql migration to add
// missing values to the invoice_payment_status enum.
// ============================================================

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

if (!connectionString) {
  console.error('DATABASE_URL not configured. Check backend/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkCurrentEnumValues() {
  const client = await pool.connect();
  try {
    console.log('=== Current enum values ===');
    
    const res = await client.query(`
      SELECT 'invoice_payment_status' as enum_name, enumlabel as value
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_payment_status')
      ORDER BY enumsortorder
    `);
    
    if (res.rows.length === 0) {
      console.log('invoice_payment_status enum does not exist');
    } else {
      console.log('invoice_payment_status values:', res.rows.map(r => r.value).join(', '));
    }
    
    // Also check invoice_status
    const res2 = await client.query(`
      SELECT 'invoice_status' as enum_name, enumlabel as value
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_status')
      ORDER BY enumsortorder
    `);
    
    if (res2.rows.length === 0) {
      console.log('invoice_status enum does not exist');
    } else {
      console.log('invoice_status values:', res2.rows.map(r => r.value).join(', '));
    }
    
    return res.rows;
  } finally {
    client.release();
  }
}

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('=== Running migration... ===');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'schema', 'fix_invoice_payment_status_enum.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    const result = await client.query(sql);
    console.log('Migration executed successfully');
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyFix() {
  const client = await pool.connect();
  try {
    console.log('\n=== Verification ===');
    
    // Check invoice_payment_status enum values
    const res = await client.query(`
      SELECT enumlabel as value
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_payment_status')
      ORDER BY enumsortorder
    `);
    
    console.log('invoice_payment_status enum now has values:', res.rows.map(r => r.value).join(', '));
    
    // Check if 'paid' is now included
    const hasPaid = res.rows.some(r => r.value === 'paid');
    const hasPending = res.rows.some(r => r.value === 'pending');
    const hasCompleted = res.rows.some(r => r.value === 'completed');
    
    console.log('  - has_paid:', hasPaid);
    console.log('  - has_pending:', hasPending);
    console.log('  - has_completed:', hasCompleted);
    
    if (hasPaid && hasPending) {
      console.log('\n✓ Fix verified! invoice_payment_status enum now includes all required values.');
      return true;
    } else {
      console.log('\n✗ Fix incomplete - some values are still missing.');
      return false;
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('============================================');
    console.log('  Invoice Payment Status Enum Fix');
    console.log('============================================\n');
    
    // Step 1: Check current state
    await checkCurrentEnumValues();
    
    // Step 2: Run migration
    console.log('\n');
    await runMigration();
    
    // Step 3: Verify
    await verifyFix();
    
    console.log('\n=== Done ===');
    
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
