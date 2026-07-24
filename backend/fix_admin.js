/**
 * Fix admin password hash
 * Run: node fix_admin.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, role, is_active, password_hash 
       FROM users WHERE email = $1`,
      ['admin@summitshares.com']
    );
    
    if (rows.length === 0) {
      console.log('❌ Admin user not found in database');
      console.log('Creating admin user now...');
      
      const hash = await bcrypt.hash('Admin@123456', 10);
      await pool.query(
        `INSERT INTO users (
          first_name, last_name, email, password_hash, role,
          phone, street, city, state, zip, country, date_of_birth,
          terms_accepted, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true)
        RETURNING id`,
        ['Super', 'Admin', 'admin@summitshares.com', hash, 'super_admin',
         '555-0100', '100 Summit Street', 'New York', 'NY', '10001', 'US', '1990-01-01']
      );
      console.log('✅ Admin user created successfully');
    } else {
      const u = rows[0];
      console.log('Found user:');
      console.log('  ID:', u.id);
      console.log('  Email:', u.email);
      console.log('  Role:', u.role);
      console.log('  Active:', u.is_active);
      
      // Check password
      const match = await bcrypt.compare('Admin@123456', u.password_hash);
      console.log('  Password match:', match);
      
      if (!match) {
        console.log('🔄 Password mismatch - updating hash...');
        const hash = await bcrypt.hash('Admin@123456', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, u.id]);
        console.log('✅ Password hash updated successfully');
      } else {
        console.log('✅ Password is already correct');
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
