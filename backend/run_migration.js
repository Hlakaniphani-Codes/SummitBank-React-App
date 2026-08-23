#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./config/db');

const runMigration = async () => {
  const migrationFile = path.join(__dirname, 'schema', 'add_email_notifications_table.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');

  try {
    console.log('🔄 Running email_notifications migration...');
    await pool.query(sql);
    console.log('✅ Migration applied successfully!');
    console.log('   - email_notifications table created (if not exists)');
    console.log('   - Indexes created for user_id, status, event_type, created_at');
    console.log('   - Trigger for updated_at timestamp configured');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();
