process.on('uncaughtException', (err) => { console.error('ОШИБКА:', err.message, err.stack); });
process.on('unhandledRejection', (err) => { console.error('ОШИБКА:', err.message, err.stack); });

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());
//app.use(express.static(path.join(__dirname, '../frontend')));

// API маршруты
// Логирование всех запросов к /api/auth
app.use('/api/auth', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, req.body);
  next();
});

// Подключаем роуты после логирования
app.use('/api/auth', require('./routes/auth'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => res.json({ success: true, message: '💪 FitPartner Almaty API работает!' }));

// Socket.IO — реалтайм сообщения
const onlineUsers = {};
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    socket.userId = userId;
    io.emit('online_users', Object.keys(onlineUsers));
  });

  socket.on('send_message', (data) => {
    const recipientSocket = onlineUsers[data.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('new_message', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) delete onlineUsers[socket.userId];
    io.emit('online_users', Object.keys(onlineUsers));
  });
});

//app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
// });
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 FitPartner запущен: http://localhost:${PORT}\n`);
});