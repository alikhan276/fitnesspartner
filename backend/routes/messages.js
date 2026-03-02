const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// ПОЛУЧИТЬ ДИАЛОГ
router.get('/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { from: req.user._id, to: req.params.userId },
        { from: req.params.userId, to: req.user._id }
      ]
    }).populate('from', 'name').populate('to', 'name').sort({ createdAt: 1 });

    // Пометить как прочитанные
    await Message.updateMany({ from: req.params.userId, to: req.user._id, read: false }, { read: true });

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ОТПРАВИТЬ СООБЩЕНИЕ
router.post('/:userId', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Сообщение пустое' });
    const message = await Message.create({ from: req.user._id, to: req.params.userId, text: text.trim() });
    const populated = await Message.findById(message._id).populate('from', 'name').populate('to', 'name');
    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// СПИСОК ЧАТОВ (все диалоги)
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ from: req.user._id }, { to: req.user._id }]
    }).populate('from', 'name district').populate('to', 'name district').sort({ createdAt: -1 });

    const chats = {};
    messages.forEach(msg => {
      const otherId = msg.from._id.toString() === req.user._id.toString()
        ? msg.to._id.toString() : msg.from._id.toString();
      if (!chats[otherId]) {
        const other = msg.from._id.toString() === req.user._id.toString() ? msg.to : msg.from;
        chats[otherId] = { user: other, lastMessage: msg, unread: 0 };
      }
      if (msg.to._id.toString() === req.user._id.toString() && !msg.read) {
        chats[otherId].unread++;
      }
    });

    res.json({ success: true, chats: Object.values(chats) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;