const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// ПОЛУЧИТЬ ВСЕХ ПАРТНЁРОВ (только Алматы)
router.get('/', protect, async (req, res) => {
  try {
    const { district, fitnessLevel, gender, schedule } = req.query;
    const filter = { _id: { $ne: req.user._id } };
    if (district) filter.district = district;
    if (fitnessLevel) filter.fitnessLevel = fitnessLevel;
    if (gender) filter.gender = gender;
    if (schedule) filter.schedule = { $in: [schedule] };

    const users = await User.find(filter)
      .select('-password')
      .sort({ isOnline: -1, createdAt: -1 })
      .limit(50);

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;