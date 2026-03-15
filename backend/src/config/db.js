const { Pool } = require('pg');
require('dotenv').config();

// Connect to NeonDB using the connection string in .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for NeonDB's secure connection
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};