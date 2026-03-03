// backend/server.js
process.on('uncaughtException', (err) => { 
  console.error('UNCAUGHT:', err && err.message); 
  console.error(err && err.stack);
});
process.on('unhandledRejection', (err) => { 
  console.error('UNHANDLED:', err && (err.message || err)); 
  if (err && err.stack) console.error(err.stack);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ----- robust DB loader: handles module.exports = connectDB OR module.exports.connectDB -----
let connectDB;
try {
  const dbModule = require('./config/db');
  // support: module.exports = connectDB OR module.exports.connectDB = connectDB OR export default
  connectDB = dbModule.connectDB || dbModule.default || dbModule;
  if (typeof connectDB !== 'function') {
    console.warn('Warning: ./config/db did not export a function. connectDB will be a no-op.');
    connectDB = async () => Promise.resolve();
  }
} catch (err) {
  console.warn('Warning: could not require ./config/db — DB connect will be skipped until file exists.', err.message);
  connectDB = async () => Promise.resolve();
}
// ------------------------------------------------------------------------------------

// Раздаём весь frontend (frontend рядом с backend в вашей структуре)
const frontendRoot = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendRoot));

// API routes (убедитесь, что файлы exist: routes/auth.js, routes/users.js, routes/messages.js)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '💪 FitPartner работает!' });
});

// Socket.IO — онлайн статус и реалтайм сообщения
const onlineUsers = {};
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    socket.userId = userId;
    io.emit('online_users', Object.keys(onlineUsers));
    console.log('👤 join:', userId);
  });

  socket.on('send_message', (data) => {
    const recipientSocket = onlineUsers[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('new_message', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      delete onlineUsers[socket.userId];
      io.emit('online_users', Object.keys(onlineUsers));
      console.log('👋 disconnect:', socket.userId);
    }
  });
});

// ВАЖНО: не делаем catch-all, который перехватывает /api или ассеты.
// Но добавим "safe" catch-all, который не мешает файлам с расширением, API и socket.io:
app.get('*', (req, res, next) => {
  const isApi = req.path.startsWith('/api');
  const isSocket = req.path.startsWith('/socket.io');
  const hasExt = Boolean(path.extname(req.path)); // /css/app.css, /pages/dashboard.html -> hasExt true for .html/.css/.js
  if (isApi || isSocket || hasExt) return next();
  // fallback to SPA index.html
  return res.sendFile(path.join(frontendRoot, 'pages', 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Error handler
app.use(errorHandler);

// Start server only after DB connect attempt
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🚀 FitPartner запущен: http://localhost:${PORT}`);
      console.log(`📡 Страницы: http://localhost:${PORT}/pages/index.html`);
    });
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения к БД:', err && err.message);
    // При желании можно удалить process.exit и запустить без БД:
    process.exit(1);
  });