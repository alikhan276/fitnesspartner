const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,                     // postgres
  host: process.env.DB_HOST,                     // localhost
  database: process.env.DB_NAME,                 // fitpartner
  password: String(process.env.DB_PASSWORD),     // 123456
  port: Number(process.env.DB_PORT),             // 5432
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL подключена');
    await initTables(client);
    client.release();
  } catch (error) {
    console.error('❌ Ошибка БД:', error.message);
    process.exit(1);
  }
};

const initTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      age INTEGER,
      gender VARCHAR(10),
      district VARCHAR(50) DEFAULT 'Алмалинский',
      fitness_level VARCHAR(20) DEFAULT 'beginner',
      goals TEXT[] DEFAULT '{}',
      schedule TEXT[] DEFAULT '{}',
      gym VARCHAR(150),
      bio TEXT,
      is_subscribed BOOLEAN DEFAULT FALSE,
      subscription_expiry TIMESTAMP,
      subscription_plan VARCHAR(20) DEFAULT 'none',
      is_online BOOLEAN DEFAULT FALSE,
      last_seen TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      from_user INTEGER REFERENCES users(id) ON DELETE CASCADE,
      to_user INTEGER REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('✅ Таблицы готовы');
};

module.exports = { pool, connectDB };