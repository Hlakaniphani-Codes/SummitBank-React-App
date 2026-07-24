require('dotenv').config();
const { Pool } = require('pg');

console.log('Starting admin hash update...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // The correct bcrypt hash for Admin@123456 provided by the user
    const correctHash = '$2a$12$G45NUoLmkKEUxefNXtmlpecwtl4iu406z9ffdN.rYhlX48xAmC5tS';
    
    // First check if user exists
    const { rows: existing } = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      ['admin@summitshares.com']
    );
    
    if (existing.length > 0) {
      console.log('Found admin user:', JSON.stringify(existing[0]));
      console.log('Updating password hash and ensuring role=super_admin...');
      
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2 WHERE email = $3',
        [correctHash, 'super_admin', 'admin@summitshares.com']
      );
      
      console.log('✅ Admin password hash and role updated successfully');
    } else {
      console.log('Admin user not found, creating new one...');
      
      await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, phone, street, city, state, zip, country, date_of_birth, terms_accepted, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true)`,
        ['Super', 'Admin', 'admin@summitshares.com', correctHash, 'super_admin',
         '555-0100', '100 Summit St', 'New York', 'NY', '10001', 'US', '1990-01-01']
      );
      
      console.log('✅ Admin user created successfully');
    }
    
    // Verify
    const { rows } = await pool.query(
      'SELECT id, email, role, is_active, LEFT(password_hash, 25) as hash_start FROM users WHERE email = $1',
      ['admin@summitshares.com']
    );
    
    if (rows.length > 0) {
      console.log('User verification:', JSON.stringify(rows[0]));
      console.log('Hash starts with $2a$12$?:', rows[0].hash_start.startsWith('$2a$12$') ? 'YES ✓' : 'NO ✗');
    } else {
      console.log('❌ Admin user not found in database after update');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await pool.end();
  }
})();
