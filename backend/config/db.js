// ============================================
// UNIFIED DATABASE CONNECTION
// Works in Local Development & Production (Render)
// ============================================

// Load .env before anything else
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

// Build connection string from DATABASE_URL or individual variables
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// If no connection string is available, exit gracefully (for local dev)
if (!connectionString) {
  console.error('══════════════════════════════════════════════════════════════');
  console.error('  DATABASE_URL environment variable is not set.');
  console.error('  Make sure a .env file exists in the backend/ directory');
  console.error('  with a line like: DATABASE_URL=postgresql://user:pass@localhost:5432/your_db');
  console.error('══════════════════════════════════════════════════════════════');
  
  // Export placeholder that fails gracefully
  module.exports = {
    query: async () => { 
      throw new Error('Database not configured – set DATABASE_URL in backend/.env'); 
    },
    connect: async () => { 
      throw new Error('Database not configured – set DATABASE_URL in backend/.env'); 
    },
  };
  return;
}

// Create the pool with unified configuration
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  // SSL is required in production (Render), disabled in local development
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;