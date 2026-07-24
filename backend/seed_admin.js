/**
 * Seed script to create the initial super admin user.
 * Run: node seed_admin.js
 */
const bcrypt = require('bcrypt');
const pool = require('./config/db');

const seedAdmin = async () => {
  const email = 'admin@summitshares.com';
  const password = 'Admin@123456';
  const firstName = 'Super';
  const lastName = 'Admin';
  const role = 'super_admin';

  try {
    // Check if admin already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('✅ Admin user already exists (ID: %s)', existing.rows[0].id);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (
        first_name, last_name, email, password_hash, role,
        phone, street, city, state, zip, country, date_of_birth,
        terms_accepted, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true)
      RETURNING id`,
      [
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        '555-0100',
        '100 Summit Street',
        'New York',
        'NY',
        '10001',
        'US',
        '1990-01-01',
      ]
    );

    console.log('✅ Super admin created successfully (ID: %s)', result.rows[0].id);
    console.log('   Email: %s', email);
    console.log('   Password: %s', password);
    console.log('   Role: %s', role);
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message);
  } finally {
    await pool.end();
  }
};

seedAdmin();
