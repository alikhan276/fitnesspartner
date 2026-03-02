// config/db.js
const mongoose = require('mongoose');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * connectDB({ retries = 5 })
 * - пытается подключиться с экспоненциальным бэкоффом
 * - логирует события подключения/отключения/ошибки
 */
const connectDB = async ({ retries = 5 } = {}) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI не задан в окружении');
  }

  mongoose.connection.on('connected', () => {
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err && err.message ? err.message : err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  let attempt = 0;
  while (attempt <= retries) {
    try {
      // опции не всегда обязательны для новых версий mongoose, но не вредят
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      // при успешном подключении возвращаем управление
      return;
    } catch (err) {
      attempt += 1;
      const isLast = attempt > retries;
      console.error(`❌ Ошибка подключения к MongoDB (попытка ${attempt}/${retries + 1}):`, err.message);
      if (isLast) {
        // бросаем дальше — вызывающая сторона решит, exit или retry по-другому
        throw err;
      }
      // экспоненциальная задержка: 500ms * 2^(attempt-1)
      const delay = 500 * Math.pow(2, attempt - 1);
      console.log(`Повтор через ${delay}ms...`);
      await sleep(delay);
    }
  }
};

// Graceful shutdown: on process termination close mongoose connection
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed due to app termination (SIGINT)');
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
});

module.exports = connectDB;