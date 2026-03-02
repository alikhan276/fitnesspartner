const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// РЕГИСТРАЦИЯ
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Имя обязательно'),
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  try {
    const { name, email, password, age, gender, district, fitnessLevel, goals, schedule, gym, bio } = req.body;
    const user = await User.create({ name, email, password, age, gender, district, fitnessLevel, goals, schedule, gym, bio });
    const token = genToken(user._id);
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, isSubscribed: user.isSubscribed, subscriptionPlan: user.subscriptionPlan } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.code === 11000 ? 'Email уже занят' : err.message });
  }
});

// ВХОД
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Введите email и пароль' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    }
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    const token = genToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, isSubscribed: user.isSubscribed, subscriptionPlan: user.subscriptionPlan, district: user.district } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// МОЙ ПРОФИЛЬ
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ОБНОВИТЬ ПРОФИЛЬ
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name', 'age', 'gender', 'district', 'fitnessLevel', 'goals', 'schedule', 'gym', 'bio', 'phone'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ПОДПИСКА (имитация Kaspi оплаты)
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { plan, kaspiPhone } = req.body;
    if (!kaspiPhone) return res.status(400).json({ success: false, message: 'Укажите номер Kaspi' });

    const expiry = new Date();
    plan === 'premium' ? expiry.setMonth(expiry.getMonth() + 3) : expiry.setMonth(expiry.getMonth() + 1);

    const user = await User.findByIdAndUpdate(req.user._id, {
      isSubscribed: true,
      subscriptionPlan: plan || 'basic',
      subscriptionExpiry: expiry
    }, { new: true });

    res.json({ success: true, message: `Подписка ${plan} активирована до ${expiry.toLocaleDateString('ru')}!`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;