const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.on("connect", () => {
  console.log("Connected to Supabase PostgreSQL");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

// Compatibility helpers for the existing backend
const db = {
  query(sql, params = []) {
  return pool.query(sql, params);
},
  async all(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
  },

  async get(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0];
  },

  async run(sql, params = []) {
    const result = await pool.query(sql, params);

    return {
      changes: result.rowCount,
      lastInsertRowid:
        result.rows[0]?.id || null,
    };
  },

  async exec(sql) {
    return pool.query(sql);
  },

  async transaction(callback) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await callback(client);

      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  pool,
};

module.exports = db;