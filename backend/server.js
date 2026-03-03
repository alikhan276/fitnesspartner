
process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err.message); });
process.on('unhandledRejection', (err) => { console.error('UNHANDLED:', err.message); });

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '💪 FitPartner Almaty работает!' });
});

// Socket.IO — онлайн статус и реалтайм сообщения
const onlineUsers = {};
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    socket.userId = userId;
    io.emit('online_users', Object.keys(onlineUsers));
    console.log('👤 Онлайн:', userId);
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
      console.log('👋 Оффлайн:', socket.userId);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 FitPartner запущен: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/health\n`);
  });
}).catch((err) => {
  console.error('❌ Не удалось запустить сервер:', err.message);
  process.exit(1);
});