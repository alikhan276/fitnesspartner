const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.code === '23505') {
    return res.status(400).json({ success: false, message: 'Этот email уже зарегистрирован' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Пользователь не найден' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутренняя ошибка сервера'
  });
};

module.exports = errorHandler;