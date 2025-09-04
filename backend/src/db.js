const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  // ssl: { rejectUnauthorized: false } // descomenta si te conectas a un servicio en la nube que requiere SSL
});

module.exports = { pool };
