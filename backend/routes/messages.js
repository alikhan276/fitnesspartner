const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET /api/messages — список всех чатов
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Message.getChats(req.user.id);
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages/:userId — диалог с пользователем
router.get('/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.getDialog(req.user.id, req.params.userId);
    await Message.markRead(req.params.userId, req.user.id);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/messages/:userId — отправить сообщение
router.post('/:userId', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Сообщение пустое' });
    }

    const msg = await Message.create(req.user.id, req.params.userId, text.trim());
    res.status(201).json({
      success: true,
      message: { ...msg, from_name: req.user.name }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;