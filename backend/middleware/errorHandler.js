const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: 'Этот email уже зарегистрирован' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join('. ') });
  }
  res.status(500).json({ success: false, message: err.message || 'Ошибка сервера' });
};

module.exports = errorHandler;