const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { protect } = require('../middleware/auth');

// GET /api/users — все партнёры (только Алматы)
router.get('/', protect, async (req, res) => {
  try {
    const { district, fitnessLevel, gender, schedule } = req.query;

    let query = `
      SELECT id, name, age, gender, district, fitness_level,
             goals, schedule, gym, bio, is_online, is_subscribed, created_at
      FROM users WHERE id != $1
    `;
    const params = [req.user.id];
    let idx = 2;

    if (district) { query += ` AND district = $${idx++}`; params.push(district); }
    if (fitnessLevel) { query += ` AND fitness_level = $${idx++}`; params.push(fitnessLevel); }
    if (gender) { query += ` AND gender = $${idx++}`; params.push(gender); }
    if (schedule) { query += ` AND $${idx++} = ANY(schedule)`; params.push(schedule); }

    query += ' ORDER BY is_online DESC, created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id — профиль одного пользователя
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, age, gender, district, fitness_level,
              goals, schedule, gym, bio, is_online, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;