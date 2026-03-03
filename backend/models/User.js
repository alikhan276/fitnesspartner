// Модель пользователя (PostgreSQL)
// Таблица создаётся автоматически в config/db.js
// Этот файл содержит вспомогательные функции для работы с пользователями

const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  // Найти по email
  findByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return result.rows[0] || null;
  },

  // Найти по ID
  findById: async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  // Создать пользователя
  create: async ({ name, email, password, age, gender, district, fitnessLevel, goals, schedule, gym, bio }) => {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, age, gender, district, fitness_level, goals, schedule, gym, bio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, email.toLowerCase(), hashed, age || null, gender || null,
       district || 'Алмалинский', fitnessLevel || 'beginner',
       goals || [], schedule || [], gym || null, bio || null]
    );
    return result.rows[0];
  },

  // Проверить пароль
  checkPassword: async (entered, hashed) => {
    return await bcrypt.compare(entered, hashed);
  },

  // Обновить профиль
  update: async (id, fields) => {
    const { name, age, phone, district, fitnessLevel, goals, schedule, gym, bio } = fields;
    const result = await pool.query(
      `UPDATE users SET name=$1, age=$2, phone=$3, district=$4,
       fitness_level=$5, goals=$6, schedule=$7, gym=$8, bio=$9
       WHERE id=$10 RETURNING *`,
      [name, age || null, phone || null, district,
       fitnessLevel, goals || [], schedule || [], gym || null, bio || null, id]
    );
    return result.rows[0];
  },

  // Безопасные поля (без пароля)
  safe: (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    age: u.age,
    gender: u.gender,
    district: u.district,
    fitness_level: u.fitness_level,
    goals: u.goals || [],
    schedule: u.schedule || [],
    gym: u.gym,
    bio: u.bio,
    is_subscribed: u.is_subscribed,
    subscription_plan: u.subscription_plan,
    subscription_expiry: u.subscription_expiry,
    is_online: u.is_online,
    created_at: u.created_at
  })
};

module.exports = User;