const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Имя обязательно'),
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const existing = await User.findByEmail(req.body.email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email уже занят' });
    }

    const user = await User.create(req.body);
    const token = genToken(user.id);

    res.status(201).json({ success: true, token, user: User.safe(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Введите email и пароль' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    }

    const isMatch = await User.checkPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    }

    await pool.query('UPDATE users SET is_online=TRUE, last_seen=NOW() WHERE id=$1', [user.id]);

    const token = genToken(user.id);
    res.json({ success: true, token, user: User.safe(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: User.safe(req.user) });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.update(req.user.id, req.body);
    res.json({ success: true, user: User.safe(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/subscribe
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { kaspiPhone } = req.body;
    if (!kaspiPhone) {
      return res.status(400).json({ success: false, message: 'Укажите номер Kaspi' });
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    const result = await pool.query(
      `UPDATE users SET is_subscribed=TRUE, subscription_plan='basic', subscription_expiry=$1
       WHERE id=$2 RETURNING *`,
      [expiry, req.user.id]
    );

    res.json({
      success: true,
      message: `✅ Подписка активирована до ${expiry.toLocaleDateString('ru-RU')}!`,
      user: User.safe(result.rows[0])
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;