const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Khởi tạo ứng dụng
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Biến lưu trữ thông tin người dùng
const users = new Map();
const messages = [];
const MAX_MESSAGES = 100; // Giới hạn tin nhắn lưu trữ

// Xử lý kết nối Socket.io
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Gửi danh sách người dùng đang online
  updateOnlineUsers();
  
  // Gửi lịch sử tin nhắn cho người dùng mới
  socket.emit('messageHistory', messages);
  
  // Xử lý đăng ký người dùng
  socket.on('register', (username) => {
    if (username && username.trim()) {
      const userData = {
        id: socket.id,
        username: username.trim(),
        joinedAt: new Date()
      };
      
      users.set(socket.id, userData);
      console.log(`User registered: ${username} (${socket.id})`);
      
      // Gửi thông báo có người tham gia
      const joinMessage = {
        id: Date.now().toString(),
        username: 'System',
        text: `${userData.username} has joined the chat`,
        timestamp: new Date(),
        isSystem: true
      };
      
      messages.push(joinMessage);
      trimMessages();
      
      io.emit('newMessage', joinMessage);
      updateOnlineUsers();
      
      // Gửi xác nhận đăng ký thành công
      socket.emit('registered', userData);
    }
  });
  
  // Xử lý tin nhắn mới
  socket.on('sendMessage', (messageData) => {
    const user = users.get(socket.id);
    
    if (user && messageData && messageData.trim()) {
      const message = {
        id: Date.now().toString(),
        username: user.username,
        text: messageData.trim(),
        timestamp: new Date(),
        userId: socket.id
      };
      
      messages.push(message);
      trimMessages();
      
      io.emit('newMessage', message);
      console.log(`Message from ${user.username}: ${message.text}`);
    }
  });
  
  // Xử lý khi người dùng đang nhập
  socket.on('typing', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('userTyping', user.username);
    }
  });
  
  // Xử lý khi người dùng dừng nhập
  socket.on('stopTyping', () => {
    socket.broadcast.emit('userStopTyping');
  });
  
  // Xử lý ngắt kết nối
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      users.delete(socket.id);
      
      // Gửi thông báo người dùng rời khỏi
      const leaveMessage = {
        id: Date.now().toString(),
        username: 'System',
        text: `${user.username} has left the chat`,
        timestamp: new Date(),
        isSystem: true
      };
      
      messages.push(leaveMessage);
      trimMessages();
      
      io.emit('newMessage', leaveMessage);
      updateOnlineUsers();
      
      console.log(`User disconnected: ${user.username} (${socket.id})`);
    }
  });
  
  // Hàm cập nhật danh sách người dùng online
  function updateOnlineUsers() {
    const onlineUsers = Array.from(users.values()).map(user => ({
      username: user.username,
      joinedAt: user.joinedAt
    }));
    
    io.emit('onlineUsers', onlineUsers);
  }
  
  // Hàm giới hạn số lượng tin nhắn lưu trữ
  function trimMessages() {
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES);
    }
  }
});

// Route cho trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API endpoint để lấy thông tin server
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    users: users.size,
    messages: messages.length,
    maxMessages: MAX_MESSAGES,
    uptime: process.uptime()
  });
});

// Xử lý 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Khởi động server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});